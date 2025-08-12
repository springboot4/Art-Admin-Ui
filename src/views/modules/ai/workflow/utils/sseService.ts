import { EventSourceMessage, fetchEventSource } from '@microsoft/fetch-event-source'
import { getTenant, getToken } from '/@/utils/auth'
import { useGlobSetting } from '/@/hooks/setting'
import type { SSEChunkMessage, SSENodeOutputMessage } from '../types'

interface SSEServiceOptions {
  url: string
  onMessage?: (data: SSENodeOutputMessage | SSEChunkMessage) => void
  onError?: (error: any) => void
  onOpen?: () => void
  onClose?: () => void
  onRetry?: (retryCount: number) => void
}

export class SSEService {
  protected options: SSEServiceOptions
  protected controller: AbortController | null = null
  protected isConnected = false
  protected isManualClose = false

  constructor(options: SSEServiceOptions) {
    this.options = options
  }

  /**
   * 启动SSE连接
   */
  async connect(): Promise<void> {}

  /**
   * 手动关闭连接
   */
  disconnect(): void {
    this.isManualClose = true
    this.isConnected = false

    if (this.controller) {
      this.controller.abort()
      this.controller = null
    }

    this.options.onClose?.()
  }

  /**
   * 是否已连接
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * 获取连接状态
   */
  getReadyState(): number {
    return this.isConnected ? 1 : 3 // 1: OPEN, 3: CLOSED
  }
}

/**
 * 增强版SSE服务，支持自定义请求体
 */
export class EnhancedSSEService extends SSEService {
  protected readonly requestBody: any
  protected controller: AbortController | null = null
  protected isManualClose = false

  constructor(options: SSEServiceOptions & { requestBody?: any }) {
    super(options)
    this.requestBody = options.requestBody || {}
  }

  async connect(): Promise<void> {
    if (this.getIsConnected()) {
      console.warn('增强SSE连接已存在')
      return
    }

    this.controller = new AbortController()
    this.isManualClose = false

    const globSetting = useGlobSetting()
    const token = getToken()
    const tenant = getTenant()

    let fullUrl = this.options.url
    if (!fullUrl.startsWith('http')) {
      fullUrl = `${globSetting.apiUrl}${globSetting.urlPrefix}${fullUrl}`
    }

    const getHeaders = (token?: any, tenant?: any): Record<string, string> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      if (tenant) {
        headers['tenant-id'] = tenant
      }

      return headers
    }

    try {
      await fetchEventSource(fullUrl, {
        method: 'POST',
        headers: getHeaders(token, tenant),
        body: JSON.stringify(this.requestBody),
        signal: this.controller.signal,

        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            console.log('增强SSE连接已建立')
            this.options.onOpen?.()
            return
          } else {
            throw new Error(`增强SSE连接失败: ${response.status} ${response.statusText}`)
          }
        },

        onmessage: (message: EventSourceMessage) => {
          try {
            if (message.data && message.data !== '[DONE]') {
              const data = JSON.parse(message.data)
              this.options.onMessage?.(data)
            }
          } catch (error) {
            console.error('解析增强SSE消息失败:', error, message.data)
          }
        },

        onerror: (error) => {
          console.error('增强SSE连接错误:', error)
          this.options.onError?.(error)

          if (this.isManualClose) {
            return
          }

          throw error
        },

        onclose: () => {
          console.log('增强SSE连接已关闭')
          this.options.onClose?.()
        },
      })
    } catch (error) {
      if (!this.isManualClose) {
        console.error('增强SSE连接异常:', error)
        this.options.onError?.(error)
      }
      throw error
    }
  }
}
