import Taro from '@tarojs/taro'

// ════════════════════════════════════════════════════════════
// ⚠️ 小程序真机预览的后端地址
//   小程序运行在手机上，localhost 会指向手机自身，必须填开发机的局域网 IP。
//   换网络 / 换电脑后，改下面两个值即可，无需改动其他业务代码。
//   查本机 IP：Windows 执行 ipconfig，找 WLAN 的 IPv4 地址。
//   （曾尝试用 Taro defineConstants 注入 process.env.API_HOST，但 Taro 4.2 watch
//    增量编译下替换不可靠，小程序运行时报 "process is not defined"，故改用此常量。）
// ════════════════════════════════════════════════════════════
const API_HOST = '192.168.1.7'
const API_PORT = '3000'
const API_ORIGIN = `http://${API_HOST}:${API_PORT}`

// 根据环境动态设置 BASE_URL
// H5：开发环境走 `/api`（devServer proxy），生产环境直接调用后端
// 小程序：用开发机局域网地址
const getBaseUrl = () => {
  if (process.env.TARO_ENV === 'h5') {
    // H5 环境统一走相对路径，由 fc-entry 代理转发到后端
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
