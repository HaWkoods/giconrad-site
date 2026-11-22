# 擬コンラット — 数学ノート横断索引

[公開検索サイト](https://hawkoods.github.io/giconrad-site/)では、数学ノート157件を番号順・分野別・概念・手法別に検索できます。

## 公開範囲

- **公開PDF・編集可能なpLaTeX原稿**：明示的に公開を選択した第97系列の第1期6冊（計34頁・初稿・数学的校閲中）。
- **非公開の管理用リポジトリ**：残り151件のPDF・原稿・内部査読記録。検索サイトには題名・概要・分類等のみ公開し、PDFリンクは従来どおりGitHubの閲覧権限を必要とします。
- **Google Driveの専門書・参考文献等は公開リポジトリに置きません。**

公開は数学的な完成認定や利用者による最終承認を意味しません。公開リポジトリのGit履歴も公開されることに注意してください。

## 公開pLaTeX自動ビルド

`public_notes/` の原稿変更でGitHub Actionsが起動し、変更された原稿だけに `platex` を2回、`dvipdfmx` を実行してPDFを更新します。公開リポジトリのみを使うため、PrivateリポジトリのActions実行枠に依存しません。

詳しくは [自動ビルド・公開範囲の説明](docs/public_build.md) を参照してください。

## サイト内PDF閲覧

公開ノートは検索結果の「サイト内で読む」から [ページ画像ビューア](viewer.html) を開けます。各ノートの詳細ページには冒頭3ページの画像プレビューを設けています。PDF.jsを使ってPDFの各ページをCanvas画像に描画するため、ブラウザのPDFビューワーは埋め込みません。画像表示にはJavaScriptとPDF.js配信元へのアクセスが必要です。PDFファイルの直接表示・保存リンクも残しています。

非公開ノートは対象外であり、公開PDFの索引に登録されている6冊のみ表示します。

## 全157冊の公開同期（要初回認証設定）

検索索引は157冊です。うち6冊は従来から公開され、残り151冊も一般公開する方針です。管理用の `HaWkoods/giconrad` は**非公開のまま**維持します。外部専門書・内部査読記録・作業ファイルは公開しません。

`.github/workflows/publish_all_notes.yml` を手動実行すると、Privateリポジトリの `notes/` から **索引に登録された157冊のPDFとTeXだけ** を `public_notes/` にコピーし、`data/public_pdf_links.json` に157冊分の公開リンクを生成して、サイトに反映します。公開ノートには引き続き「初稿・数学的校閲中」と表示します。公開は数学的完成認定ではありません。

**初回実行に必要な設定:** 公開サイトリポジトリの Settings → Secrets and variables → Actions に、Fine-grained personal access token を `GICONRAD_SOURCE_TOKEN` という名前で登録してください。トークンは非公開リポジトリ `HaWkoods/giconrad` の Contents: Read-only 権限を持つものとし、公開サイトへの書き込み権限は必要ありません（公開サイトへの書き込みには Actions の `GITHUB_TOKEN` を使います）。登録後に Actions → Publish all catalogued note PDFs and sources → Run workflow を実行します。

トークン未登録時は同期ワークフローが明示的に失敗します。この状態では全冊が公開されたことにはなりません。
