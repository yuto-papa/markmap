# ThinkTool が生成するファイル

このドキュメントでは、ThinkTool を使用したときに作成・更新されるファイルをすべて説明します。

---

## 全体マップ

```
C:\Users\<ユーザー名>\
├── .thinktool\
│   └── recent.json              ← 最近開いたプロジェクト履歴
└── .claude\
    └── projects\
        └── <cwd-hash>\
            └── <session-id>.jsonl   ← Claude 会話ログ（Claude CLI が自動生成）

<プロジェクトフォルダ>\               ← ユーザーが指定した任意の場所
├── tree.json                    ← ノードツリー定義
├── layout.json                  ← レイアウト情報（互換性保持用）
├── <ノード名>\
│   ├── README.md                ← ノードの要約メモ
│   └── <子ノード名>\
│       ├── README.md
│       └── ...
└── ...
```

---

## 1. プロジェクトフォルダ内のファイル

### 1-1. `tree.json` ── ノードツリー定義

| 項目 | 内容 |
|---|---|
| **場所** | `<プロジェクトフォルダ>\tree.json` |
| **生成タイミング** | プロジェクト作成時（初回）。ノードの追加・削除・名前変更・セッション保存のたびに上書き |
| **更新タイミング** | ノード操作・AI セッション起動・URL 保存のたびに自動保存 |

**フォーマット例:**

```json
{
  "name": "MyProject",
  "children": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "調査テーマA",
      "expanded": true,
      "summary": "AIを使ったコード生成の調査",
      "children": [
        {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "name": "PoC実装",
          "expanded": false,
          "summary": "",
          "children": [],
          "sessions": {
            "claude": "abc123def456",
            "codex": null,
            "gemini": null,
            "copilot": null,
            "perplexity": null
          },
          "urls": []
        }
      ],
      "sessions": {
        "claude": null,
        "codex": null,
        "gemini": null,
        "copilot": "https://copilot.microsoft.com/chats/abc123",
        "perplexity": "https://www.perplexity.ai/s/xyz789"
      },
      "urls": []
    }
  ]
}
```

**フィールド説明:**

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | string | プロジェクト名（ルートフォルダ名） |
| `children` | TreeNode[] | 子ノードの配列 |
| `id` | string (UUID v4) | ノードの一意識別子。変更不可 |
| `name`（ノード） | string | ノード名。対応するサブフォルダ名と一致 |
| `expanded` | boolean | マインドマップでの展開状態 |
| `summary` | string | ノードの要約テキスト。README.md の冒頭に挿入される |
| `sessions.claude` | string \| null | Claude セッション ID（`--resume` 引数に使用） |
| `sessions.codex` | string \| null | Codex セッション ID |
| `sessions.gemini` | string \| null | Gemini セッション ID |
| `sessions.copilot` | string \| null | Microsoft Copilot のスレッド URL |
| `sessions.perplexity` | string \| null | Perplexity のスレッド URL |
| `urls` | string[] | 参考 URL の配列（将来の拡張用） |

---

### 1-2. `layout.json` ── レイアウト情報（互換性保持用）

| 項目 | 内容 |
|---|---|
| **場所** | `<プロジェクトフォルダ>\layout.json` |
| **生成タイミング** | プロジェクトを開いたとき（存在しない場合は空オブジェクト `{}` として扱う） |
| **更新タイミング** | 現バージョン（markmap UI）では自動更新しない。旧 ReactFlow 版との互換性のために保持 |

**フォーマット例:**

```json
{
  "__root__": { "x": 600, "y": 0 },
  "550e8400-e29b-41d4-a716-446655440000": { "x": 200, "y": 130 },
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8": { "x": 200, "y": 260 }
}
```

> **注意:** markmap は独自のレイアウトアルゴリズムを使用するため、このファイルの座標は現バージョンでは参照されません。

---

### 1-3. `<ノード名>\README.md` ── ノードの要約メモ

| 項目 | 内容 |
|---|---|
| **場所** | `<プロジェクトフォルダ>\<ノード名>\README.md` |
| **生成タイミング** | ノードが追加されたとき、またはツリーが保存されたとき |
| **更新タイミング** | ノードの summary・子ノードに変更があるたびに自動上書き |

**フォーマット（summary あり）:**

```markdown
# 調査テーマA

## Summary

AIを使ったコード生成の調査。
主に GitHub Copilot と Claude を比較する。

---

## Sub-topics

- PoC実装
- ベンチマーク測定
- まとめレポート
```

**フォーマット（summary なし）:**

```markdown
# 調査テーマA

## Sub-topics

- PoC実装
- ベンチマーク測定
```

**フォーマット（子ノードなし・summary なし）:**

```markdown
# PoC実装

```

