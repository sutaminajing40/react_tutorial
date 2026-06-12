# 第5章（別枠）Apollo Client / GraphQL 入門

## この章でやること

チームのデータ取得の主役は **Apollo Client（GraphQL）** です。ただし、これまで使ってきた TMDB は REST API なので、お気に入り映画アプリの中では GraphQL を自然に練習できません。そこでこの章は本編から切り離した**独立の小さなお試し**として、GraphQL の感覚をつかむことを目的にします。

- REST と GraphQL の違いを「定食 vs アラカルト」で理解する
- Rick and Morty の公開 GraphQL API に Apollo Client でつないでデータを取る
- クエリを変えると返ってくるデータが変わる体験をする
- 変数付きクエリ・loading/error の UI など、実務で必ず使うパターンを練習する

> 「なんとなく分かる」まで行ければ十分です。この章の課題は movie-app ではなく、別プロジェクトで行います。

---

## 1. REST と GraphQL の違い（考え方）

これまでの REST（TMDB）はこうでした:

- **URL がデータの種類を決める**。`/movie/popular` なら人気映画、`/movie/123` なら詳細。
- 返ってくる**項目はサーバーが決める**。詳細を取ると、欲しくない `production_companies` なども全部ついてくる（第2章で見た巨大な型を思い出してください）。
- 関連データが欲しいと**何度もリクエスト**することがある（映画 → そのキャスト → 各俳優…）。

GraphQL はこう変わります:

- **エンドポイントは基本1つ**（例: `/graphql`）。
- **欲しいデータの形を、こちらが指定して送る**。返ってくるのは指定した項目だけ。
- 関連データも**1回のリクエストでまとめて**取れる。

> **「定食 vs アラカルト」**: REST はメニューが決まった定食（出てくる中身は固定）、GraphQL は欲しい料理だけ注文するアラカルト。

問い合わせ（クエリ）はこんな見た目です:

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

---

## 2. Apollo Client とは

GraphQL のクエリを「投げて・受け取って・キャッシュする」ためのクライアントライブラリです。React 用のフック（`useQuery` など）を提供しており、これがチームの採用品です。

主な役割:

- クエリをサーバーに送り、結果・ローディング・エラーをまとめて返す
- 取得済みデータを**キャッシュ**し、同じデータの再取得を省く（速くなる）

`useQuery` が返す `loading`・`error`・`data` の3状態は、第2章で loader が無いと自前で書く必要があったローディング・エラー・データの管理を、Apollo が最初から提供してくれています。

---

## 3. セットアップ（手順）

本編の movie-app を壊さないよう、練習用に新しい Vite プロジェクトを作ります。

### 手順1: 別プロジェクトを用意する

```bash
npm create vite@latest graphql-practice -- --template react-ts
cd graphql-practice
npm install @apollo/client@3 graphql
```

> `@3` を付けてバージョン3系を入れています。2025年リリースの v4 では `useQuery` などの import 元が `@apollo/client/react` に分離されるなど書き方が変わりました。本書（とチームの既存コード）は v3 の書き方を前提にしています。

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
- `ApolloProvider` … アプリ全体を包み、どのコンポーネントからもクエリを打てるようにする（第1章で Zustand を「外の保管庫」と呼んだのと同様、Apollo も外側で用意します）。

---

## 4. 最小例で使い方を見る

> これは**読んで理解すれば OK**です。次の課題で実際に書きます。

Rick and Morty API でキャラクター一覧を取得する最小例です（`locations` や `episodes` は課題で自分で書きます）。

```tsx
// src/App.tsx
import { gql, useQuery } from "@apollo/client";

const GET_EPISODES = gql`
  query {
    episodes {
      results {
        id
        name
        air_date
      }
    }
  }
`;

type Episode = { id: string; name: string; air_date: string };

function App() {
  const { loading, error, data } = useQuery(GET_EPISODES);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  return (
    <ul>
      {data.episodes.results.map((e: Episode) => (
        <li key={e.id}>{e.name}（{e.air_date}）</li>
      ))}
    </ul>
  );
}

export default App;
```

