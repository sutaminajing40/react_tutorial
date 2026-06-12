# 第4章 Vitest + Testing Library でテストする

## この章でやること

機能が増えるほど、手で全部の動作を確認するのは無理になります。「お気に入りを直したら、検索が壊れていた」という事故（**デグレ／回帰**）を自動で検知するのがテストの役割です。

- Vitest + Testing Library のセットアップをする
- 第1章で作ったお気に入りストアのロジックを**単体テスト**する
- 「ボタンを押す → ストアに追加される」という**ユーザー目線のテスト**を書く
- わざとコードを壊して、テストが本当に守ってくれることを体感する

> Lv2 の条件に「ユニットテストを実施して品質を高められる」「既存のテストを壊すことなく新機能を追加できる」が入っています。テストが書けることは業務レベルの必須スキルです。

---

## 1. Vitest と Testing Library とは

### Vitest

テストを**実行するエンジン**（テストランナー）です。Vite と同じ設定を使うため、`vite.config.ts` にちょっと足すだけで動き出す軽量なツールです。Jest に似た API（`test`・`expect`・`describe`）を持っています。

### Testing Library

画面を「**ユーザー目線**」で操作・確認するための道具です。

重要な思想は「**実装ではなく、振る舞いをテストする**」です。

たとえば:

```tsx
// ❌ 実装を見るテスト（避けたい）
const button = wrapper.find(".btn-favorite");  // class 名（実装の詳細）で探す

// ✅ 振る舞いを見るテスト（好ましい）
const button = screen.getByRole("button", { name: /お気に入り/ }); // ユーザーが見るラベルで探す
```

前者は class 名を変えるだけでテストが壊れます。後者はボタンの見た目ラベルが変わらない限り壊れません。「**リファクタリングしても壊れない**」テストを書くのが Testing Library の哲学です。

チームの道具立て:

- **Vitest** … テストを実行するエンジン（Vite と相性が良く設定が楽）
- **Testing Library** … 画面を「ユーザー目線」で操作・確認する道具

---

## 2. 最小例で使い方を見る

> これは**読んで理解すれば OK**です。手元で動かさなくてよいです。

`add(a, b)` という簡単な関数の単体テストと、ボタンをクリックするコンポーネントテストを見てみましょう。movie-app とは別の題材です。

**ロジックの単体テスト例**

```ts
// src/utils/math.test.ts
import { describe, expect, test } from "vitest";
import { add } from "./math";

describe("add 関数", () => {
  test("1 + 2 は 3 になる", () => {
    expect(add(1, 2)).toBe(3);
  });

  test("負の数を渡してもいい", () => {
    expect(add(-1, 5)).toBe(4);
  });
});
```

**コンポーネントの操作テスト例**

```tsx
// src/components/Counter.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Counter from "./Counter";

test("ボタンをクリックするとカウントが増える", async () => {
  const user = userEvent.setup();
  render(<Counter />);

  // ユーザーが見るテキストでボタンを探す
  const button = screen.getByRole("button", { name: "増やす" });
  await user.click(button);

  // ユーザーが画面で見るテキストを検証する
  expect(screen.getByText("カウント: 1")).toBeInTheDocument();
});
```

`render` で画面を描き、`screen` で要素を探し、`userEvent` で操作し、`expect` で結果を検証する——この4ステップが Testing Library の基本形です。

---

## 3. セットアップ（考える余地がない作業なので手順として書きます）

### 手順1: インストール

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- `jsdom` … Node の中に擬似的なブラウザ環境（DOM）を用意するためのもの。テストはブラウザ無しで走るので、これが画面の代わりになります。

