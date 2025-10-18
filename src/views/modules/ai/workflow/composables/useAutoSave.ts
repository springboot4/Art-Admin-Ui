import type { Ref } from "vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";

/**
 * 自动保存状态枚举
 */
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'success' | 'error'

/**
 * 自动保存配置
 */
export interface AutoSaveConfig {
  /** 防抖延迟时间(ms) - 用户停止操作后多久触发保存 */
  debounceDelay?: number
  /** 最大等待时间(ms) - 无论如何最多等待多久必须保存 */
  maxWaitTime?: number
  /** 是否启用自动保存 */
  enabled?: boolean
  /** 保存失败后重试次数 */
  maxRetries?: number
  /** 重试延迟(ms) */
  retryDelay?: number
  /** 是否在卸载前保存 */
  saveOnUnmount?: boolean
}

/**
 * 自动保存 Hook
 *
 * 设计原则：
 * 1. 关注点分离：自动保存逻辑独立管理
 * 2. 防御性编程：完善的错误处理和边界条件
 * 3. 性能优化：智能去重、防抖节流、请求管理
 * 4. 零侵入：不修改业务逻辑，只扩展功能
 */
export function useAutoSave(config: AutoSaveConfig = {}) {
  // ==================== 配置初始化 ====================
  const {
    debounceDelay = 5000, // 5秒防抖
    maxWaitTime = 30000, // 最长30秒必须保存
    enabled = true,
    maxRetries = 3,
    retryDelay = 2000,
    saveOnUnmount = true,
  } = config

  // ==================== 状态管理 ====================

  /** 自动保存状态 */
  const status = ref<AutoSaveStatus>('idle')

  /** 最后保存时间 */
  const lastSavedTime = ref<Date | null>(null)

  /** 最后保存的数据哈希 */
  const lastSavedHash = ref<string>('')

  /** 错误信息 */
  const errorMessage = ref<string | null>(null)

  /** 当前重试次数 */
  const retryCount = ref(0)

  /** 是否有未保存的更改 */
  const hasUnsavedChanges = ref(false)

  /** 是否暂停自动保存 */
  const isPaused = ref(false)

  // ==================== 定时器管理 ====================

  /** 防抖定时器 */
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /** 节流定时器 */
  let throttleTimer: ReturnType<typeof setTimeout> | null = null

  /** 最后一次数据变更时间 */
  let lastChangeTime = 0

  /** AbortController 用于取消过时的保存请求 */
  let abortController: AbortController | null = null

  /** 保存可见性变化监听器的引用，用于清理 */
  let visibilityChangeHandler: (() => void) | null = null

  /** 保存 watch 停止函数的引用 */
  let stopWatch: (() => void) | null = null

  // ==================== 核心功能 ====================

  /**
   * 计算数据的哈希值（使用简单的字符串哈希）
   * 排除临时UI状态，只关注数据结构
   */
  function computeDataHash(data: any): string {
    try {
      // 深拷贝并清理临时状态
      const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
        // 排除运行时状态和UI相关属性
        if (key === 'status' || key === 'animated' || key === 'selected') {
          return undefined
        }
        return value
      }))

      const str = JSON.stringify(cleanData)

      // 简单的字符串哈希算法
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
      }
      return hash.toString(36)
    } catch (error) {
      console.error('[AutoSave] 计算哈希失败:', error)
      return ''
    }
  }

  /**
   * 清除所有定时器
   */
  function clearTimers() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
  }

  /**
   * 取消当前保存请求
   */
  function cancelCurrentSave() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  /**
   * 执行保存操作（内部方法）
   */
  async function performSave(saveFunction: () => Promise<boolean>, currentHash: string) {
    // 检查是否已取消
    if (abortController?.signal.aborted) {
      return false
    }

    // 更新状态
    status.value = 'saving'
    errorMessage.value = null

    try {
      const success = await saveFunction()

      // 检查是否在保存过程中被取消
      if (abortController?.signal.aborted) {
        return false
      }

      if (success) {
        // 保存成功
        status.value = 'success'
        lastSavedTime.value = new Date()
        lastSavedHash.value = currentHash
        hasUnsavedChanges.value = false
        retryCount.value = 0

        // 2秒后状态回到idle
        setTimeout(() => {
          if (status.value === 'success') {
            status.value = 'idle'
          }
        }, 2000)

        return true
      } else {
        throw new Error('保存失败')
      }
    } catch (error: any) {
      console.error('[AutoSave] 保存失败:', error)

      // 重试逻辑
      if (retryCount.value < maxRetries) {
        retryCount.value++
        status.value = 'pending'
        errorMessage.value = `保存失败，${retryDelay / 1000}秒后重试...`

        // 延迟后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return performSave(saveFunction, currentHash)
      } else {
        // 重试次数耗尽
        status.value = 'error'
        errorMessage.value = error.message || '自动保存失败，请手动保存'
        retryCount.value = 0
        return false
      }
    }
  }

  /**
   * 触发自动保存
   */
  async function triggerAutoSave(
    getData: () => any,
    saveFunction: () => Promise<boolean>,
    force = false
  ) {
    // 检查是否启用
    if (!enabled || isPaused.value) {
      return
    }

    // 取消之前的保存请求
    cancelCurrentSave()

    // 计算当前数据哈希
    const currentData = getData()
    const currentHash = computeDataHash(currentData)

    // 如果数据没有变化且非强制保存，跳过
    if (!force && currentHash === lastSavedHash.value) {
      hasUnsavedChanges.value = false
      return
    }

    // 标记有未保存的更改
    hasUnsavedChanges.value = true

    // 创建新的 AbortController
    abortController = new AbortController()

    // 执行保存
    await performSave(saveFunction, currentHash)
  }

  /**
   * 设置自动保存监听
   *
   * @param watchTarget 要监听的响应式数据
   * @param getData 获取要保存的数据的函数
   * @param saveFunction 执行保存的函数
   */
  function setupAutoSave(
    watchTarget: Ref<any> | Ref<any>[],
    getData: () => any,
    saveFunction: () => Promise<boolean>
  ) {
    // 清理之前的监听器
    cleanup()

    // 监听数据变化
    stopWatch = watch(
      watchTarget,
      () => {
        if (!enabled || isPaused.value) {
          return
        }

        const now = Date.now()

        // 清除之前的防抖定时器
        clearTimers()

        // 更新最后变更时间
        lastChangeTime = now

        // 设置防抖定时器
        debounceTimer = setTimeout(() => {
          triggerAutoSave(getData, saveFunction, false)
        }, debounceDelay)

        // 设置节流定时器（最长等待时间）
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            triggerAutoSave(getData, saveFunction, false)
            throttleTimer = null
          }, maxWaitTime)
        }

        // 标记状态为待保存
        if (status.value === 'idle' || status.value === 'success') {
          status.value = 'pending'
        }
      },
      { deep: true }
    )

    // 监听页面可见性变化（切换标签页时保存）
    visibilityChangeHandler = async () => {
      if (document.hidden && hasUnsavedChanges.value) {
        clearTimers()
        await triggerAutoSave(getData, saveFunction, true)
      }
    }
    document.addEventListener('visibilitychange', visibilityChangeHandler)

    // 如果需要在卸载前保存，监听 beforeunload 事件
    if (saveOnUnmount) {
      const beforeUnloadHandler = async () => {
        if (hasUnsavedChanges.value) {
          clearTimers()
          await triggerAutoSave(getData, saveFunction, true)
        }
      }
      window.addEventListener('beforeunload', beforeUnloadHandler)

      // 保存清理函数引用
      const originalCleanup = visibilityChangeHandler
      visibilityChangeHandler = () => {
        window.removeEventListener('beforeunload', beforeUnloadHandler)
        if (originalCleanup) {
          originalCleanup()
        }
      }
    }
  }

  /**
   * 清理所有监听器和定时器
   */
  function cleanup() {
    // 停止 watch
    if (stopWatch) {
      stopWatch()
      stopWatch = null
    }

    // 清理定时器
    clearTimers()

    // 取消当前保存
    cancelCurrentSave()

    // 移除事件监听器
    if (visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler)
      visibilityChangeHandler = null
    }
  }

  // 在组件卸载时自动清理
  onBeforeUnmount(() => {
    cleanup()
  })

  /**
   * 暂停自动保存
   */
  function pause() {
    isPaused.value = true
    clearTimers()
    if (status.value === 'pending') {
      status.value = 'idle'
    }
  }

  /**
   * 恢复自动保存
   */
  function resume() {
    isPaused.value = false
  }

  /**
   * 手动触发保存
   */
  async function forceSave(getData: () => any, saveFunction: () => Promise<boolean>) {
    clearTimers()
    return await triggerAutoSave(getData, saveFunction, true)
  }

  /**
   * 重置状态
   */
  function reset() {
    clearTimers()
    cancelCurrentSave()
    status.value = 'idle'
    lastSavedTime.value = null
    lastSavedHash.value = ''
    errorMessage.value = null
    retryCount.value = 0
    hasUnsavedChanges.value = false
  }

  // ==================== 计算属性 ====================

  /**
   * 是否正在保存
   */
  const isSaving = computed(() => status.value === 'saving')

  /**
   * 格式化的最后保存时间
   */
  const formattedLastSavedTime = computed(() => {
    if (!lastSavedTime.value) return ''

    const now = new Date()
    const diff = now.getTime() - lastSavedTime.value.getTime()

    // 小于1分钟显示"刚刚"
    if (diff < 60000) {
      return '刚刚'
    }

    // 小于1小时显示分钟
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}分钟前`
    }

    // 小于1天显示小时
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}小时前`
    }

    // 显示具体时间
    return lastSavedTime.value.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  })

  /**
   * 状态描述文本
   */
  const statusText = computed(() => {
    switch (status.value) {
      case 'idle':
        return lastSavedTime.value ? `已保存 ${formattedLastSavedTime.value}` : '未保存'
      case 'pending':
        return '等待保存...'
      case 'saving':
        return '保存中...'
      case 'success':
        return `已保存 ${formattedLastSavedTime.value}`
      case 'error':
        return errorMessage.value || '保存失败'
      default:
        return ''
    }
  })

  // ==================== 对外暴露 ====================

  return {
    // 状态
    status,
    lastSavedTime,
    errorMessage,
    hasUnsavedChanges,
    isPaused,
    isSaving,
    statusText,
    formattedLastSavedTime,

    // 方法
    setupAutoSave,
    cleanup,
    pause,
    resume,
    forceSave,
    reset,
  }
}
