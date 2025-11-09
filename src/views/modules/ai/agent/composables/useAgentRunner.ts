import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { EnhancedSSEService } from '/@/views/modules/ai/workflow/utils/sseService'
import type { AgentRunPayload } from '/@/api/ai/agent/AiAgentTypes'

/**
 * 中间过程数据结构
 */
export interface IntermediateProcess {
  type: 'plan' | 'tool_start' | 'tool_end'
  data: any
}

/**
 * Agent 运行回调接口
 */
export interface AgentRunCallbacks {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onError?: (errorMessage: string) => void
  onComplete?: () => void
  /** 中间过程回调 */
  onIntermediateProcess?: (process: IntermediateProcess) => void
}

export function useAgentRunner() {
  const isRunning = ref(false)
  const lastError = ref<string | null>(null)
  let sseService: EnhancedSSEService | null = null

  const cleanup = () => {
    if (sseService) {
      sseService.disconnect()
      sseService = null
    }
    isRunning.value = false
  }

  const runAgent = async (payload: AgentRunPayload, callbacks?: AgentRunCallbacks) => {
    if (isRunning.value) {
      message.warning('Agent 正在运行，请稍候')
      return
    }

    isRunning.value = true
    lastError.value = null

    sseService = new EnhancedSSEService({
      url: '/ai/ai/agent/run', // 网关/ai 所以完整路径为 /ai/ai/agent/run
      requestBody: payload,
      disableRetry: true,
      onStart: () => {
        callbacks?.onStart?.()
      },
      onMessage: (data, event) => {
        const errorEvent = event === '[ERROR]' || event === 'ERROR'

        // 处理中间过程消息（仅当消息只包含 intermediateProcess 字段时）
        if (
          typeof data === 'object' &&
          data !== null &&
          'intermediateProcess' in data &&
          !('nodeId' in data) &&
          !('chunk' in data)
        ) {
          const intermediateProcess = data.intermediateProcess as IntermediateProcess
          callbacks?.onIntermediateProcess?.(intermediateProcess)
          return
        }

        const chunk = typeof data === 'string' ? data : JSON.stringify(data)

        if (errorEvent) {
          lastError.value = chunk
          callbacks?.onError?.(chunk)
          cleanup()
          return
        }

        if (chunk === '[DONE]') {
          return
        }

        callbacks?.onChunk?.(chunk)
      },
      onDone: () => {
        callbacks?.onComplete?.()
        cleanup()
      },
      onError: (error) => {
        const msg = error?.message || 'Agent 运行失败'
        lastError.value = msg
        callbacks?.onError?.(msg)
        cleanup()
      },
      onClose: () => {
        isRunning.value = false
      },
    })

    try {
      await sseService.connect()
    } catch (error: any) {
      const msg = error?.message || 'Agent 运行失败'
      lastError.value = msg
      callbacks?.onError?.(msg)
      cleanup()
    }
  }

  const stop = () => {
    if (sseService) {
      sseService.disconnect()
      sseService = null
    }
    isRunning.value = false
  }

  return {
    isRunning,
    lastError,
    runAgent,
    stop,
  }
}
