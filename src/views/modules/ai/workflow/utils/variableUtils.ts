import {
  ENVIRONMENT_VARIABLES,
  NODE_OUTPUT_DEFINITIONS,
  getSystemVariables,
  VariableAccess,
  VariableDataType,
  VariableDefinition,
  VariableType,
} from '../types'

// 工作流图结构
export interface WorkflowNode {
  id: string
  type: string
  data: {
    nodeType: string
    config?: any
    [key: string]: any
  }

  [key: string]: any
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

// 节点前驱关系计算工具类
export class NodeDependencyAnalyzer {
  private nodes: WorkflowNode[]
  private edges: WorkflowEdge[]
  private appMode: 'workflow' | 'chatflow'

  private conversationVariables: { key: string; defaultValue: string | null }[]

  constructor(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    appMode: 'workflow' | 'chatflow' = 'workflow',
    conversationVariables: { key: string; defaultValue: string | null }[] = [],
  ) {
    this.nodes = nodes
    this.edges = edges
    this.appMode = appMode
    this.conversationVariables = Array.isArray(conversationVariables)
      ? conversationVariables.filter((item) => item && item.key)
      : []
  }

  /**
   * 获取指定节点的所有前驱节点（可达的节点）
   * @param nodeId 目标节点ID
   * @returns 前驱节点ID列表，按依赖顺序排序
   */
  getPredecessorNodes(nodeId: string): string[] {
    const predecessors = new Set<string>()
    const visited = new Set<string>()

    const dfs = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return
      visited.add(currentNodeId)

      // 查找所有指向当前节点的边
      const incomingEdges = this.edges.filter((edge) => edge.target === currentNodeId)

      for (const edge of incomingEdges) {
        const sourceNodeId = edge.source
        predecessors.add(sourceNodeId)
        // 递归查找前驱的前驱
        dfs(sourceNodeId)
      }
    }

    dfs(nodeId)

    // 按拓扑顺序返回（更早执行的节点在前）
    return this.topologicalSort(Array.from(predecessors))
  }

  /**
   * 获取指定节点可用的所有变量
   * @param nodeId 目标节点ID
   * @returns 可用变量列表
   */
  getAvailableVariables(nodeId: string): VariableDefinition[] {
    const variables: VariableDefinition[] = []

    // 1. 添加系统变量（所有节点都可访问，根据应用模式）
    variables.push(...getSystemVariables(this.appMode))

    // 2. 添加环境变量（所有节点都可访问）
    variables.push(...ENVIRONMENT_VARIABLES)

    // 3. 添加用户输入变量（从开始节点获取）
    const startNode = this.nodes.find((node) => node.data.nodeType === 'start')
    if (startNode && startNode.data.config?.userInputs) {
      const userInputVariables = this.createUserInputVariables(startNode.data.config.userInputs)
      variables.push(...userInputVariables)
    }

    // 4. 添加会话变量（TODO: 从配置中获取）
    const conversationVariables = this.getConversationVariables()
    variables.push(...conversationVariables)

    // 5. 添加前驱节点的输出变量
    const predecessorNodeIds = this.getPredecessorNodes(nodeId)
    for (const predecessorId of predecessorNodeIds) {
      const nodeOutputVariables = this.createNodeOutputVariables(predecessorId)
      variables.push(...nodeOutputVariables)
    }

    return variables
  }

  /**
   * 检查节点是否可以访问指定变量
   */
  canAccessVariable(nodeId: string, variableId: string): boolean {
    const availableVariables = this.getAvailableVariables(nodeId)
    return availableVariables.some((v) => v.id === variableId)
  }

  /**
   * 获取变量的完整引用路径
   */
  getVariableReference(variable: VariableDefinition): string {
    switch (variable.type) {
      case VariableType.SYSTEM:
        return `{{system.${variable.name}}}`
      case VariableType.ENVIRONMENT:
        return `{{environment.${variable.name}}}`
      case VariableType.USER_INPUT:
        return `{{userInput.${variable.name}}}`
      case VariableType.CONVERSATION:
        return `{{conversation.${variable.name}}}`
      case VariableType.NODE_OUTPUT:
        return `{{nodeOutput.${variable.sourceNodeId}.${variable.sourceOutputKey}}}`
      default:
        return `{{${variable.name}}}`
    }
  }

