import { redirect } from 'next/navigation'

// /plan 的白皮书长页已拆分:概览与下载移至 /whitepaper,
// 技术细节在 /technology,版本计划在 /roadmap。
export default async function PlanPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/whitepaper`)
}
