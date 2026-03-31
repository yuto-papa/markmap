# markmap

[![Join the chat at https://gitter.im/gera2ld/markmap](https://badges.gitter.im/gera2ld/markmap.svg)](https://gitter.im/gera2ld/markmap?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Visualize your Markdown as mindmaps.

This project is heavily inspired by [dundalek's markmap](https://github.com/dundalek/markmap).

👉 [Try it out](https://markmap.js.org/repl).

## Related Projects

Markmap is also available in:

- [VSCode](https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode) and [Open VSX](https://open-vsx.org/extension/gera2ld/markmap-vscode)
- Vim / Neovim:
  - [coc-markmap](https://github.com/gera2ld/coc-markmap) ![NPM](https://img.shields.io/npm/v/coc-markmap.svg) - powered by [coc.nvim](https://github.com/neoclide/coc.nvim)
  - [markmap.vim](https://github.com/Zeioth/markmap.nvim): for using without [coc.nvim](https://github.com/neoclide/coc.nvim)
- Emacs: [eaf-markmap](https://github.com/emacs-eaf/eaf-markmap) -- powered by [EAF](https://github.com/emacs-eaf/emacs-application-framework)
- MCP Server: [markmap-mcp-server](https://github.com/jinzcdev/markmap-mcp-server) [![NPM Version](https://img.shields.io/npm/v/@jinzcdev/markmap-mcp-server.svg)](https://www.npmjs.com/package/@jinzcdev/markmap-mcp-server) - powered by [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Usage

👉 [Read the documentation](https://markmap.js.org/docs) for more detail.

---

## Markmap AI Desktop App (Electron)

`packages/app` に Markmap と AI チャット（Claude CLI / Gemini CLI / Copilot Web / Perplexity Web）を統合したデスクトップアプリが含まれます。

### セットアップ

```powershell
# monorepo ルートで依存関係をインストール（node-pty の native ビルドを含む）
pnpm install

# node-pty を手動再ビルドする場合（環境によって必要）
pnpm --filter @markmap/app run rebuild-pty
```

### 開発サーバー起動

```powershell
pnpm --filter @markmap/app run dev
```

### プロダクションビルド

```powershell
# Electron アプリ（.exe インストーラー）
pnpm --filter @markmap/app run build

# Web パッケージのみビルド（既存 markmap ライブラリ）
pnpm build
```

### テスト

```powershell
# Electron アプリのユニット + IPC テスト
pnpm --filter @markmap/app run test

# Web ライブラリのテスト（既存）
pnpm test
```

### 主な機能

- Markdown エディタ（CodeMirror）とマインドマップのリアルタイム同期
- ノード右クリックメニューから AI ツール起動
  - **Claude CLI / Gemini CLI**：下部ターミナルパネルで起動（node-pty + xterm.js）
  - **Copilot / Perplexity**：ブラウザで開く（過去 URL があれば再利用）
- ノードごとの AI 会話履歴を `.ai-history/` に保存
- プロジェクト履歴（`~/.thinktool/recent.json`）