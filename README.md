# 日本酒手帳 (Web版)

Flutter版・Swift版と同じ機能を持つ、完全無料のWebアプリ(PWA)版です。
Googleアカウントでログインし、記録はFirebase(無料枠)に保存されます。
App Store/Google Playを経由しないため、公開時の住所公開の問題は発生しません。

## 1. Firebaseプロジェクトを作る(無料)

1. https://console.firebase.google.com/ を開き、Googleアカウントでログイン
2. 「プロジェクトを作成」→ 好きな名前(例: sake-diary)を入力 → Googleアナリティクスは無効でOK
3. 左メニュー「構築」→「Authentication」→「Sign-in method」タブ →「Google」を有効化
4. 左メニュー「構築」→「Firestore Database」→「データベースの作成」→ 本番環境モードで開始(リージョンは asia-northeast1 = 東京 がおすすめ)
5. 左メニュー「プロジェクトの設定」(歯車アイコン)→「全般」タブ →「マイアプリ」→ Webアプリを追加(</>アイコン)→ アプリのニックネームを適当に入力して登録
6. 表示される `firebaseConfig` の中身をコピーする

**Storageは使いません。** Firebase StorageはBlaze(従量課金)プランへの切り替えが必要なため、
このアプリでは写真もFirestoreに直接保存する方式にしています(詳細は「写真の保存方式について」を参照)。
Sparkプラン(無料・クレジットカード登録不要)のままで完結します。

## 2. 設定値を貼り付ける

[js/firebase-init.js](js/firebase-init.js) を開き、`firebaseConfig` の値を手順1-7でコピーした内容に置き換えてください。

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

## 3. セキュリティルールを設定する(重要)

自分のデータを自分だけが読み書きできるようにするため、以下を設定してください。これをしないと、
他の人が自分のFirestoreに好きにアクセスできてしまいます。

**Firestore Database → ルール タブ**に以下を貼り付けて公開:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

このルールは `users/{uid}/` 以下のすべてのサブコレクション(記録・フォルダ・写真)に
まとめて適用されるので、Storageのルールは不要です。

## 4. Google認証の「承認済みドメイン」を確認する

Authentication →「Settings」タブ →「承認済みドメイン」に、実際に公開するドメイン
(例: GitHub Pagesなら `<ユーザー名>.github.io`)を追加してください。
`localhost` は最初から登録済みなので、ローカルでのテストはそのまま動きます。

## 5. ローカルで動作確認する

このアプリはES Modules構成のため、`index.html` を直接ダブルクリックでは動きません
(`file://` では動作しないブラウザ制限があります)。簡易サーバーを立てて確認してください。

```
# Node.jsがあれば
npx serve .

# もしくはPythonがあれば
python -m http.server 8000
```

表示されたURL(例: http://localhost:3000)をブラウザで開き、「Googleでログイン」→
記録を追加して動作を確認してください。

## 6. 公開する(無料)

コードが完成したら、下記のような無料ホスティングに `WebApp` フォルダの中身をそのままアップロードすれば公開できます。

- **GitHub Pages**: GitHubリポジトリを作成し、`WebApp` の中身をpush→ Settings → Pages でmainブランチを指定
- **Netlify / Vercel**: フォルダをドラッグ&ドロップするだけで公開できる無料プランがあります

公開後、そのドメインを手順4の「承認済みドメイン」に追加するのを忘れないでください。

公開したURLをiPhoneのSafari/AndroidのChromeで開き、共有メニューから
「ホーム画面に追加」すると、アイコンをタップしてアプリのように起動できます(PWA)。

## 写真の保存方式について

Firebase Storageを使わず、写真は `users/{uid}/photos/{photoId}` というFirestoreの
サブコレクションにBase64文字列として保存しています。Firestoreの1ドキュメントには
1MiBの上限があるため、クロップ時([js/imageCrop.js](js/imageCrop.js))に書き出しサイズが
約700KB以下になるよう、JPEG品質を自動的に段階調整しています。

- メリット: Blazeプラン(従量課金・クレジットカード登録)が不要、Sparkプラン(無料)のみで完結
- 制約: Firestoreの無料枠(合計1GiB・書き込み1日2万回など)を写真も消費します。個人の日記用途なら十分ですが、大量の写真を登録し続けると将来的に枠に近づく可能性があります

## 実装済みの機能(Flutter/Swift版との対応)

- Googleアカウントログイン、記録はアカウントに紐付いてクラウド保存(複数端末で共有可)
- 記録の追加・編集・削除、フォルダ分け、お気に入り
- 写真の複数枚登録(最大5枚)、ドラッグ&ピンチでの画角調整、拡大表示
- 精米歩合(複数の米に対応)、アルコール度数、日本酒度
- 甘辛度・香り・淡濃度のスライダー、総合評価(星)、飲み方ごとの評価
- 印象タグ(テンプレート+自由入力)
- 検索・絞り込み・並び替え
- 統計・分析(好みマップ、産地ランキング、精米度×評価、アルコール度数×評価)
- 都道府県マップ(ピンチズーム、タップで一覧表示)
- オフライン時もFirestoreのローカルキャッシュにより閲覧・入力でき、オンライン復帰時に自動同期

## 既知の制約・注意点

- 実機ブラウザでの動作確認はしていません。特に都道府県マップのピンチズーム/タップ判定、
  画像クロップのドラッグ操作は、Safari/Chrome双方で挙動を確認しながら調整が必要な可能性があります。
- PWAアイコンは `icons/` 以下のPNG(192/512/apple-touch-icon/favicon)です。デザインを
  変更したい場合はこのファイルを差し替えてください。
- Firebaseの無料枠(Sparkプラン)で個人利用には十分ですが、Firestoreには
  1日あたりの読み書き上限(各2万回程度)と合計1GiBの保存容量上限があります。
