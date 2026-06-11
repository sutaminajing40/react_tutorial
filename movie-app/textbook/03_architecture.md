# 第3章 構成・REST クライアント・型を整える

チュートリアルのコードは「ファイルが少なく、1ファイルに何でも書く」状態になりがち。実務では人もファイルも増えるので、**どこに何があるか迷わない構成**にしておく。この章は新機能ではなく**整理（リファクタリング）**の章。動きは変えずに、構造だけ良くする。

## 3-1. REST クライアントを1か所に集約する

### 何が問題か

今は `App.tsx` にも `MovieDetail.tsx` にも、こういう `fetch` が直接書かれている:

```tsx
const res = await fetch(`https://api.themoviedb.org/3/...`, {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}` },
});
```

同じ URL のベースやヘッダーが**あちこちにコピペ**されている。API のキーの渡し方を変えたくなったら、全部直して回ることになる。これが「コンポーネントの中に通信が混ざっている」状態。

チームのスタックに「**fetch ベースの独自 REST クライアント**」とあったのは、まさにこれを1か所に集約したものを指す。作ってみよう。

### 手順: `src/api/tmdb.ts`

```ts
const BASE = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// 共通の通信処理。ここだけがヘッダーやエラーの面倒を見る
async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    throw new Response("TMDB request failed", { status: res.status });
  }
  return res.json() as Promise<T>;
}

// 画面側はこの関数たちを呼ぶだけ。URL の組み立ては知らなくていい
export const tmdb = {
  popular: () => request<TmdbListResponse>("/movie/popular?language=ja&page=1"),
  search: (q: string) =>
    request<TmdbListResponse>(
      `/search/movie?query=${encodeURIComponent(q)}&include_adult=false&language=ja&page=1`
    ),
  detail: (id: string) => request<TmdbDetailResponse>(`/movie/${id}?language=ja`),
};
```

すると第2章の loader はこう短くなる:

```ts
export async function moviesLoader({ request }: LoaderFunctionArgs) {
  const keyword = new URL(request.url).searchParams.get("query") ?? "";
  const data = keyword ? await tmdb.search(keyword) : await tmdb.popular();
  return { movies: data.results.map(toMovieCard), keyword };
}
```

loader（＝画面の都合）と、通信の詳細（＝URL・ヘッダー・エラー）が分離された。これが「**関心の分離**」。

## 3-2. 型を1か所に統一する

### 何が問題か

今 `Movie` 型が **2つの場所でバラバラに**定義されている:

- `App.tsx`: `id: number`
- `MovieDetail.tsx`: `id: string`

同じ「映画」を表す型が食い違うと、第1章で `Number(movie.id)` のような変換が必要になったり、バグの温床になる。型は**1か所に集約**する。

### 手順: `src/types/movie.ts`

```ts
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

**ポイント: 「API の形」と「アプリの形」を分ける**

`Tmdb*Response` は「サーバーが返す形（`poster_path` などスネークケース）」、`Movie` は「アプリ内で扱いやすい形（`posterPath` などキャメルケース）」。この2つを変換する関数（マッパー）を api 層に置くと、画面はずっと `Movie` だけを相手にできる。

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

第1章の `FavoriteMovie` 型も、この `Movie` をベースに揃えると一貫する。

> `any` を避ける: 第2章の loader で `data.results.map((m: any) => ...)` と書いた `any` は「型チェックを諦める」という意味。業務では嫌われる。上のように API レスポンスの型を定義して `any` を消すのが Lv2。

## 3-3. 繰り返す UI をコンポーネントに切り出す

`App.tsx` と `Favorites.tsx` で、映画カードの JSX（`movie-card` のかたまり）がほぼ同じものになっているはず。これを1つの部品にする。

### 手順: `src/components/MovieCard.tsx`

```tsx
import { Link } from "react-router";
import type { Movie } from "../types/movie";

type Props = { movie: Movie };

function MovieCard({ movie }: Props) {
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
        <div className="movie-card__overlay">
          <h3 className="movie-card__title">{movie.title}</h3>
        </div>
      </div>
    </Link>
  );
}

export default MovieCard;
```

すると一覧側は `{movies.map((m) => <MovieCard key={m.id} movie={m} />)}` だけになる。同じ見た目を2回書かなくて済み、直すときも1か所。これが「**コンポーネントの再利用**」と「**Props でデータを渡す**」の実践。

## 3-4. ディレクトリ構成

ファイルが増えてきたら、役割ごとにフォルダを分ける。小〜中規模で分かりやすいのは「**機能（feature）ごと**」＋「**横断的なもの**」の組み合わせ:

```
src/
  api/         … 通信（tmdb.ts）
  types/       … 型（movie.ts）
  stores/      … Zustand ストア（favorites.ts）
  components/  … 複数機能で使い回す部品（MovieCard.tsx, Header.tsx）
  features/
    movies/    … 一覧・詳細（App→MovieList.tsx, MovieDetail.tsx, loader）
    favorites/ … お気に入り（Favorites.tsx）
  main.tsx
```

> 厳密な正解は無く、チームごとにルールがある。大事なのは「**新しい画面を足すとき、どこに何を置くか即答できる**」こと。実際に入社したら、まずチームの既存リポジトリの構成に合わせる（郷に入っては郷に従え）。今は上の形で“分ける感覚”を体験すれば十分。

## 3-5. 章末の課題

1. `App.tsx` を `features/movies/MovieList.tsx` にリネーム＆移動し、import を直す。動きが変わらないことを確認する（リファクタの基本＝振る舞いを変えない）。
2. `MovieDetail` の取得も `tmdb.detail(id)` 経由に変え、生の `fetch` をコンポーネントから完全に追い出す。
3. プロジェクト全体を検索して `any` が残っていないかチェックし、型を付けて消す。

## 3-6. 完了チェック（Lv2 基準）

- [ ] コンポーネントの中に生の `fetch(...)` が残っていない（全部 `api/` 経由）
- [ ] `Movie` 型を2か所で別定義していない
- [ ] `any` を使っていない
- [ ] 映画カードが部品化され、一覧・お気に入りで使い回されている
- [ ] 「新しい画面を足すならどこに何を置くか」を即答できる

ここまでで機能と構造が整った。最後に「壊れていないことを保証する」[第4章](./04_testing.md) へ。
