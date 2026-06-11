# 業務レベル化ロードマップ — お気に入り機能で stack を体得する

この movie-app を「お気に入り機能」を軸に作り込みながら、Zext チームの確定スタックを実地で身につけるための手順書。
**答えのコードは載せない。** 各ステップの「ゴール / やること / 調べるキーワード / 完了チェック」だけ書くので、自分で実装しながら進める。詰まったら AI レビューに投げる。

---

## 現状とゴール

いまの movie-app は既に:

- TypeScript（.tsx）で書かれている ✅
- React Router で `/`（一覧）と `/movies/:id`（詳細）の 2 画面遷移ができている ✅
- TMDB API から fetch でデータ取得して表示できている ✅

つまり Notion 記事でいう「Lv1」と、足りないとされた *TypeScript* と *ルーティング* の入口は既にクリア済み。
残る Lv2 の壁は **グローバル状態管理・Router の実務的な使い方・構成の整理・テスト**。これを全部「お気に入り機能」一本で埋めにいく。

ヒント: 詳細画面の「＋ Add to My List」ボタン、いま押しても何も起きないよね。これが出発点。

### チームのスタックとの対応

| やること | チームの技術 | このリポジトリの今 |
|---|---|---|
| 状態管理 | Zustand 5 | 未導入 → Phase 1 で入れる |
| ルーティング | React Router DOM 6.30（Data Router）| react-router 7 導入済み（loader はまだ）|
| データ取得 | Apollo(GraphQL) ＋ 独自 REST クライアント | fetch 直書き → Phase 3 で整理、Apollo は別枠 |
| テスト | Vitest + Testing Library | 未導入 → Phase 4 で入れる |
| ビルド | Vite | 導入済み ✅ |

※ 君のは react-router **v7**、チームは **v6.30**。`createBrowserRouter` / `loader` / `action` の考え方は同じなので学習はそのまま通用する（v7 で `react-router-dom` が `react-router` に統合された、くらいの差）。

---

## Phase 1 — Zustand でお気に入りストアを作る

**ゴール**: お気に入りに入れた映画を、どの画面からでも共有して読み書きできる状態にする。

**やること**

- [ ] `zustand` をインストール
- [ ] お気に入りを保持するストアを 1 つ作る（映画の配列 ＋ `add` / `remove` / `toggle` / `isFavorite`）
- [ ] 詳細画面の「＋ Add to My List」ボタンに `toggle` をつなぐ。登録済みなら見た目を変える（「✓ My List」など）
- [ ] リロードしても消えないように `persist` ミドルウェアで localStorage に保存

**調べるキーワード**: `zustand create`、`zustand persist`、`selector`（必要な部分だけ購読して再レンダリングを減らす）

**完了チェック（Lv2 基準）**

- [ ] 詳細でお気に入り登録 → 別の映画に移動 → 戻っても状態が保持されている
- [ ] なぜ `useState` ではダメで Zustand なのかを自分の言葉で説明できる（＝複数画面で共有するから）

---

## Phase 2 — お気に入り一覧ページ ＋ Router を実務的に使う

**ゴール**: お気に入りだけを並べる画面を増やし、Router でデータ取得を扱う作法を覚える。

**やること**

- [ ] `/favorites` ルートを追加（`main.tsx` の `createBrowserRouter` に足す）
- [ ] ヘッダー（`Header.tsx`）に `/` と `/favorites` へのナビリンクを置く。お気に入り件数のバッジも出す（Zustand から読む）
- [ ] お気に入り一覧ページは Phase 1 のストアを読んで表示するだけ
- [ ] 今 `useEffect` 内で fetch している一覧 / 詳細のデータ取得を、Router の **loader** に移す（画面を描く前にデータを用意する書き方を体験）
- [ ] データ取得失敗時の `errorElement`（または ErrorBoundary）を用意

**調べるキーワード**: `createBrowserRouter loader`、`useLoaderData`、`errorElement`、`NavLink`

**完了チェック**

