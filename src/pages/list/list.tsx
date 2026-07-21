import { useState, useEffect } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { searchProducts, fixImageUrl } from '../../utils/request'
import { addSearchHistory } from '../../utils/storage'
import { decodeHtmlEntities } from '../../utils/decode'
import HighlightText from '../../components/HighlightText/HighlightText'
import './list.scss'

interface Product {
  id: number
  title: string
  img: string
  tag: string[]
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

  useEffect(() => {
    const kw = decodeURIComponent(router.params.keyword || '')
    setKeyword(kw)
    if (kw) {
      fetchProducts(kw, 1)
    }
  }, [])

  const fetchProducts = async (kw: string, pageNum: number) => {
    if (!kw.trim()) return
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setSearched(true)
    try {
      const res = await searchProducts(kw, pageNum)
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
      if (pageNum === 1) {
        setProducts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (loadingMore || page >= totalPages || loading) return
    fetchProducts(keyword, page + 1)
  }

  const onScrollToLower = () => {
    loadMore()
  }

  const handleSearch = () => {
    if (!keyword.trim()) return
    addSearchHistory(keyword)
    fetchProducts(keyword, 1)
  }

  return (
    <View className='page'>
      {/* Header */}
      <View className='header'>
        <View className='search-input-wrap'>
          <Input
            className='search-input'
            placeholder='搜索家电产品...'
            placeholderClass='search-placeholder'
            value={keyword || ''}
            onInput={e => setKeyword(e.detail.value || '')}
            confirmType='search'
            onConfirm={handleSearch}
          />
          <Text className='search-icon'>⌕</Text>
        </View>
      </View>

      {/* 结果头部 */}
      <View className='result-header'>
        <Text className='result-count'>
          找到 <Text className='result-count-num'>{products.length}</Text> 件产品
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
          ) : products.length > 0 ? (
            <View className='product-grid'>
              {products.map(item => (
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
                    <Text className='product-brand'>{item.tag?.[0] || '品牌'}</Text>
                    <HighlightText text={item.title} className='product-name' />
                    {item.tag?.length > 0 && (
                      <View className='product-specs'>
                        {item.tag.slice(0, 2).map((t, i) => (
                          <Text key={i} className='spec-tag'>{decodeHtmlEntities(t)}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* 加载更多 */}
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

          {/* 空状态提示 */}
          {searched && products.length === 0 && !loading && (
            <View className='empty-recommend'>
              <View className='empty-header'>
                <Text className='empty-icon-text'>∅</Text>
                <Text className='empty-text'>未找到相关商品</Text>
                <Text className='empty-hint'>换个关键词试试</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
