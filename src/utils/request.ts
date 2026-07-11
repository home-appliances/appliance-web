import Taro from '@tarojs/taro'

// API 基础地址
const API_ORIGIN = 'https://appliance-api.cheapgo.top'

// 根据环境动态设置 BASE_URL
// H5：开发环境走 `/api`（devServer proxy），生产环境直接调用后端
// 小程序：直接用线上地址
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
  // 失败重试次数（默认 2 次），网络错误 / 5xx / 业务 code === -1 时触发
  retry?: number
  // 是否打印响应数据（默认 false；响应体可能很大，避免无谓的日志开销）
  logResponse?: boolean
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

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// 判断是否值得重试：网络层失败、5xx、或后端业务层返回失败（code === -1，常见于超时）
const shouldRetry = (res: Taro.request.SuccessCallbackResult | null, err: any, body?: ApiResponse): boolean => {
  if (err) return true
  if (!res) return false
  if (res.statusCode >= 500) return true
  if (res.statusCode === 200 && body && typeof body.code === 'number' && body.code !== 0) return true
  return false
}

// 单次请求（不含重试逻辑），返回 { res, body } 供上层判断
const requestOnce = <T = any>(
  options: RequestOptions
): Promise<{ res: Taro.request.SuccessCallbackResult; body: ApiResponse<T> }> => {
  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}${options.url}`
    Taro.request({
      url: fullUrl,
      data: options.data || {},
      method: options.method || 'GET',
      timeout: 30000,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        resolve({ res, body: res.data as ApiResponse<T> })
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export const request = async <T = any>(options: RequestOptions): Promise<ApiResponse<T>> => {
  const maxRetry = options.retry ?? 2
  const logResponse = options.logResponse ?? false
  let lastErr: any = null

  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const { res, body } = await requestOnce<T>(options)
      // 仅在需要时打印响应体，避免 1MB+ 日志开销
      console.log(`[Request] ${options.url} attempt ${attempt + 1}: ${res.statusCode}`)
      if (logResponse) {
        console.log('[Request] 响应数据:', res.data)
      }

      // 业务层失败（后端返回 200 但 code 非 0，如连接超时）也走重试
      if (shouldRetry(res, null, body) && attempt < maxRetry) {
        await sleep(500 * Math.pow(2, attempt)) // 0.5s, 1s, 2s...
        continue
      }

      if (res.statusCode === 200) {
        return body
      }
      throw new Error(`请求失败: ${res.statusCode}`)
    } catch (err) {
      lastErr = err
      console.error(`[Request] ${options.url} attempt ${attempt + 1} 失败:`, JSON.stringify(err))
      if (attempt < maxRetry) {
        await sleep(500 * Math.pow(2, attempt))
        continue
      }
      throw err
    }
  }

  // 理论上不会走到这里，兜底
  throw lastErr || new Error('请求失败')
}

// 搜索产品
export const searchProducts = (keyword: string, page: number = 1) => {
  console.log('[API] 搜索产品:', keyword, 'page:', page)
  return request({
    url: '/search',
    data: { keyword, page },
    retry: 3
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
