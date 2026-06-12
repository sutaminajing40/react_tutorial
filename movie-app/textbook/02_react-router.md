# 第2章 React Router — Data Router と loader

## この章でやること

お気に入り一覧ページを追加し、データ取得を「画面の中の `useEffect`」から「Router の `loader`」に切り替える。
完成すると:

- `/favorites` でお気に入り一覧が表示され、ヘッダーの件数バッジがリアルタイムに変わる
- 映画一覧のデータを Router が事前に取得するため、画面描画時にローディング待ちが起きなくなる
- 検索キーワードが URL（`?query=`）に乗り、リロードしても同じ結果が再現される
- 連続入力による不要なリクエストをデバウンスと `AbortSignal` で防ぐ

---

## 1. React Router Data Router とは

### 今できていること・足りないこと

君の `main.tsx` は既に Data Router を使えている:

```tsx
const router = createBrowserRouter([
  { path: "/", Component: App },
  { path: "/movies/:id", Component: MovieDetail },
]);
```

`createBrowserRouter` でルート（URL と画面の対応）を配列で定義 → `RouterProvider` で表示、という形だ。これが React Router の「**Data Router API**」（チームが使っているやつ）。

足りないのは2つ:

1. **画面が増えたときの足し方**（お気に入り一覧ページを足す）
2. **loader** — データ取得を「コンポーネントの `useEffect`」ではなく「Router 側」で行う実務的な書き方

### なぜ `useEffect` のままではダメなのか

今の一覧取得はこうなっている:

```tsx
useEffect(() => {
  fetchMovieList();
}, [keyword]);
```

この書き方の流れは「**①まず空っぽの画面を描く → ②描いた後で fetch が走る → ③返ってきたら再描画**」。一瞬カラの状態が見えるし、ローディングやエラーの管理を毎コンポーネントで書く必要がある。

Data Router の **loader** は「**画面を描く前に**必要なデータを取ってくる」係。流れが「①データを取る → ②揃ってから画面を描く」に変わる。チームが Data Router を採用している大きな理由がこれ。

### loader が Race Condition を自動解決する

`useEffect` でデータ取得を行っていたときは、検索の連続入力で「古いリクエストが後から返ってくる（Race Condition）」問題を、クリーンアップ関数でフラグ管理するか、手動で `AbortController` を制御しなければならなかった:

```tsx
// 【Before】useEffect での面倒な競合対策コードの例
useEffect(() => {
  let ignore = false;
  async function fetchResults() {
    const data = await api.search(keyword);
    if (!ignore) setMovies(data); // 古いリクエストの結果なら無視する
  }
  fetchResults();
  return () => {
    ignore = true; // 次の fetch が走る前に古いリクエストの結果を捨てる
  };
}, [keyword]);
```

これを画面ごとに手動で漏れなく書くのは、非常に面倒でバグの原因になりがちだった。

Data Router（loader）に移行すると、React Router が古いリクエストを自動的に無視してくれる。さらに loader の引数 `request` には `AbortSignal` が含まれており、これを `fetch` に渡すだけでブラウザ層での自動キャンセルも有効になる。

---

## 2. 最小例で使い方を見る

> これは読んで理解すればOK。手元で動かさなくてよい。

ユーザー一覧アプリを題材に、ルート追加・loader・`useLoaderData` の形を見てみよう。

```tsx
// ルート定義（main.tsx 相当）
const router = createBrowserRouter([
  {
    path: "/users",
    Component: UserList,
    loader: usersLoader,
  },
  {
    path: "/users/:id",
    Component: UserDetail,
    loader: userDetailLoader,
  },
]);
```