`episodes`（エピソード）は課題の答えにならないよう、キャラクター（`characters`）とは別のデータを使っています。構造は同じです。

---

## 5. やってみよう（課題）

### 課題 5-1: キャラクター一覧を表示する

**要件**:

- `src/App.tsx` に `GET_CHARACTERS` クエリを書き、`name` と `image` を取得する
- `useQuery` の `loading`・`error`・`data` を使って3状態をすべてハンドリングする
- 名前と画像（40px）を `<ul><li>` で表示する

**受け入れ条件**:

- `npm run dev` でブラウザを開くと Rick and Morty のキャラクター名と画像が並ぶ
- 読み込み中は「読み込み中...」と表示される
- ブラウザの開発者ツール → Network タブを見て、リクエストが `https://rickandmortyapi.com/graphql` への POST 1件だけであることを確認できる

**使うもの**: `gql`, `useQuery`, `ApolloProvider`（main.tsx で設定済み）

<details><summary>💡 ヒント1（方針）</summary>

`gql` テンプレートリテラルの中に GraphQL クエリを書きます。`characters { results { id name image } }` という形です。`useQuery(GET_CHARACTERS)` が `{ loading, error, data }` を返すので、順番に条件分岐します。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
import { gql, useQuery } from "@apollo/client";

const GET_CHARACTERS = gql`
  query {
    characters {
      results {
        # TODO: 欲しいフィールドを書く
      }
    }
  }
`;

function App() {
  const { loading, error, data } = useQuery(GET_CHARACTERS);

  if (loading) return /* TODO */;
  if (error) return /* TODO */;

  return (
    <ul>
      {data.characters.results.map((c: /* TODO: 型 */) => (
        <li key={c.id}>
          {/* TODO: 画像と名前を表示 */}
        </li>
      ))}
    </ul>
  );
}
```

</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/App.tsx
import { gql, useQuery } from "@apollo/client";

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

**なぜこう書くか**: `useQuery` が `loading`・`error`・`data` の3状態をまとめて返してくれます。第2章で loader が無いと自前で書く必要があった「ローディング・エラー・データ」の管理が、Apollo では最初から揃っています。

</details>

---

### 課題 5-2: クエリのフィールドを変えてレスポンスの変化を観察する

**要件**（観察課題）:

1. `GET_CHARACTERS` クエリの `image` フィールドを削除して保存し、レスポンスから画像データが消えることを確認する
2. 逆に `status`（生存・死亡・不明のステータス）フィールドを追加して、データに `status` が入ることを確認する
3. Network タブで、どちらの場合も POST リクエストは1件（`/graphql`）だけであることを確認する
4. 確認できたら `status` を表示に追加して残す

**受け入れ条件**:

- フィールドを削除するとレスポンスのデータもなくなり、追加するとデータが増えることを自分で観察できた
- 「欲しい項目を自分で決められる」という GraphQL の感覚を体験できた

**使うもの**: クエリの編集のみ（コードの構造変更なし）

<details><summary>💡 ヒント1（方針）</summary>

`gql` の中に `status` を書き足すだけです。追加したフィールドは `data.characters.results[0].status` で取れます。Network タブで「Preview」タブを開くと、レスポンスの JSON 構造をリアルタイムで確認できます。

</details>

<details><summary>✅ 解答例</summary>

```graphql
query {
  characters {
    results {
      id
      name
      image
      status   # ← 追加するとレスポンスに含まれる
    }
  }
}
```

表示への組み込み例:

```tsx
<li key={c.id}>
  <img src={c.image} width={40} alt={c.name} />
  {c.name}（{c.status}）
