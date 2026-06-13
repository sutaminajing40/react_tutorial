# 第6章（発展）Rails で GraphQL API を作り、フロントとつなぐ

## この章でやること

これは**読んで地図を持つための発展章**です。第1〜5章までで「フロントを作る・GraphQL を使う」側はやりました。この章では、自分で**バックエンド（Rails）の GraphQL API を作り**、movie-app をそこに繋ぎます。

完成イメージ:

- Rails が `/graphql` というエンドポイントで映画データを返す
- movie-app の Apollo Client の接続先を、Rick and Morty から**自作の Rails API** に差し替える
- フロント（第1〜5章）とバック（Rails）が GraphQL でつながり、「フルスタックで一周」する

> 手を動かすのは **Rails の基礎（別途 Rails チュートリアル）を終えてから**にしてください。この章は順番と勘所を示す地図です。各課題は別プロジェクト（Rails アプリ）で行います。

---

## 1. なぜバックエンドまで作るのか

Zext の構成は **Rails バックエンド ← GraphQL → React フロント** で、データ取得は **GraphQL が主役**です。

ところが第5章は他人の API（Rick and Morty）を**使うだけ**でした。GraphQL の「使う側（クライアント）」しか触れていません。GraphQL の本当の姿は、

- **サーバー側**: スキーマで「どんな型のデータがあるか」を定義し、`query`（読み取り）と `mutation`（書き込み）を実装する
- **クライアント側**: そのスキーマに対して「欲しい形」を問い合わせる

の**両側がかみ合って**初めて分かります。自分でスキーマと resolver を書くと、第5章で「おまじない」だったクエリの意味が腑に落ちます。

そして Level 2 の本質は「**既存コードの意図を正しく汲み取る**」こと。フロントとバックの**接続**を一度自分で作っておくと、入社後にチームのコードを読むときの解像度が段違いになります。

---

## 2. 最小例で全体像を見る

> これは読んで理解すれば OK。手元で動かさなくてよいです。

Rails で GraphQL を扱うときは **`graphql-ruby`** という gem を使います。「本」を返す最小スキーマの形を見てみましょう（movie とは別題材です）。

**サーバー側（型を定義する）**

```ruby
# app/graphql/types/book_type.rb
class Types::BookType < Types::BaseObject
  field :id, ID, null: false
  field :title, String, null: false
  field :author, String, null: false
end
```

```ruby
# app/graphql/types/query_type.rb
class Types::QueryType < Types::BaseObject
  field :books, [Types::BookType], null: false

  def books
    Book.all   # ActiveRecord でDBから取るだけ
  end
end
```

**クライアント側（欲しい形を問い合わせる）**

```graphql
query {
  books {
    title     # 欲しい項目だけ並べる（第5章と同じ）
    author
  }
}
```

ポイントは、**サーバーが「型」を決め、クライアントが「欲しい形」を選ぶ**こと。REST のように URL がデータを固定するのではなく、1つのエンドポイント（`/graphql`）に対してクライアントが形を指定します。これが第5章で見た「定食 vs アラカルト」のサーバー側の正体です。

---

## 3. やってみよう（ロードマップ課題）

**前提の順番**:

```
Rails チュートリアル（基礎）
  → 第1〜5章（このフロント教科書）
    → 6-1〜6-5（この章）
```

Rails の MVC・モデル・マイグレーションが分かっている状態から始めます。最初は**認証なし**（誰のお気に入りか、は考えない）で「映画一覧を GraphQL で返す」ことに集中してください。認証まで入れると一気に難しくなります。

---

### 課題 6-1: Rails に GraphQL のエンドポイントを生やす

**要件**:
- 練習用の新しい Rails アプリ（API モード可）を用意する
- `graphql` gem を入れ、`/graphql` エンドポイントを作る

**受け入れ条件**:
- ブラウザで `http://localhost:3000/graphiql`（開発用の探索ツール）が開く
- GraphiQL から最初から用意されるサンプルクエリ（`testField` など）が実行できる

**使うもの**: `graphql` gem, `rails generate graphql:install`

<details><summary>💡 ヒント1（方針）</summary>

`graphql-ruby` は導入ジェネレータが用意されています。`Gemfile` に `gem "graphql"` を足して `bundle install` → `rails generate graphql:install` を実行すると、`app/graphql/` 一式・`GraphqlController`・`/graphql` ルート・開発用の GraphiQL が自動生成されます。まずは生成物が動くことだけ確認すれば OK です。
</details>

<details><summary>✅ 解答例（方針）</summary>

```bash
# Gemfile に gem "graphql" を追加してから
bundle install
rails generate graphql:install
rails server
```

