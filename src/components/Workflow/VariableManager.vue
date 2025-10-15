<template>
  <div class="variable-manager">
    <div class="manager-header">
      <div class="header-left">
        <h3>变量管理</h3>
        <span class="variable-count">共 {{ variables.length }} 个变量</span>
      </div>
      <div class="header-right">
        <a-space>
          <a-button type="primary" @click="addVariable">
            <template #icon><plus-outlined /></template>
            添加变量
          </a-button>
          <a-button @click="importVariables">
            <template #icon><import-outlined /></template>
            导入
          </a-button>
          <a-button @click="exportVariables">
            <template #icon><export-outlined /></template>
            导出
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="variable-list">
      <a-table
        :dataSource="variables"
        :columns="columns"
        row-key="name"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'name'">
            <a-input
              v-if="record.editing"
              v-model:value="record.name"
              @blur="saveVariable(index)"
              @press-enter="saveVariable(index)"
            />
            <span v-else>{{ record.name }}</span>
          </template>

          <template v-if="column.key === 'type'">
            <a-select v-if="record.editing" v-model:value="record.type" style="width: 100%">
              <a-select-option value="string">String</a-select-option>
              <a-select-option value="number">Number</a-select-option>
              <a-select-option value="boolean">Boolean</a-select-option>
              <a-select-option value="json">JSON</a-select-option>
              <a-select-option value="array">Array</a-select-option>
            </a-select>
            <a-tag v-else :color="getTypeColor(record.type)">
              {{ record.type }}
            </a-tag>
          </template>

          <template v-if="column.key === 'value'">
            <div v-if="record.editing" class="value-editor">
              <a-input
                v-if="record.type === 'string'"
                v-model:value="record.value"
                placeholder="输入字符串值"
              />
              <a-input-number
                v-else-if="record.type === 'number'"
                v-model:value="record.value"
                style="width: 100%"
                placeholder="输入数字值"
              />
              <a-switch v-else-if="record.type === 'boolean'" v-model:checked="record.value" />
              <a-textarea
                v-else-if="record.type === 'json' || record.type === 'array'"
                v-model:value="record.value"
                :rows="3"
                placeholder="输入JSON格式数据"
              />
            </div>
            <div v-else class="value-display">
              <span v-if="record.type === 'boolean'">
                <a-tag :color="record.value ? 'success' : 'default'">
                  {{ record.value ? 'true' : 'false' }}
                </a-tag>
              </span>
              <span v-else-if="record.type === 'json' || record.type === 'array'">
                <code class="json-preview">{{ formatValue(record.value) }}</code>
              </span>
              <span v-else>{{ record.value }}</span>
            </div>
          </template>

          <template v-if="column.key === 'description'">
            <a-input
              v-if="record.editing"
              v-model:value="record.description"
              placeholder="输入变量描述"
            />
            <span v-else>{{ record.description || '-' }}</span>
          </template>

          <template v-if="column.key === 'required'">
            <a-checkbox v-if="record.editing" v-model:checked="record.required" />
            <a-tag v-else :color="record.required ? 'red' : 'default'">
              {{ record.required ? '必需' : '可选' }}
            </a-tag>
          </template>

          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="!record.editing"
                type="link"
                size="small"
                @click="editVariable(index)"
              >
                编辑
              </a-button>
              <a-button v-if="record.editing" type="link" size="small" @click="saveVariable(index)">
                保存
              </a-button>
              <a-button v-if="record.editing" type="link" size="small" @click="cancelEdit(index)">
                取消
              </a-button>
              <a-popconfirm title="确定删除这个变量吗？" @confirm="deleteVariable(index)">
                <a-button type="link" size="small" danger> 删除 </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <div class="manager-footer">
      <a-space>
        <a-button @click="onCancel">取消</a-button>
        <a-button type="primary" @click="onSave" :loading="saving"> 保存变量 </a-button>
      </a-space>
    </div>

    <!-- 导入文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import {
    Table as ATable,
    Button as AButton,
    Space as ASpace,
    Input as AInput,
    InputNumber as AInputNumber,
    Select as ASelect,
    SelectOption as ASelectOption,
    Switch as ASwitch,
    Tag as ATag,
    Checkbox as ACheckbox,
    Popconfirm as APopconfirm,
    message,
  } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
  import { PlusOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons-vue'
  import type { WorkflowVariable } from '../../types/workflow'

  interface Props {
    variables?: WorkflowVariable[]
  }

  const props = withDefaults(defineProps<Props>(), {
    variables: () => [],
  })

  const emit = defineEmits(['save', 'update:variables'])

  const saving = ref(false)
  const fileInput = ref<HTMLInputElement>()
  const variables = ref<(WorkflowVariable & { editing?: boolean; originalData?: any })[]>([])

  // 初始化变量数据
  const initVariables = () => {
    variables.value = props.variables.map((v) => ({ ...v, editing: false }))
  }

  // 表格列定义
  const columns = [
    {
      title: '变量名',
      key: 'name',
      dataIndex: 'name',
      width: 150,
    },
    {
      title: '类型',
      key: 'type',
      dataIndex: 'type',
      width: 100,
    },
    {
      title: '值',
      key: 'value',
      dataIndex: 'value',
      width: 200,
    },
    {
      title: '描述',
      key: 'description',
      dataIndex: 'description',
      width: 150,
    },
    {
      title: '必需',
      key: 'required',
      dataIndex: 'required',
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
    },
  ]

  const getTypeColor = (type: string): string => {
    const colors = {
      string: 'blue',
      number: 'green',
      boolean: 'orange',
      json: 'purple',
      array: 'cyan',
    }
    return colors[type] || 'default'
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2).substring(0, 50) + '...'
      } catch {
        return value.substring(0, 50) + (value.length > 50 ? '...' : '')
      }
    }
    return JSON.stringify(value, null, 2).substring(0, 50) + '...'
  }

  const addVariable = () => {
    const newVariable = {
      name: `variable_${variables.value.length + 1}`,
      type: 'string' as const,
      value: '',
      description: '',
      required: false,
      editing: true,
    }
    variables.value.push(newVariable)
  }

  const editVariable = (index: number) => {
    const variable = variables.value[index]
    variable.originalData = { ...variable }
    variable.editing = true
  }

  const saveVariable = (index: number) => {
    const variable = variables.value[index]

    // 验证变量名
    if (!variable.name || !variable.name.trim()) {
      message.error('变量名不能为空')
      return
    }

    // 检查变量名是否重复
    const duplicateIndex = variables.value.findIndex(
      (v, i) => i !== index && v.name === variable.name,
    )
    if (duplicateIndex !== -1) {
      message.error('变量名已存在')
      return
    }

    // 验证JSON格式
    if ((variable.type === 'json' || variable.type === 'array') && variable.value) {
      try {
        JSON.parse(variable.value as string)
      } catch {
        message.error('JSON格式不正确')
        return
      }
    }

    variable.editing = false
    delete variable.originalData
    message.success('变量保存成功')
  }

  const cancelEdit = (index: number) => {
    const variable = variables.value[index]
    if (variable.originalData) {
      Object.assign(variable, variable.originalData)
      delete variable.originalData
    } else {
      // 新添加的变量，直接删除
      variables.value.splice(index, 1)
    }
    variable.editing = false
  }

  const deleteVariable = (index: number) => {
    variables.value.splice(index, 1)
    message.success('变量已删除')
  }

  const importVariables = () => {
    fileInput.value?.click()
  }

  const exportVariables = () => {
    const data = variables.value.map(({ editing, originalData, ...v }) => {
      console.log(editing)
      console.log(originalData)
      return v
    })
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'workflow-variables.json'
    link.click()
    URL.revokeObjectURL(url)
    message.success('变量导出成功')
  }

  const handleFileImport = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedVariables = JSON.parse(e.target?.result as string)
        if (Array.isArray(importedVariables)) {
          variables.value = importedVariables.map((v) => ({ ...v, editing: false }))
          message.success('变量导入成功')
        } else {
          message.error('导入文件格式错误')
        }
        // 重置文件输入
        if (fileInput.value) {
          fileInput.value.value = ''
        }
      } catch (error) {
        message.error('导入文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  const onSave = async () => {
    // 检查是否有正在编辑的变量
    const editingVariable = variables.value.find((v) => v.editing)
    if (editingVariable) {
      message.warning('请先保存正在编辑的变量')
      return
    }

    saving.value = true
    try {
      const data = variables.value.map(({ editing, originalData, ...v }) => {
        console.log(editing)
        console.log(originalData)
        return v
      })
      emit('save', data)
      emit('update:variables', data)
      message.success('变量保存成功')
    } catch (error) {
      message.error('保存变量失败')
    } finally {
      saving.value = false
    }
  }

  const onCancel = () => {
    initVariables()
  }

  // 初始化
  initVariables()
</script>

<style lang="less" scoped>
  .variable-manager {
    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;

      .header-left {
        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .variable-count {
          font-size: 14px;
          color: #8c8c8c;
          margin-left: 8px;
        }
      }
    }

    .variable-list {
      margin-bottom: 16px;

      .value-editor {
        min-width: 150px;
      }

      .value-display {
        .json-preview {
          font-size: 12px;
          color: #666;
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 2px;
          white-space: pre-wrap;
          word-break: break-all;
        }
      }
    }

    .manager-footer {
      text-align: right;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }
  }
</style>