</li>
```

**なぜこう書くか**: これが GraphQL の本質です。`status` を追加した瞬間にサーバーがその値を返してきます。REST では「全部入りのレスポンス」が決まっていますが、GraphQL では「欲しいものだけ」をクエリに書きます。

</details>

---

### 課題 5-3: `locations` クエリを自分で書く

**要件**:

- Rick and Morty API の `locations` エンドポイントを使い、場所（名前・種類）の一覧を表示する
- 既存の `GET_CHARACTERS` クエリとは**別のコンポーネント**として `LocationList.tsx` を作り、`App.tsx` から読み込む
- `loading` と `error` のハンドリングも含める

**受け入れ条件**:

- ブラウザにキャラクター一覧と場所一覧が両方表示される
- `locations { results { id name type } }` の形でクエリを書き、`name` と `type` が画面に出ている

**使うもの**: `gql`, `useQuery`, 新規コンポーネントの作成

<details><summary>💡 ヒント1（方針）</summary>

課題 5-1 で作った `App.tsx` の構造をそのままコピーして `LocationList.tsx` を作り、クエリ名と取得先フィールドを `locations` に変えるだけです。Rick and Morty API のスキーマは `https://rickandmortyapi.com/graphql` をブラウザで開くと確認できます（GraphiQL という探索ツールが使えます）。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
// src/LocationList.tsx
import { gql, useQuery } from "@apollo/client";

const GET_LOCATIONS = gql`
  query {
    locations {
      results {
        # TODO: id, name, type を書く
      }
    }
  }
`;

type Location = { id: string; name: string; type: string };

function LocationList() {
  const { loading, error, data } = useQuery(GET_LOCATIONS);

  if (loading) return <p>場所を読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  return (
    <ul>
      {data.locations.results.map((loc: Location) => (
        <li key={loc.id}>
          {/* TODO: name と type を表示 */}
        </li>
      ))}
    </ul>
  );
}

export default LocationList;
```

</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/LocationList.tsx
import { gql, useQuery } from "@apollo/client";

const GET_LOCATIONS = gql`
  query {
    locations {
      results {
        id
        name
        type
      }
    }
  }
`;

type Location = { id: string; name: string; type: string };

function LocationList() {
  const { loading, error, data } = useQuery(GET_LOCATIONS);

  if (loading) return <p>場所を読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  return (
    <>
      <h2>ロケーション一覧</h2>
      <ul>
        {data.locations.results.map((loc: Location) => (
          <li key={loc.id}>
            {loc.name}（{loc.type}）
          </li>
        ))}
      </ul>
    </>
  );
}

export default LocationList;
```

`App.tsx` への組み込み:

```tsx
import LocationList from "./LocationList";

// App の return 内に追加
<LocationList />
```

</details>

---

### 課題 5-4: 変数付きクエリでキャラクター詳細を取る

**要件**:

- `GET_CHARACTER` クエリを作り、ID を変数（`$id: ID!`）で渡してキャラクターの詳細（`id`・`name`・`image`・`species`・`status`）を取得する
- `useQuery` の第2引数 `{ variables: { id: "1" } }` で ID を渡す
- `src/CharacterDetail.tsx` として作成し、`App.tsx` から読み込む

**受け入れ条件**:

- ブラウザに ID=1 のキャラクター（Rick Sanchez）の詳細情報が表示される
- クエリに `$id: ID!` という変数宣言が含まれている
- `variables` で渡す ID を `"2"` に変えると別のキャラクター（Morty Smith）の情報に切り替わる

**使うもの**: `gql`（変数付き）, `useQuery({ variables: { id: ... } })`

<details><summary>💡 ヒント1（方針）</summary>

変数付きクエリはこういう形になります:

```graphql
query GetCharacter($id: ID!) {
  character(id: $id) {
    id
    name
    ...
  }
}
```

`$id: ID!` は「`ID` 型の変数 `$id` を受け取る（`!` は必須の意味）」という宣言です。`useQuery(GET_CHARACTER, { variables: { id: "1" } })` のように呼び出します。

</details>

<details><summary>💡 ヒント2（骨組み）</summary>

```tsx
// src/CharacterDetail.tsx
import { gql, useQuery } from "@apollo/client";

const GET_CHARACTER = gql`
  query GetCharacter($id: ID!) {
    character(id: $id) {
      # TODO: 欲しいフィールドを書く
    }
  }
