import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getProductDetail, fixImageUrl } from '../../utils/request'
import { decodeHtmlEntities } from '../../utils/decode'
import './detail.scss'

interface ProductDetail {
  id: number
  name: string
  brand: string
  model: string
  images: string[]
  params: Record<string, string>
}

export default function Detail() {
  const router = useRouter()
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  useEffect(() => {
    const id = Number(router.params.id) || 1
    getProductDetail(id).then(res => {
      if (res.code === 0) setDetail(res.data as ProductDetail)
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

  // 获取产品图片（支持多图）
  const productImages = (detail.images || []).map(fixImageUrl)
  const mainImage = productImages[currentImageIndex] || ''

  // 获取产品标签
  const tags = [
    detail.brand,
    detail.params?.['产品类别'],
    detail.params?.['总容积'],
    detail.params?.['制冷方式'],
  ].filter(Boolean)

  // 核心参数（前3个）
  const coreParams = [
    { icon: '⚡', label: '匹数', value: detail.params?.['匹数'] || detail.params?.['制冷量'] || '-' },
    { icon: '🌿', label: '能效', value: detail.params?.['能效等级'] || '-' },
    { icon: '🔄', label: '类型', value: detail.params?.['变频/定频'] || detail.params?.['产品类别'] || '-' },
  ]

  // 产品特点标签
  const features = [
    detail.params?.['变频/定频'] === '变频' ? '变频' : null,
    detail.params?.['能效等级']?.includes('一级') ? '一级能效' : null,
    'WiFi智控',
    '静音设计',
    '自清洁',
    '快速冷暖',
  ].filter(Boolean)

  // 平铺的参数列表
  const paramEntries = Object.entries(detail.params || {}).filter(
    ([_, value]) => value && String(value).trim() !== ''
  )

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
        <View className='header-actions'>
          <View className='action-btn' onClick={() => Taro.showToast({ title: '已复制链接', icon: 'none' })}>
            <Text className='action-icon'>↗</Text>
          </View>
          <View className='action-btn' onClick={() => Taro.showToast({ title: '更多功能', icon: 'none' })}>
            <Text className='action-icon'>⋯</Text>
          </View>
        </View>
      </View>

      <ScrollView className='content' scrollY>
        {/* 图片区域 */}
        <View className='image-gallery'>
          {mainImage ? (
            <Image
              className='main-image'
              src={mainImage}
              mode='aspectFit'
              onClick={() => {
                if (process.env.TARO_ENV === 'h5') {
                  setShowPreview(true)
                } else {
                  Taro.previewImage({ urls: productImages, current: mainImage })
                }
              }}
            />
          ) : (
            <Text className='main-image-placeholder'>⬡</Text>
          )}
          {/* 图片指示器 */}
          {productImages.length > 1 && (
            <View className='image-dots'>
              {productImages.map((_, index) => (
                <View
                  key={index}
                  className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        {/* 产品信息 */}
        <View className='product-header'>
          <View className='brand-row'>
            <View className='brand-logo'>
              <Text className='brand-logo-text'>{detail.brand?.charAt(0) || '品'}</Text>
            </View>
            <View className='brand-info'>
              <Text className='brand-name'>{detail.brand || '未知品牌'}</Text>
              <Text className='brand-meta'>官方旗舰店</Text>
            </View>
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

        {/* 产品特点 */}
        <View className='section'>
          <View className='section-header'>
            <Text className='section-title'>产品特点</Text>
          </View>
          <View className='features'>
            {features.map((item, index) => (
              <View key={index} className='feature-tag'>
                <Text className='feature-icon'>✓</Text>
                <Text className='feature-text'>{item}</Text>
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
      {process.env.TARO_ENV === 'h5' && showPreview && (
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
