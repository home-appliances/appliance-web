import { useState, useRef, useCallback } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {getSearchHistory,addSearchHistory,removeSearchHistory,clearSearchHistory,formatRelativeTime,type SearchHistoryItem} from '../../utils/storage'
import { getSuggest, getHotSearches } from '../../utils/request'
import { prefetchSearch } from '../../utils/searchPrefetch'
import './index.scss'

const FALLBACK_HOT_KEYWORDS = [
  '格力空调',
  '美的空调',
  '一级能效',
  '海尔空调',
  '变频',
  '挂机',
  '柜机',
  '小米空调',
]
const HOT_DISPLAY_COUNT = 8

type SearchEntry = 'typed' | 'quick'

const isAirConditionKeyword = (kw: string) =>
  /空调|挂机|柜机|变频|能效|冷暖|匹|新风|中央空调|空调扇/.test(kw)

/** 只保留空调相关词，不足时用兜底补齐 */
function fillHotKeywords(list: string[], target = HOT_DISPLAY_COUNT): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const kw of [...list, ...FALLBACK_HOT_KEYWORDS]) {
    const trimmed = (kw || '').trim()
    if (!trimmed || seen.has(trimmed) || !isAirConditionKeyword(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
    if (result.length >= target) break
  }
  return result
}

export default function Index() {
  const [keyword, setKeyword] = useState('')
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [hotKeywords, setHotKeywords] = useState<string[]>(() => fillHotKeywords([]))
  const debounceTimer = useRef<any>(null)
  const blurHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigatingRef = useRef(false)
  const lastEntryRef = useRef<SearchEntry | null>(null)
  const preservedKeywordRef = useRef('')

  const clearBlurHideTimer = () => {
    if (blurHideTimer.current) {
      clearTimeout(blurHideTimer.current)
      blurHideTimer.current = null
    }
  }

  const restoreTypedSuggest = (kw: string) => {
    getSuggest(kw)
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
          setSuggestions(res.data)
          setShowSuggest(true)
        } else {
          setSuggestions([])
          setShowSuggest(false)
        }
      })
      .catch(() => {
        setSuggestions([])
        setShowSuggest(false)
      })
  }

  useDidShow(() => {
    navigatingRef.current = false
    clearBlurHideTimer()
    setInputFocused(false)
    setSearchHistory(getSearchHistory())

    const entry = lastEntryRef.current
    const preserved = preservedKeywordRef.current

    if (entry === 'typed' && preserved) {
      setKeyword(preserved)
      restoreTypedSuggest(preserved)
    } else {
      setKeyword('')
      setSuggestions([])
      setShowSuggest(false)
      preservedKeywordRef.current = ''
      lastEntryRef.current = null
    }

    getHotSearches(HOT_DISPLAY_COUNT)
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
          setHotKeywords(fillHotKeywords(res.data))
        } else {
          setHotKeywords(fillHotKeywords([]))
        }
      })
      .catch(() => {
        setHotKeywords(fillHotKeywords([]))
      })
    try {
      Taro.preloadPage?.({ url: '/pages/list/list' })
    } catch {
      // 忽略不支持的环境
    }
  })

  const go = useCallback((kw: string, entry: SearchEntry) => {
    const trimmed = kw.trim()
    if (!trimmed) return

    clearBlurHideTimer()
    navigatingRef.current = true
    lastEntryRef.current = entry
    preservedKeywordRef.current = trimmed
    setKeyword(trimmed)
    setInputFocused(false)

    if (entry === 'typed') {
      // 保持联想面板（若有），跳转中不强制关掉
    } else {
      setShowSuggest(false)
      setSuggestions([])
    }

    const newHistory = addSearchHistory(trimmed)
    setSearchHistory(newHistory)
    prefetchSearch(trimmed)
    Taro.navigateTo({ url: `/pages/list/list?keyword=${encodeURIComponent(trimmed)}` })
  }, [])

  const handleInput = useCallback((value: string) => {
    setKeyword(value)
    navigatingRef.current = false
    lastEntryRef.current = null
    preservedKeywordRef.current = ''
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    if (!value.trim()) {
      setSuggestions([])
      setShowSuggest(false)
      return
    }
    debounceTimer.current = setTimeout(() => {
      getSuggest(value).then(res => {
        if (res.code === 0 && res.data && res.data.length > 0) {
          setSuggestions(res.data)
          setShowSuggest(true)
        } else {
          setSuggestions([])
          setShowSuggest(false)
        }
      }).catch(() => {
        setSuggestions([])
        setShowSuggest(false)
      })
    }, 180)
  }, [])

  const handleRemoveHistory = useCallback((kw: string) => {
    const newHistory = removeSearchHistory(kw)
    setSearchHistory(newHistory)
  }, [])

  const handleClearHistory = useCallback(() => {
    Taro.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          clearSearchHistory()
          setSearchHistory([])
        }
      }
    })
  }, [])

  const showQuickPanels = !(showSuggest && suggestions.length > 0)

  return (
    <View className='index-page'>
      <View className='index-container'>
        <View className='index-header'>
          <Text className='index-title'>智能<Text className='index-highlight'>家电</Text>查询</Text>
          <Text className='index-subtitle'>发现适合你的家电产品</Text>
        </View>

        <View className='index-search-section'>
          <View className='index-search-box'>
            <Input
              className={`index-search-input${inputFocused ? ' is-focused' : ''}`}
              placeholder='品牌、型号、品类'
              placeholderClass='index-search-placeholder'
              value={keyword || ''}
              onInput={e => handleInput(e.detail.value || '')}
              confirmType='search'
              onConfirm={() => go(keyword, 'typed')}
              onFocus={() => setInputFocused(true)}
              onBlur={() => {
                setInputFocused(false)
                clearBlurHideTimer()
                blurHideTimer.current = setTimeout(() => {
                  // 跳转中（尤其是输入搜索）不要关掉联想面板
                  if (!navigatingRef.current) {
                    setShowSuggest(false)
                  }
                }, 200)
              }}
            />
            <View className='index-search-btn' onClick={() => go(keyword, 'typed')}>
              <Text className='index-search-btn-icon'>⌕</Text>
            </View>

            {showSuggest && suggestions.length > 0 && (
              <View className='index-suggest-dropdown'>
                {suggestions.map((item, index) => (
                  <View key={index} className='index-suggest-item' onClick={() => go(item, 'typed')}>
                    <Text className='index-suggest-icon'>⌕</Text>
                    <Text className='index-suggest-text'>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {showQuickPanels && (
            <>
              <View className='index-hot-searches'>
                <View className='index-section-header'>
                  <Text className='index-section-title'>热门搜索</Text>
                </View>
                <View className='index-hot-tags'>
                  {hotKeywords.map((item, index) => (
                    <View key={index} className='index-hot-tag' onClick={() => go(item, 'quick')}>
                      {index < 3 && <Text className='index-hot-corner'>热</Text>}
                      <Text className='index-hot-tag-text'>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className='index-recent-section'>
                <View className='index-section-header'>
                  <Text className='index-section-title'>搜索历史</Text>
                  {searchHistory.length > 0 && (
                    <View className='index-section-action' onClick={handleClearHistory}>
                      <Text className='index-section-action-text'>清空</Text>
                    </View>
                  )}
                </View>
                {searchHistory.length > 0 ? (
                  <View className='index-recent-list'>
                    {searchHistory.map((item) => {
                      const relativeTime = formatRelativeTime(item.searchedAt)
                      return (
                        <View
                          key={item.keyword}
                          className='index-recent-item'
                          onClick={() => go(item.keyword, 'quick')}
                        >
                          <View className='index-recent-icon'>
                            <Text className='index-recent-icon-text'>◷</Text>
                          </View>
                          <View className='index-recent-content'>
                            <Text className='index-recent-title'>{item.keyword}</Text>
                            {relativeTime ? (
                              <Text className='index-recent-meta'>{relativeTime}</Text>
                            ) : null}
                          </View>
                          <View
                            className='index-recent-delete'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveHistory(item.keyword)
                            }}
                          >
                            <Text className='index-recent-delete-text'>×</Text>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className='index-empty-state'>
                    <Text className='index-empty-text'>暂无搜索历史，试试上方搜索</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  )
}
