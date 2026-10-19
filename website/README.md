# Palium / PaliMesh Website

同一个 Next.js 15 codebase 构建两个官网：

| 变体 | 域名 | 定位 | 端口 | 构建产物 |
|---|---|---|---|---|
| `palium` | https://palium.io | AI 智能体的公链 L1（$PALI） | 3004 | `.next-palium/` |
| `palimesh` | https://palimesh.io | AI 智能体的去中心化存储、身份与记忆（$MESH） | 3001 | `.next-palimesh/` |

变体由 `NEXT_PUBLIC_SITE=palium|palimesh` 在构建期决定，唯一真相源是 `src/config/site.ts`
（品牌、logo、导航、footer 分栏、独占路由、跨站链接、链基础设施域名、视觉资产）。
`NEXT_PUBLIC_SITE` 由 `package.json` 脚本注入，**不要写进 `.env.local`**。

## 快速开始

```bash
npm install
cp .env.local.example .env.local   # RPC / WS 地址
npm run dev:palium                 # http://localhost:3004
npm run dev:palimesh               # http://localhost:3001
```

## 构建与运行

```bash
npm run check:i18n     # 五语 key 对齐 + 占位符一致 + 品牌字面量允许清单
npm run build          # = build:palium && build:palimesh(各自 prebuild 会先跑 check:i18n)
npm run start:palium   # 3004
npm run start:palimesh # 3001
npm run smoke -- --palium http://127.0.0.1:3004 --palimesh http://127.0.0.1:3001
```

## 变体机制

- **品牌占位符**：共享文案里用 `{brand}` / `{token}` / `{chain}` / `{networkName}`，在 `src/i18n/request.ts`
  加载 messages 时按变体替换（next-intl 4 已无 `defaultTranslationValues`）。
- **按站不同正文**：语义随站不同的页面用子命名空间 `xxx.palium.*` / `xxx.palimesh.*`
  （首页 hero、technology、whitepaper、docs、economics、identity、security.scope、footer）。
- **路由归属**：`site.exclusiveRoutes` 里的路由在本站 308 跳到对方站（`src/middleware.ts`）。
  Palium 独占：network / testnet / governance / forum / roadmap；PaliMesh 独占：story / services。
- **跨站链接**：`crossSiteUrl(locale, path)` 生成对方站带 locale 前缀的 URL。

## 页面

`/` 首页（两站 section 不同）· `/technology` · `/whitepaper`（Palium=链白皮书，PaliMesh=存储论文）·
`/docs` · `/economics` · `/identity`（Palium=治理身份注册，PaliMesh=DID 生命周期）· `/security` ·
Palium 独占 `/network` `/testnet` `/governance` `/forum` `/roadmap` · PaliMesh 独占 `/story` `/services`

## 国际化

五语 `messages/{en,zh,es,ja,ko}.json`，结构必须完全一致（`npm run check:i18n` 强制）。
规范见 [I18N_GUIDE.md](./I18N_GUIDE.md)。品牌字面量只允许出现在允许清单路径下（包名、命令、
story 叙事、已按站拆分的命名空间），其余一律用占位符。

## 环境变量

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_RPC_URL` / `NEXT_PUBLIC_WS_URL` | 浏览器端 RPC / WS（默认 rpc.palium.io） |
| `PALI_RPC_URL` | 服务端 RPC |
| `NEXT_PUBLIC_CHAIN_ID` | 默认 88780 |
| `NEXT_PUBLIC_{FACTION_REGISTRY,GOVERNANCE_DAO,TREASURY}_ADDRESS` | 治理合约地址 |
| `PALI_DB_PATH` | 论坛 / 身份 SQLite 路径（两站共用，WAL） |

## 部署（v3）

两个 systemd unit（`ops/systemd/palium-website.service`、`palimesh-website.service`）在同一目录
`/opt/coc/website` 运行，nginx 模板见 `docker/nginx/palium.io.conf`；部署脚本 `scripts/deploy-website.sh`
只更新 `website/` 子目录并重启两个 unit。详见 `docs/DEPLOYMENT.md` 的"双站"小节。

## 技术栈

Next.js 15 App Router · TypeScript · Tailwind CSS 3 · next-intl 4 · ethers v6 · better-sqlite3
