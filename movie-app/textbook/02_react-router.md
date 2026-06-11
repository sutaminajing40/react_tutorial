# 第2章 React Router — Data Router と loader

## 2-1. 今できていること・足りないこと

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

この章でその両方をやる。

## 2-2. お気に入り一覧ページを足す

### 手順1: ページコンポーネントを作る

`src/Favorites.tsx` を新規作成。第1章のストアを読んで並べるだけ。

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

このページは**サーバー通信が要らない**点に注目。お気に入りは Zustand（＝クライアント側の状態）が全部持っているので、ストアを読むだけで描ける。

### 手順2: ルートに登録する

`main.tsx`:

```tsx
import Favorites from "./Favorites.tsx";

const router = createBrowserRouter([
  { path: "/", Component: App },
  { path: "/movies/:id", Component: MovieDetail },
  { path: "/favorites", Component: Favorites }, // 追加
]);
```

### 手順3: ヘッダーにナビと件数バッジを置く

`src/Header.tsx` を、リンクと件数バッジ付きに。

```tsx
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

`NavLink` は `Link` とほぼ同じだが「今いるページのリンクかどうか」を自動で判定できる（`active` のスタイルを当てられる）。ナビゲーションでは `NavLink` を使うのが定石。

> 動作確認: 詳細でお気に入り登録 → ヘッダーの `My List (件数)` が増える → クリックで一覧へ → そこにさっきの映画がいる。Zustand が全画面で共有されているのが体感できる。

## 2-3. loader — データ取得を Router 側でやる

### なぜ `useEffect` のままではダメなのか

今の一覧取得はこうなっている（`App.tsx`）:

```tsx
useEffect(() => {
  fetchMovieList();
}, [keyword]);
```

この書き方の流れは「**①まず空っぽの画面を描く → ②描いた後で fetch が走る → ③返ってきたら再描画**」。一瞬カラの状態が見えるし、ローディングやエラーの管理を毎コンポーネントで書く必要がある。

Data Router の **loader** は「**画面を描く前に**必要なデータを取ってくる」係。流れが「①データを取る → ②揃ってから画面を描く」に変わる。チームが Data Router を採用している大きな理由がこれ。

### 手順1: loader 関数を書く

`App.tsx` に、コンポーネントの外で loader を用意する（API 集約は第3章でやるので、ここではいったん直書き）。

```tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router";

type MovieCard = { id: number; original_title: string; poster_path: string };

export async function moviesLoader({ request }: LoaderFunctionArgs) {
  // URL の ?query= を読む（検索を URL で表現する。後述）
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

### 手順2: ルートに loader を紐づける

`main.tsx`:

```tsx
import App, { moviesLoader } from "./App.tsx";

const router = createBrowserRouter([
  { path: "/", Component: App, loader: moviesLoader, errorElement: <ErrorPage /> },
  // ...
]);
```

### 手順3: コンポーネントは `useLoaderData` で受け取るだけ

`App` 本体から `useState` / `useEffect` のデータ取得を消し、loader の結果を読む形に変える。

```tsx
function App() {
  const { movies, keyword } = useLoaderData() as {
    movies: MovieCard[];
    keyword: string;
  };

  // movies をそのまま .map で描画（fetch も useEffect もコンポーネントから消える）
}
```

これで「データが揃ってから描画」になり、`App` から取得ロジックが消えてスッキリする。

## 2-4. 検索を「URL」で表現する（実務の作法）

今の検索は `keyword` という state。でも loader は「URL を見て」データを取る。だから検索も **URL の `?query=`** に持たせるのが Data Router 流。こうすると検索結果が**ブックマーク・履歴・リロードで再現できる**。

`App` の検索 input を、`useSearchParams` でURLに書き込む形にする:

```tsx
import { useSearchParams } from "react-router";

const [searchParams, setSearchParams] = useSearchParams();
const keyword = searchParams.get("query") ?? "";

<input
  className="app-search"
  placeholder="映画タイトルで検索..."
  value={keyword}
  onChange={(e) => setSearchParams(e.target.value ? { query: e.target.value } : {})}
/>;
```

URL が `/?query=君の名は` のように変わり、それを loader が読んで検索結果を取りに行く。

> 発展（`action`）: 「サーバーにデータを書き込む」操作は loader の対になる **action** が担当する。ただし TMDB には「お気に入りを保存する」エンドポイントが無く、お気に入りは Zustand に持たせているので、この映画アプリでは action の出番は無い。本物の Rails バックエンドにフォーム送信する場面で使う、と覚えておけば十分。

## 2-5. エラー画面（errorElement）

loader の中で `throw new Response(...)` したエラーは、ルートに設定した `errorElement` が受け止める。簡単なものを `src/ErrorPage.tsx` に:

```tsx
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

各画面で `try/catch` を書かなくても、Router が一括でエラー表示に切り替えてくれる。これも Data Router の利点。

## 2-6. 章末の課題

1. 詳細ページ（`MovieDetail`）の取得も `useEffect` から loader に移してみる。`useParams` の代わりに loader の引数 `{ params }` で `params.id` が取れる。
2. わざと API キー（`.env` の `VITE_TMDB_API_KEY`）を壊して、`errorElement` がちゃんと出ることを確認する。
3. `Link` と `NavLink` の違いを、実際に active のスタイルを当てて確かめる。

## 2-7. 完了チェック（Lv2 基準）

- [ ] `/favorites` ページが増え、ヘッダーの件数バッジが登録/解除と即連動する
- [ ] 一覧（と余裕があれば詳細）のデータ取得を loader に移せた
- [ ] 検索が URL（`?query=`）に乗っていて、リロードしても検索結果が再現される
- [ ] loader 版と useEffect 版、それぞれの流れと利点を説明できる
- [ ] `errorElement` が何を受け止めるか説明できる

次は、ここまでで散らかった `fetch` やコンポーネントを「チームに馴染む構成」に整える [第3章](./03_architecture.md) へ。
