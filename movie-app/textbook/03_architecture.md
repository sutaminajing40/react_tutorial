# 第3章 構成・REST クライアント・型を整える

## この章でやること

第1〜2章で書いたコードは「動く」が、`fetch` や型定義があちこちに散らばっている。この章では動きを変えずに**構造だけを整える（リファクタリング）**。

- コンポーネントから生の `fetch` を追い出し、通信を `src/api/` に集約する
- バラバラな `Movie` 型を `src/types/movie.ts` に一本化する
- 重複している映画カードの JSX を `MovieCard` コンポーネントに切り出す
- 「新しい画面を足すとき、どこに何を置くか」が即答できる構成にする

> これは**振る舞いを変えないリファクタリング**の章です。手を加えた後も `npm run dev` でアプリが同じように動くことが「完了」の証拠になります。

---

## 1. 関心の分離とは

チュートリアルのコードは「ファイルが少なく、1ファイルに何でも書く」状態になりがちです。実務では人もファイルも増えるので、**どこに何があるか迷わない構成**にしておく必要があります。

「**関心の分離（Separation of Concerns）**」とは、「それぞれのファイルが1つの役割だけを持つ」という原則です。

たとえば今の `App.tsx` には:

- 映画を取得する通信処理（URL・ヘッダー・エラー処理）
- 検索キーワードを管理するロジック
- 画面の JSX

が全部混ざっています。変更が1か所に集中しないため、直すたびに関係ないコードを読み飛ばす必要が出てきます。

**「API の生の形（スネークケース）」と「アプリ内の型（キャメルケース）」を分ける**のも同じ発想です。TMDB は `poster_path` のようにスネークケースで返しますが、アプリ内では `posterPath` というキャメルケースで扱いたい。この変換を一か所（API 層）に閉じ込めると、画面側のコードは常に`posterPath`だけを知っていればよくなります。

---

## 2. 最小例で使い方を見る

> これは**読んで理解すれば OK**です。手元で動かさなくてよいです。

たとえば、ユーザー情報を取得する簡単な REST クライアントを作るとします。

**before（散らばった状態）**

```ts
// UserList.tsx の中
const res = await fetch("https://api.example.com/users", {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_API_KEY}` },
});
const data = await res.json();

// UserDetail.tsx の中でも同じヘッダーをコピペ
const res2 = await fetch(`https://api.example.com/users/${id}`, {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_API_KEY}` },
});
```

**after（API 層に集約した状態）**

```ts
// src/api/example.ts
const BASE = "https://api.example.com";
const KEY = import.meta.env.VITE_API_KEY;

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Response("API error", { status: res.status });
  return res.json() as Promise<T>;
}

export const api = {
  listUsers: () => request<UserListResponse>("/users"),
  getUser: (id: string) => request<UserResponse>(`/users/${id}`),
};
```

```ts
// UserList.tsx — URL やヘッダーを知らなくてよい
const data = await api.listUsers();
```

変更点は1か所（`src/api/example.ts`）だけで済むようになりました。

---

## 3. やってみよう（課題）

### 課題 3-1: `src/api/tmdb.ts` を作る

**要件**:

- `src/api/tmdb.ts` を新規作成する
- `BASE`（TMDB の API ルート URL）と `API_KEY`（環境変数）を定数として定義する
- 共通リクエスト関数 `request<T>(path: string): Promise<T>` を作り、ヘッダー付加とエラー処理をここだけに閉じ込める
- `tmdb` オブジェクトとして `popular()`・`search(q: string)`・`detail(id: string)` の3関数を export する（型は後の課題で付けるので、まずは動けば OK）

**受け入れ条件**:

- 「`fetch` を直接書かずに `await tmdb.popular()` と書けば人気映画の JSON が返ってくる」状態になっている
- `App.tsx` や `MovieDetail.tsx` の中に `https://api.themoviedb.org` という文字列が残っていない

**使うもの**: `fetch`, `import.meta.env.VITE_TMDB_API_KEY`, ジェネリクス(`<T>`)

<details><summary>💡 ヒント1（方針）</summary>

まず `request<T>` 関数を1つ作ってしまいましょう。`popular()` は `request<any>("/movie/popular?language=ja&page=1")` を呼ぶだけ、`search(q)` は URL を組み立てて `request<any>(...)` を呼ぶだけ、という構成が最初の目標です。型は課題 3-2 で整えます。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
// src/api/tmdb.ts
const BASE = "TODO: TMDB の API ルート URL";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    // TODO: Authorization ヘッダーを付ける
  });
  if (!res.ok) {
    // TODO: エラーを throw する（第2章の loader と同じ形）
  }
  return res.json() as Promise<T>;
}

