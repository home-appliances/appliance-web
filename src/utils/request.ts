import Taro from '@tarojs/taro'

// ════════════════════════════════════════════════════════════
// 后端地址配置
//   H5 走相对路径 /api（devServer proxy 或 fc-entry 代理）。
//   小程序通过 API_ORIGIN 环境变量指定后端地址。
//   开发模式默认 http://localhost:3000，生产模式通过 .env 配置。
//   真机预览时 localhost 不可达，需改为局域网 IP。
// ════════════════════════════════════════════════════════════
const IS_DEV = process.env.NODE_ENV === 'development'
const API_ORIGIN = process.env.API_ORIGIN || (IS_DEV ? 'http://localhost:3000' : '')

// 根据环境动态设置 BASE_URL
// H5：统一走相对路径 /api（devServer proxy 或 fc-entry 代理）
// 小程序：开发模式请求本地后端，生产模式请求线上后端
const getBaseUrl = () => {
  if (process.env.TARO_ENV === 'h5') {
    return '/api'
  }
  return `${API_ORIGIN}/api`
}

const BASE_URL = getBaseUrl()

// 修正图片 URL：小程序中相对路径会被当作本地资源，需要拼接完整域名
export const fixImageUrl = (url: string): string => {
  if (!url) return url
  // 已经是完整 URL 或 base64 数据，直接返回
  if (url.startsWith('http') || url.startsWith('data:')) return url
  // 小程序环境：相对路径需要拼上域名
  if (process.env.TARO_ENV !== 'h5' && url.startsWith('/')) {
    return `${API_ORIGIN}${url}`
  }
  return url
}

interface RequestOptions {
  url: string
  data?: Record<string, any>
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
}

interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const request = <T = any>(options: RequestOptions): Promise<ApiResponse<T>> => {
  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}${options.url}`
    console.log('[Request] 发起请求:', fullUrl)
    console.log('[Request] 请求参数:', options.data)
    console.log('[Request] 当前环境:', process.env.TARO_ENV)

    Taro.request({
      url: fullUrl,
      data: options.data || {},
      method: options.method || 'GET',
      timeout: 30000,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('[Request] 请求成功:', res.statusCode)
        console.log('[Request] 响应数据:', res.data)
        if (res.statusCode === 200) {
          resolve(res.data as ApiResponse<T>)
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('[Request] 请求失败:', err)
        console.error('[Request] 错误详情:', JSON.stringify(err))
        reject(err)
      }
    })
  })
}

// 搜索产品
export const searchProducts = (keyword: string, page: number = 1) => {
  console.log('[API] 搜索产品:', keyword, 'page:', page)
  return request({
    url: '/search',
    data: { keyword, page }
  })
}

// 获取产品详情
export const getProductDetail = (id: number) => {
  console.log('[API] 获取详情:', id)
  return request({
    url: '/detail',
    data: { id }
  })
}

// 获取搜索建议
export const getSuggest = (keyword: string) => {
  return request<string[]>({
    url: '/suggest',
    data: { keyword, limit: 8 }
  })
}

// 获取推荐数据
export const getRecommend = () => {
  return request<{ brands: any[]; products: any[] }>({
    url: '/recommend',
    data: { limit: 6 }
  })
}

// 获取分类列表（树形结构）
export const getCategories = () => {
  return request<Array<{
    id: number;
    code: string;
    name: string;
    parent_id: number | null;
    product_count: number;
    children: Array<{
      id: number;
      code: string;
      name: string;
      parent_id: number;
      product_count: number;
    }>;
  }>>({
    url: '/categories'
  })
}

// 获取分类下的产品
export const getCategoryProducts = (categoryId: number, page: number = 1) => {
  return request<{
    category: {
      id: number;
      code: string;
      name: string;
    };
    products: Array<{
      id: number;
      title: string;
      img: string;
      tag: string[];
      brand: string;
      model: string;
      price: number;
    }>;
  }>({
    url: `/category/${categoryId}`,
    data: { page }
  })
}
