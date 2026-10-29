# 名刺マッチング（モック）

社内向け名刺マッチングシステムの画面モックです。仕様は [meishi-matching-prompt.md](meishi-matching-prompt.md)。

- Supabase にはつながず、データはブラウザ内（localStorage）に保存します
- AI の API は使いません。マッチ率は [src/lib/match.ts](src/lib/match.ts) の決まったルールで計算します
- 仮データはすべて架空です（会社・氏名・メールは example ドメイン）

## 起動

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm run lint
```

## ログイン

パスワードはすべて `password`。

| メール | 役割 |
|---|---|
| dev@example.com | admin（ユーザー管理が見える） |
| member-a@example.com | 一般・営業部 |
| member-b@example.com | 一般・初回パスワード変更を求められる |
| member-c@example.com | 一般・開発部（「登録者のみ」の名刺を持つ） |

データを最初に戻すには「設定 → 初期データに戻す」。

## 画面

| パス | 内容 |
|---|---|
| /matches | トップ画面。全体のマッチ候補（内訳つき）と計算方法の説明（/ や存在しない URL はここへ移動） |
| /people | 名刺一覧（タブ: すべて / 提供側 / 求める側。両方登録の人は両方に出る。検索・並び替え・20 枚ずつ表示。右のアイコンでカード / リスト表示を切り替え、利用者ごとに覚える）。右上に「CSV インポート」（モーダルで一括取り込み）と「名刺を登録」 |
| /people/new, /people/:id/edit | 名刺の登録・編集（名刺画像が一番上。重複の警告、提供できること・求めていること・条件） |
| /people/:id | 名刺の詳細。「この人の課題に合う人」「この人の得意領域を求めている人」、重複の統合、削除 |
| /people?import=1 | CSV インポートのモーダルを開いた名刺一覧（旧 /import はここへ転送。文字コード判定、列の対応付け、プレビュー、重複検知） |
| /companies | 会社一覧（名刺登録時に自動で作られる。業種・規模・地域は「編集」で足す）。行をクリックで所属の名刺へ |
| /companies/:id | 会社に所属する名刺だけの一覧（会社の情報つき） |
| /introductions | 紹介管理。「編集」で紹介のモーダル（紹介内容・メール文面・履歴のタブ、ステータス、同意、担当、メモ）を開く。マッチ候補の「紹介候補にする」も同じモーダルで、「紹介候補に登録」を押したときだけ追加。/introductions?edit=<id> で直接開ける（旧 /introductions/:id はここへ転送） |
| /users | ユーザー管理（admin のみ。追加・初期パスワード発行・再発行・無効化と引き継ぎ） |
| /settings | タブ「個人設定」: 名前・パスワード変更・マッチ率のしきい値<br>タブ「メールテンプレート」（/settings?tab=mail）: 紹介メールのテンプレートを複数持てる（追加・タイトル・件名・本文・プレビュー・既定・削除）<br>タブ「タグ辞書」（/settings?tab=tags）: 追加・別名・統合・削除 |

## 構成

```
src/
  types/        ドメインモデルの型（本番の DB スキーマの出どころ）
  lib/          match.ts（マッチング）、normalize.ts（正規化）、csv.ts、mailTemplate.ts、util.ts
  mock/seed.ts  架空の仮データ
  context/      DataContext（モックのデータ層。画面を先に更新してから保存）
  components/   Layout・LoadingOverlay・Modal（ConfirmModal）・TagPicker など
  pages/        各画面
  styles/       tokens.css（寸法・色）、global.css、ui.ts（共通の見た目）
public/_redirects  Cloudflare Pages の SPA フォールバック
```
