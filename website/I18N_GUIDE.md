# Palimesh Website 国际化(i18n)指南

## ✅ 已完成

Palimesh Website现已支持5种语言的完整国际化:

- 🇨🇳 **中文** (zh) - 默认语言
- 🇺🇸 **English** (en)  
- 🇪🇸 **Español** (es)
- 🇯🇵 **日本語** (ja)
- 🇰🇷 **한국어** (ko)

## 🏗️ 技术架构

### 使用的库
- **next-intl** v4.8.2 - Next.js 15 App Router官方推荐的i18n解决方案

### 目录结构

```
website/
├── messages/              # 翻译文件
│   ├── zh.json           # 中文翻译
│   ├── en.json           # 英文翻译
│   ├── es.json           # 西班牙语翻译
│   ├── ja.json           # 日语翻译
│   └── ko.json           # 韩语翻译
├── src/
│   ├── i18n/             # i18n配置
│   │   ├── request.ts    # 请求配置
│   │   └── routing.ts    # 路由配置
│   ├── middleware.ts     # i18n中间件
│   ├── app/
│   │   ├── [locale]/     # 语言路由
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── about/
│   │   │   ├── technology/
│   │   │   ├── network/
│   │   │   ├── roadmap/
│   │   │   └── docs/
│   │   └── page.tsx      # 根重定向
│   └── components/
│       └── LanguageSwitcher.tsx  # 语言切换器
```

## 🌐 URL结构

所有页面URL包含语言前缀:

```
中文:    http://localhost:3001/zh
英文:    http://localhost:3001/en  
西班牙: http://localhost:3001/es
日语:    http://localhost:3001/ja
韩语:    http://localhost:3001/ko

示例:
/zh/about      - 中文关于页
/en/technology - 英文技术页
/es/network    - 西班牙语网络状态页
```

## 💡 使用方法

### 1. 在页面中使用翻译

```typescript
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function MyPage() {
  const t = useTranslations('home')  // 指定命名空间
  
  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <p>{t('hero.subtitle')}</p>
      
      {/* 使用i18n Link组件,自动处理语言路由 */}
      <Link href="/about">{t('common.about')}</Link>
    </div>
  )
}
```

### 2. 添加新翻译

在 `messages/zh.json`:
```json
{
  "home": {
    "hero": {
      "title": "我的标题",
      "subtitle": "我的副标题"
    }
  }
}
```

在对应的其他语言文件中添加相同结构的翻译。

### 3. 语言切换器

已包含 `<LanguageSwitcher />` 组件,在header中使用:

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

<LanguageSwitcher />
```

## 📝 翻译文件结构

### 当前已翻译内容 (首页)

```json
{
  "common": {
    "home": "首页",
    "about": "关于",
    ...
  },
  "home": {
    "hero": {
      "title": "...",
      "subtitle": "..."
    },
    "networkStats": {...},
    "features": {...},
    "architecture": {...},
    "nodeRoles": {...},
    "cta": {...}
  },
  "footer": {...}
}
```

### 待扩展翻译

其他页面(about, technology, network, roadmap, docs)目前使用硬编码文本，需要:

1. 在 `messages/*.json` 中添加对应的翻译键
2. 在页面组件中使用 `useTranslations()` 替换硬编码文本
3. 更新所有5种语言的翻译文件

## 🔧 配置说明

### 修改默认语言

编辑 `src/i18n/routing.ts`:

```typescript
export const routing = defineRouting({
  locales: ['en', 'es', 'zh', 'ja', 'ko'],
  defaultLocale: 'en',  // 改为英文默认
  localePrefix: 'always'
})
```

### 添加新语言

1. 在 `src/i18n/routing.ts` 添加语言代码:
   ```typescript
   locales: ['en', 'es', 'zh', 'ja', 'ko', 'fr'], // 添加法语
   ```

2. 创建翻译文件 `messages/fr.json`

3. 在 `src/components/LanguageSwitcher.tsx` 添加语言选项:
   ```typescript
   { code: 'fr', name: 'Français', flag: '🇫🇷' }
   ```

4. 更新 middleware matcher:
   ```typescript
   matcher: ['/', '/(zh|en|es|ja|ko|fr)/:path*']
   ```

## 🚀 启动开发服务器

```bash
cd website
npm run dev
```

访问:
- http://localhost:3001 → 自动重定向到 /zh
- http://localhost:3001/en → 英文版
- http://localhost:3001/es → 西班牙语版
- http://localhost:3001/ja → 日语版
- http://localhost:3001/ko → 韩语版

## 📋 待办事项

为了完成完整的多语言支持，需要:

### 高优先级
- [ ] 翻译 `/about` 页面 (白皮书内容)
- [ ] 翻译 `/technology` 页面 (技术架构)
- [ ] 翻译 `/network` 页面 (网络状态)
- [ ] 翻译 `/roadmap` 页面 (路线图)
- [ ] 翻译 `/docs` 页面 (文档中心)

### 中优先级
- [ ] 翻译 `NetworkStats` 组件中的标签
- [ ] 翻译 Footer 链接
- [ ] 翻译 Header 导航项
- [ ] 为每个语言设置正确的 SEO metadata

### 低优先级
- [ ] 添加语言特定的日期/时间格式化
- [ ] 添加语言特定的数字格式化
- [ ] 考虑RTL语言支持(如阿拉伯语)

## 📖 参考资源

- [next-intl官方文档](https://next-intl-docs.vercel.app/)
- [Next.js国际化指南](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

## 💡 最佳实践

1. **保持翻译键结构一致**: 所有语言文件应有相同的JSON结构
2. **使用命名空间**: 按页面或功能组织翻译 (`home`, `about`, `common`)
3. **避免在翻译中嵌入HTML**: 使用变量或组件组合
4. **测试所有语言**: 切换到每种语言确保无遗漏翻译
5. **使用专业翻译**: 机器翻译仅作参考，建议人工校对

## 🐛 常见问题

### Q: 页面刷新后语言重置?
A: 语言存储在URL中 (`/zh/`, `/en/`等)，不会重置。

### Q: 如何在服务端组件中使用翻译?
A: 直接使用 `useTranslations()`:
```typescript
import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('home')
  return <h1>{t('title')}</h1>
}
```

### Q: 如何在客户端组件中使用?
A: 添加 `'use client'` 并使用同样的API:
```typescript
'use client'
import { useTranslations } from 'next-intl'
```

### Q: 翻译文件太大怎么办?
A: next-intl支持代码分割，只加载当前页面需要的翻译。

## 📦 生产部署

确保在部署时:
1. 所有翻译文件已提交到git
2. 运行 `npm run build` 验证无错误
3. 测试所有语言的路由正常工作
4. 设置CDN缓存策略考虑语言路径

---

**国际化支持让Palimesh网站真正面向全球用户! 🌍**
