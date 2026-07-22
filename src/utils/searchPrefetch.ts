import { searchProducts } from './request'

type SearchResponse = Awaited<ReturnType<typeof searchProducts>>

interface PrefetchEntry {
  keyword: string
  promise: Promise<SearchResponse>
}

let entry: PrefetchEntry | null = null

/** 跳转列表页前预发起搜索，缩短等待感 */
export function prefetchSearch(keyword: string): void {
  const kw = keyword.trim()
  if (!kw) return
  // 同一关键词已在飞则复用
  if (entry?.keyword === kw) return
  entry = {
    keyword: kw,
    promise: searchProducts(kw, 1),
  }
}

/** 列表页取走预取结果；关键词不一致则返回 null */
export function takePrefetch(keyword: string): Promise<SearchResponse> | null {
  const kw = keyword.trim()
  if (!entry || entry.keyword !== kw) return null
  const { promise } = entry
  entry = null
  return promise
}