```ts
// loader 関数（コンポーネントの外に置く）
export async function usersLoader() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Response("取得失敗", { status: res.status });
  return res.json(); // これが useLoaderData() の戻り値になる
}

// URL パラメータを使う例
export async function userDetailLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/users/${params.id}`);
  if (!res.ok) throw new Response("Not Found", { status: 404 });
  return res.json();
}
```

```tsx
// コンポーネント側（fetch も useEffect も不要）
function UserList() {
  const users = useLoaderData() as User[];
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**`Link` と `NavLink` の違い**:

```tsx
// Link: 普通のリンク
<Link to="/users">ユーザー一覧</Link>

// NavLink: 今いるページかどうかを自動判定できる
// アクティブ時に className や style を付けられる
<NavLink to="/users" className={({ isActive }) => isActive ? "active" : ""}>
  ユーザー一覧
</NavLink>
```

`NavLink` はナビゲーションバーのように「今どこにいるか」を示したい場所で使うのが定石。

---

## 3. やってみよう（課題）

### 課題 2-1: お気に入り一覧ページを作る

**要件**:
- `src/Favorites.tsx` を新規作成する
- 第1章のストア（`useFavoritesStore`）から `favorites` を読んで一覧表示する
- お気に入りが0件のときは「まだお気に入りがありません。」と表示する
- 各映画カードを `<Link to={/movies/${movie.id}}>` で詳細へリンクする

**受け入れ条件**:
- ブラウザで `/favorites` に直接アクセスすると映画カードが並ぶ（まだルート登録していないのでエラーになってOK。課題2-2でつなぐ）
- お気に入りが0件のときに「まだお気に入りがありません。」が表示される
- このページに `useEffect` や `fetch` が一切含まれない（ストアを読むだけ）

**使うもの**: `useFavoritesStore`, `Link`（react-router）, セレクタ

<details><summary>💡 ヒント1（方針）</summary>

このページは**サーバー通信が要らない**。お気に入りは Zustand が全部持っているので、ストアを読んで `.map` するだけ。

画像 URL は `https://image.tmdb.org/t/p/w300_and_h450_bestv2${movie.posterPath}` の形で組み立てる。
</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
import { Link } from "react-router";
import { useFavoritesStore } from "./stores/favorites";

function Favorites() {
  const favorites = useFavoritesStore((s) => /* TODO: favorites を取り出す */);

  if (/* TODO: 0件チェック */) {
    return <p style={{ padding: 24 }}>まだお気に入りがありません。</p>;
  }

  return (
    <section className="movie-row-section">
      <h2 className="movie-row-title">My List</h2>
      <div className="movie-row-scroll">
        {favorites.map((movie) => (
          <Link key={movie.id} to={/* TODO: 詳細 URL */} className="movie-card">
            {/* TODO: img と title を表示 */}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Favorites;
```
</details>

<details><summary>✅ 解答例</summary>

```tsx
import { Link } from "react-router";
import { useFavoritesStore } from "./stores/favorites";

function Favorites() {
  const favorites = useFavoritesStore((s) => s.favorites);

  if (favorites.length === 0) {
    return <p style={{ padding: 24 }}>まだお気に入りがありません。</p>;
  }

  return (
    <section className="movie-row-section">
      <h2 className="movie-row-title">My List</h2>
      <div className="movie-row-scroll">
        {favorites.map((movie) => (
          <Link key={movie.id} to={`/movies/${movie.id}`} className="movie-card">
            <div className="movie-card__imgwrap">
              <img
                src={`https://image.tmdb.org/t/p/w300_and_h450_bestv2${movie.posterPath}`}
                alt={movie.title}
                className="movie-card__image"
              />
              <div className="movie-card__overlay">
                <h3 className="movie-card__title">{movie.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Favorites;
```

**なぜサーバー通信が要らないか**: お気に入りは Zustand（＝クライアント側の状態）が全部持っているので、ストアを読むだけで描ける。loader も `useEffect` も不要。
</details>

---

### 課題 2-2: `/favorites` をルートに登録する

**要件**:
- `main.tsx` に `/favorites` のルートを追加する
- `Favorites` コンポーネントを import する

**受け入れ条件**:
- ブラウザで `/favorites` に直接アクセスすると Favorites ページが表示される

**使うもの**: `createBrowserRouter`

<details><summary>💡 ヒント1（方針）</summary>

既存のルート配列に1行足すだけ。形式は `{ path: "/favorites", Component: Favorites }` と他のルートと同じ。
</details>

<details><summary>✅ 解答例</summary>

```tsx
// main.tsx
import Favorites from "./Favorites.tsx";

const router = createBrowserRouter([
  { path: "/", Component: App },
  { path: "/movies/:id", Component: MovieDetail },
  { path: "/favorites", Component: Favorites }, // 追加
]);
```
</details>

---

### 課題 2-3: ヘッダーにナビと件数バッジを付ける（レイアウトルート化）

**要件**:
- `src/Header.tsx` に、`/` と `/favorites` へのナビリンクを追加する
- ヘッダーにお気に入り件数のバッジを表示する（例: `My List (3)`）
- ナビリンクには `NavLink` を使う（`Link` ではない）
- 件数は Zustand ストアから取る
- **`main.tsx` を「レイアウトルート」構成に変更する**: 今は `<Header>` が `<RouterProvider>` を外から包んでいるが、`NavLink` は Router の**内側**でしか使えない。親ルート＋`children`＋`<Outlet />` の形に組み替える

**受け入れ条件**:
- ヘッダーに「Home」「My List (件数)」のリンクが表示され、クリックで遷移できる
- 詳細でお気に入り登録 → ヘッダーの件数が即座に増える
- ブラウザのコンソールに Router 関連のエラー（`useHref() may be used only in the context of a <Router>` など）が出ていない

**使うもの**: `NavLink`, `Outlet`（react-router）, `createBrowserRouter` の `children`, `useFavoritesStore`, セレクタ

<details><summary>💡 ヒント1（方針）</summary>

そのまま `Header` に `NavLink` を書くと**実行時エラーで画面が真っ白になる**。今の `main.tsx` は `<Header><RouterProvider /></Header>` という形で、Header が Router の外にいるからだ。`NavLink`・`Link`・`useNavigate` などは Router のコンテキストが必要。

Data Router で「全ページ共通のガワ（ヘッダーなど）」を作る定石が**レイアウトルート**:

- 親ルートに `Component: Layout` を置き、各ページは `children: [...]` に並べる
- `Layout` の中に置いた `<Outlet />` の位置に、現在の子ルートが描画される

`NavLink` を使う理由: 今いるページのリンクに自動で「active」の状態を付けられる。ナビゲーションでは `Link` ではなく `NavLink` を使うのが定石。

件数は `useFavoritesStore((s) => s.favorites.length)` でセレクタを使って購読する。
</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
// src/Header.tsx
import { NavLink } from "react-router";
import { useFavoritesStore } from "./stores/favorites";

function Header({ children }: { children: React.ReactNode }) {
  const count = useFavoritesStore((s) => /* TODO: 件数を取る */);

  return (
    <div className="app-bg">
      <header className="app-header">
        <h1 className="app-title">MOVIEFLIX</h1>
        <nav style={{ display: "flex", gap: 16 }}>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/favorites">My List ({/* TODO */})</NavLink>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

```tsx
// src/main.tsx
import { createBrowserRouter, RouterProvider, Outlet } from "react-router";

// 全ページ共通のガワ（レイアウトルート）
function Layout() {
  return (
    <Header>
      {/* TODO: 子ルートが描画される場所に Outlet を置く */}
    </Header>
  );
}

const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: App },
      // TODO: /movies/:id と /favorites もここに移す
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```
</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/Header.tsx
import { NavLink } from "react-router";
import { useFavoritesStore } from "./stores/favorites";

function Header({ children }: { children: React.ReactNode }) {
  const count = useFavoritesStore((s) => s.favorites.length);

  return (
    <div className="app-bg">
      <header className="app-header">
        <h1 className="app-title">MOVIEFLIX</h1>
        <nav style={{ display: "flex", gap: 16 }}>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/favorites">My List ({count})</NavLink>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default Header;
```

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import "./index.css";
import App from "./App.tsx";
import MovieDetail from "./MovieDetail.tsx";
import Favorites from "./Favorites.tsx";
import Header from "./Header.tsx";

// 全ページ共通のガワ（レイアウトルート）。子ルートは <Outlet /> の位置に描画される
function Layout() {
  return (
    <Header>
      <Outlet />
    </Header>
  );
}

const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: App },
      { path: "/movies/:id", Component: MovieDetail },
      { path: "/favorites", Component: Favorites },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

**なぜ Layout（レイアウトルート）が必要か**: `NavLink` や `Link` は `RouterProvider` の内側でしか動かない。Header を Router の外から被せたままだと「`useHref() may be used only in the context of a <Router>`」というエラーで落ちる。親ルートの `Component` にレイアウトを置き、`<Outlet />` に子ルートを流し込むのが Data Router の定石（全ページ共通のヘッダー・フッターは全部この形で作る）。

**`NavLink` vs `Link`**: `NavLink` は `Link` とほぼ同じだが「今いるページのリンクかどうか」を自動で判定できる（`active` のスタイルを当てられる）。ナビゲーションでは `NavLink` を使うのが定石。
</details>

---

### 課題 2-4: 一覧ページに `loader` を追加する

**要件**:
- `src/App.tsx` にコンポーネントの外で `moviesLoader` 関数を作り、export する
- URL の `?query=` パラメータを読んで、キーワードがあれば検索、なければ人気映画を取得する
- `main.tsx` の `/` ルートに `loader: moviesLoader` を紐づける
- `App` コンポーネントから `useState` / `useEffect` によるデータ取得を削除し、`useLoaderData` で受け取る形に変える

**受け入れ条件**:
- `npm run dev` が起動し、映画一覧が表示される
- `App.tsx` の中に `useEffect` によるデータ取得が残っていない
- `useLoaderData` で `movies` と `keyword` が取れている

**使うもの**: `useLoaderData`, `LoaderFunctionArgs`（react-router）, `fetch`, `import.meta.env.VITE_TMDB_API_KEY`

<details><summary>💡 ヒント1（方針）</summary>

loader 関数はコンポーネントの外、ファイルのトップレベルに書く。引数は `{ request }` の形で、`request.url` から URL オブジェクトを作り `searchParams.get("query")` でキーワードを取る。

エラーハンドリングは `if (!res.ok) throw new Response(...)` の形で。
</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router";

type MovieCard = { id: number; original_title: string; poster_path: string };

export async function moviesLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = /* TODO: ?query= を取り出す */;

  const endpoint = keyword
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(keyword)}&include_adult=false&language=ja&page=1`
    : "https://api.themoviedb.org/3/movie/popular?language=ja&page=1";

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}` },
  });
  if (!res.ok) throw new Response("映画の取得に失敗しました", { status: res.status });

  const data = await res.json();
  const movies: MovieCard[] = data.results.map((m: any) => ({
    id: m.id,
    original_title: m.title,
    poster_path: m.poster_path,
  }));
  return { movies, keyword };
}

// App コンポーネント
function App() {
  const { movies, keyword } = useLoaderData() as {
    movies: MovieCard[];
    keyword: string;
  };

  // TODO: useEffect によるデータ取得を削除し、movies をそのまま .map で描画
}
```
</details>

<details><summary>✅ 解答例</summary>

**src/App.tsx の loader 部分:**

```tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router";

type MovieCard = { id: number; original_title: string; poster_path: string };

export async function moviesLoader({ request }: LoaderFunctionArgs) {
  // URL の ?query= を読む（検索を URL で表現する）
  const url = new URL(request.url);
  const keyword = url.searchParams.get("query") ?? "";

  const endpoint = keyword
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
        keyword
      )}&include_adult=false&language=ja&page=1`
    : "https://api.themoviedb.org/3/movie/popular?language=ja&page=1";

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}` },
  });
  if (!res.ok) throw new Response("映画の取得に失敗しました", { status: res.status });

  const data = await res.json();
  const movies: MovieCard[] = data.results.map((m: any) => ({
    id: m.id,
    original_title: m.title,
    poster_path: m.poster_path,
  }));
  return { movies, keyword };
}
```

**src/App.tsx のコンポーネント部分:**

```tsx
function App() {
  const { movies, keyword } = useLoaderData() as {
    movies: MovieCard[];
    keyword: string;
  };

  // movies をそのまま .map で描画（fetch も useEffect もコンポーネントから消える）
}
```

**main.tsx（課題 2-3 で作った children の中を変更）:**

```tsx
import App, { moviesLoader } from "./App.tsx";

