import { useState, useEffect } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { searchProducts, getRecommend, fixImageUrl } from '../../utils/request'
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

interface RecommendBrand {
  brand: string
  name: string
  count: number
}

interface RecommendProduct {
  id: number
  name: string
  brand: string
  images: string[]
}

export default function List() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [recommendBrands, setRecommendBrands] = useState<RecommendBrand[]>([])
  const [recommendProducts, setRecommendProducts] = useState<RecommendProduct[]>([])
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
        if (pageNum === 1 && list.length === 0) {
          loadRecommend()
        }
      }
    } catch (e) {
      console.error(e)
      if (pageNum === 1) {
        setProducts([])
        loadRecommend()
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

  const loadRecommend = async () => {
    try {
      const res = await getRecommend()
      if (res.code === 0 && res.data) {
        setRecommendBrands(res.data.brands || [])
        setRecommendProducts(res.data.products || [])
      }
    } catch (e) {
      console.error(e)
    }
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
        <View className='back-btn' onClick={() => {
          const pages = Taro.getCurrentPages()
          if (pages.length > 1) {
            Taro.navigateBack()
          } else {
            Taro.reLaunch({ url: '/pages/index/index' })
          }
        }}>
          <Text className='back-icon'>←</Text>
        </View>
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
                      <Image
                        src={fixImageUrl(item.img)}
                        mode='aspectFill'
                        lazyLoad
                        style='width:100%;height:100%'
                      />
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

          {/* 空结果推荐 */}
          {searched && products.length === 0 && !loading && (
            <View className='empty-recommend'>
              <View className='empty-header'>
                <Text className='empty-icon-text'>∅</Text>
                <Text className='empty-text'>未找到相关商品</Text>
                <Text className='empty-hint'>换个关键词试试，或看看以下推荐</Text>
              </View>

              {recommendBrands.length > 0 && (
                <View className='recommend-section'>
                  <Text className='recommend-title'>热门品牌</Text>
                  <View className='recommend-brands'>
                    {recommendBrands.map((b) => (
                      <View
                        key={b.brand}
                        className='recommend-brand-tag'
                        onClick={() => { setKeyword(b.name); fetchProducts(b.name, 1) }}
                      >
                        <Text className='recommend-brand-name'>{b.name}</Text>
                        <Text className='recommend-brand-count'>{b.count}款</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {recommendProducts.length > 0 && (
                <View className='recommend-section'>
                  <Text className='recommend-title'>热门商品</Text>
                  {recommendProducts.map((p) => (
                    <View
                      key={p.id}
                      className='recommend-card'
                      onClick={() => Taro.navigateTo({ url: `/pages/detail/detail?id=${p.id}` })}
                    >
                      {p.images?.[0] && (
                        <Image className='recommend-img' src={fixImageUrl(p.images[0])} mode='aspectFill' lazyLoad />
                      )}
                      <Text className='recommend-name'>{p.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
