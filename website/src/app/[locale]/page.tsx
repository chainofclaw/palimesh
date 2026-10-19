'use client'

import { site } from '@/config/site'
import { PaliumHome } from '@/components/home/PaliumHome'
import { PaliMeshHome } from '@/components/home/PaliMeshHome'

// 首页按 NEXT_PUBLIC_SITE 变体组装:公链站 / 存储站各自的章节顺序见对应组件
export default function HomePage() {
  return site.variant === 'palimesh' ? <PaliMeshHome /> : <PaliumHome />
}
