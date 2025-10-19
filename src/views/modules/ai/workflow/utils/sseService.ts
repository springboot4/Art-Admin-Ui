import { EventSourceMessage, fetchEventSource } from '@microsoft/fetch-event-source'
import { getTenant, getToken } from '/@/utils/auth'
import { useGlobSetting } from '/@/hooks/setting'
import type { SSEChunkMessage, SSENodeOutputMessage } from '../types'

interface SSEServiceOptions {
  url: string
  onMessage?: (data: SSENodeOutputMessage | SSEChunkMessage, event?: string) => void
  onError?: (error: any) => void
  onOpen?: () => void
  onClose?: () => void
  onRetry?: (retryCount: number) => void
  onStart?: () => void // 新增：流程开始事件
  onDone?: () => void // 新增：流程结束事件
  disableRetry?: boolean // 新增：禁用重试（默认false）
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
        openWhenHidden: true,
        // 使用自定义 fetch 来禁用重试
        fetch: async (input: RequestInfo, init?: RequestInit) => {
          try {
            return await fetch(input, init)
          } catch (error) {
            console.log('Fetch 请求失败，不重试:', error)
            throw error
          }
        },
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
            // 处理事件类型 - 后端发送的格式是 [START] 和 [DONE]
            if (message.event === '[START]' || message.event === 'START') {
              this.options.onStart?.()
              return
            }

            if (
              message.event === '[DONE]' ||
              message.event === 'DONE' ||
              message.data === '[DONE]'
            ) {
              this.options.onDone?.()
              return
            }

            // 处理数据消息
            if (message.data && message.data !== '[DONE]') {
              const data = JSON.parse(message.data)
              this.options.onMessage?.(data, message.event)
            }
          } catch (error) {
            console.error('解析增强SSE消息失败:', error, message.data)
          }
        },

        onerror: (error) => {
          console.error('增强SSE连接错误:', error)
          this.options.onError?.(error)

          // 如果禁用重试，直接抛出错误终止连接
          if (this.options.disableRetry) {
            throw error
          }

          return null
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
    }
  }
}