export const tmdb = {
  popular: () => request<any>(/* TODO */),
  search: (q: string) => request<any>(/* TODO */),
  detail: (id: string) => request<any>(/* TODO */),
};
```

</details>

<details><summary>✅ 解答例</summary>

```ts
// src/api/tmdb.ts
const BASE = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    throw new Response("TMDB request failed", { status: res.status });
  }
  return res.json() as Promise<T>;
}

export const tmdb = {
  popular: () => request<TmdbListResponse>("/movie/popular?language=ja&page=1"),
  search: (q: string) =>
    request<TmdbListResponse>(
      `/search/movie?query=${encodeURIComponent(q)}&include_adult=false&language=ja&page=1`
    ),
  detail: (id: string) => request<TmdbDetailResponse>(`/movie/${id}?language=ja`),
};
```

**なぜこう書くか**: `request<T>` に `T` というジェネリクス型引数を付けることで、呼び出し側が「この呼び出しで帰ってくる型はこれ」と宣言できます。型引数を `any` から具体型に変えるのが次の課題です。

</details>

---

### 課題 3-2: `src/types/movie.ts` を作る

**要件**:

- `src/types/movie.ts` を新規作成する
- アプリ内で使う `Movie` 型（`id: number`、`title: string`、`posterPath: string`、`overview: string`）を定義して export する
- TMDB の生のレスポンス型 `TmdbListResponse`（results の配列）と `TmdbDetailResponse` を定義して export する
- `App.tsx`（一覧）の独自 `Movie` 型を削除し、`types/movie.ts` から import するように変更する
- `MovieDetail.tsx` の生レスポンス型（`MovieDetailJson`）を `TmdbDetailResponse` に置き換える。画面表示用のローカル型（year・runtime・genres などを持つ）は `MovieDetailView` などにリネームして残してよい

**受け入れ条件**:

- `Movie` 型が1か所にしか定義されていない（`grep -r "type Movie =" src/` で1件だけヒット）
- 今まで `App.tsx` では `id: number`、`MovieDetail.tsx` では `id: string` とバラついていた映画の `id` が、`number` に統一されている（第1章で必要だった `Number(movie.id)` 変換が消せる）

**使うもの**: `export type`, `string | null`（`poster_path` は null になりうる）

<details><summary>💡 ヒント1（方針）</summary>

まず「API が返す形」と「アプリ内で使う形」が別物だという意識を持ちましょう。TMDB の `poster_path` はスネークケースで `string | null` ですが、アプリ内の `posterPath` はキャメルケースで `string` として扱いたい。型定義を2種類（`Tmdb*` と `Movie`）に分けるのがポイントです。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
// src/types/movie.ts

// アプリ内で使う形（画面で必要な分だけ）
export type Movie = {
  id: number;
  title: string;
  posterPath: string; // TODO: 型を書く
  overview: string;
};

// TMDB API が返す生の形（一覧）
export type TmdbListResponse = {
  results: {
    id: number;
    title: string;
    poster_path: /* TODO: null になりうる */ ;
    overview: string;
  }[];
};

// TMDB API が返す生の形（詳細）
export type TmdbDetailResponse = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
};
```

</details>

<details><summary>✅ 解答例</summary>

