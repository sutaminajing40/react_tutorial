# 第5章（別枠）Apollo Client / GraphQL 入門

## 5-1. なぜこの章は「別枠」なのか

チームのデータ取得の主役は **Apollo Client（GraphQL）**。ただし、これまで使ってきた **TMDB は REST API** なので、お気に入り映画アプリの中では GraphQL を自然に練習できない。
そこでこの章は、本編から切り離した**独立の小さなお試し**として GraphQL の感覚をつかむことを目的にする。「なんとなく分かる」まで行ければ十分。

## 5-2. REST と GraphQL の違い（考え方）

これまでの REST（TMDB）はこうだった:

- **URL がデータの種類を決める**。`/movie/popular` なら人気映画、`/movie/123` なら詳細。
- 返ってくる**項目はサーバーが決める**。詳細を取ると、欲しくない `production_companies` なども全部ついてくる（第2章で見た巨大な型を思い出して）。
- 関連データが欲しいと**何度もリクエスト**することがある（映画→そのキャスト→各俳優…）。

GraphQL はこう変わる:

- **エンドポイントは基本1つ**（例: `/graphql`）。
- **欲しいデータの形を、こちらが指定して送る**。返ってくるのは指定した項目だけ。
- 関連データも**1回のリクエストでまとめて**取れる。

問い合わせ（クエリ）はこんな見た目:

```graphql
query {
  movie(id: 1) {
    title          # 欲しい項目だけ並べる
    releaseDate
    genres {       # 関連データも同じクエリで
      name
    }
  }
}
```

「メニューから欲しい料理だけ注文する」イメージ。REST は「定食（出てくる中身は固定）」、GraphQL は「アラカルト」。

## 5-3. Apollo Client とは

GraphQL のクエリを「投げて・受け取って・キャッシュする」ためのクライアントライブラリ。React 用のフック（`useQuery` など）を提供していて、これがチームの採用品。

主な役割:

- クエリをサーバーに送り、結果・ローディング・エラーをまとめて返す
- 取得済みデータを**キャッシュ**し、同じデータの再取得を省く（速くなる）

## 5-4. 手を動かす（公開 GraphQL API で）

認証不要の公開 GraphQL API を使うと手軽。ここでは **Rick and Morty API**（`https://rickandmortyapi.com/graphql`）を例にする。

### 手順1: 別プロジェクト or ブランチを用意

本編の movie-app を壊さないよう、練習用に新しい Vite プロジェクトを作るのがおすすめ:

```bash
npm create vite@latest graphql-practice -- --template react-ts
cd graphql-practice
npm install @apollo/client graphql
```

### 手順2: Apollo を設定して全体をくるむ

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import App from "./App";

const client = new ApolloClient({
  uri: "https://rickandmortyapi.com/graphql",
  cache: new InMemoryCache(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </StrictMode>
);
```

- `ApolloClient` … 通信先（`uri`）とキャッシュ（`InMemoryCache`）を設定した本体。
- `ApolloProvider` … アプリ全体を包み、どのコンポーネントからもクエリを打てるようにする（第1章で Zustand を「外の保管庫」と呼んだのと同様、Apollo も外側で用意する）。

### 手順3: `useQuery` でデータを取る

`src/App.tsx`:

```tsx
import { gql, useQuery } from "@apollo/client";

// 欲しいデータの形を宣言する
const GET_CHARACTERS = gql`
  query {
    characters {
      results {
        id
        name
        image
      }
    }
  }
`;

function App() {
  const { loading, error, data } = useQuery(GET_CHARACTERS);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  return (
    <ul>
      {data.characters.results.map((c: { id: string; name: string; image: string }) => (
        <li key={c.id}>
          <img src={c.image} width={40} alt={c.name} /> {c.name}
        </li>
      ))}
    </ul>
  );
}

export default App;
```

`useQuery` が `loading` / `error` / `data` をまとめて返してくれる点に注目。第2章で loader が無いと自前で書く必要があった「ローディング・エラー・データ」の3状態が、Apollo では最初から揃っている。

## 5-5. 体感してほしいこと

1. クエリの `name` や `image` を**消したり足したり**して、返ってくるデータがその通り変わるのを見る（＝欲しい項目を自分で決められる）。
2. ブラウザの開発者ツール → Network で、**リクエストが1つのURL（/graphql）に対する POST** であることを確認する（REST のように URL が変わらない）。
3. 同じクエリを2回表示すると、2回目はキャッシュから即返る挙動を観察する。

## 5-6. 完了チェック

- [ ] REST と GraphQL の違いを「欲しい項目を指定できる/できない」で説明できる
- [ ] `ApolloProvider` が何のために全体をくるむのか説明できる
- [ ] `useQuery` が返す `loading` / `error` / `data` の3つを使えた
- [ ] クエリの項目を変えると結果が変わることを自分で確認した

---

## おわりに

第1〜4章で、お気に入り機能を通じて **状態管理（Zustand）・ルーティング（Data Router）・構成と型・テスト** という Lv2 のコアを一通り体験した。第5章で GraphQL の感覚もつかんだ。

ここまで来たら、あとは:

- 各章の差分を、例の「スタックを縛った」プロンプトで AI レビューに通して指摘を取り込む
- 入社後はチームの既存リポジトリを読み、本書で身につけた「型・分割・テスト・状態の置き場所」の観点で**意図を読み解く**

教科書はゴールではなく地図。実際に手を動かして詰まって直す、その回数がそのまま実力になる。
