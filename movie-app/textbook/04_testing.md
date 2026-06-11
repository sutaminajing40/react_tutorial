# 第4章 Vitest + Testing Library でテストする

## 4-1. なぜテストを書くのか

機能が増えるほど、手で全部の動作を確認するのは無理になる。「お気に入りを直したら、検索が壊れていた」みたいな事故（**デグレ／回帰**）を防ぐのがテスト。

> Notion にもあった通り、Lv2 の条件に「ユニットテストを実施して品質を高められる」「既存のテストを壊すことなく新機能を追加できる」が入っている。テストが書けることは業務レベルの必須スキル。

チームの道具立て:

- **Vitest** … テストを実行するエンジン（Vite と相性が良く設定が楽）
- **Testing Library** … 画面を「ユーザー目線」で操作・確認する道具

## 4-2. セットアップ

### 手順1: インストール

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- `jsdom` … Node の中に擬似的なブラウザ環境（DOM）を用意するためのもの。テストはブラウザ無しで走るので、これが画面の代わりになる。

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

`jest-dom` は `toBeInTheDocument()` のような「画面向けの便利な検証（マッチャ）」を足してくれる。

### 手順4: `package.json` の scripts に追加

```json
"scripts": {
  "test": "vitest"
}
```

これで `npm test` でテストが走る（ファイルを保存するたび自動で再実行されるウォッチモード）。

## 4-3. ストアの単体テスト（ロジックのテスト）

まず画面を介さず、第1章のお気に入りストアの**ロジック単体**をテストする。一番書きやすく、一番効果が高い。

`src/stores/favorites.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { useFavoritesStore } from "./favorites";

const sample = { id: 1, title: "君の名は", posterPath: "/a.jpg" };

// 各テストの前にストアを空に戻す（テスト同士が影響し合わないように）
beforeEach(() => {
  useFavoritesStore.setState({ favorites: [] });
});

describe("favorites store", () => {
  test("add でお気に入りに追加される", () => {
    useFavoritesStore.getState().add(sample);
    expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
  });

  test("同じ映画を二重に追加しても1件のまま", () => {
    useFavoritesStore.getState().add(sample);
    useFavoritesStore.getState().add(sample);
    expect(useFavoritesStore.getState().favorites).toHaveLength(1);
  });

  test("toggle で追加→削除が切り替わる", () => {
    const store = useFavoritesStore.getState();
    store.toggle(sample);
    expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
    store.toggle(sample);
    expect(useFavoritesStore.getState().isFavorite(1)).toBe(false);
  });
});
```

**読み方**

- `test("説明", () => { ... })` が1つのテスト。`expect(実際の値).toBe(期待する値)` で検証する。
- ストアは React の外にあるので、`useFavoritesStore.getState()` で**フックを使わずに**中身を直接呼べる。テストではこれが便利。
- `beforeEach` で毎回リセットするのが超重要。前のテストの結果が次に残ると、原因不明の失敗になる。

## 4-4. コンポーネントの操作テスト（ユーザー目線）

次に「ボタンを押したらお気に入りに追加される」を、画面を通してテストする。Testing Library の出番。

`src/components/MovieCard.test.tsx`（カードに♡トグルを付けた前提。無ければ詳細ボタンで同様に書ける）:

```tsx
import { beforeEach, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import MovieCard from "./MovieCard";
import { useFavoritesStore } from "../stores/favorites";

const movie = { id: 1, title: "君の名は", posterPath: "/a.jpg", overview: "" };

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
  const button = screen.getByRole("button", { name: /お気に入り/ });
  await user.click(button);

  expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
});
```

**ここが Testing Library の思想**

- `getByRole("button", { name: ... })` のように「**ユーザーが画面で何を見て、どう操作するか**」でテストを書く。`className` や内部の state ではなく、見える振る舞いを検証する。
- そうすると、内部実装を変えても（リファクタしても）テストは壊れない。「テストが実装の足かせにならない」良いテストになる。
- `userEvent` は実際のクリックやタイピングを再現する。`render` で画面を描き、`screen` でその中の要素を探す。
- `MemoryRouter` … `Link` / `NavLink` は Router の中でしか動かないので、テストではこれでくるむ。

## 4-5. 章末の課題

1. ストアの `remove` 単体のテストを1つ書き足す。
2. お気に入り**登録済み**の状態でカードを描画したとき、ボタンのラベルが「解除」側になっていることをテストする（`useFavoritesStore.setState({ favorites: [movie] })` で初期状態を作ってから `render`）。
3. わざとストアの `toggle` を壊して（例: `add` だけにする）、テストが**赤くなる**ことを確認する。テストが本当に守ってくれている実感を持つ。

## 4-6. 完了チェック（Lv2 基準）

- [ ] `npm test` が緑で通る
- [ ] ストアのロジックに単体テストがある
- [ ] 「ボタンを押す→追加される」をユーザー目線（`getByRole` / `userEvent`）でテストできている
- [ ] ロジックをわざと壊すとテストが赤くなることを確認した
- [ ] 「実装ではなく振る舞いをテストする」理由を説明できる

これで Lv2 のコア（状態・ルーティング・構成・テスト）が一周した。残りは別枠の [第5章 Apollo/GraphQL](./05_apollo-graphql.md)。