```ts
// src/types/movie.ts

// アプリ内で使う「映画」の形（画面で必要な分だけ）
export type Movie = {
  id: number;
  title: string;
  posterPath: string;
  overview: string;
};

// TMDB API が返す生の形（一覧）
export type TmdbListResponse = {
  results: {
    id: number;
    title: string;
    poster_path: string | null;
    overview: string;
  }[];
};

// TMDB API が返す生の形（詳細）
export type TmdbDetailResponse = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
};
```

**なぜこう書くか**: `poster_path` を `string | null` にしておくのは TMDB の実際の仕様に合わせるためです。`null` をそのまま `<img src={null}>` に渡すとブラウザがエラーを出すので、マッパー（次の課題）で `?? ""` で潰します。`any` を避ける方法として「API のレスポンス型を定義する」のが Lv2 の基準です。

</details>

---

### 課題 3-3: マッパー関数 `toMovieCard` を `api/tmdb.ts` に追加する

**要件**:

- `src/api/tmdb.ts` に `toMovieCard` 関数を追加し、`TmdbListResponse["results"][number]` を `Movie` に変換する
- `App.tsx` の loader で `data.results.map((m: any) => ...)` と書いていた箇所を `data.results.map(toMovieCard)` に差し替える
- `any` をすべて消す

**受け入れ条件**:

- プロジェクト全体を `grep -r ": any" src/` で検索して、意図的に残した箇所以外に `any` がない
- `npm run dev` で画面が以前と同じように表示される

**使うもの**: `import type { Movie, TmdbListResponse } from "../types/movie"`, `?? ""`（null 合体演算子）

<details><summary>💡 ヒント1（方針）</summary>

`toMovieCard` はスネークケースのオブジェクトを受け取ってキャメルケースのオブジェクトを返す純粋な関数です。「入力の型」は `TmdbListResponse["results"][number]`（配列の要素1つ）、「出力の型」は `Movie` と書けます。`poster_path` が `null` のときは `?? ""` で空文字に変換します。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
// src/api/tmdb.ts の末尾に追加
import type { Movie, TmdbListResponse } from "../types/movie";

export function toMovieCard(m: TmdbListResponse["results"][number]): Movie {
  return {
    id: m.id,
    title: m.title,
    posterPath: /* TODO: null のときは空文字にする */,
    overview: m.overview,
  };
}
```

</details>

<details><summary>✅ 解答例</summary>

```ts
// src/api/tmdb.ts に追加
import type { Movie, TmdbListResponse } from "../types/movie";

export function toMovieCard(m: TmdbListResponse["results"][number]): Movie {
  return {
    id: m.id,
    title: m.title,
    posterPath: m.poster_path ?? "",
    overview: m.overview,
  };
}
```

loader での使い方:

```ts
// src/App.tsx（または features/movies/MovieList.tsx）の loader
import { tmdb, toMovieCard } from "./api/tmdb";

export async function moviesLoader({ request }: LoaderFunctionArgs) {
  const keyword = new URL(request.url).searchParams.get("query") ?? "";
  const data = keyword ? await tmdb.search(keyword) : await tmdb.popular();
  return { movies: data.results.map(toMovieCard), keyword };
}
```

**なぜこう書くか**: 変換（マッパー）を API 層に置くことで、loader（画面の都合）と通信の詳細（URL・ヘッダー・エラー）が分離されます。これが「**関心の分離**」。loader は「いつ何を取るか」だけに集中できます。

</details>

---

### 課題 3-4: `src/components/MovieCard.tsx` を作る

**要件**:

- `src/components/MovieCard.tsx` を新規作成する
- `Props` 型として `{ movie: Movie }` を受け取り、`Link`・画像・タイトルを含む映画カードの JSX を返す
- 課題 1-5 で一覧カードに付けた**お気に入りボタンも `MovieCard` の中に移す**
- `App.tsx` と `Favorites.tsx` のカード部分の JSX をこのコンポーネントに差し替える

**受け入れ条件**:

- `App.tsx` の映画一覧と `Favorites.tsx` のお気に入り一覧、両方で `MovieCard` が使われている
- カードのお気に入りボタン（♡/♥）が以前どおり動く
- `posterPath` が空のときはプレースホルダー画像（`https://via.placeholder.com/300x450?text=No+Image`）を表示する
- 見た目が以前と変わらない

