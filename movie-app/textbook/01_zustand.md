# 第1章 Zustand — グローバル状態でお気に入りを持つ

## 1-1. なぜ `useState` ではダメなのか

いま君は `useState` を使えている。たとえば検索キーワードはこう持っている:

```tsx
const [keyword, setKeyword] = useState("");
```

`useState` の状態は「**そのコンポーネントの中だけ**」のもの。`App` の中で作った state は、`MovieDetail` や `Header` からは見えない。

ところが「お気に入り」はこういうデータだ:

- **詳細画面**（MovieDetail）で登録・解除したい
- **お気に入り一覧画面**（これから作る）で全部表示したい
- **ヘッダー**（Header）で件数バッジを出したい

つまり **複数の離れたコンポーネントが同じデータを読み書きする**。これを `useState` でやろうとすると、共通の親（App のさらに上）に state を置いて、子へ子へと props で延々と渡す「**バケツリレー（prop drilling）**」になる。画面が増えるほど地獄になる。

この「アプリ全体で共有したい状態」を、コンポーネントの外の**1か所の保管庫**に置くのが**グローバル状態管理**で、チームが使っているのが **Zustand**。

> React 標準の `Context` でも共有はできるが、書く量が多く、更新のたび広く再レンダリングが起きやすい。Zustand は「必要な部分だけ購読」が簡単で記述も短いため、チームで採用されている。

## 1-2. Zustand の考え方（どう動くか）

Zustand のストアは「**状態 + それを変える関数**」を1つにまとめたただのオブジェクト。

- `create(...)` で**ストアを1個作る**。これは React の外に存在する。
- コンポーネントは `useFavoritesStore(...)` という**フック**でストアを読む。
- ストアの中身が変わると、それを読んでいるコンポーネントだけが再レンダリングされる。

`useState` の「アプリ全体・1個だけ版」というイメージで OK。

## 1-3. 実際に作る

### 手順1: インストール

```bash
npm install zustand
```

### 手順2: ストアを作る

`src/stores/favorites.ts` を新規作成する（`stores` フォルダも作る）。

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

// お気に入りとして保存する映画の最小限の形
export type FavoriteMovie = {
  id: number;
  title: string;
  posterPath: string;
};

// ストアが持つ「状態」と「操作」を型で宣言する
type FavoritesState = {
  favorites: FavoriteMovie[];
  add: (movie: FavoriteMovie) => void;
  remove: (id: number) => void;
  toggle: (movie: FavoriteMovie) => void;
  isFavorite: (id: number) => boolean;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      add: (movie) =>
        set((state) =>
          // 既に入っていれば何もしない（重複防止）
          state.favorites.some((m) => m.id === movie.id)
            ? state
            : { favorites: [...state.favorites, movie] }
        ),

      remove: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((m) => m.id !== id),
        })),

      toggle: (movie) =>
        get().isFavorite(movie.id)
          ? get().remove(movie.id)
          : get().add(movie),

      isFavorite: (id) => get().favorites.some((m) => m.id === id),
    }),
    { name: "movie-favorites" } // localStorage に保存するときのキー名
  )
);
```

**コードの読み方**

- `set(...)` が「状態を更新する」関数。`set((state) => 新しい状態)` の形で、今の状態をもとに新しい状態を返す。
- `get()` は「今の状態・関数を取り出す」関数。`toggle` の中で `isFavorite` や `remove` を呼ぶのに使っている。
- `create<FavoritesState>()(...)` の `()` が2回続くのは Zustand + TypeScript の決まり文句。`persist` のような**ミドルウェア**を挟むときはこの形になる（理由はおまじないとして覚えてOK）。
- `persist(..., { name: "movie-favorites" })` で、状態が自動的に **localStorage** に保存される。これでリロードしてもお気に入りが消えない。

### 手順3: 「Add to My List」ボタンにつなぐ

`src/MovieDetail.tsx` の `＋ Add to My List` ボタンを、ストアにつなぐ。

```tsx
import { useFavoritesStore } from "./stores/favorites";

// ...コンポーネントの中（movie が取れている前提）...

// 必要な部分だけを「セレクタ」で購読する
const isFav = useFavoritesStore((s) => s.isFavorite(movie.id));
const toggle = useFavoritesStore((s) => s.toggle);

// ボタンの JSX を差し替える
<button
  className="movie-detail-btn"
  onClick={() =>
    toggle({
      id: Number(movie.id),
      title: movie.original_title,
      posterPath: movie.poster_path,
    })
  }
>
  {isFav ? "✓ My List" : "＋ Add to My List"}
</button>
```

**ポイント: セレクタ（selector）**

`useFavoritesStore((s) => s.isFavorite(movie.id))` のように、ストア全体ではなく**欲しい値だけ**を引数の関数で選ぶ。こうすると「その値が変わったときだけ」再レンダリングされ、無駄な描画を防げる。`useFavoritesStore()` と全部取ってくる書き方もできるが、業務では原則セレクタで絞る。

> 注: 君の `MovieDetail` の `Movie` 型は `id: string`、`App` は `id: number` とバラついている。ここでは `Number(movie.id)` で揃えているが、この型の不一致は第3章でちゃんと統一する。

## 1-4. 動作確認

`npm run dev` で起動し、どれかの映画の詳細を開いてボタンを押す。

- ボタンの表示が `✓ My List` に変わる
- もう一度押すと `＋ Add to My List` に戻る
- ブラウザの開発者ツール → Application → Local Storage に `movie-favorites` というキーができている
- ページをリロードしても、登録した映画のボタンは `✓ My List` のまま

## 1-5. 章末の課題

1. 一覧（`App.tsx`）の各映画カードにも、小さなお気に入りトグル（♡ など）を付けてみる。詳細画面とお気に入り状態が**連動する**ことを確認する（同じストアを見ているから連動するはず）。
2. `toggle` を使わず `add` だけにしたらどうなるか考えてから試す（解除できなくなる）。なぜ `toggle` が便利かを言葉にする。
3. `persist` の行を一時的に消すと何が起きるか試す（リロードで消える）。`persist` が何をしているか説明できるようにする。

## 1-6. 完了チェック（Lv2 基準）

- [ ] 詳細で登録 → 別の映画へ → 戻っても状態が保持されている
- [ ] リロードしてもお気に入りが消えない
- [ ] 「なぜ `useState` ではなく Zustand なのか」を、prop drilling という言葉を使って説明できる
- [ ] セレクタで「必要な値だけ購読する」意味を説明できる

次は、登録したお気に入りを一覧する画面を作りながら、Router を実務的に使う [第2章](./02_react-router.md) へ。