- [ ] ヘッダーのバッジ件数が、登録 / 解除と即連動する
- [ ] loader 版と useEffect 版、それぞれの利点を説明できる（loader は表示前取得でチラつかない 等）

---

## Phase 3 — 構成と型を「チームに馴染む」形に整える

**ゴール**: ファイル数が増えても破綻しない構成・再利用・型に作り替える。

**やること**

- [ ] API 呼び出しを `src/api/tmdb.ts` のような **REST クライアント 1 か所**に集約（fetch の URL・ヘッダー・エラー処理をコンポーネントから追い出す）。※これがチームの「fetch ベース独自 REST クライアント」の練習になる
- [ ] 一覧の映画カードを `MovieCard` コンポーネントとして切り出し、Props で受け渡し（`App.tsx` の `.map` の中身を独立させる）
- [ ] `Movie` 型がいま `App.tsx`（id: number）と `MovieDetail.tsx`（id: string）でバラバラ。型を `src/types/` に 1 つにまとめて統一
- [ ] ディレクトリを役割で分ける（例: `features/movies/`、`features/favorites/`、`components/`、`api/`、`stores/`）

**調べるキーワード**: `feature-based folder structure react`、`barrel file`、TMDB の型定義の付け方

**完了チェック**

- [ ] コンポーネントの中に生の `fetch(...)` が残っていない
- [ ] 同じ映画型を 2 箇所で別定義していない
- [ ] 新しい画面を足すとき「どこに何を置くか」が迷わず言える

---

## Phase 4 — Vitest + Testing Library でテストを書く

**ゴール**: 手で確認しなくても「壊れてない」と保証できる状態。

**やること**

- [ ] `vitest` と `@testing-library/react` を導入し、`npm test` で動くように設定
- [ ] Zustand ストアの単体テスト（add → isFavorite が true、remove → false、toggle の往復）
- [ ] お気に入りボタンの操作テスト（押すとストアに増える / 表示が変わる）を Testing Library で
- [ ] 「ユーザーがどう操作するか」目線で書く（`getByRole` / `userEvent`）。実装の中身ではなく見える振る舞いをテストする

**調べるキーワード**: `vitest setup vite`、`@testing-library/react render screen`、`userEvent`、`getByRole`

**完了チェック**

- [ ] `npm test` が緑
- [ ] お気に入り機能のロジックをわざと壊すとテストが赤になる（確認する）

---

## Phase 5（別枠）— Apollo Client / GraphQL

TMDB は REST API なので、お気に入り機能だけでは GraphQL を練習できない。ここはチームのスタックで唯一この題材から外れる部分なので、最後に**独立した小さなお試し**として触れば十分。

**やること**

- [ ] 公開 GraphQL API（例: GitHub GraphQL、Rick & Morty、SpaceX など）を 1 つ選ぶ
- [ ] `@apollo/client` を入れて `ApolloProvider` を設定、`useQuery` で 1 画面ぶんだけデータ表示
- [ ] 「欲しいフィールドだけ要求する」「キャッシュが効く」を体感する

**調べるキーワード**: `apollo client useQuery`、`ApolloProvider`、`gql`

---

## AI レビューの使い方（重要）

各 Phase が終わったら差分を AI レビューに投げる。ただし丸投げだと「動けば OK」と言われがちなので、**スタックを縛って**頼む。例:

> 「Rails + React(関数コンポーネント) + React Router(Data Router) + Zustand + Vitest を使うチームの規約として、この差分をレビューして。命名・型・状態の置き場所・テストの観点で、業務(ITSS Lv2)なら指摘される点を挙げて」

レビューの指摘は人格否定じゃなく「プロダクト改善のギフト」。Notion にあった HRT（謙虚・尊敬・信頼）の実践練習も兼ねられる。

---

### 進め方の目安

Phase 1 → 4 を順番に。各 Phase は独立して動く状態（=どこで止めても壊れてない）で区切るのがコツ。Phase 5 は気が向いたら。
