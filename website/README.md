# Palimesh Website

Palimesh (Palimesh) 项目官方网站 - 基于 Next.js 15 构建的现代化Web应用，支持5种语言国际化。

## 🌍 多语言支持

网站现已支持以下语言:
- 🇨🇳 中文 (zh) - 默认
- 🇺🇸 English (en)
- 🇪🇸 Español (es)
- 🇯🇵 日本語 (ja)
- 🇰🇷 한국어 (ko)

访问示例:
- http://localhost:3001/zh - 中文版
- http://localhost:3001/en - 英文版
- http://localhost:3001/es - 西班牙语版

详细国际化指南请查看 [I18N_GUIDE.md](./I18N_GUIDE.md)

## 功能特性

### 📱 页面结构

- **首页** (`/`) - Hero section、核心特性展示、实时网络统计、四层架构概览
- **关于** (`/about`) - 基于whitepaper的详细项目介绍、PoSe协议、经济模型
- **技术架构** (`/technology`) - 四层架构详解、PoSe协议深度剖析、性能指标、技术对比
- **网络状态** (`/network`) - 实时网络监控、节点信息、验证者列表、最近区块
- **路线图** (`/roadmap`) - 开发历程(Cycle 1-25)、白皮书规划、未来计划
- **文档中心** (`/docs`) - 快速开始、核心文档、开发指南、实现状态

### 🚀 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **国际化**: next-intl v4.8.2
- **区块链交互**: ethers.js v6
- **部署**: Vercel / 自托管

### 🔗 外部集成

- **区块浏览器**: 链接到独立运行的 explorer (http://localhost:3000)
- **RPC节点**: 连接到本地或远程 Palimesh 节点 (默认 http://127.0.0.1:18780)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制示例环境变量文件:

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 设置RPC节点地址:

```env
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:18780
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:18781
```

### 3. 启动开发服务器

```bash
npm run dev
```

网站将运行在 http://localhost:3001

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
website/
├── src/
│   ├── app/              # Next.js App Router页面
│   │   ├── page.tsx      # 首页
│   │   ├── about/        # 关于页面
│   │   ├── technology/   # 技术架构页
│   │   ├── network/      # 网络状态页
│   │   ├── roadmap/      # 路线图页
│   │   ├── docs/         # 文档中心页
│   │   ├── layout.tsx    # 全局布局
│   │   └── globals.css   # 全局样式
│   ├── components/       # React组件
│   │   └── NetworkStats.tsx  # 网络统计组件
│   └── lib/              # 工具库
│       ├── provider.ts   # Ethers.js provider
│       └── rpc.ts        # RPC调用封装
├── public/               # 静态资源
├── package.json          # 项目配置
├── next.config.ts        # Next.js配置
├── tailwind.config.ts    # Tailwind配置
└── tsconfig.json         # TypeScript配置
```

## 开发说明

### RPC调用

网站通过 `src/lib/provider.ts` 和 `src/lib/rpc.ts` 与Palimesh节点交互:

- 标准以太坊RPC方法 (via ethers.js)
- 自定义Palimesh方法 (`pali_nodeInfo`, `pali_validators`)
- WebSocket实时订阅 (用于网络状态更新)

### 组件设计

- **服务器组件** (默认): 用于静态内容和初始数据获取
- **客户端组件** (`'use client'`): 用于交互式UI和实时更新

### 样式规范

- 使用 Tailwind CSS utility classes
- 响应式设计: `md:` (768px+), `lg:` (1024px+)
- 配色方案: 蓝色/紫色渐变 (科技感)

## 部署

### Vercel (推荐)

```bash
vercel deploy
```

### Docker

```bash
docker build -t palimesh-website .
docker run -p 3001:3001 palimesh-website
```

### 手动部署

```bash
npm run build
# 将 .next 和 public 目录部署到静态服务器
npm start
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_RPC_URL` | Palimesh节点RPC地址 | `http://127.0.0.1:18780` |
| `NEXT_PUBLIC_WS_URL` | Palimesh节点WebSocket地址 | `ws://127.0.0.1:18781` |

## 许可证

MIT License - 详见 LICENSE 文件
