# 第1章 Zustand — グローバル状態でお気に入りを持つ

## この章でやること

「＋ Add to My List」ボタンを実際に動くようにする。
完成すると:

- 詳細画面でボタンを押すと表示が「✓ My List」に変わる
- もう一度押すと「＋ Add to My List」に戻る（トグル）
- ページをリロードしても、登録したお気に入りが消えない

---

## 1. Zustand とは

### なぜ `useState` ではダメなのか

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

### Zustand の考え方

Zustand のストアは「**状態 + それを変える関数**」を1つにまとめたただのオブジェクト。

- `create(...)` で**ストアを1個作る**。これは React の外に存在する。
- コンポーネントは `useXxxStore(...)` という**フック**でストアを読む。
- ストアの中身が変わると、それを読んでいるコンポーネントだけが再レンダリングされる。

`useState` の「アプリ全体・1個だけ版」というイメージで OK。

---

## 2. 最小例で使い方を見る

> これは読んで理解すればOK。手元で動かさなくてよい。

カウンターを Zustand で作る例。movie-app とは別の題材で、API の形を確認しよう。

```ts
import { create } from "zustand";

type CounterState = {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

コンポーネントからはこう使う:

```tsx
function Counter() {
  // セレクタ: ストア全体ではなく必要な値だけを指定して購読する
  const count = useCounterStore((s) => s.count);
  const increment = useCounterStore((s) => s.increment);

  return <button onClick={increment}>{count}</button>;
}
```

**ポイント: セレクタ（selector）**

`useCounterStore((s) => s.count)` のように、ストア全体ではなく**欲しい値だけ**を引数の関数で選ぶ。こうすると「その値が変わったときだけ」再レンダリングされ、無駄な描画を防げる。業務では原則セレクタで絞る。

**`persist` ミドルウェア**でストアの状態を `localStorage` に保存することもできる:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCounterStore = create<CounterState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      // ...
    }),
    { name: "counter-storage" } // localStorage のキー名
  )
);
```

`create<T>()(...)` の `()` が2回続くのは Zustand + TypeScript の決まり文句。`persist` のような**ミドルウェア**を挟むときはこの形になる（理由はおまじないとして覚えてOK）。

---

## 3. やってみよう（課題）

### 課題 1-1: Zustand をインストールする

**要件**:
- `zustand` パッケージをプロジェクトに追加する

**受け入れ条件**: `npm run dev` が引き続きエラーなく起動する。`package.json` の `dependencies` に `zustand` が追加されている。

<details><summary>💡 ヒント1（方針）</summary>
npm install コマンドを使う。バージョン指定は不要（最新が入る）。
</details>

<details><summary>✅ 解答例</summary>

```bash
npm install zustand
```

これだけ。`package.json` と `package-lock.json` が更新されれば完了。
</details>

---

### 課題 1-2: お気に入りストアを作る

**要件**:
- `src/stores/` フォルダを作成する
- `src/stores/favorites.ts` を新規作成する
- ストアが持つ状態: `favorites`（映画の配列）
- ストアが持つ操作: `add`（追加）、`remove`（削除）、`toggle`（追加/削除の切り替え）、`isFavorite`（登録済みか確認）
- `persist` ミドルウェアで `localStorage` に永続化する（キー名: `"movie-favorites"`）
- ストアで扱う映画の型 `FavoriteMovie` も同ファイルで定義・export する

**受け入れ条件**:
- TypeScript のコンパイルエラーが出ない
- `FavoriteMovie` 型が `{ id: number; title: string; posterPath: string }` の形を持つ
- `npm run dev` が起動する

**使うもの**: `create`, `persist`, `zustand`, `zustand/middleware`

<details><summary>💡 ヒント1（方針）</summary>

型定義 → ストア本体の順に作ると整理しやすい。

