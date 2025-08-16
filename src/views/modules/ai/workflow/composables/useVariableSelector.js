import { computed, ref } from 'vue'
import { NodeDependencyAnalyzer } from '../utils/variableUtils'
import { VariableType } from '../types'

export function useVariableSelector(props, emit) {
  // 状态
  const searchText = ref('')
  const activeGroups = ref(['system', 'environment', 'userInput', 'conversation', 'nodeOutput'])

  // 计算可用变量
  const dependencyAnalyzer = computed(() => {
    const nodeList = props.nodes || []
    const edgeList = props.edges || []
    return new NodeDependencyAnalyzer(nodeList, edgeList)
  })

  const availableVariables = computed(() => {
    if (!props.nodeId) return []
    try {
      return dependencyAnalyzer.value.getAvailableVariables(props.nodeId)
    } catch (error) {
      console.error('Error getting available variables:', error)
      return []
    }
  })

  // 按类型分组的变量
  const groupedVariables = computed(() => {
    const groups = {
      system: [],
      environment: [],
      userInput: [],
      conversation: [],
      nodeOutput: [],
    }

    availableVariables.value.forEach((variable) => {
      switch (variable.type) {
        case VariableType.SYSTEM:
          groups.system.push(variable)
          break
        case VariableType.ENVIRONMENT:
          groups.environment.push(variable)
          break
        case VariableType.USER_INPUT:
          groups.userInput.push(variable)
          break
        case VariableType.CONVERSATION:
          groups.conversation.push(variable)
          break
        case VariableType.NODE_OUTPUT:
          groups.nodeOutput.push(variable)
          break
      }
    })

    return groups
  })

  // 过滤后的变量组
  const filteredGroups = computed(() => {
    if (!searchText.value) return groupedVariables.value

    const keyword = searchText.value.toLowerCase()
    const filtered = {}

    Object.keys(groupedVariables.value).forEach((key) => {
      filtered[key] = groupedVariables.value[key].filter(
        (variable) =>
          variable.name?.toLowerCase().includes(keyword) ||
          variable.description?.toLowerCase().includes(keyword),
      )
    })

    return filtered
  })

  // 总变量数量
  const totalVariableCount = computed(() => {
    return Object.values(filteredGroups.value).reduce((sum, group) => sum + group.length, 0)
  })

  // 生成新的变量引用格式: ${variableType.nodeId.parameterName}
  const getNewVariableReference = (variable) => {
    const variableType = variable.type
    const parameterName = variable.sourceOutputKey || variable.name

    // 对于节点输出，使用实际的 nodeId
    // 对于非节点输出（系统、环境、输入、会话变量），使用 variableType 作为 nodeId
    let nodeId
    if (variable.type === 'output' && variable.sourceNodeId) {
      nodeId = variable.sourceNodeId
    } else {
      nodeId = variableType
    }

    return `${variableType}.${nodeId}.${parameterName}`
  }

  // 已选择的变量信息 - 正确根据 referenceParameters 显示
  const selectedVariables = computed(() => {
    if (!props.referenceParameters || props.referenceParameters.length === 0) {
      return []
    }

    return props.referenceParameters.map((param) => {
      var k =
        param.variableType === 'output'
          ? `${param.variableType}.${param.nodeId}.${param.parameterName}`
          : `${param.variableType}.${param.variableType}.${param.parameterName}`

      return {
        ...param,
        displayName: param.parameterName,
        description: '',
        typeLabel: getVariableTypeLabel(param.variableType),
        uniqueKey: k,
        referenceFormat: k,
      }
    })
  })

  // 已选择变量的数量
  const selectedVariableCount = computed(() => {
    return selectedVariables.value.length
  })

  // 获取变量类型标签
  const getVariableTypeLabel = (type) => {
    const typeLabels = {
      sys: '系统',
      env: '环境',
      input: '输入',
      conversation: '会话',
      output: '输出',
      string: '文本',
      number: '数字',
      boolean: '布尔',
      array: '数组',
      object: '对象',
      any: '任意',
    }
    return typeLabels[type] || type
  }

  // 选择变量
  const handleSelectVariable = (variable) => {
    // 生成新的变量引用格式: ${variableType.nodeId.parameterName}
    const variableReference = getNewVariableReference(variable)
    const reference = `\${${variableReference}}`

    // 确定 nodeId 的逻辑要与 getNewVariableReference 保持一致
    let nodeId
    if (variable.type === 'output' && variable.sourceNodeId) {
      nodeId = variable.sourceNodeId
    } else {
      nodeId = variable.type
    }

    // 更新引用参数列表
    const newReferenceParameter = {
      nodeId: nodeId,
      parameterName: variable.sourceOutputKey || variable.name,
      variableType: variable.type,
    }

    const currentReferenceParameters = [...(props.referenceParameters || [])]

    // 检查是否已存在相同的引用
    const existingIndex = currentReferenceParameters.findIndex(
      (param) =>
        param.nodeId === newReferenceParameter.nodeId &&
        param.parameterName === newReferenceParameter.parameterName &&
        param.variableType === newReferenceParameter.variableType,
    )

    if (existingIndex === -1) {
      // 添加新的引用参数
      currentReferenceParameters.push(newReferenceParameter)
      emit('update:referenceParameters', currentReferenceParameters)
    }

    return { reference, newReferenceParameter }
  }

  // 移除已选择的变量
  const handleRemoveVariable = (nodeId, parameterName, variableType) => {
    const currentReferenceParameters = [...(props.referenceParameters || [])]
    const index = currentReferenceParameters.findIndex(
      (param) =>
        param.nodeId === nodeId &&
        param.parameterName === parameterName &&
        param.variableType === variableType,
    )

    if (index !== -1) {
      currentReferenceParameters.splice(index, 1)
      emit('update:referenceParameters', currentReferenceParameters)
    }
  }

  return {
    searchText,
    activeGroups,
    availableVariables,
    groupedVariables,
    filteredGroups,
    totalVariableCount,
    selectedVariables,
    selectedVariableCount,
    getNewVariableReference,
    getVariableTypeLabel,
    handleSelectVariable,
    handleRemoveVariable,
  }
}