`config/routes.rb` に `post "/graphql", to: "graphql#execute"` と、開発環境用の GraphiQL マウントが追加されます。`app/graphql/types/query_type.rb` に最初から `testField` があるので、GraphiQL で `query { testField }` が返れば成功です。

**なぜこう書くか**: 自分でゼロからコントローラを書くのではなく、gem の規約（CoC: 設定より規約）に乗るのが Rails Way。生成物の構造を読むこと自体が「既存コードを読む」練習になります。
</details>

---

### 課題 6-2: `movies` を返す Query を作る

**要件**:
- `Movie` モデル（`title` などのカラム）を作り、数件のデータを seed で入れる
- `Types::MovieType` を定義する（`id`・`title`・`posterPath` など）
- `QueryType` に `movies` フィールドを追加し、一覧を返す

**受け入れ条件**:
- GraphiQL で `query { movies { id title } }` を実行すると、seed したデータが返る
- 欲しいフィールドを増減すると、レスポンスもそれに追従する（第5章の体験のサーバー側）

**使うもの**: `rails generate model`, `db/seeds.rb`, `Types::BaseObject`, `field`

<details><summary>💡 ヒント1（方針）</summary>

GraphQL の型（`MovieType`）と DB のモデル（`Movie`）は別物です。`MovieType` の `field` 名はキャメルケース（`posterPath`）で書くと、graphql-ruby が自動で Ruby 側のスネークケース（`poster_path`）に対応づけてくれます。第3章でやった「API の生型とアプリ内型の分離」と同じ発想が、サーバー側にもあります。
</details>

<details><summary>✅ 解答例（方針）</summary>

```ruby
# app/graphql/types/movie_type.rb
class Types::MovieType < Types::BaseObject
  field :id, ID, null: false
  field :title, String, null: false
  field :poster_path, String, null: true   # クライアントには posterPath として見える
end
```

```ruby
# app/graphql/types/query_type.rb
class Types::QueryType < Types::BaseObject
  field :movies, [Types::MovieType], null: false

  def movies
    Movie.all
  end
end
```

**なぜこう書くか**: `def movies` が第5章で言う「resolver（その項目をどう取ってくるか）」です。ここでは `Movie.all` で全件返すだけですが、引数（`field :movie, Types::MovieType, null: true do; argument :id, ID, required: true; end`）を足せば、第5章 課題5-4 でやった**変数付きクエリ**のサーバー側になります。
</details>

---

### 課題 6-3: ★ Apollo の接続先を自作 API に差し替える（この章の山）

**要件**:
- movie-app（または第5章の練習アプリ）の Apollo Client の `uri` を、自作 Rails API（`http://localhost:3000/graphql`）に向ける
- Rails 側で **CORS** を許可する
- フロントから `movies` を取得して画面に表示する

**受け入れ条件**:
- React 画面に、Rails の DB に入れた映画が GraphQL 経由で表示される
- ブラウザの Network タブで、リクエスト先が `localhost:3000/graphql` になっている
- CORS エラー（コンソールの赤）が出ていない

**使うもの**: `ApolloClient` の `uri`, `rack-cors` gem

<details><summary>💡 ヒント1（方針）</summary>

フロント（Vite, 例: `localhost:5173`）と Rails（`localhost:3000`）は**別オリジン**なので、そのままだとブラウザがブロックします（CORS エラー）。Rails 側に `rack-cors` を入れ、開発中はフロントのオリジンからのアクセスを許可します。Apollo 側は `uri` を変えるだけ。**接続が一番つまずくのはここ**なので、エラーが出たらまず「CORS か / uri が正しいか / Rails が起動しているか」を順に疑ってください。
</details>

<details><summary>✅ 解答例（方針）</summary>

```ts
// フロント側: Apollo の接続先を差し替えるだけ
const client = new ApolloClient({
  uri: "http://localhost:3000/graphql",
  cache: new InMemoryCache(),
});
```

```ruby
# Rails 側: config/initializers/cors.rb（開発用）
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:5173"   # Vite のオリジン
    resource "/graphql", headers: :any, methods: [:post, :options]
  end
end
```

**なぜこう書くか**: ここまで来ると、第5章で「他人の API」だったものが「自分が作った API」に変わります。フロントの `useQuery` と、バックの resolver が、GraphQL のスキーマを介して**一本の線でつながった**瞬間です。これが Zext の構成そのもの。
</details>

---

### 課題 6-4: `mutation` でお気に入りを保存する

**要件**:
- Rails に `addFavorite`（または `toggleFavorite`）の **mutation** を作る
- フロントから `useMutation` で呼び、お気に入りを **DB に保存**する
- 第1章の Zustand は「ブラウザ内の状態」だったが、ここでは「サーバーに永続化」する違いを体感する

