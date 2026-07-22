import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getProductDetail, fixImageUrl } from '../../utils/request'
import { decodeHtmlEntities } from '../../utils/decode'
import './detail.scss'

interface ProductDetail {
  id: number
  name: string
  brand: string
  model: string
  main_image?: string
  images?: string[]
  params: Record<string, string>
}

/** 解析图片列表：优先 main_image，兼容 images */
function resolveImages(detail: ProductDetail): string[] {
  const urls: string[] = []
  const push = (u?: string) => {
    if (!u || !String(u).trim()) return
    const fixed = fixImageUrl(String(u).trim())
    if (fixed && !urls.includes(fixed)) urls.push(fixed)
  }
  push(detail.main_image)
  ;(detail.images || []).forEach(push)
  return urls
}

export default function Detail() {
  const router = useRouter()
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const id = Number(router.params.id) || 1
    getProductDetail(id).then(res => {
      if (res.code === 0) {
        setDetail(res.data as ProductDetail)
        setCurrentImageIndex(0)
      }
    })
  }, [])

  if (!detail) {
    return (
      <View className='page'>
        <View className='loading'>
          <View className='loading-spinner' />
          <Text className='loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  const productImages = resolveImages(detail)
  const mainImage = productImages[currentImageIndex] || productImages[0] || ''

  const tags = [
    detail.brand,
    detail.params?.['产品类别'],
    detail.params?.['总容积'],
    detail.params?.['制冷方式'],
  ].filter(Boolean)

  /** 从产品 params 取核心参数（匹数 / 能效 / 冷暖），兼容常见别名 */
  const pickParam = (...keys: string[]) => {
    for (const key of keys) {
      const v = detail.params?.[key]
      if (v && String(v).trim()) return String(v).trim()
    }
    return '-'
  }

  const formatEnergy = (raw: string) => {
    if (raw === '-') return raw
    const short = raw.replace(/能效等级/g, '').replace(/能效$/g, '').trim()
    return short || raw
  }

  const coreParams = [
    { icon: '⚡', label: '匹数', value: pickParam('匹数', '空调匹数') },
    { icon: '🌿', label: '能效', value: formatEnergy(pickParam('能效等级', '能效')) },
    { icon: '❄️', label: '冷暖', value: pickParam('冷暖类型', '冷暖', '制冷方式') },
  ]

  const paramEntries = Object.entries(detail.params || {}).filter(
    ([_, value]) => value && String(value).trim() !== ''
  )

  const handlePreview = () => {
    if (!mainImage) return
    if (process.env.TARO_ENV === 'h5') {
      setShowPreview(true)
    } else {
      Taro.previewImage({ urls: productImages, current: mainImage })
    }
  }

  return (
    <View className='page'>
      <ScrollView className='content' scrollY>
        {/* 图片区域 - 支持左右滑动切换 */}
        <View className='image-gallery'>
          {productImages.length > 0 ? (
            <Swiper
              className='image-swiper'
              current={currentImageIndex}
              onChange={(e) => setCurrentImageIndex(e.detail.current)}
              duration={300}
              circular={productImages.length > 1}
              indicatorDots={false}
              style={{ width: '100%', height: '100%' }}
            >
              {productImages.map((img, index) => (
                <SwiperItem key={index}>
                  <Image
                    className='main-image'
                    src={img}
                    mode='aspectFit'
                    onClick={handlePreview}
                  />
                </SwiperItem>
              ))}
            </Swiper>
          ) : (
            <Text className='main-image-placeholder'>⬡</Text>
          )}
          {productImages.length > 0 && (
            <View className='image-counter'>
              <Text className='image-counter-text'>
                {currentImageIndex + 1} / {productImages.length}
              </Text>
            </View>
          )}
        </View>

        {/* 产品信息 */}
        <View className='product-header'>
          <View className='brand-row'>
            <Text className='brand-name'>{detail.brand || '未知品牌'}</Text>
          </View>
          <Text className='product-title'>{detail.name || '未知产品'}</Text>
          <Text className='product-subtitle'>
            {tags.slice(1).join(' · ')}
          </Text>
        </View>

        {/* 核心参数 */}
        <View className='section'>
          <View className='section-header'>
            <Text className='section-title'>核心参数</Text>
          </View>
          <View className='key-specs'>
            {coreParams.map((item, index) => (
              <View key={index} className='spec-item'>
                <Text className='spec-icon'>{item.icon}</Text>
                <Text className='spec-value'>{item.value}</Text>
                <Text className='spec-label'>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 详细参数 */}
        <View className='section'>
          <View className='section-header'>
            <Text className='section-title'>详细参数</Text>
          </View>
          <View className='specs-table'>
            {paramEntries.map(([label, value], i) => (
              <View key={i} className='spec-row'>
                <Text className='spec-key'>{label}</Text>
                <Text className='spec-value-text'>{decodeHtmlEntities(String(value))}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* H5 图片预览弹窗 */}
      {process.env.TARO_ENV === 'h5' && showPreview && mainImage && (
        <View className='image-preview-overlay' onClick={() => setShowPreview(false)}>
          <View className='image-preview-close' onClick={() => setShowPreview(false)}>✕</View>
          <Image
            className='image-preview-img'
            src={mainImage}
            mode='aspectFit'
            onClick={(e) => e.stopPropagation()}
          />
        </View>
      )}
    </View>
  )
}
