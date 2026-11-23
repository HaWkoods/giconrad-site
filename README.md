# 擬コンラット — 数学ノート横断索引

[公開検索サイト](https://hawkoods.github.io/giconrad-site/)では、数学ノート160件を番号順・分野別・概念・手法別に検索できます。うち157件はPDF・pLaTeX本文を公開済み、3件は内容索引のみです。日本語・英語の別名検索と、根拠付き関連性の表示に対応しています。

## 公開範囲

- **公開PDF・編集可能なpLaTeX原稿**：公開済みの157冊（初稿・数学的校閲中を含む）。ほか3件は検索用メタデータのみ。
- **非公開の管理用リポジトリ**：原稿の作業履歴・内部査読記録・運用資料などは引き続き非公開。公開サイトには指定した157冊のPDFとpLaTeXソースのみ複製します。
- **Google Driveの専門書・参考文献等は公開リポジトリに置きません。**

公開は数学的な完成認定や利用者による最終承認を意味しません。公開リポジトリのGit履歴も公開されることに注意してください。

## 公開pLaTeX自動ビルド

`public_notes/` の原稿変更でGitHub Actionsが起動し、変更された原稿だけに `platex` を2回、`dvipdfmx` を実行してPDFを更新します。公開リポジトリのみを使うため、PrivateリポジトリのActions実行枠に依存しません。

詳しくは [自動ビルド・公開範囲の説明](docs/public_build.md) を参照してください。

## サイト内PDF閲覧

公開ノートは検索結果の「サイト内で読む」から [ページ画像ビューア](viewer.html) を開けます。各ノートの詳細ページには冒頭3ページの画像プレビューを設けています。PDF.jsを使ってPDFの各ページをCanvas画像に描画するため、ブラウザのPDFビューワーは埋め込みません。画像表示にはJavaScriptとPDF.js配信元へのアクセスが必要です。PDFファイルの直接表示・保存リンクも残しています。

PDF・TeXの公開が認められた157冊が閲覧対象です。索引のみの3件には本文閲覧リンクを表示しません。

## 全157冊の公開同期（要初回認証設定）

検索索引の157冊は、PDFとpLaTeX原稿の両方を一般公開済みです。管理用の `HaWkoods/giconrad` は**非公開のまま**維持します。外部専門書・内部査読記録・作業ファイルは公開しません。

`.github/workflows/publish_all_notes.yml` を手動実行すると、Privateリポジトリの `notes/` から **既に公開を許可した157冊（`data/public_pdf_links.json` のID）のPDFとTeXだけ** を `public_notes/` にコピーし、`data/public_pdf_links.json` に157冊分の公開リンクを生成して、サイトに反映します。公開ノートには引き続き「初稿・数学的校閲中」と表示します。公開は数学的完成認定ではありません。

**今後の原稿更新をまとめて同期する場合の初回設定（今回の公開自体には不要）:** 公開サイトリポジトリの Settings → Secrets and variables → Actions に、Fine-grained personal access token を `GICONRAD_SOURCE_TOKEN` という名前で登録してください。トークンは非公開リポジトリ `HaWkoods/giconrad` の Contents: Read-only 権限を持つものとし、公開サイトへの書き込み権限は必要ありません（公開サイトへの書き込みには Actions の `GITHUB_TOKEN` を使います）。登録後に Actions → Publish all catalogued note PDFs and sources → Run workflow を実行します。

トークン未登録時は将来の一括同期ワークフローが実行できません。既に公開済みの157冊の閲覧には影響しません。

## 概念・数学的関連性の索引

- [概念IDと日英同義語](data/concepts.json)
- [根拠・関連度・確認状況を含む関連性](data/relations.json)
- [JSON仕様書](data/index_schema.json)
- [更新・検証報告](docs/search_index_update_20261123.md)

既存の `data/details.json` の前提・後続は推奨読書順です。
`data/relations.json` の `prerequisite` は別属性で、明示的な数学的関係だけを記録しています。
`要確認` は確認済みとして扱いません。本文・証明は引き続き数学的校閲中です。

## 主要定理ロードマップ

[`roadmap.html`](roadmap.html) から、12の大分野→小分野→主要定理・主題→公開ノートという階層で学習できます。既存 `data/notes.json`、`data/details.json`、`data/taxonomy.json` を参照し、前提・次のノートは推奨読書順で示します。主題は索引160件を対象とし、主要定理名は代表的なものに付与しています。論理的な定理間依存関係の完全な表現ではありません。

### 放射状の前提マップ

`roadmap.html` では、ノートを選択すると目標を中央に置いた放射状マップを表示します。円形ノードを押して一段ずつ前提を展開・折りたたみでき、ドラッグ移動・マウスホイールでのズーム・全体表示・目標ノートの再設定に対応します。強い前提は実線、弱い前提は点線、未判定の推奨読書順は破線で区別します。ノードと辺は `data/roadmap_graph.json` を参照し、未査読の辺を勝手に強い前提へ変更しません。現時点のノードはノートと概念であり、定理単位への精密化は今後の作業です。
