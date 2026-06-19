<div align="center">
  <img width="1200" height="475" alt="Chat Light Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 聊亮 Chat Light

> 具備深厚同理心的 AI 學習引導大師 — 幫你釐清卡住的學術名詞，或排除生活中的心靈窒礙。

[![Deploy to GitHub Pages](https://github.com/<your-username>/chat-light/actions/workflows/deploy.yml/badge.svg)](https://github.com/<your-username>/chat-light/actions/workflows/deploy.yml)

---

## ✨ 功能特色

- 🧠 **學術字詞釐清** — 不懂「邊際效應」、「光合作用」等學術名詞？逐步引導你理解並造句掌握
- 🌱 **生活卡點排除** — 完美主義、自我懷疑、感官超載？透過轉念卡片與承諾儀式重獲能量
- 🎤 **語音輸入** — 支援瀏覽器原生語音辨識
- 📖 **心靈筆記** — 對話歷程可儲存為日誌
- 🧘 **深呼吸練習** — 內建 4-7-8 深呼吸引導
- 🎴 **轉念卡片** — 翻面式認知重構卡 + 意志滑桿簽署儀式

---

## 🚀 本地開發

**需求：** Node.js 18+

```bash
# 1. 安裝相依套件
npm install

# 2. 建立本地環境變數（不會被 git commit）
cp .env.example .env.local
# 編輯 .env.local，填入你的 Gemini API Key：
# VITE_GEMINI_API_KEY="your_key_here"

# 3. 啟動開發伺服器
npm run dev
```

開啟 http://localhost:5173 即可看到 App。

> 🔑 取得 API Key：[Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 📦 Build

```bash
npm run build   # 輸出到 dist/ 資料夾
npm run lint    # TypeScript 型別檢查
```

---

## 🌐 部署到 GitHub Pages

### 一次性設定

1. **GitHub 儲存庫設定** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `GEMINI_API_KEY`
   - Value: 你的 Gemini API Key

2. **GitHub 儲存庫設定** → **Pages**
   - Source 選擇 **GitHub Actions**

3. Push 到 `main` branch，GitHub Actions 自動 Build + Deploy。

### 部署流程

```
push to main
  └─> GitHub Actions (.github/workflows/deploy.yml)
        ├─> npm ci
        ├─> npm run build  (注入 VITE_GEMINI_API_KEY)
        └─> deploy dist/ → GitHub Pages
```

部署完成後網址：`https://<your-username>.github.io/chat-light/`

> ⚠️ **安全性提醒**：GitHub Pages 是純靜態前端，API Key 會被打包進 JS bundle。
> 建議使用 [API Key 限制](https://ai.google.dev/gemini-api/docs/api-key) 功能鎖定來源網域。

---

## 📁 專案結構

```
chat-light/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署流程
├── src/
│   ├── api/
│   │   └── chat.ts             # Gemini API 呼叫封裝（前端直接呼叫）
│   ├── components/
│   │   └── ReframingCards.tsx  # 轉念卡片元件
│   ├── App.tsx                 # 主應用元件
│   ├── main.tsx                # 進入點
│   ├── types.ts                # TypeScript 型別定義
│   └── index.css               # 全域樣式
├── .env.example                # 環境變數範本（可安全 commit）
├── .gitignore
├── index.html
├── package.json
├── server.ts                   # 本地開發用 Express 伺服器（選用）
├── tsconfig.json
└── vite.config.ts              # Vite 設定（base: '/chat-light/'）
```

---

## 🛠 Tech Stack

| 技術 | 用途 |
|------|------|
| React 19 + TypeScript | 前端框架 |
| Vite 6 | 打包工具 |
| Tailwind CSS v4 | 樣式 |
| Framer Motion | 動畫 |
| @google/genai | Gemini API SDK |
| Lucide React | 圖示 |
| GitHub Actions | CI/CD |
| GitHub Pages | 靜態托管 |

---

## 📝 License

MIT