**使うもの**: `Link` from `react-router`, `import type { Movie } from "../types/movie"`, `useFavoritesStore`

<details><summary>💡 ヒント1（方針）</summary>

既存の `App.tsx` や `Favorites.tsx` にある `<Link to={...} className="movie-card">...` のかたまりをそのままコピーして新ファイルに移すのが最速です。`movie` を props で受け取り、JSX 内の各値を `movie.id`・`movie.title`・`movie.posterPath` に差し替えます。

お気に入りボタンについて: 課題 1-5 では「フックは map の中で呼べない」ため `App` のトップレベルで `favorites` を購読していましたが、カードが**独立したコンポーネント**になったので、今度は `MovieCard` 自身のトップレベルでフックを呼べます。`useFavoritesStore((s) => s.isFavorite(movie.id))` とカード単位で購読でき、`App` 側から購読コードを消せます。これもコンポーネント分割のご利益です。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
// src/components/MovieCard.tsx
import { Link } from "react-router";
import type { Movie } from "../types/movie";
import { useFavoritesStore } from "../stores/favorites";

type Props = { movie: Movie };

function MovieCard({ movie }: Props) {
  // コンポーネントになったので、カード単位でフックを呼べる
  const isFav = useFavoritesStore((s) => /* TODO: このカードの映画がお気に入りか */);
  const toggle = useFavoritesStore((s) => s.toggle);

  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <div className="movie-card__imgwrap">
        <img
          src={
            movie.posterPath
              ? `https://image.tmdb.org/t/p/w300_and_h450_bestv2${movie.posterPath}`
              : /* TODO: プレースホルダー URL */
          }
          alt={movie.title}
          className="movie-card__image"
        />
        <button
          aria-label={/* TODO: isFav に応じて「お気に入りから削除」/「お気に入りに追加」 */}
          onClick={(e) => {
            e.preventDefault(); // Link の遷移をキャンセル
            // TODO: toggle を呼ぶ
          }}
        >
          {isFav ? "♥" : "♡"}
        </button>
        <div className="movie-card__overlay">
          {/* TODO: タイトルを表示する */}
        </div>
      </div>
    </Link>
  );
}

export default MovieCard;
```

</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/components/MovieCard.tsx
import { Link } from "react-router";
import type { Movie } from "../types/movie";
import { useFavoritesStore } from "../stores/favorites";

type Props = { movie: Movie };

function MovieCard({ movie }: Props) {
  // カードがコンポーネントになったので、カード単位でフックを呼べる
  const isFav = useFavoritesStore((s) => s.isFavorite(movie.id));
  const toggle = useFavoritesStore((s) => s.toggle);

  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <div className="movie-card__imgwrap">
        <img
          src={
            movie.posterPath
              ? `https://image.tmdb.org/t/p/w300_and_h450_bestv2${movie.posterPath}`
              : "https://via.placeholder.com/300x450?text=No+Image"
          }
          alt={movie.title}
          className="movie-card__image"
        />
        <button
          aria-label={isFav ? "お気に入りから削除" : "お気に入りに追加"}
          onClick={(e) => {
            e.preventDefault(); // Link の遷移をキャンセル
            toggle({
              id: movie.id,
              title: movie.title,
              posterPath: movie.posterPath,
            });
          }}
        >
          {isFav ? "♥" : "♡"}
        </button>
        <div className="movie-card__overlay">
          <h3 className="movie-card__title">{movie.title}</h3>
        </div>
      </div>
    </Link>
  );
}