**受け入れ条件**:
- ボタンを押すと mutation が飛び、Rails の DB にお気に入りが1件増える
- ページをリロードしても（localStorage ではなく）サーバーから取得して残っている

**使うもの**: `Mutations::BaseMutation`, graphql-ruby の `field`（mutation_type）, `useMutation`（Apollo）

<details><summary>💡 ヒント1（方針）</summary>

`query` が「読み取り」なら `mutation` は「書き込み」です。サーバー側は `app/graphql/mutations/` に mutation クラスを作り、`MutationType` に登録します。フロント側は `useQuery` の書き込み版 `useMutation` を使い、`const [addFavorite] = useMutation(ADD_FAVORITE)` のように呼びます。第5章では `useQuery` しか触れていないので、ここが新しい部分です。
</details>

<details><summary>✅ 解答例（方針）</summary>

```ruby
# app/graphql/mutations/add_favorite.rb
class Mutations::AddFavorite < Mutations::BaseMutation
  argument :movie_id, ID, required: true
  field :movie, Types::MovieType, null: false

  def resolve(movie_id:)
    movie = Movie.find(movie_id)
    Favorite.find_or_create_by(movie: movie)   # 重複防止は第1章の add と同じ発想
    { movie: movie }
  end
end
```

```ts
// フロント側
const ADD_FAVORITE = gql`
  mutation AddFavorite($movieId: ID!) {
    addFavorite(input: { movieId: $movieId }) {
      movie { id title }
    }
  }
`;
const [addFavorite] = useMutation(ADD_FAVORITE);
// onClick={() => addFavorite({ variables: { movieId: movie.id } })}
```

**なぜこう書くか**: 第1章では「お気に入り」を Zustand（クライアント側）に持ち、`persist` で localStorage に保存しました。実務では**サーバーの DB に保存**して、別端末からでも見られるようにします。クライアント状態（Zustand）とサーバー状態（GraphQL）の**使い分け**が見えてくると、フロントの設計力が一段上がります。
</details>

---

### 課題 6-5: N+1 問題を観察して潰す（発展）

**要件**（観察＋改善課題）:
- `movies` に「関連データ（例: ジャンル）」を持たせ、一覧で各映画のジャンルも取得する
- Rails のログを見て、映画の件数だけ追加の SQL が飛ぶ（N+1）ことを確認する
- batch loading で SQL の本数を減らす

**受け入れ条件**:
- 改善前: 映画 N 件に対して `1 + N` 本の SQL がログに出る
- 改善後: SQL の本数が大幅に減っている

**使うもの**: Rails のクエリログ, graphql-ruby の Dataloader（または `graphql-batch` gem）

<details><summary>💡 ヒント1（方針）</summary>

GraphQL は「ネストしたデータを1クエリで取れる」のが利点ですが、サーバー側の resolver を素朴に書くと、親1件ごとに子を取る SQL が走って**爆発**します（N+1）。これは GraphQL に限らず ORM 全般の定番問題で、実務で必ず出会います。graphql-ruby には標準で `Dataloader` の仕組みがあり、まとめて取る（batch）ことで解決できます。まずは**ログで N+1 を自分の目で見る**ことが大事です。
</details>

---

## 完了チェック

- [ ] Rails で `/graphql` を立ち上げ、GraphiQL でクエリを実行できた
- [ ] `movies` を返す Query type と resolver を自分で書けた
- [ ] movie-app の Apollo を自作 API に向け、CORS を越えてデータを表示できた（★接続）
- [ ] `mutation` で「サーバーに永続化する」お気に入りを実装できた
- [ ] クライアント状態（Zustand）とサーバー状態（GraphQL）の使い分けを説明できる
- [ ] N+1 問題が何か、なぜ起きるかを自分の言葉で説明できる

---

## おわりに

第1〜5章で「React フロント（状態・ルーティング・構成・型・テスト・GraphQL を使う側）」を、この第6章で「Rails バックエンド（GraphQL を作る側）と、その接続」を一周しました。これで Zext の確定スタック——**Rails ← GraphQL → React**——の全体像を、地図ではなく**自分の手で通った道**として持てます。

ここから先は:

- 認証（誰のお気に入りか）・ページネーション・エラー設計など、実務の「面倒だが避けられない部分」へ
- 入社後はチームの既存リポジトリを読み、本書で身につけた観点（型・分割・テスト・状態の置き場所・スキーマ設計）で**意図を読み解く**

教科書はゴールではなく地図。詰まって直した回数が、そのまま実力になります。
