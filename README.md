# MD Reader · 通用 Markdown 線上閱讀器

自建的純前端 Markdown 閱讀器,以 HackMD 風的白底黑字介面呈現,支援多文件、HackMD 風 TOC、相對路徑圖片、深層 hash 路由。

無後端、無建置流程;只要把 .md 檔放進子資料夾,在 `index.html` 加一行連結即可。

## 功能

- 純前端、單一 `index.html` 入口
- HackMD 風格白底黑字、無干擾排版
- 自動產生左側 HackMD 風 TOC,並支援滾動高亮(scroll-spy)
- Markdown 中的相對路徑圖片/連結會以 MD 檔所在目錄為基準解析
- 內部 `.md` 連結自動轉為閱讀器內導向(hash 路由)
- 行動版響應式;閱讀模式下隱藏 topbar、提供浮動漢堡選單
- 由 [marked](https://github.com/markedjs/marked) 解析、[DOMPurify](https://github.com/cure53/DOMPurify) 消毒

## 專案結構

```
.
├── index.html          # 閱讀器入口
├── assets/
│   ├── app.js          # 載入、TOC、相對路徑解析、路由
│   └── style.css       # HackMD 風主題
└── decamahoro/         # 收錄文件:デカマホロ 繁中翻譯
    ├── README.md
    ├── MD/             # 翻譯 Markdown
    └── ...             # 立繪、PDF 等資產
```

## 使用方式

### 線上閱讀

開啟 `index.html` 後,從首頁「收錄文件」清單選擇,或以 hash 直接開啟任意 .md:

```
index.html#decamahoro/MD/公開資訊.md
```

### 加入新的 Markdown 文件

1. 把 `.md` 與其引用的圖片/資源放進任一子資料夾
2. MD 內以**相對於該 MD 檔位置**的路徑引用圖片(例:`![](../images/foo.png)`)
3. 在 `index.html` 的「收錄文件」區段加入連結:

   ```html
   <li><a href="#" data-file="my-folder/article.md">文章名稱</a><span>說明</span></li>
   ```

## 本地預覽

直接以 `file://` 開啟瀏覽器會被 fetch 阻擋,需要走 HTTP:

```powershell
cd "d:\帶團用\DekaMahoro"
python -m http.server 8000
# 瀏覽器開啟 http://localhost:8000
```

## 部署 GitHub Pages

1. 推送至 `main` 分支
2. **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: **`main` / `/ (root)`**
3. 約 1 分鐘後上線

## 收錄文件

| 子資料夾 | 內容 | 說明 |
|---|---|---|
| [`decamahoro/`](decamahoro/) | デカマホロ 繁體中文翻譯 | 非公式 CoC 劇本 · 詳見 [decamahoro/README.md](decamahoro/README.md) |
| [`To_change/`](To_change/) | To Change 繁體中文翻譯 | 塔羅大阿爾克那為核心、無骰、PbtA 風的「蛻化」主題 TRPG 規則書（Ulysses · Ewen 著）之繁中版 |
| [`hyperoean/`](hyperoean/) | 終北大陸希柏里爾 Hyperoean | C. A. Smith《終北大陸系列》二創 D&D 5e 劇本 |
| [`vamp/`](vamp/) | VAMP（ヴァンプ）繁體中文翻譯 | 新克蘇魯神話 TRPG 劇本 · PL 向資料與譯名對照表 |

## 授權

閱讀器本身(`index.html`、`assets/`)為自建程式碼,可自由使用。
各子資料夾下的內容請依其各自 README 所載之授權與使用須知為準。