- `FavoritesState` 型でストアの「状態」と「操作」を型宣言する
- `add` は重複を防ぐ（既に入っていれば何もしない）
- `remove` は `filter` で該当 id を除外する
- `toggle` は `isFavorite` の結果によって `add` か `remove` を呼ぶ
- `isFavorite` は `some` で id が存在するか調べる
- `set` でストアの状態を更新する。`get()` でストア内の他の関数を呼ぶ
</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FavoriteMovie = {
  id: number;
  title: string;
  posterPath: string;
};

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
          // TODO: 既に入っていれば state をそのまま返す（重複防止）
          // TODO: 入っていなければ favorites に movie を追加して返す
        ),

      remove: (id) =>
        set((state) => ({
          // TODO: id が一致しない映画だけ残す
        })),

      toggle: (movie) =>
        // TODO: isFavorite の結果で remove か add を呼ぶ
        ,

      isFavorite: (id) => /* TODO: favorites の中に id が存在するか返す */,
    }),
    { name: "movie-favorites" }
  )
);
```
</details>

<details><summary>✅ 解答例</summary>

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

**なぜこう書くか**:
- `set((state) => 新しい状態)` の形で、今の状態をもとに新しい状態を返す
- `get()` はストア内で「今の状態・関数を取り出す」関数。`toggle` の中で `isFavorite` や `remove` を呼ぶのに使っている
- `persist(..., { name: "movie-favorites" })` で、状態が自動的に `localStorage` に保存される。リロードしてもお気に入りが消えない
</details>

---

### 課題 1-3: 「Add to My List」ボタンにストアをつなぐ

**要件**:
- `src/MovieDetail.tsx` を編集する
- `useFavoritesStore` を import し、`isFavorite` と `toggle` をセレクタで購読する
- ボタンを押すとストアの `toggle` が呼ばれ、お気に入りの状態が切り替わるようにする
- ボタンのラベルをお気に入り状態に応じて切り替える（お気に入り済みなら「✓ My List」、未登録なら「＋ Add to My List」）
- `toggle` に渡す `id` は `Number(movie.id)` で数値に変換する

**受け入れ条件**:
- 詳細画面でボタンを押すと「✓ My List」に変わる
- もう一度押すと「＋ Add to My List」に戻る
- ブラウザの開発者ツール → Application → Local Storage に `movie-favorites` キーができている

**使うもの**: `useFavoritesStore`, セレクタ（`(s) => ...`）, `toggle`, `isFavorite`

<details><summary>💡 ヒント1（方針）</summary>

セレクタで「必要な値だけ」を取る。`isFav` と `toggle` を別々に購読する。

注意点が2つある:

- フックはコンポーネントのトップレベルでしか呼べないが、`movie` は fetch が終わるまで `null`。セレクタの中で `movie ? ... : false` と null チェックする
- `MovieDetail` の `Movie` 型は `id: string` なのに、ストアの `isFavorite` は `number` を受け取る。`Number(movie.id)` で揃える

`toggle` に渡す映画オブジェクトは `{ id, title, posterPath }` の形に整える（`movie.poster_path` → `posterPath` の変換に注意）。
</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
import { useFavoritesStore } from "./stores/favorites";

// コンポーネントのトップレベル（movie はまだ null かもしれない）
const isFav = useFavoritesStore((s) =>
  /* TODO: movie が null なら false、あれば isFavorite で確認（id は Number に変換） */
);
const toggle = useFavoritesStore((s) => /* TODO: toggle を取り出す */);

// ボタン部分
<button
  className="movie-detail-btn"
  onClick={() =>
    toggle({
      id: /* TODO: number 型に変換 */,
      title: movie.original_title,
      posterPath: /* TODO: poster_path を渡す */,
    })
  }
>
  {/* TODO: isFav の値でラベルを切り替える */}
</button>
```
</details>

<details><summary>✅ 解答例</summary>