const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: App, loader: moviesLoader }, // loader を紐づける
      // ...
    ],
  },
]);
```
</details>

---

### 課題 2-5: 検索を URL（`?query=`）に乗せる

**要件**:
- `App.tsx` の検索 input を、`useSearchParams` で URL に書き込む形にする
- タイピング中は `localKeyword` というローカル state で入力値を保持する
- 入力が止まってから 300ms 後に URL の `?query=` を更新するデバウンスを実装する
- `setSearchParams` には `{ replace: true }` オプションを渡す
- URL から `?query=` が変わったとき（リロード・「戻る」ボタンなど）に、入力欄を同期させる

**受け入れ条件**:
- 「アバター」と入力すると URL が `/?query=アバター` になり、検索結果が表示される
- ページをリロードしても、URL の検索クエリに対応した検索結果が表示される（リロードで再現できる）
- 「戻る」ボタンで検索前の状態に戻れる（余分な履歴が溜まっていない）
- ブラウザの開発者ツール → Network で、1文字ごとにリクエストが飛ばないことを確認できる

**使うもの**: `useSearchParams`, `useState`, `useEffect`（react-router および react）

<details><summary>💡 ヒント1（方針）</summary>

`replace: true` を指定する実務的な理由: デフォルト（`push`）のままだと、デバウンスが走るたびにブラウザ履歴に「`/?query=a`」「`/?query=ab`」「`/?query=abc`」と別ページとして記録されてしまう。`replace` を使えば現在の履歴エントリーを上書きするため、「戻る」ボタンが快適に使える。

ローカル state が必要な理由: `useSearchParams` は「URL の状態」を読み書きするものなので、1文字ごとに URL を書き換えると 300ms デバウンスの前にも URL が変わってしまう。入力欄の一時的な状態は `localKeyword` でローカルに持ち、デバウンス後に URL に反映するのが正しい分離。
</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

// App コンポーネント内
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get("query") ?? "";

// 1. 入力欄の一時的な状態
const [localKeyword, setLocalKeyword] = useState(query);

// 2. URL から検索クエリが変わったら、入力欄に同期させる
useEffect(() => {
  setLocalKeyword(query);
}, [/* TODO: 依存配列 */]);

// 3. デバウンス: 入力が止まってから 300ms 後に URL を更新
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchParams(
      localKeyword ? { query: localKeyword } : {},
      { replace: /* TODO */ }
    );
  }, 300);

  return () => clearTimeout(/* TODO: クリーンアップ */);
}, [localKeyword, setSearchParams]);

// input の value と onChange
<input
  className="app-search"
  placeholder="映画タイトルで検索..."
  value={localKeyword}
  onChange={(e) => setLocalKeyword(e.target.value)}
/>
```
</details>