export default MovieCard;
```

使い方（一覧側）:

```tsx
{movies.map((m) => <MovieCard key={m.id} movie={m} />)}
```

`App` のトップレベルにあった `favorites` / `toggle` の購読（課題 1-5）は、`MovieCard` の中に移ったので削除できます。

**なぜこう書くか**: 同じ見た目を2か所で書かなくて済むのが「**コンポーネントの再利用**」のメリットです。デザインを直すときも1か所変えれば全画面に反映されます。課題 1-5 では「フックは map の中で呼べない」せいで `App` のトップレベルで購読していましたが、カードをコンポーネントに切り出したことで、お気に入りの購読もカード自身に閉じ込められました。型が `Movie`（`id: number`）に統一されたので、`Number(...)` 変換も不要になっています。

</details>

---

### 課題 3-5: `App.tsx` を `features/movies/MovieList.tsx` に移動する

**要件**:

- `src/features/movies/` ディレクトリを作成する
- `App.tsx`（または相当するコンポーネント）を `src/features/movies/MovieList.tsx` にリネーム＆移動する
- `main.tsx` の import パスを修正して、`npm run dev` でアプリが以前と同じように動くことを確認する

**受け入れ条件**:

- `npm run dev` でエラーが出ない
- URL `/` にアクセスすると映画一覧が表示される
- 「**振る舞いを変えない**リファクタリング」になっている（機能追加なし）

**使うもの**: ファイル移動（`mv`コマンドまたは IDE の Refactor）、import パスの修正

<details><summary>💡 ヒント1（方針）</summary>

ファイルを移動するとすべての import パスが壊れます。まずターミナルで `grep -r "from.*App" src/` を実行して、どこが `App` を import しているかを確認してから移動しましょう。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```bash
mkdir -p src/features/movies
mv src/App.tsx src/features/movies/MovieList.tsx
```

`main.tsx` の修正例:

```tsx
// before
import App, { moviesLoader } from "./App.tsx";

// after
import MovieList, { moviesLoader } from "./features/movies/MovieList.tsx";

// ルート定義も合わせて変更
{ path: "/", Component: MovieList, loader: moviesLoader, ... }
```

</details>

<details><summary>✅ 解答例</summary>

```
src/
  api/         … 通信（tmdb.ts）
  types/       … 型（movie.ts）
  stores/      … Zustand ストア（favorites.ts）
  components/  … 複数機能で使い回す部品（MovieCard.tsx, Header.tsx）
  features/
    movies/    … 一覧・詳細（MovieList.tsx, MovieDetail.tsx）
    favorites/ … お気に入り（Favorites.tsx）
  main.tsx
```

`main.tsx` での読み込み:

```tsx
import MovieList, { moviesLoader } from "./features/movies/MovieList.tsx";

const router = createBrowserRouter([
  { path: "/", Component: MovieList, loader: moviesLoader, errorElement: <ErrorPage /> },
  { path: "/movies/:id", Component: MovieDetail },
  { path: "/favorites", Component: Favorites },
]);
```

**なぜこう書くか**: 「新しい画面を足すとき、どこに何を置くか即答できる」のが良い構成の条件です。`features/movies/` には映画に関するファイルを、`features/favorites/` にはお気に入りに関するファイルを置く、と決めておくと迷いません。厳密な正解は無く、大事なのは**チームでルールを決めて守ること**です。

</details>

---

## 完了チェック

- [ ] コンポーネントの中に生の `fetch(...)` が残っていない（すべて `api/` 経由）
- [ ] `Movie` 型を2か所で別定義していない
- [ ] `any` を使っていない（`grep -r ": any" src/` がクリーン）
- [ ] 映画カードが `MovieCard` コンポーネントに部品化され、一覧・お気に入りで使い回されている
- [ ] 「新しい画面を足すならどこに何を置くか」を即答できる
- [ ] `npm run dev` でアプリが以前と同じように動く

次は、ここまで整えたコードが「壊れていないことを自動で確認する」[第4章](./04_testing.md) へ。
