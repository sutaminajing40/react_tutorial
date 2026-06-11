# movie-app 業務レベル化 教科書

このリポジトリ（movie-app）に「お気に入り機能」を足しながら、Zext チームの確定スタックを**手を動かして理解する**ための教科書。
各章は「**なぜ必要か → どう動くか → 実際のコード → なぜこう書くか → 章末の課題 → 完了チェック**」の順で進む。

> ロードマップ（`ROADMAP.md`）が「やることリスト」なのに対して、こちらは「読んで理解する本」。
> コードはそのまま写すのではなく、**一度読んで意味を理解してから自分で打ち込む**のがおすすめ。写経でも、理解しながらなら力になる。

---

## 今のあなたの位置

movie-app は既にこうなっている:

- TypeScript（`.tsx`）で書かれている
- React Router で `/`（一覧）と `/movies/:id`（詳細）を行き来できる
- TMDB API から `fetch` でデータを取って表示できる
- 詳細画面に「＋ Add to My List」ボタンがあるが、**まだ何も起きない** ← ここを育てる

Notion 記事でいう Lv1 はクリア済み。この本で埋めるのは Lv2 の壁——**グローバル状態管理・Router の実務的な使い方・構成の整理・テスト**。

## チームのスタックと、この本の対応

| 技術 | 役割（ひとことで） | 学ぶ章 |
|---|---|---|
| Zustand 5 | 全画面で共有するデータの保管庫 | 第1章 |
| React Router（Data Router）| URL と画面の対応＋表示前のデータ準備 | 第2章 |
| 独自 REST クライアント | サーバー通信を1か所に集約 | 第3章 |
| Vitest + Testing Library | 壊れてないかを自動チェック | 第4章 |
| Apollo Client（GraphQL）| 別方式のデータ取得（別枠）| 第5章 |
| Vite | 全部を動かす土台 | （導入済み）|

## 章一覧

1. [第1章 Zustand — グローバル状態でお気に入りを持つ](./01_zustand.md)
2. [第2章 React Router — Data Router と loader](./02_react-router.md)
3. [第3章 構成・REST クライアント・型を整える](./03_architecture.md)
4. [第4章 Vitest + Testing Library でテストする](./04_testing.md)
5. [第5章（別枠）Apollo Client / GraphQL 入門](./05_apollo-graphql.md)

## 前提バージョンの注意

このリポジトリは **react-router v7**、チームは **v6.30** を使っている。
`createBrowserRouter` / `loader` / `action` という Data Router の考え方は両者同じなので、この本の内容はそのまま通用する。違いは「v7 で `react-router-dom` パッケージが `react-router` に統合された」程度（import 元の名前が違うだけ）。本書のコードは君のリポジトリに合わせて `react-router` から import する。

## 進め方

第1章 → 第4章を順番に。各章のコードを入れたら `npm run dev` で動作を確認し、章末の課題までやってから次へ。
第5章（Apollo）は TMDB が REST のため映画アプリでは練習しづらいので、気が向いたとき独立して触れば OK。