### 手順2: `vite.config.ts` に test 設定を足す

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",      // DOM を使えるように
    globals: true,             // test / expect を import 無しで使える
    setupFiles: "./src/test/setup.ts",
  },
});
```

### 手順3: セットアップファイル `src/test/setup.ts`

```ts
import "@testing-library/jest-dom";
```

`jest-dom` は `toBeInTheDocument()` のような「画面向けの便利な検証（マッチャ）」を足してくれます。

### 手順4: `package.json` の scripts に追加

```json
"scripts": {
  "test": "vitest"
}
```

これで `npm test` でテストが走ります（ファイルを保存するたび自動で再実行されるウォッチモード）。

---

## 4. やってみよう（課題）

### 課題 4-1: `favorites.test.ts` を作り、`add` のテストを書く

**要件**:

- `src/stores/favorites.test.ts` を新規作成する
- `add` を呼ぶとお気に入りに追加されることをテストする（1件）
- 各テストの前にストアをリセットする `beforeEach` を書く

**受け入れ条件**:

- `npm test` を実行してテストが緑（PASS）になる
- ストアを直接操作して `isFavorite(1)` が `true` になることを確認できている

**使うもの**: `beforeEach`, `describe`, `test`, `expect`, `useFavoritesStore.setState`, `useFavoritesStore.getState`

<details><summary>💡 ヒント1（方針）</summary>

Zustand ストアは React の外に存在するので、コンポーネントを `render` しなくても `useFavoritesStore.getState().add(...)` でロジックを直接呼べます。`beforeEach` で `setState({ favorites: [] })` を呼ぶことで、毎テスト前にストアを空に戻せます。これをやらないと「前のテストで追加した映画が次のテストに残る」という不思議なバグが起きます。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
// src/stores/favorites.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { useFavoritesStore } from "./favorites";

const sample = { id: 1, title: "テスト映画", posterPath: "/test.jpg" };

// TODO: beforeEach でストアをリセットする

describe("favorites store", () => {
  test("add でお気に入りに追加される", () => {
    // TODO: add を呼ぶ
    // TODO: isFavorite(1) が true であることを検証する
  });
});
```

</details>

<details><summary>✅ 解答例</summary>

```ts
// src/stores/favorites.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { useFavoritesStore } from "./favorites";

const sample = { id: 1, title: "テスト映画", posterPath: "/test.jpg" };

// 各テストの前にストアを空に戻す（テスト同士が影響し合わないように）
beforeEach(() => {
  useFavoritesStore.setState({ favorites: [] });
});

describe("favorites store", () => {
  test("add でお気に入りに追加される", () => {
    useFavoritesStore.getState().add(sample);
    expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
  });
});
```

**なぜこう書くか**: ストアは React の外にあるので、`useFavoritesStore.getState()` で**フックを使わずに**中身を直接呼べます。テストではこれが便利です。`beforeEach` で毎回リセットするのが超重要で、これをサボると前のテストの結果が次に残って原因不明の失敗を生みます。

</details>

---

### 課題 4-2: `remove` と二重追加防止のテストを書き足す

**要件**:

- 課題 4-1 の `favorites.test.ts` に2つのテストを追加する
  1. `add` → `remove` で `isFavorite(1)` が `false` になることをテスト
  2. 同じ映画を2回 `add` しても `favorites` の長さが1件のままであることをテスト

**受け入れ条件**:

- `npm test` で3つのテスト全部が緑になる
- `expect(useFavoritesStore.getState().favorites).toHaveLength(1)` の形で件数を検証できている

**使うもの**: `remove`, `toHaveLength`, `toBe(false)`

<details><summary>💡 ヒント1（方針）</summary>

既存テストの構造をコピーして、中身を変えるだけです。`remove` のテストは「まず `add` してから `remove` する」という2ステップです。二重追加テストは「同じ `sample` を2回 `add` してから `favorites.length` を確認する」だけです。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
test("remove でお気に入りから削除される", () => {
  const store = useFavoritesStore.getState();
  store.add(sample);
  // TODO: remove を呼ぶ
  // TODO: isFavorite(1) が false であることを検証する
});

test("同じ映画を二重に追加しても1件のまま", () => {
  useFavoritesStore.getState().add(sample);
  // TODO: もう一度 add を呼ぶ
  // TODO: favorites の長さが 1 であることを検証する
});
```

</details>

<details><summary>✅ 解答例</summary>

```ts
test("remove でお気に入りから削除される", () => {
  const store = useFavoritesStore.getState();
  store.add(sample);
  store.remove(1);
  expect(useFavoritesStore.getState().isFavorite(1)).toBe(false);
});

