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

## 2-5. デバウンスと検索競合対策（loader 移行による恩恵）

### 検索の「競合（Race Condition）」問題と useEffect での戦い

前節のように `setSearchParams` を `onChange` に直結させると、ユーザーが「アバター」とタイピングする間に `ア` -> `アバ` -> `アバタ` -> `アバター` と4回連続で URL が更新され、それぞれ loader が走って fetch が走ります。

ここで問題になるのが**検索の競合（Race Condition）**です。
ネットワークの遅延などにより、3番目のリクエスト（`アバタ`）のレスポンスが、4番目のリクエスト（`アバター`）のレスポンスよりも**遅れて**返ってきたとします。すると、画面は一瞬「アバター」の結果を表示したあと、遅れて届いた「アバタ」の結果で上書きされてしまいます。

これまで `useEffect` でデータ取得を行っていたときは、この競合を防ぐために「クリーンアップ関数」でフラグ管理をするか、手動で `AbortController` を制御しなければなりませんでした。

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

これを画面ごとに手動で漏れなく書くのは、非常に面倒でバグの原因になりがちでした。

### loader が古いリクエストを自動キャンセルする

Data Router（loader）に移行すると、この問題が劇的にシンプルになります。

React Router は、新しい遷移（URL の変更など）が発生して loader が再実行されると、**現在実行中の古い loader の処理を自動的に無視（破棄）**してくれます。

さらに、ブラウザの `fetch` 通信自体もキャンセルできます。`moviesLoader` の引数である `request` には `signal`（AbortSignal）が含まれています。これを `fetch` のオプションにそのまま渡します。

`src/App.tsx` の loader を以下のように修正してください：

```diff
 export async function moviesLoader({ request }: LoaderFunctionArgs) {
   const url = new URL(request.url);
   const keyword = url.searchParams.get("query") ?? "";
 
   const endpoint = keyword
     ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
         keyword
       )}&include_adult=false&language=ja&page=1`
     : "https://api.themoviedb.org/3/movie/popular?language=ja&page=1";
 
   const res = await fetch(endpoint, {
+    signal: request.signal, // ★ これを渡すだけで、自動キャンセルがブラウザ層で有効になる！
     headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}` },
   });
   if (!res.ok) throw new Response("映画の取得に失敗しました", { status: res.status });
```

これだけで、ユーザーが連続でタイピングして URL が切り替わったとき、React Router は前のリクエストの `request.signal.aborted` を `true` にし、ブラウザは不要になった古い HTTP リクエストを途中で**自動キャンセル**します。
開発者が `useEffect` のクリーンアップ関数で手動で競合対策（フラグ管理など）を書く必要は一切ありません。これが loader 移行による大きな恩恵の一つ（観点1の cleanup/競合 の自動解決）です。

### デバウンス（Debounce）で不要なリクエスト自体を減らす

自動キャンセルされるとはいえ、1文字打つたびに API リクエストを送信するのはサーバーや通信回線に優しくありません。
そこで、タイピングの手が止まってから一定時間（例: 300ms）待って URL を更新する「**デバウンス（Debounce）**」を挟みます。

React Router 環境でデバウンスを行うには、検索入力の文字を一時的にローカル `useState` で保持し、タイマーで `setSearchParams` を呼ぶアプローチが綺麗です。

`src/App.tsx` の検索 input 周りを以下のように書き換えます：

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

HTML の `<input>` は `localKeyword` と連動させます：
```tsx
<input
  className="app-search"
  placeholder="映画タイトルで検索..."
  value={localKeyword}
  onChange={(e) => setLocalKeyword(e.target.value)}
/>
```

#### ここでの `replace: true` の重要性

`setSearchParams(..., { replace: true })` を設定するのが実務の重要なコツです。デフォルト（`push`）のままだと、例えば「a」「ab」「abc」とデバウンスが走るたびにブラウザ履歴（History Stack）に別ページとして記録されてしまいます。すると、ユーザーが「戻る」ボタンを押したときに、検索前の画面に戻るまで何度も戻るボタンを連打しなければならなくなります。`replace` を使うことで、現在の履歴エントリーを上書きするため、スマートな操作感が得られます。

これで、
1. デバウンスによって無駄な API リクエストの発生自体を抑える
2. それでも発生する遅延や画面遷移による古いリクエストの処理は、loader の `request.signal` が自動キャンセルする

という、モダンで堅牢な検索 UI が完成します！

## 2-6. エラー画面（errorElement）

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

## 2-7. 章末の課題

1. 詳細ページ（`MovieDetail`）の取得も `useEffect` から loader に移してみる。`useParams` の代わりに loader の引数 `{ params }` で `params.id` が取れる。
2. わざと API キー（`.env` の `VITE_TMDB_API_KEY`）を壊して、`errorElement` がちゃんと出ることを確認する。
3. `Link` と `NavLink` の違いを、実際に active のスタイルを当てて確かめる。

## 2-8. 完了チェック（Lv2 基準）

- [ ] `/favorites` ページが増え、ヘッダーの件数バッジが登録/解除と即連動する
- [ ] 一覧（と余裕があれば詳細）のデータ取得を loader に移せた
- [ ] 検索が URL（`?query=`）に乗っていて、リロードしても検索結果が再現される
- [ ] 連続で文字を入力したときの検索競合（Race Condition）を防ぐ loader の自動キャンセル仕組み（AbortSignal）を理解した
- [ ] デバウンスを実装し、replace: true を使う実務的な理由を説明できる
- [ ] loader 版と useEffect 版、それぞれの流れと利点を説明できる
- [ ] `errorElement` が何を受け止めるか説明できる

次は、ここまでで散らかった `fetch` やコンポーネントを「チームに馴染む構成」に整える [第3章](./03_architecture.md) へ。
