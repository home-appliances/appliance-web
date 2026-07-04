import { useState, useRef, useCallback } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory
} from '../../utils/storage'
import { getSuggest } from '../../utils/request'
import './index.scss'

export default function Index() {
  const [keyword, setKeyword] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const debounceTimer = useRef<any>(null)

  useDidShow(() => {
    setSearchHistory(getSearchHistory())
    setKeyword('')
    setSuggestions([])
    setShowSuggest(false)
  })

  const go = useCallback((kw: string) => {
    if (!kw.trim()) return
    setShowSuggest(false)
    const newHistory = addSearchHistory(kw)
    setSearchHistory(newHistory)
    Taro.navigateTo({ url: `/pages/list/list?keyword=${encodeURIComponent(kw)}` })
  }, [])

  const handleInput = useCallback((value: string) => {
    setKeyword(value)
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
    }, 300)
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

  const hotKeywords = ['格力空调', '海尔冰箱', '美的洗衣机', '小米电视', '热水器']

  return (
    <View className='index-page'>
      <View className='index-container'>
        {/* Header */}
        <View className='index-header'>
          <View className='index-header-top'>
            <Text className='index-greeting'>Hi, <Text className='index-greeting-strong'>欢迎回来</Text></Text>
            <View className='index-avatar'>
              <Text className='index-avatar-text'>U</Text>
            </View>
          </View>
          <Text className='index-title'>智能<Text className='index-highlight'>家电</Text>查询</Text>
          <Text className='index-subtitle'>发现适合你的家电产品</Text>
        </View>

        {/* Search */}
        <View className='index-search-section'>
          <View className='index-search-box'>
            <Input
              className='index-search-input'
              placeholder='搜索家电产品、品牌、型号...'
              placeholderClass='index-search-placeholder'
              value={keyword || ''}
              onInput={e => handleInput(e.detail.value || '')}
              confirmType='search'
              onConfirm={() => go(keyword)}
              onBlur={() => {
                setTimeout(() => setShowSuggest(false), 200)
              }}
            />
            <View className='index-search-btn' onClick={() => go(keyword)}>
              <Text className='index-search-btn-icon'>⌕</Text>
            </View>
          </View>

          {/* 搜索建议 */}
          {showSuggest && suggestions.length > 0 && (
            <View className='index-suggest-dropdown'>
              {suggestions.map((item, index) => (
                <View key={index} className='index-suggest-item' onClick={() => go(item)}>
                  <Text className='index-suggest-icon'>⌕</Text>
                  <Text className='index-suggest-text'>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 热门搜索 */}
          <View className='index-hot-searches'>
            <View className='index-section-header'>
              <Text className='index-section-title'>热门搜索</Text>
            </View>
            <View className='index-hot-tags'>
              {hotKeywords.map((item, index) => (
                <View key={index} className='index-hot-tag' onClick={() => go(item)}>
                  {index < 2 && <Text className='index-fire'>🔥</Text>}
                  <Text className='index-hot-tag-text'>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 搜索历史 */}
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
                {searchHistory.map((item, index) => (
                  <View key={index} className='index-recent-item' onClick={() => go(item)}>
                    <View className='index-recent-icon'>
                      <Text className='index-recent-icon-text'>◷</Text>
                    </View>
                    <View className='index-recent-content'>
                      <Text className='index-recent-title'>{item}</Text>
                      <Text className='index-recent-meta'>{index === 0 ? '刚刚浏览' : `${index}小时前`}</Text>
                    </View>
                    <View
                      className='index-recent-delete'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveHistory(item)
                      }}
                    >
                      <Text className='index-recent-delete-text'>×</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className='index-empty-state'>
                <Text className='index-empty-text'>暂无搜索历史</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View className='index-footer'>
          <Text className='index-footer-text'>FRESH APPLIANCE SEARCH</Text>
        </View>
      </View>
    </View>
  )
}