`;

function CharacterDetail() {
  const { loading, error, data } = useQuery(GET_CHARACTER, {
    variables: { id: "1" }, // TODO: "2" に変えると別キャラになる
  });

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  const c = data.character;
  return (
    <div>
      {/* TODO: キャラクター詳細を表示 */}
    </div>
  );
}

export default CharacterDetail;
```

</details>

<details><summary>✅ 解答例</summary>

```tsx
// src/CharacterDetail.tsx
import { gql, useQuery } from "@apollo/client";

const GET_CHARACTER = gql`
  query GetCharacter($id: ID!) {
    character(id: $id) {
      id
      name
      image
      species
      status
    }
  }
`;

type Character = {
  id: string;
  name: string;
  image: string;
  species: string;
  status: string;
};

function CharacterDetail() {
  const { loading, error, data } = useQuery(GET_CHARACTER, {
    variables: { id: "1" },
  });

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  const c: Character = data.character;
  return (
    <div>
      <h2>{c.name}</h2>
      <img src={c.image} alt={c.name} width={100} />
      <p>種族: {c.species}</p>
      <p>ステータス: {c.status}</p>
    </div>
  );
}

export default CharacterDetail;
```

**なぜこう書くか**: 変数付きクエリにすることで「どの ID のキャラクターを取るか」を呼び出し側から動的に制御できます。`variables` を props で受け取る形にすれば、クリックしたキャラクターの詳細を表示する機能にも応用できます。

</details>

---

### 課題 5-5: キャッシュを観察する

**要件**（観察課題）:

1. `CharacterDetail` の ID を `"1"` にして画面を表示 → Network タブで POST リクエストが走ることを確認する
2. 同じ ID `"1"` で再度表示（例: ページをリロードせずに ID を切り替えてまた `"1"` に戻す）→ Network タブでリクエストが走らず、キャッシュから即座に返ることを確認する
3. Apollo DevTools（Chrome 拡張）を使える場合はインストールし、キャッシュの内容を確認する

**受け入れ条件**:

- 2回目のアクセスで Network タブにリクエストが増えないことを確認できた
- 「Apollo が同じデータを再取得しない」という体験ができた

<details><summary>💡 ヒント1（方針）</summary>

`variables` の ID を変えるために、`CharacterDetail` に `id` props を追加してそれを `variables` に渡す形に改造すると確認しやすくなります。`App.tsx` で `<CharacterDetail id="1" />` → `<CharacterDetail id="2" />` → `<CharacterDetail id="1" />` と切り替えてみましょう。3回目の `id="1"` でリクエストが増えなければキャッシュが効いています。

</details>

---

## 完了チェック

- [ ] REST と GraphQL の違いを「欲しい項目を指定できる/できない」で説明できる
- [ ] `ApolloProvider` が何のために全体をくるむのか説明できる
- [ ] `useQuery` が返す `loading`・`error`・`data` の3つを使えた
- [ ] クエリの項目を変えると結果が変わることを自分で確認した（課題 5-2）
- [ ] `locations` クエリを自分で書けた（課題 5-3）
- [ ] 変数付きクエリ（`$id: ID!`）で詳細データを取得できた（課題 5-4）
- [ ] キャッシュが効いて2回目はリクエストが走らないことを確認した（課題 5-5）

---

## おわりに

第1〜4章で、お気に入り機能を通じて **状態管理（Zustand）・ルーティング（Data Router）・構成と型・テスト** という Lv2 のコアを一通り体験しました。第5章で GraphQL の感覚もつかみました。

ここまで来たら、あとは:

- 各章の差分を、例の「スタックを縛った」プロンプトで AI レビューに通して指摘を取り込む
- 入社後はチームの既存リポジトリを読み、本書で身につけた「型・分割・テスト・状態の置き場所」の観点で**意図を読み解く**

教科書はゴールではなく地図。実際に手を動かして詰まって直す、その回数がそのまま実力になります。
