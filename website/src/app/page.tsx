import { redirect } from 'next/navigation'

// 根路径交给 defaultLocale;带语言前缀的路径由 next-intl middleware 处理。
export default function RootPage() {
  redirect('/en')
}
