/**
 * 工作流节点过滤工具
 * 用于根据应用模式(workflow/chatflow)过滤可用的节点类型
 */

export type AppMode = 'workflow' | 'chatflow'

/**
 * 定义节点类型的应用模式适配关系
 * - workflow: 工作流模式支持的节点
 * - chatflow: 对话流模式支持的节点
 */
const NODE_MODE_MAP: Record<string, AppMode[]> = {
  start: ['workflow', 'chatflow'], // 开始节点 - 两种模式都支持
  llm: ['workflow', 'chatflow'], // 大语言模型 - 两种模式都支持
  llm_answer: ['chatflow'], // 大模型应答 - 仅对话流支持
  knowledge: ['workflow', 'chatflow'], // 知识检索 - 两种模式都支持
  condition: ['workflow', 'chatflow'], // 条件判断 - 两种模式都支持
  code: ['workflow', 'chatflow'], // 代码执行 - 两种模式都支持
  http: ['workflow', 'chatflow'], // HTTP请求 - 两种模式都支持
  output: ['workflow'], // 输出节点 - 仅工作流支持
}

/**
 * 判断节点类型是否在指定应用模式下可用
 * @param nodeType 节点类型
 * @param appMode 应用模式
 * @returns 是否可用
 */
export function isNodeTypeAvailable(nodeType: string, appMode: AppMode): boolean {
  const supportedModes = NODE_MODE_MAP[nodeType]

  // 如果节点类型未在映射表中定义，默认允许所有模式使用
  if (!supportedModes) {
    console.warn(`节点类型 "${nodeType}" 未在节点模式映射表中定义，默认允许使用`)
    return true
  }

  return supportedModes.includes(appMode)
}

/**
 * 过滤节点类型列表，只返回当前应用模式支持的节点
 * @param nodeTypes 节点类型列表
 * @param appMode 应用模式
 * @returns 过滤后的节点类型列表
 */
export function filterNodeTypesByAppMode<T extends { type: string }>(
  nodeTypes: T[],
  appMode: AppMode,
): T[] {
  return nodeTypes.filter((nodeType) => isNodeTypeAvailable(nodeType.type, appMode))
}

/**
 * 获取应用模式的中文名称
 * @param appMode 应用模式
 * @returns 中文名称
 */
export function getAppModeLabel(appMode: AppMode): string {
  const labels: Record<AppMode, string> = {
    workflow: '工作流',
    chatflow: '对话流',
  }
  return labels[appMode] || appMode
}

/**
 * 校验应用模式是否匹配
 * @param routeAppMode 路由中的应用模式
 * @param backendAppMode 后端返回的应用模式
 * @returns 校验结果
 */
export function validateAppMode(
  routeAppMode: string | undefined,
  backendAppMode: string | undefined,
): { valid: boolean; message?: string } {
  // 如果路由没有传递appMode，跳过校验
  if (!routeAppMode) {
    return {
      valid: true,
    }
  }

  // 如果后端没有返回appMode，警告但允许继续
  if (!backendAppMode) {
    console.warn('后端未返回应用模式(type字段)，跳过校验')
    return {
      valid: true,
    }
  }

  // 严格校验：路由的appMode必须与后端返回的type一致
  if (routeAppMode !== backendAppMode) {
    return {
      valid: false,
      message: `应用模式不匹配！路由模式: ${getAppModeLabel(
        routeAppMode as AppMode,
      )}，数据模式: ${getAppModeLabel(backendAppMode as AppMode)}。请检查数据一致性。`,
    }
  }

  return {
    valid: true,
  }
}
