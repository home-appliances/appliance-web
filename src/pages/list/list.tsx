import { useState, useEffect, useRef } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { searchProducts, fixImageUrl } from '../../utils/request'
import { takePrefetch, prefetchSearch } from '../../utils/searchPrefetch'
import { addSearchHistory } from '../../utils/storage'
import { decodeHtmlEntities } from '../../utils/decode'
import HighlightText from '../../components/HighlightText/HighlightText'
import './list.scss'

interface Product {
  id: number
  title: string
  img: string
  tag: string[]
  brand?: string
}

/** 统一能效文案 */
function normalizeSpecTag(tag: string): string {
  const t = decodeHtmlEntities(tag).trim()
  if (/能效|^\S*级$/.test(t)) {
    return t.replace(/能效等级/g, '').replace(/能效$/g, '').trim() || t
  }
  return t
}

/** 规格标签：去掉品牌，最多展示 2 个参数 */
function getSpecTags(item: Product): string[] {
  const brand = (item.brand || item.tag?.[0] || '').trim()
  return (item.tag || [])
    .filter(t => t && t.trim() && t.trim() !== brand)
    .slice(0, 2)
    .map(normalizeSpecTag)
}

/** 标题若以品牌开头则去掉，避免与品牌行重复 */
function getDisplayTitle(item: Product): string {
  const brand = (item.brand || item.tag?.[0] || '').trim()
  let title = item.title || ''
  if (!brand) return title
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  title = title.replace(new RegExp(`^(?:<hl>)?${escaped}(?:</hl>)?\\s*`), '')
  return title.replace(/^[\s\-_/·]+/, '') || item.title
}

export default function List() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const kw = decodeURIComponent(router.params.keyword || '')
    setKeyword(kw)
    if (kw) {
      fetchProducts(kw, 1)
    }
  }, [])

  const fetchProducts = async (kw: string, pageNum: number) => {
    if (!kw.trim()) return
    const reqId = ++requestIdRef.current

    if (pageNum === 1) {
      setLoading(true)
      setProducts([])
      setPage(1)
      setTotalPages(1)
      setLoadingMore(false)
    } else {
      setLoadingMore(true)
    }
    setSearched(true)

    try {
      const prefetched = pageNum === 1 ? takePrefetch(kw) : null
      const res = await (prefetched || searchProducts(kw, pageNum))
      if (reqId !== requestIdRef.current) return

      if (res.code === 0) {
        const list = res.data as Product[]
        if (pageNum === 1) {
          setProducts(list)
        } else {
          setProducts(prev => [...prev, ...list])
        }
        setTotalPages(res.pagination?.totalPages || 1)
        setPage(pageNum)
      }
    } catch (e) {
      console.error(e)
      if (reqId === requestIdRef.current && pageNum === 1) {
        setProducts([])
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  const loadMore = () => {
    if (loadingMore || loading || page >= totalPages) return
    fetchProducts(keyword, page + 1)
  }

  const onScrollToLower = () => {
    if (loading) return
    loadMore()
  }

  const handleSearch = () => {
    if (!keyword.trim()) return
    addSearchHistory(keyword)
    prefetchSearch(keyword)
    fetchProducts(keyword, 1)
  }

  return (
    <View className='page'>
      {/* Header */}
      <View className='header'>
        <View className='search-input-wrap'>
          <Input
            className='search-input'
            placeholder={inputFocused ? ' ' : '搜索家电产品...'}
            placeholderClass='search-placeholder'
            value={keyword || ''}
            onInput={e => setKeyword(e.detail.value || '')}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            confirmType='search'
            onConfirm={handleSearch}
          />
          <View className='search-btn' onClick={handleSearch}>
            <Text className='search-btn-icon'>⌕</Text>
          </View>
        </View>
      </View>

      {/* 结果头部 */}
      <View className='result-header'>
        <Text className='result-count'>
          {loading ? (
            '搜索中...'
          ) : (
            <>
              找到 <Text className='result-count-num'>{products.length}</Text> 件产品
            </>
          )}
        </Text>
      </View>

      {/* 产品列表 */}
      <ScrollView
        className='list-scroll'
        scrollY
        onScrollToLower={onScrollToLower}
        lowerThreshold={100}
      >
        <View className='list-wrapper'>
          {loading ? (
            <View className='loading-state'>
              <View className='loading-spinner' />
              <Text className='loading-text'>搜索中...</Text>
            </View>
          ) : (
            <>
              {products.length > 0 ? (
                <View className='product-list'>
                  {products.map(item => {
                    const brand = item.brand || item.tag?.[0] || ''
                    const specTags = getSpecTags(item)
                    return (
                      <View
                        key={item.id}
                        className='product-card'
                        onClick={() => Taro.navigateTo({ url: `/pages/detail/detail?id=${item.id}` })}
                      >
                        <View className='product-image'>
                          {item.img ? (
                            <Image src={fixImageUrl(item.img)} mode='aspectFill' style='width:100%;height:100%' />
                          ) : (
                            <Text className='product-image-placeholder'>⬡</Text>
                          )}
                        </View>
                        <View className='product-content'>
                          {brand ? <Text className='product-brand'>{brand}</Text> : null}
                          <HighlightText text={getDisplayTitle(item)} className='product-name' />
                          {specTags.length > 0 && (
                            <View className='product-specs'>
                              {specTags.map((t, i) => (
                                <Text key={i} className='spec-tag'>{t}</Text>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : null}

              {/* 仅在非搜索中、且已有结果时展示底部状态 */}
              {products.length > 0 && (
                <View className='load-more'>
                  {loadingMore ? (
                    <View className='load-more-loading'>
                      <View className='load-more-spinner' />
                      <Text className='load-more-text'>加载中...</Text>
                    </View>
                  ) : page >= totalPages ? (
                    <Text className='load-more-no-more'>没有更多了</Text>
                  ) : null}
                </View>
              )}

              {searched && products.length === 0 && (
                <View className='empty-recommend'>
                  <View className='empty-header'>
                    <Text className='empty-icon-text'>∅</Text>
                    <Text className='empty-text'>未找到相关商品</Text>
                    <Text className='empty-hint'>换个关键词试试</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