  /**
   * 解析变量引用字符串
   */
  parseVariableReference(reference: string): {
    type: VariableType
    nodeId?: string
    variableName: string
    outputKey?: string
  } | null {
    // 匹配格式: {{type.nodeId.variableName.outputKey}}
    const match = reference.match(/\{\{(\w+)\.(.+)\}\}/)
    if (!match) return null

    const type = match[1] as VariableType
    const parts = match[2].split('.')

    switch (type) {
      case VariableType.NODE_OUTPUT:
        return {
          type,
          nodeId: parts[0],
          variableName: parts[1] || '',
          outputKey: parts[1],
        }
      default:
        return {
          type,
          variableName: parts[0] || '',
        }
    }
  }

  /**
   * 创建用户输入变量定义
   */
  private createUserInputVariables(userInputs: any[]): VariableDefinition[] {
    if (!Array.isArray(userInputs)) return []

    return userInputs.map((input) => ({
      id: `user_input_${input.name}`,
      name: input.name,
      type: VariableType.USER_INPUT,
      dataType: input.dataType || VariableDataType.STRING,
      access: VariableAccess.READONLY,
      description: input.description || `用户输入: ${input.name}`,
      required: input.required || false,
      defaultValue: input.defaultValue,
    }))
  }

  /**
   * 获取会话变量
   */
  private getConversationVariables(): VariableDefinition[] {
    if (!Array.isArray(this.conversationVariables) || this.conversationVariables.length === 0) {
      return []
    }

    return this.conversationVariables.map((item) => ({
      id: `conversation_${item.key}`,
      name: item.key,
      type: VariableType.CONVERSATION,
      dataType: VariableDataType.STRING,
      access: VariableAccess.READWRITE,
      description: '会话变量',
      required: false,
      defaultValue: item.defaultValue ?? null,
    }))
  }

  /**
   * 创建节点输出变量定义
   */
  private createNodeOutputVariables(nodeId: string): VariableDefinition[] {
    const node = this.nodes.find((n) => n.id === nodeId)
    if (!node) return []

    const outputDefs = NODE_OUTPUT_DEFINITIONS[node.data.nodeType] || []

    return outputDefs.map((outputDef) => ({
      id: `node_output_${nodeId}_${outputDef.key}`,
      name: `${node.label || node.data.nodeType}.${outputDef.name}`,
      type: VariableType.NODE_OUTPUT,
      dataType: outputDef.dataType,
      access: VariableAccess.READONLY,
      description: outputDef.description || `来自节点 ${node.label || nodeId} 的输出`,
      sourceNodeId: nodeId,
      sourceOutputKey: outputDef.key,
    }))
  }

  /**
   * 拓扑排序，确保节点按执行顺序排列
   */
  private topologicalSort(nodeIds: string[]): string[] {
    const indegree = new Map<string, number>()
    const graph = new Map<string, string[]>()

    // 初始化
    nodeIds.forEach((id) => {
      indegree.set(id, 0)
      graph.set(id, [])
    })

    // 构建图和计算入度
    this.edges.forEach((edge) => {
      if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
        graph.get(edge.source)?.push(edge.target)
        indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1)
      }
    })

    // 拓扑排序
    const queue: string[] = []
    const result: string[] = []

    // 找到所有入度为0的节点
    nodeIds.forEach((id) => {
      if (indegree.get(id) === 0) {
        queue.push(id)
      }
    })

    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      // 更新邻接节点的入度
      const neighbors = graph.get(current) || []
      neighbors.forEach((neighbor) => {
        const newIndegree = (indegree.get(neighbor) || 0) - 1
        indegree.set(neighbor, newIndegree)
        if (newIndegree === 0) {
          queue.push(neighbor)
        }
      })
    }

    return result
  }
}
