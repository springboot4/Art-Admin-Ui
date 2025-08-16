<template>
  <div class="simple-json-editor">
    <div class="json-editor-header">
      <span class="json-title">JSON Body</span>
      <div class="json-actions">
        <a-button size="small" title="格式化JSON" type="text" @click="formatJson">
          <template #icon>
            <FormatPainterOutlined />
          </template>
          格式化
        </a-button>
      </div>
    </div>

    <div class="json-editor-container">
      <a-textarea
        ref="textareaRef"
        v-model:value="editorValue"
        :class="{ 'has-variables': hasVariables, 'has-error': hasJsonError }"
        :placeholder="placeholder"
        :rows="12"
        class="json-textarea"
        @blur="validateJson"
        @input="handleInput"
        @keydown="handleKeyDown"
      />

      <!-- JSON 错误提示 -->
      <div v-if="jsonError" class="json-error">
        <ExclamationCircleOutlined />
        {{ jsonError }}
      </div>

      <!-- JSON 帮助提示 -->
      <div class="json-help">
        <div class="help-content">
          <div class="help-item"> <strong>支持变量:</strong> 引用变量 </div>
          <div class="help-item"> <strong>格式化:</strong> 点击"格式化"按钮美化JSON结构 </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, nextTick, ref, watch } from 'vue'
  import { Button as AButton, Textarea as ATextarea } from 'ant-design-vue'
  import { ExclamationCircleOutlined, FormatPainterOutlined } from '@ant-design/icons-vue'

  const props = defineProps({
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: `{
  "key": "value",
  "variable": "{{nodeId.paramName}}",
  "nested": {
    "data": "{{nodeId.result}}"
  }
}`,
    },
  })

  const emit = defineEmits(['update:value'])

  // 状态
  const textareaRef = ref()
  const editorValue = ref(props.value)
  const jsonError = ref('')

  // 监听外部值变化
  watch(
    () => props.value,
    (newValue) => {
      editorValue.value = newValue
    },
  )

  // 计算属性
  const hasVariables = computed(() => {
    return /\{\{[^}]+\}\}/.test(editorValue.value)
  })

  const hasJsonError = computed(() => {
    return !!jsonError.value
  })

  // 处理输入
  const handleInput = (e) => {
    const value = e.target.value
    editorValue.value = value
    emit('update:value', value)

    // 清除之前的错误
    if (jsonError.value) {
      jsonError.value = ''
    }
  }

  // 验证 JSON
  const validateJson = () => {
    if (!editorValue.value.trim()) {
      jsonError.value = ''
      return true
    }

    try {
      // 临时替换变量引用为占位符以验证JSON结构
      const tempJson = editorValue.value.replace(/\{\{[^}]+\}\}/g, '"__VARIABLE_PLACEHOLDER__"')
      JSON.parse(tempJson)
      jsonError.value = ''
      return true
    } catch (error) {
      jsonError.value = `JSON格式错误: ${error.message}`
      return false
    }
  }

  // 格式化 JSON
  const formatJson = () => {
    if (!editorValue.value.trim()) return

    try {
      // 保存变量引用的位置和内容
      const variables = []
      let tempJson = editorValue.value.replace(/\{\{[^}]+\}\}/g, (match) => {
        const placeholder = `__VAR_${variables.length}__`
        variables.push(match)
        return `"${placeholder}"`
      })

      // 格式化JSON
      const parsed = JSON.parse(tempJson)
      let formatted = JSON.stringify(parsed, null, 2)

      // 恢复变量引用
      variables.forEach((variable, index) => {
        formatted = formatted.replace(`"__VAR_${index}__"`, variable)
      })

      editorValue.value = formatted
      emit('update:value', formatted)
      jsonError.value = ''
    } catch (error) {
      jsonError.value = `无法格式化: ${error.message}`
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e) => {
    // Tab 键缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      insertTextAtCursor('  ')

    }
  }

  // 在光标位置插入文本
  const insertTextAtCursor = (text) => {
    const textarea =
      textareaRef.value?.resizableTextArea?.textArea ||
      textareaRef.value?.$el?.querySelector('textarea')
    if (!textarea) return

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const currentValue = editorValue.value || ''

    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end)

    editorValue.value = newValue
    emit('update:value', newValue)

    // 设置光标位置
    nextTick(() => {
      const newPosition = start + text.length
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    })
  }
</script>

<style lang="less" scoped>
  .simple-json-editor {
    position: relative;
  }

  .json-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .json-title {
    font-weight: 500;
    color: #262626;
    font-size: 14px;
  }

  .json-actions {
    display: flex;
    gap: 8px;
  }

  .json-editor-container {
    position: relative;
  }

  .json-textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.5;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    resize: vertical;
    transition: all 0.2s ease;

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }

    &.has-variables {
      background: linear-gradient(90deg, #f6ffed 0%, #ffffff 100%);
      border-color: #52c41a;
    }

    &.has-error {
      border-color: #ff4d4f;
      background: linear-gradient(90deg, #fff2f0 0%, #ffffff 100%);
    }
  }

  .json-error {
    margin-top: 8px;
    padding: 8px 12px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 4px;
    color: #ff4d4f;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .json-help {
    margin-top: 12px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 6px;
    border: 1px solid #f0f0f0;
  }

  .help-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .help-item {
    font-size: 12px;
    color: #595959;

    strong {
      color: #262626;
      font-weight: 500;
    }
  }
</style>
