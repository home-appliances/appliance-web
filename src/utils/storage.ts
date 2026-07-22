import Taro from '@tarojs/taro'

const SEARCH_HISTORY_KEY = 'search_history'
const MAX_HISTORY_LENGTH = 10

export type SearchHistoryItem = {
  keyword: string
  searchedAt: number
}

const normalizeHistory = (raw: unknown): SearchHistoryItem[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        return { keyword: item.trim(), searchedAt: 0 }
      }
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as SearchHistoryItem).keyword === 'string' &&
        (item as SearchHistoryItem).keyword.trim()
      ) {
        const keyword = (item as SearchHistoryItem).keyword.trim()
        const searchedAt = Number((item as SearchHistoryItem).searchedAt)
        return {
          keyword,
          searchedAt: Number.isFinite(searchedAt) ? searchedAt : 0,
        }
      }
      return null
    })
    .filter((item): item is SearchHistoryItem => Boolean(item))
}

export const formatRelativeTime = (searchedAt: number, now = Date.now()): string => {
  if (!searchedAt) return ''

  const diffMs = Math.max(0, now - searchedAt)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return '刚刚'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} 分钟前`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} 小时前`
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} 天前`

  const date = new Date(searchedAt)
  const month = date.getMonth() + 1
  const dayOfMonth = date.getDate()
  return `${month}月${dayOfMonth}日`
}

// 获取搜索历史
export const getSearchHistory = (): SearchHistoryItem[] => {
  try {
    const history = Taro.getStorageSync(SEARCH_HISTORY_KEY)
    if (!history) return []
    return normalizeHistory(typeof history === 'string' ? JSON.parse(history) : history)
  } catch {
    return []
  }
}

// 添加搜索历史
export const addSearchHistory = (keyword: string): SearchHistoryItem[] => {
  if (!keyword.trim()) return getSearchHistory()

  const trimmed = keyword.trim()
  const history = getSearchHistory()
  const newHistory = [
    { keyword: trimmed, searchedAt: Date.now() },
    ...history.filter((item) => item.keyword !== trimmed),
  ].slice(0, MAX_HISTORY_LENGTH)

  try {
    Taro.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  } catch {
    console.error('保存搜索历史失败')
  }

  return newHistory
}

// 删除单条搜索历史
export const removeSearchHistory = (keyword: string): SearchHistoryItem[] => {
  const history = getSearchHistory()
  const newHistory = history.filter((item) => item.keyword !== keyword)

  try {
    Taro.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  } catch {
    console.error('删除搜索历史失败')
  }

  return newHistory
}

// 清空搜索历史
export const clearSearchHistory = (): void => {
  try {
    Taro.removeStorageSync(SEARCH_HISTORY_KEY)
  } catch {
    console.error('清空搜索历史失败')
  }
}
