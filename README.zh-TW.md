# Finance Job Scraper

[English](README.md) | **繁體中文**

以 Node.js / TypeScript 開發的 API，彙整台灣各金融業者的職缺，以統一格式提供，並附 Swagger 文件、快取與篩選功能。

## 目錄

- [資料來源](#資料來源)
- [安裝](#安裝)
- [使用方式](#使用方式)
- [API](#api)
- [資安](#資安)
- [專案結構](#專案結構)
- [設定](#設定)
- [日誌](#日誌)
- [貢獻](#貢獻)
- [授權](#授權)

## 資料來源

| 來源 id    | 公司                   | 抓取方式                            |
| ---------- | ---------------------- | ----------------------------------- |
| `taishin`  | 台新新光金控           | HTML 頁面                           |
| `cathaybk` | 國泰金控（含各子公司） | JSON API                            |
| `esunfhc`  | 玉山金控               | JSON API                            |
| `sinopac`  | 永豐金控               | 無頭瀏覽器（chrome-headless-shell） |
| `fubon`    | 富邦金控（含各子公司） | JSON API                            |
| `ctbc`     | 中信金控（含各子公司） | Workday API                         |
| `kgi`      | 凱基金控（含各子公司） | Workday API                         |

## 安裝

需要 Node.js 22.18 以上（建議使用 Node 24 LTS）。專案以 TypeScript 撰寫：開發時由 Node 直接執行 `.ts` 原始碼，正式環境則用 `npm run build` 編譯到 `dist/`。

```bash
git clone https://github.com/louisxie0830/finance-job-scraper.git
cd finance-job-scraper
npm install
```

永豐的路由需要用 Puppeteer 渲染網頁。請先執行一次 `npx puppeteer browsers install chrome-headless-shell` 下載輕量版無頭瀏覽器，或用 `CHROME_PATH` 指定已安裝的 Chrome。

## 使用方式

```bash
npm run dev       # 執行 src/，存檔自動重新載入
npm run build     # 將 TypeScript 編譯到 dist/
npm start         # 執行編譯後的伺服器（dist/server.js）
npm test          # 單元測試與 API 測試（node:test，不連外網）
npm run typecheck # tsc --noEmit
npm run lint      # ESLint（typescript-eslint）
npm run format    # Prettier
```

使用 Docker：image 以 `tini` 直接執行 Node，並使用 chrome-headless-shell；PM2（`npm run run-prod`）只用於容器外執行。`API_KEYS` 可不設定：

```bash
docker compose up --build
```

GitHub Actions（`.github/workflows/ci.yml`）會在每次 push 與 pull request 時執行型別檢查、lint、格式檢查與測試，並建置 Docker image、啟動容器，實際測試一個 HTTP 來源與無頭瀏覽器來源。

## API

互動式文件（Swagger UI）在 **`/docs`**，提供英文與繁體中文兩種版本：可用頁面上方的下拉選單切換，或直接開啟 `/docs?urls.primaryName=繁體中文`。OpenAPI 3.1 規格在 `/openapi.json`（英文）與 `/openapi.zh-TW.json`（繁體中文）。

| 路由                                       | 說明                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `GET /jobs`                                | 一次回傳所有來源，並附各來源的狀態                                                       |
| `GET /taishin/jobs`                        | 台新新光金控                                                                             |
| `GET /cathaybk/jobs`                       | 國泰金控（含各子公司）                                                                   |
| `GET /esunfhc/jobs`                        | 玉山金控                                                                                 |
| `GET /sinopac/jobs`                        | 永豐金控                                                                                 |
| `GET /fubon/jobs`                          | 富邦金控（含各子公司）                                                                   |
| `GET /ctbc/jobs`                           | 中信金控（含各子公司）                                                                   |
| `GET /kgi/jobs`                            | 凱基金控（含各子公司）                                                                   |
| `GET /{source}/job/description?jobId=<id>` | 單一職缺的內容與地點，適用 `sinopac`、`fubon`、`ctbc`、`kgi`（這幾家的列表沒有職缺內容） |
| `GET /health`                              | 存活檢查（公開）                                                                         |
| `GET /status`                              | 運行時間、記憶體、快取與瀏覽器狀態（需 API key）                                         |

職缺路由支援以下查詢參數：

- `q`：以空白分隔的關鍵字，全部都要出現在職稱或職缺內容中（列表沒有職缺內容的來源只比對職稱）。
- `area`：地點或 `city` 須包含的文字，「台」與「臺」視為相同。凱基的地點是分行或大樓名稱，因此另外提供依凱基官方據點地址對照出的 `city` 欄位。
- `refresh=true`：不使用快取，重新抓取。
- `source=taishin,sinopac`（僅 `/jobs`）：只包含指定的來源。

服務啟動時會先把每個來源抓一次，所以最初的請求就能直接從記憶體回傳。資料 10 分鐘內視為最新；超過後仍會立即回傳快取（最長 24 小時），同時在背景重新抓取一次（stale-while-revalidate）。同時間對相同資料的請求只會觸發一次抓取。回應標頭 `X-Cache` 會標示 `HIT`、`STALE` 或 `MISS`。

## 資安

- **API key**：設定 `API_KEYS` 後，所有職缺路由與 `/status` 都必須帶 `X-API-Key` 標頭。金鑰以固定時間比對，且不接受放在網址參數中。
- **IP 白名單**：`ALLOWED_IPS` 預設只允許本機。在 Render 上（偵測 `RENDER=true`）預設為 `*`，`TRUST_PROXY` 預設為 `1`，因為請求會經過 Render 的代理。
- **CORS**：預設關閉，只開放 `CORS_ORIGINS` 列出的網域。
- **Rate limit**：依用戶端 IP 計算。資料比 `MIN_REFRESH_INTERVAL_MS` 還新時，`refresh=true` 會被忽略，避免有人透過本服務大量請求銀行網站。
- **錯誤不洩漏內部細節**：用戶端只會拿到一組參考編號，對應 `X-Request-Id` 標頭與伺服器日誌。
- **防 SSRF**：無頭瀏覽器拒絕載入本機、內網、雲端 metadata 位址，以及非網頁的協定。
- **資源上限**：對外請求設有逾時、回應大小與轉址次數限制，快取也有筆數上限。
- **安全標頭**：helmet 設定 CSP、`nosniff`、`Referrer-Policy: no-referrer`，並隱藏 `X-Powered-By`。
- **容器**：以非 root 使用者執行。`docker-compose.yml` 另外使用唯讀檔案系統、移除所有 Linux capabilities、設定 `no-new-privileges`，且 port 只綁定主機的本機位址。

## 專案結構

```plaintext
finance-job-scraper/
├── .github/workflows/     # CI：測試與 Docker image 實際運行測試
├── src/
│   ├── server.ts          # 進入點：啟動伺服器、預先抓取、正常關閉
│   ├── app.ts             # Express app（middleware、文件、路由）
│   ├── config/            # 以環境變數為主的設定
│   ├── docs/              # OpenAPI 規格
│   ├── middleware/        # API key、IP 白名單、request id、逾時、錯誤處理
│   ├── plugin/            # axios、cheerio 與共用的 Puppeteer 瀏覽器
│   ├── routes/            # 職缺、health 與 status 路由
│   ├── scrapers/          # 每家公司一支爬蟲（中信與凱基共用 Workday）
│   ├── utils/             # 快取、篩選、並行控制、網路防護
│   ├── types.ts           # 共用型別
│   └── winstonLogger.ts   # Winston 日誌
├── test/                  # 解析、API 與資安測試
├── Dockerfile
├── docker-compose.yml
└── ecosystem.config.cjs   # PM2 設定（容器外使用）
```

## 設定

所有設定都是選填的環境變數（見 `src/config/index.ts`）：

| 變數                      | 預設值                             | 說明                                                                                  |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| `PORT`                    | `3000`                             | HTTP port                                                                             |
| `API_KEYS`                | （無）                             | 以逗號分隔的 API key；設定後即為必填                                                  |
| `ALLOWED_IPS`             | `127.0.0.1,::1`（Render 上為 `*`） | 允許呼叫 API 的用戶端 IP（`*` 表示全部允許）                                          |
| `TRUST_PROXY`             | `loopback`（Render 上為 `1`）      | Express `trust proxy`：代理層數（Render 等單層代理用 `1`）、`true`/`false` 或 IP 清單 |
| `CORS_ORIGINS`            | （無）                             | 允許跨來源呼叫的網域，以逗號分隔                                                      |
| `DOCS_ENABLED`            | `true`                             | 是否提供 `/docs` 與 `/openapi.json`                                                   |
| `WARM_UP`                 | `true`                             | 啟動時先抓取每個來源一次                                                              |
| `CACHE_TTL_MS`            | `600000`                           | 抓取結果的快取時間                                                                    |
| `CACHE_STALE_TTL_MS`      | `86400000`                         | 過期資料在背景更新期間仍可回傳的時間                                                  |
| `CACHE_MAX_ENTRIES`       | `500`                              | 快取最大筆數                                                                          |
| `MIN_REFRESH_INTERVAL_MS` | `60000`                            | `refresh=true` 重新抓取前，資料至少要存在的時間                                       |
| `REQUEST_TIMEOUT_MS`      | `300000`                           | 請求超過此時間回傳 503                                                                |
| `RATE_LIMIT_WINDOW_MS`    | `600000`                           | Rate limit 的時間區間                                                                 |
| `RATE_LIMIT_MAX`          | `100`                              | 每個 IP 在一個區間內可發出的請求數                                                    |
| `HTTP_TIMEOUT_MS`         | `30000`                            | 對外 HTTP 請求的逾時                                                                  |
| `HTTP_MAX_CONTENT_LENGTH` | `20971520`                         | 上游回應的大小上限（bytes）                                                           |
| `HTTP_CONCURRENCY`        | `3`                                | 每次抓取的對外並行請求數                                                              |
| `HTTP_API_CONCURRENCY`    | `8`                                | 公開 JSON API（富邦、Workday）的並行請求數                                            |
| `CHROME_PATH`             | （無）                             | 改用已安裝的完整版 Chrome，而非 chrome-headless-shell                                 |
| `BROWSER_CONCURRENCY`     | `3`                                | 同時渲染的頁面數                                                                      |
| `BROWSER_TIMEOUT_MS`      | `60000`                            | Puppeteer 啟動與載入頁面的逾時                                                        |
| `LOG_DIR`                 | `logs`                             | 日誌檔目錄                                                                            |
| `LOG_LEVEL`               | `info`                             | Winston 日誌等級                                                                      |

## 日誌

使用 [Winston](https://github.com/winstonjs/winston)。日誌寫入 `logs/error.log` 與 `logs/combined.log`，每一行都帶有 request id。

## 貢獻

歡迎貢獻！請送 pull request，或開 issue 討論修改與改進。

## 授權

本專案採用 MIT 授權，詳見 [LICENSE](LICENSE)。