> **ポイント:** summary が設定されていれば必ず先頭に `## Summary` セクションとして記載されます。  
> このファイルはユーザーが自由に追記・編集できます。ただし ThinkTool がノード操作を行うと上書きされます。

---

### 1-4. サブフォルダ構造

| 項目 | 内容 |
|---|---|
| **生成タイミング** | 子ノードを追加したとき、または CLI 起動時（`ensureFolderPath`） |
| **削除タイミング** | ノードを削除したとき（確認ダイアログ後に再帰削除） |

ノード名がそのままフォルダ名になります。使用できない文字（`\ / : * ? " < > |`）は自動的に `_` に置換されます。

**例:**

```
MyProject\
├── 調査テーマA\
│   ├── README.md
│   ├── PoC実装\
│   │   └── README.md
│   └── ベンチマーク測定\
│       └── README.md
└── 別テーマ\
    └── README.md
```

---

## 2. ユーザーホームフォルダのファイル

### 2-1. `~\.thinktool\recent.json` ── 最近のプロジェクト履歴

| 項目 | 内容 |
|---|---|
| **場所** | `C:\Users\<ユーザー名>\.thinktool\recent.json` |
| **生成タイミング** | プロジェクトを初めて開いたとき（フォルダも自動作成） |
| **更新タイミング** | プロジェクトを開くたびに先頭に追加（最大 16 件。超えた分は末尾から削除） |

**フォーマット例:**

```json
[
  {
    "path": "C:\\Users\\tosihide\\Documents\\MyProject",
    "name": "MyProject",
    "openedAt": "2026-03-28T10:30:00.000Z"
  },
  {
    "path": "C:\\Users\\tosihide\\Documents\\OldProject",
    "name": "OldProject",
    "openedAt": "2026-03-27T08:00:00.000Z"
  }
]
```

**フィールド説明:**

| フィールド | 型 | 説明 |
|---|---|---|
| `path` | string | プロジェクトフォルダの絶対パス |
| `name` | string | プロジェクト名（`tree.json` の `name` フィールドと同一） |
| `openedAt` | string (ISO 8601) | 最後に開いた日時（UTC） |

---

### 2-2. `~\.claude\projects\<hash>\<session-id>.jsonl` ── Claude 会話ログ

| 項目 | 内容 |
|---|---|
| **場所** | `C:\Users\<ユーザー名>\.claude\projects\<cwd-hash>\<session-id>.jsonl` |
| **生成・管理** | **Claude CLI が自動生成**（ThinkTool は関与しない） |
| **生成タイミング** | Claude CLI で会話を開始したとき |
| **参照タイミング** | `--resume <session-id>` で会話を再開するとき |

`<cwd-hash>` は Claude CLI が作業ディレクトリのパスから生成するハッシュ値です。  
`<session-id>` は各会話セッションの UUID で、ThinkTool では `tree.json` の `sessions.claude` フィールドに保存されます。

---

## 3. ファイル操作の安全性

### パストラバーサル防止

`README.md` の書き出しには以下のチェックが実施されます:

1. ノード名の `\ / : * ? " < > |` を `_` に置換
2. 解決済みパスが `projectPath` の配下であることを `path.resolve()` で検証
3. 検証に失敗した場合は書き込みを中止（エラーを返す）

### ファイルの競合について

| 操作 | 動作 |
|---|---|
| `tree.json` | 常に上書き保存（競合検出なし） |
| `README.md` | 常に上書き保存。手動で追記した内容は消去される |
| `layout.json` | 現バージョンでは上書きしない |
| `recent.json` | 常に上書き保存（最大 16 件） |

> **重要:** `README.md` に独自のメモを残したい場合は、summary フィールドにテキストを入力してください。  
> ファイルを直接編集した場合、次回ノード操作時に上書きされます。

---

## 4. バックアップ・移行

### プロジェクトの移動

プロジェクトフォルダをそのまま別の場所にコピーまたは移動できます。  
移動後は ThinkTool でフォルダを再度開いてください（`recent.json` に新しいパスが登録されます）。

### 共有・バージョン管理

プロジェクトフォルダを Git リポジトリとして管理することを推奨します。

`.gitignore` の推奨設定:

```gitignore
# Claude セッション ID は環境依存のため除外推奨（任意）
# tree.json と README.md はコミット対象にすると履歴が残って便利
layout.json
```

### ファイルを削除した場合の影響

| ファイル | 削除時の影響 |
|---|---|
| `tree.json` | プロジェクトを開いたときに空のツリーで再作成される |
| `layout.json` | 影響なし（markmap が自動レイアウト） |
| `README.md` | 影響なし（次回ノード操作時に再生成） |
| `~/.thinktool/recent.json` | 最近のプロジェクト一覧が消える（プロジェクト自体は影響なし） |
| ノードのサブフォルダ | ThinkTool は検知しない。`tree.json` と不整合が生じる |