```tsx
import { useFavoritesStore } from "./stores/favorites";

// ...コンポーネントのトップレベル（useState などと同じ場所）...

// 必要な部分だけを「セレクタ」で購読する
// movie は fetch が終わるまで null なので、その間は false を返しておく
const isFav = useFavoritesStore((s) =>
  movie ? s.isFavorite(Number(movie.id)) : false
);
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

**なぜ `Number(movie.id)` が必要か**:
君の `MovieDetail` の `Movie` 型は `id: string`、`App` は `id: number` とバラついている。ここでは `Number(movie.id)` で揃えているが、この型の不一致は第3章でちゃんと統一する。

**なぜセレクタの中で null チェックするか**:
フックは「コンポーネントのトップレベル」でしか呼べないルールがある（`if` 文や JSX の `{movie && ...}` の中には書けない）。一方 `movie` は fetch が終わるまで `null` なので、何も考えずに `s.isFavorite(Number(movie.id))` と書くと初回レンダリングで `movie.id` が `null` 参照になり落ちる。そこでセレクタの中で `movie ? ... : false` と分岐する。
</details>

---

### 課題 1-4: 動作確認する

**要件**:
- `npm run dev` で起動し、以下をすべて自分の手で確認する

**受け入れ条件**:
- どれかの映画の詳細を開いてボタンを押す → 「✓ My List」に変わる
- もう一度押す → 「＋ Add to My List」に戻る
- ブラウザの開発者ツール → Application → Local Storage に `movie-favorites` キーができている
- ページをリロードしても、登録した映画のボタンは「✓ My List」のまま

---

### 課題 1-5: 一覧画面にもお気に入りトグルを付ける

**要件**:
- `src/App.tsx`（一覧画面）の各映画カードに、お気に入りトグルを付ける（例: ♡ ボタン）
- 詳細画面と一覧画面のお気に入り状態が**連動する**ことを確認する

**受け入れ条件**:
- 一覧のカードにお気に入りボタンが表示される
- 詳細で登録したお気に入りが、一覧のカードのボタンにも即座に反映される（同じストアを見ているから連動するはず）
- 一覧で登録したお気に入りが、詳細ページのボタンにも反映される

**使うもの**: `useFavoritesStore`, `toggle`, `favorites`（配列）

<details><summary>💡 ヒント1（方針）</summary>

落とし穴が1つ: カードは `movieList.map(...)` の中で描かれているが、**フックは map やループの中で呼べない**（Rules of Hooks）。

なので `App` のトップレベルで `favorites` 配列と `toggle` を購読しておき、map の中では `favorites.some(...)` でお気に入りかどうかを判定する。

ちなみに `useFavoritesStore((s) => s.isFavorite)` と関数だけ購読する手はダメ。関数自体は中身（favorites）が変わっても同じ参照のままなので、再レンダリングが起きず表示が更新されない。配列そのもの（`s.favorites`）を購読するのが正解。
</details>

<details><summary>✅ 解答例</summary>

```tsx
// App.tsx
import { useFavoritesStore } from "./stores/favorites";

function App() {
  // フックは map の中で呼べないので、トップレベルでまとめて購読する
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggle = useFavoritesStore((s) => s.toggle);
  // ...既存のコード...
```

map の中はこうなる（コールバックを `{}` ブロックにして `isFav` を計算する）:

```tsx
{movieList.map((movie) => {
  const isFav = favorites.some((m) => m.id === movie.id);
  return (
    <Link key={movie.id} to={`/movies/${movie.id}`} className="movie-card">
      {/* ...既存の img / overlay はそのまま... */}
      <button
        aria-label={isFav ? "お気に入りから削除" : "お気に入りに追加"}
        onClick={(e) => {
          e.preventDefault(); // Link の画面遷移をキャンセル
          toggle({
            id: movie.id,
            title: movie.original_title,
            posterPath: movie.poster_path,
          });
        }}
      >
        {isFav ? "♥" : "♡"}
      </button>
    </Link>
  );
})}
```

**なぜ連動するか**: `useFavoritesStore` は1つのストアインスタンスを共有している。どの画面で `toggle` しても同じストアが更新され、そのストアを購読している全コンポーネントが再レンダリングされる。

**`aria-label` を付ける理由**: ボタンの見た目が「♡」だけだと、スクリーンリーダーにも（第4章で書く）テストにも「何のボタンか」が伝わらない。`aria-label` でアクセシブルな名前を付けておくと、第4章で `getByRole("button", { name: /お気に入りに追加/ })` とユーザー目線でテストできるようになる。
</details>

---

### 課題 1-6: `persist` の役割を確かめる

**要件**:
- `src/stores/favorites.ts` の `persist(...)` のラップを一時的に外して動作確認する（元に戻すのを忘れずに）

**受け入れ条件**:
- `persist` を外した状態でお気に入り登録 → ページリロード → お気に入りが消えていることを確認できる
- `persist` を元に戻したら、リロード後もお気に入りが残ることを確認できる
- 「`persist` は何をしているか」を自分の言葉で説明できる

---

## 完了チェック

- [ ] 詳細で登録 → 別の映画へ → 戻っても状態が保持されている
- [ ] リロードしてもお気に入りが消えない
- [ ] 「なぜ `useState` ではなく Zustand なのか」を、prop drilling という言葉を使って説明できる
- [ ] セレクタで「必要な値だけ購読する」意味を説明できる
- [ ] `persist` が何をしているか説明できる
- [ ] `toggle` を使わず `add` だけにしたらどうなるか言葉にできる

次は、登録したお気に入りを一覧する画面を作りながら、Router を実務的に使う [第2章](./02_react-router.md) へ。