<details><summary>✅ 解答例</summary>

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

// App コンポーネント内
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get("query") ?? "";

// 1. 入力欄の一時的な状態
const [localKeyword, setLocalKeyword] = useState(query);

// 2. URL（外部）から検索クエリが変わったら、入力欄に同期させる（リロードや「戻る」対策）
useEffect(() => {
  setLocalKeyword(query);
}, [query]);

// 3. 入力値が変わってから300ms後に URL を更新する（デバウンス）
useEffect(() => {
  const timer = setTimeout(() => {
    // replace: true を指定して、入力途中の不要な履歴がブラウザの戻る/進む履歴に溜まるのを防ぐ
    setSearchParams(
      localKeyword ? { query: localKeyword } : {},
      { replace: true }
    );
  }, 300);

  return () => clearTimeout(timer); // 次の入力があればタイマーをクリア（クリーンアップ）
}, [localKeyword, setSearchParams]);
```

```tsx
<input
  className="app-search"
  placeholder="映画タイトルで検索..."
  value={localKeyword}
  onChange={(e) => setLocalKeyword(e.target.value)}
/>
```

**`replace: true` の重要性**: デフォルト（`push`）のままだと「a」「ab」「abc」とデバウンスが走るたびに別ページとして履歴に記録される。`replace` を使うことで現在の履歴エントリーを上書きし、「戻る」ボタンが快適に動く。
</details>

---

### 課題 2-6: `request.signal` で自動キャンセルを有効にする

**要件**:
- 課題 2-4 で作った `moviesLoader` の `fetch` 呼び出しに `signal: request.signal` を追加する

**受け入れ条件**:
- ブラウザの開発者ツール → Network で、素早く文字を入力したとき古いリクエストが「Canceled」になる

**使うもの**: `request.signal`（LoaderFunctionArgs の request に含まれる）

<details><summary>💡 ヒント1（方針）</summary>

React Router は新しい遷移（URL 変更）が発生すると、前の loader の `request.signal.aborted` を `true` にする。これを `fetch` の `signal` オプションに渡すと、ブラウザが古い HTTP リクエストを自動キャンセルしてくれる。コードの変更は `fetch(endpoint, { signal: request.signal, headers: ... })` の1行だけ。
</details>

<details><summary>✅ 解答例</summary>

```tsx
export async function moviesLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("query") ?? "";

  const endpoint = keyword
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
        keyword
      )}&include_adult=false&language=ja&page=1`
    : "https://api.themoviedb.org/3/movie/popular?language=ja&page=1";

  const res = await fetch(endpoint, {
    signal: request.signal, // ★ これを渡すだけで自動キャンセルが有効になる
    headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}` },
  });
  if (!res.ok) throw new Response("映画の取得に失敗しました", { status: res.status });

  const data = await res.json();
  const movies: MovieCard[] = data.results.map((m: any) => ({
    id: m.id,
    original_title: m.title,
    poster_path: m.poster_path,
  }));
  return { movies, keyword };
}
```

**なぜこれだけで動くか**: React Router は新しい loader が走ると前の `request.signal` を abort 状態にする。`fetch` に `signal` を渡しておくと、ブラウザが自動的に古い HTTP 通信を打ち切る。`useEffect` で手書きしていた `ignore` フラグやクリーンアップ関数が一切不要になる。
</details>

---

### 課題 2-7: エラー画面（`errorElement`）を作る

**要件**:
- `src/ErrorPage.tsx` を新規作成する
- `useRouteError` でエラー情報を取得し、エラーメッセージを表示する
- `main.tsx` の `/` ルートに `errorElement: <ErrorPage />` を追加する

**受け入れ条件**:
- `.env` の `VITE_TMDB_API_KEY` を一時的に壊すと、エラーページが表示される（確認後必ず戻すこと）
- エラーページに「エラーが発生しました」と何らかのメッセージが表示される

**使うもの**: `useRouteError`（react-router）

<details><summary>💡 ヒント1（方針）</summary>

loader の中で `throw new Response(...)` したエラーは、ルートに設定した `errorElement` が受け止める。各画面で `try/catch` を書かなくても、Router が一括でエラー表示に切り替えてくれる。これも Data Router の利点。
</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/ErrorPage.tsx
import { useRouteError } from "react-router";

function ErrorPage() {
  const error = useRouteError();
  return (
    <div style={{ padding: 24 }}>
      <h2>エラーが発生しました</h2>
      <p>{error instanceof Response ? error.statusText || "読み込み失敗" : "不明なエラー"}</p>
    </div>
  );
}

export default ErrorPage;
```

```tsx
// main.tsx
import ErrorPage from "./ErrorPage.tsx";

const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: App, loader: moviesLoader, errorElement: <ErrorPage /> },
      // ...
    ],
  },
]);
```
</details>

---

## 完了チェック

- [ ] `/favorites` ページが増え、ヘッダーの件数バッジが登録/解除と即連動する
- [ ] 一覧（と余裕があれば詳細）のデータ取得を loader に移せた
- [ ] 検索が URL（`?query=`）に乗っていて、リロードしても検索結果が再現される
- [ ] 連続で文字を入力したときの検索競合（Race Condition）を防ぐ loader の自動キャンセル仕組み（AbortSignal）を理解した
- [ ] デバウンスを実装し、`replace: true` を使う実務的な理由を説明できる
- [ ] loader 版と useEffect 版、それぞれの流れと利点を説明できる
- [ ] `errorElement` が何を受け止めるか説明できる
- [ ] `Link` と `NavLink` の違いを説明できる

次は、ここまでで散らかった `fetch` やコンポーネントを「チームに馴染む構成」に整える [第3章](./03_architecture.md) へ。