test("同じ映画を二重に追加しても1件のまま", () => {
  useFavoritesStore.getState().add(sample);
  useFavoritesStore.getState().add(sample);
  expect(useFavoritesStore.getState().favorites).toHaveLength(1);
});
```

</details>

---

### 課題 4-3: `toggle` の往復テストを書く

**要件**:

- `toggle` を1回呼ぶと追加される、2回呼ぶと削除されることをテストする（1つの `test` ブロックの中で順番に検証してよい）

**受け入れ条件**:

- `npm test` で4つのテスト全部が緑になる
- 「追加」と「削除」の両方を1つのテストで検証できている

**使うもの**: `toggle`, `toBe(true)`, `toBe(false)`

<details><summary>💡 ヒント1（方針）</summary>

`toggle` は「今お気に入りなら削除、そうでなければ追加」の動作です。1回目の `toggle` 後に `true`、2回目の `toggle` 後に `false` を確認すれば、往復が正しく動いていることを証明できます。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```ts
test("toggle で追加→削除が切り替わる", () => {
  const store = useFavoritesStore.getState();
  store.toggle(sample);
  expect(/* TODO: 1回目は true */).toBe(true);
  store.toggle(sample);
  expect(/* TODO: 2回目は false */).toBe(false);
});
```

</details>

<details><summary>✅ 解答例</summary>

```ts
test("toggle で追加→削除が切り替わる", () => {
  const store = useFavoritesStore.getState();
  store.toggle(sample);
  expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
  store.toggle(sample);
  expect(useFavoritesStore.getState().isFavorite(1)).toBe(false);
});
```

</details>

---

### 課題 4-4: ボタンクリックでストアに追加されることをテストする

**要件**:

- `src/components/MovieCard.test.tsx` を新規作成する（課題 3-4 で `MovieCard` にお気に入りボタンを移した前提）
- お気に入りボタンをクリックするとストアの `isFavorite(1)` が `true` になることをテストする

**受け入れ条件**:

- `npm test` が緑になる
- `getByRole("button", { name: /お気に入り/ })` の形（実装の class 名ではなくラベルテキスト）でボタンを探せている

**使うもの**: `render`, `screen`, `userEvent`, `MemoryRouter`, `useFavoritesStore.setState`

<details><summary>💡 ヒント1（方針）</summary>

`MovieCard` の中に `Link` があるため、テスト内でも Router のコンテキストが必要です。`MemoryRouter` でコンポーネントをくるんで `render` します。ボタンは `getByRole("button", { name: /お気に入り/ })` のように「ユーザーが見るラベル」で探します。

ここでの「ラベル」はボタンの**アクセシブルな名前**のこと。課題 3-4 の解答例では、見た目は「♡」でも `aria-label="お気に入りに追加"`（登録済みなら `"お気に入りから削除"`）を付けてあるので、これが名前になります。自分の実装のラベルに合わせて正規表現を調整してください。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
// src/components/MovieCard.test.tsx
import { beforeEach, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import MovieCard from "./MovieCard";
import { useFavoritesStore } from "../stores/favorites";

const movie = { id: 1, title: "テスト映画", posterPath: "/test.jpg", overview: "" };

beforeEach(() => {
  useFavoritesStore.setState({ favorites: [] });
});

test("お気に入りボタンを押すとストアに追加される", async () => {
  const user = userEvent.setup();

  render(
    // TODO: MemoryRouter でくるんで render する
  );

  const button = screen.getByRole("button", { name: /* TODO: ボタンのラベルを正規表現で */ });
  await user.click(button);

  expect(useFavoritesStore.getState().isFavorite(1)).toBe(/* TODO */);
});
```

</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/components/MovieCard.test.tsx
import { beforeEach, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import MovieCard from "./MovieCard";
import { useFavoritesStore } from "../stores/favorites";

const movie = { id: 1, title: "テスト映画", posterPath: "/test.jpg", overview: "" };

beforeEach(() => {
  useFavoritesStore.setState({ favorites: [] });
});

test("お気に入りボタンを押すとストアに追加される", async () => {
  const user = userEvent.setup();

  // Link を含むので Router でくるむ必要がある
  render(
    <MemoryRouter>
      <MovieCard movie={movie} />
    </MemoryRouter>
  );

  // ユーザーが見るラベルでボタンを探す（実装の中身ではなく「見える振る舞い」で探す）
  const button = screen.getByRole("button", { name: /お気に入りに追加/ });
  await user.click(button);

  expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
});
```

**なぜこう書くか**: `getByRole("button", { name: ... })` のように「**ユーザーが画面で何を見て、どう操作するか**」でテストを書くと、内部実装を変えても（リファクタしても）テストは壊れません。`className` や内部 state を直接見るテストは、実装の都合でテストが壊れる「実装テスト」になりがちです。

</details>

---

### 課題 4-5: 登録済み状態でのボタンラベルをテストする

**要件**:

- 課題 4-4 の `MovieCard.test.tsx` に1つテストを追加する
- お気に入りに登録済みの状態で `MovieCard` を描画したとき、ボタンのラベルが「解除」側（`お気に入りから削除`）になっていることをテストする

**受け入れ条件**:

- 事前に `useFavoritesStore.setState({ favorites: [movie] })` で登録済み状態を作ってから `render` している
- `getByRole("button", { name: /お気に入りから削除/ })` で「解除側のラベル」が画面に存在することを確認できている

**使うもの**: `useFavoritesStore.setState({ favorites: [...] })`, `getByRole`, `toBeInTheDocument`

<details><summary>💡 ヒント1（方針）</summary>

`beforeEach` でストアをリセットした後に、このテストの中だけ `useFavoritesStore.setState({ favorites: [movie] })` で「登録済み」状態を作ります。その状態で `render` すると、ボタンのラベルが「登録済み用」の文言になっているはずです。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
test("お気に入り登録済みのとき、ボタンが解除側のラベルになる", () => {
  // TODO: ストアを「登録済み」状態にする
  useFavoritesStore.setState({ favorites: [/* TODO */] });

  render(
    <MemoryRouter>
      <MovieCard movie={movie} />
    </MemoryRouter>
  );

  // TODO: 解除側のラベルを持つボタンが存在することを確認する
  expect(screen.getByRole("button", { name: /* TODO */ })).toBeInTheDocument();
});
```

</details>

<details><summary>✅ 解答例</summary>

```tsx
test("お気に入り登録済みのとき、ボタンが解除側のラベルになる", () => {
  // 登録済みの初期状態を作る
  useFavoritesStore.setState({ favorites: [movie] });

  render(
    <MemoryRouter>
      <MovieCard movie={movie} />
    </MemoryRouter>
  );

  // 解除側のラベルが表示されていることを確認（ラベル文字列は実装に合わせる）
  expect(
    screen.getByRole("button", { name: /お気に入りから削除/ })
  ).toBeInTheDocument();
});
```

**なぜこう書くか**: `beforeEach` でリセットした後に特定のテストだけ初期状態を上書きできます。`setState` は Zustand が `beforeEach` 用に提供している便利な直接書き込み手段で、テスト外のコードには影響しません。

</details>

---

### 課題 4-6: わざとコードを壊してテストが赤くなることを確認する

**要件**（手順課題）:

1. `src/stores/favorites.ts` の `toggle` を「`add` だけ（削除しない）」に壊す（例: `get().isFavorite(movie.id)` の判定を削除して常に `add` を呼ぶ）
2. `npm test` を実行する
3. テストが**赤くなる**ことを確認したら、元に戻して緑に戻す

**受け入れ条件**:

- コードを壊したときに、`toggle で追加→削除が切り替わる` というテストが失敗（赤）になる
- 元に戻したら緑に戻る
- 「テストが本当に守ってくれている」という実感がある

<details><summary>💡 ヒント1（方針）</summary>

これは「テストの有効性を確かめる」大切なステップです。テストが常に緑でも「本当にチェックしているのか？」という疑問が残ります。壊して赤くなることを確認して、初めて「このテストは機能している」と言えます。これを **テストの信頼性確認（Mutation Testing の考え方）** と言います。

</details>

---

## 完了チェック

- [ ] `npm test` が緑（PASS）で通る
- [ ] ストアのロジックに単体テストがある（`add`・`remove`・`toggle`・重複防止）
- [ ] 「ボタンを押す→追加される」をユーザー目線（`getByRole` / `userEvent`）でテストできている
- [ ] 登録済み状態での表示ラベルもテストできている
- [ ] ロジックをわざと壊すとテストが赤くなることを確認した
- [ ] 「実装ではなく振る舞いをテストする」理由を説明できる

これで Lv2 のコア（状態・ルーティング・構成・テスト）が一周しました。残りは別枠の [第5章 Apollo/GraphQL](./05_apollo-graphql.md)。
