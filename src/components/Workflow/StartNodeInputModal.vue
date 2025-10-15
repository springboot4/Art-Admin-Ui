<template>
  <a-modal
    :visible="modalVisible"
    :width="680"
    :mask-closable="false"
    :keyboard="false"
    :footer="null"
    :class="'modern-workflow-modal'"
    @cancel="handleCancel"
  >
    <template #title>
      <div class="modern-modal-header">
        <div class="header-icon">
          <div class="icon-wrapper"> 🚀 </div>
        </div>
        <div class="header-content">
          <h3 class="header-title">运行工作流</h3>
          <p class="header-subtitle">配置输入参数并开始执行</p>
        </div>
      </div>
    </template>

    <div class="modern-form-container">
      <div v-if="!hasInputs" class="empty-state">
        <div class="empty-icon">
          <div class="icon-circle"> ⚡ </div>
        </div>
        <h3 class="empty-title">准备就绪</h3>
        <p class="empty-description">当前工作流无需输入参数，可以直接运行</p>
      </div>

      <div v-else class="form-content">
        <div class="form-intro">
          <div class="intro-icon">📝</div>
          <div class="intro-text">
            <h4>输入参数</h4>
            <p>请填写以下必要的参数以启动工作流</p>
          </div>
        </div>

        <a-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          layout="vertical"
          class="modern-form"
        >
          <a-form-item
            v-for="input in userInputs"
            :key="input.name"
            :name="input.name"
            class="modern-form-item"
          >
            <template #label>
              <div class="modern-label">
                <div class="label-main">
                  <span class="label-text">{{ input.displayName || input.name }}</span>
                  <div class="label-badges">
                    <span v-if="input.required" class="required-badge">必填</span>
                    <span :class="['type-badge', `type-${input.dataType || 'string'}`]">
                      {{ getTypeDisplayName(input.dataType || 'string') }}
                    </span>
                  </div>
                </div>
                <p v-if="input.description" class="label-description">
                  {{ input.description }}
                </p>
              </div>
            </template>

            <!-- 字符串类型输入 -->
            <a-input
              v-if="input.dataType === 'string' || !input.dataType"
              v-model:value="formData[input.name]"
              :placeholder="`请输入${input.displayName || input.name}`"
              size="large"
              class="modern-input"
            />

            <!-- 多行文本输入 -->
            <a-textarea
              v-else-if="input.dataType === 'text'"
              v-model:value="formData[input.name]"
              :placeholder="`请输入${input.displayName || input.name}`"
              :rows="4"
              class="modern-textarea"
            />

            <!-- 数字类型输入 -->
            <a-input-number
              v-else-if="input.dataType === 'number'"
              v-model:value="formData[input.name]"
              :placeholder="`请输入${input.displayName || input.name}`"
              size="large"
              class="modern-input-number"
            />

            <!-- 布尔类型输入 -->
            <div v-else-if="input.dataType === 'boolean'" class="modern-switch-container">
              <a-switch
                v-model:checked="formData[input.name]"
                size="default"
                class="modern-switch"
              />
              <span class="switch-label">
                {{ formData[input.name] ? '是' : '否' }}
              </span>
            </div>

            <!-- JSON类型输入 -->
            <a-textarea
              v-else-if="input.dataType === 'json'"
              v-model:value="formData[input.name]"
              placeholder='请输入有效的JSON格式数据，例如：{"key": "value"}'
              :rows="6"
              class="modern-code-textarea"
            />

            <!-- 数组类型输入 -->
            <a-textarea
              v-else-if="input.dataType === 'array'"
              v-model:value="formData[input.name]"
              placeholder='请输入数组格式数据，例如：["item1", "item2"]'
              :rows="4"
              class="modern-code-textarea"
            />

            <!-- 默认字符串输入 -->
            <a-input
              v-else
              v-model:value="formData[input.name]"
              :placeholder="`请输入${input.displayName || input.name}`"
              size="large"
              class="modern-input"
            />
          </a-form-item>
        </a-form>
      </div>
    </div>

    <!-- 自定义底部 -->
    <div class="modern-modal-footer">
      <div class="footer-actions">
        <a-button size="large" class="cancel-btn" @click="handleCancel"> 取消 </a-button>
        <a-button
          type="primary"
          size="large"
          :loading="executing"
          class="run-btn"
          @click="handleRun"
        >
          <template #icon>
            <play-circle-outlined />
          </template>
          {{ executing ? '运行中...' : '开始运行' }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, nextTick, reactive, ref, watch } from 'vue'
  import type { FormInstance } from 'ant-design-vue'
  import {
    Button as AButton,
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    InputNumber as AInputNumber,
    message,
    Modal as AModal,
    Space as ASpace,
    Switch as ASwitch,
    Tag as ATag,
  } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
  import { PlayCircleOutlined } from '@ant-design/icons-vue'

  interface UserInput {
    name: string
    displayName?: string
    dataType: 'string' | 'text' | 'number' | 'boolean' | 'json' | 'array'
    description?: string
    required: boolean
    defaultValue?: any
  }

  interface Props {
    open: boolean
    userInputs: UserInput[]
    executing?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    userInputs: () => [],
    executing: false,
  })

  const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'run', inputs: Record<string, any>): void
    (e: 'cancel'): void
  }>()

  const formRef = ref<FormInstance>()
  const formData = reactive<Record<string, any>>({})

  // 内部模态框可见性状态
  const modalVisible = ref(false)

  // 计算属性
  const hasInputs = computed(() => props.userInputs && props.userInputs.length > 0)

  // 表单验证规则
  const formRules = computed(() => {
    const rules: Record<string, any[]> = {}

    props.userInputs.forEach((input) => {
      const inputRules: any[] = []

      if (input.required) {
        if (input.dataType === 'boolean') {
          // 布尔类型不需要必填验证
        } else {
          inputRules.push({
            required: true,
            message: `请输入${input.displayName || input.name}`,
            trigger: 'blur',
          })
        }
      }

      // JSON 格式验证
      if (input.dataType === 'json' || input.dataType === 'array') {
        inputRules.push({
          validator: (_rule: any, value: string) => {
            if (!value && !input.required) return Promise.resolve()
            if (!value && input.required)
              return Promise.reject(new Error(`请输入${input.displayName || input.name}`))

            try {
              JSON.parse(value)
              return Promise.resolve()
            } catch (error) {
              return Promise.reject(new Error('请输入有效的JSON格式'))
            }
          },
          trigger: 'blur',
        })
      }

      rules[input.name] = inputRules
    })

    return rules
  })

  // 获取数据类型显示名称
  const getTypeDisplayName = (dataType: string): string => {
    const typeMap: Record<string, string> = {
      string: '文本',
      text: '长文本',
      number: '数字',
      boolean: '布尔',
      json: 'JSON',
      array: '数组',
    }
    return typeMap[dataType] || '文本'
  }

  // 获取数据类型颜色
  const getDataTypeColor = (dataType: string): string => {
    const colorMap: Record<string, string> = {
      string: 'blue',
      text: 'cyan',
      number: 'green',
      boolean: 'orange',
      json: 'purple',
      array: 'magenta',
    }
    return colorMap[dataType] || 'default'
  }

  // 初始化表单数据
  const initFormData = () => {
    const newFormData: Record<string, any> = {}

    props.userInputs.forEach((input) => {
      if (input.defaultValue !== undefined) {
        newFormData[input.name] = input.defaultValue
      } else {
        // 根据数据类型设置默认值
        switch (input.dataType) {
          case 'boolean':
            newFormData[input.name] = false
            break
          case 'number':
            newFormData[input.name] = undefined
            break
          case 'json':
            newFormData[input.name] = ''
            break
          case 'array':
            newFormData[input.name] = ''
            break
          default:
            newFormData[input.name] = ''
        }
      }
    })

    // 清空现有数据并赋值新数据
    Object.keys(formData).forEach((key) => {
      delete formData[key]
    })
    Object.assign(formData, newFormData)
  }

  // 处理运行
  const handleRun = async () => {
    try {
      if (hasInputs.value) {
        // 验证表单
        await formRef.value?.validate()

        // 处理表单数据
        const inputs: Record<string, any> = {}

        props.userInputs.forEach((input) => {
          let value = formData[input.name]

          // 处理JSON和数组类型
          if (input.dataType === 'json' || input.dataType === 'array') {
            if (value && typeof value === 'string') {
              try {
                value = JSON.parse(value)
              } catch (error) {
                message.error(`${input.displayName || input.name} 的JSON格式不正确`)
                return
              }
            } else if (!value) {
              value = input.dataType === 'array' ? [] : {}
            }
          }

          inputs[input.name] = value
        })

        emit('run', inputs)
      } else {
        // 没有输入参数，直接运行
        emit('run', {})
      }
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  // 处理取消
  const handleCancel = () => {
    emit('update:open', false)
    emit('cancel')
  }

  // 监听open变化，同步内部状态并重新初始化表单
  watch(
    () => props.open,
    (newOpen) => {
      modalVisible.value = newOpen
      if (newOpen) {
        nextTick(() => {
          initFormData()
        })
      }
    },
    { immediate: true },
  )

  // 监听内部modal状态变化，同步到外部
  watch(modalVisible, (newVisible) => {
    if (!newVisible && props.open) {
      // 内部modal关闭但外部状态还是true，同步外部状态
      emit('update:open', false)
    }
  })

  // 监听userInputs变化，重新初始化表单
  watch(
    () => props.userInputs,
    () => {
      if (props.open) {
        nextTick(() => {
          initFormData()
        })
      }
    },
    { deep: true },
  )
</script>

<style lang="less" scoped>
  // 简单修复警告：全局隐藏引起问题的焦点元素
  :global([tabindex='0'][aria-hidden='true']) {
    display: none !important;
  }

  :global(.ant-modal-wrap [tabindex='0'][aria-hidden='true']) {
    display: none !important;
  }

  :global(div[tabindex='0'][aria-hidden='true']) {
    display: none !important;
  }

  // 主要模态框样式
  :deep(.modern-workflow-modal) {
    .ant-modal-content {
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    .ant-modal-header {
      padding: 0;
      border-bottom: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .ant-modal-body {
      padding: 0;
    }
  }

  // 简单修复警告：隐藏引起问题的焦点元素
  :deep([tabindex='0'][aria-hidden='true']) {
    display: none !important;
  }

  // 现代化头部
  .modern-modal-header {
    display: flex;
    align-items: center;
    padding: 24px 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    .header-icon {
      margin-right: 16px;

      .icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        backdrop-filter: blur(10px);
      }
    }

    .header-content {
      flex: 1;

      .header-title {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: white;
      }

      .header-subtitle {
        margin: 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  // 现代化容器
  .modern-form-container {
    padding: 32px;
    min-height: 200px;
  }

  // 空状态样式
  .empty-state {
    text-align: center;
    padding: 48px 24px;

    .empty-icon {
      margin-bottom: 24px;

      .icon-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        font-size: 32px;
        box-shadow: 0 8px 32px rgba(132, 250, 176, 0.3);
      }
    }

    .empty-title {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2d3748;
    }

    .empty-description {
      margin: 0;
      color: #718096;
      font-size: 14px;
    }
  }

  // 表单内容
  .form-content {
    .form-intro {
      display: flex;
      align-items: center;
      padding: 20px 24px;
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border-radius: 12px;
      margin-bottom: 32px;
      border: 1px solid #e2e8f0;

      .intro-icon {
        font-size: 24px;
        margin-right: 16px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .intro-text {
        h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #2d3748;
        }

        p {
          margin: 0;
          color: #718096;
          font-size: 14px;
        }
      }
    }
  }

  // 现代化表单
  .modern-form {
    .modern-form-item {
      margin-bottom: 28px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  // 现代化标签
  .modern-label {
    .label-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .label-text {
        font-size: 15px;
        font-weight: 600;
        color: #2d3748;
      }

      .label-badges {
        display: flex;
        gap: 8px;

        .required-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;

          &.type-string {
            background: #ebf8ff;
            color: #2b6cb0;
            border: 1px solid #bee3f8;
          }

          &.type-text {
            background: #e6fffa;
            color: #285e61;
            border: 1px solid #9decf9;
          }

          &.type-number {
            background: #f0fff4;
            color: #276749;
            border: 1px solid #9ae6b4;
          }

          &.type-boolean {
            background: #fffaf0;
            color: #c05621;
            border: 1px solid #fbd38d;
          }

          &.type-json {
            background: #faf5ff;
            color: #553c9a;
            border: 1px solid #c4b5fd;
          }

          &.type-array {
            background: #fdf2f8;
            color: #97266d;
            border: 1px solid #f3e8ff;
          }
        }
      }
    }

    .label-description {
      margin: 0;
      font-size: 13px;
      color: #718096;
      line-height: 1.4;
    }
  }

  // 现代化输入框
  .modern-input,
  .modern-textarea,
  .modern-code-textarea {
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    transition: all 0.2s ease;

    &:hover {
      border-color: #cbd5e0;
    }

    &:focus,
    &.ant-input-focused {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  }

  .modern-input-number {
    width: 100%;
    border-radius: 8px;

    :deep(.ant-input-number-input) {
      border: 2px solid #e2e8f0;
      border-radius: 8px;

      &:hover {
        border-color: #cbd5e0;
      }

      &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
    }
  }

  .modern-code-textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
    font-size: 13px;
    background: #f7fafc;

    &::placeholder {
      color: #a0aec0;
    }
  }

  // 现代化开关
  .modern-switch-container {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f7fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      border-color: #cbd5e0;
      background: #edf2f7;
    }

    .modern-switch {
      :deep(.ant-switch) {
        background: #e2e8f0;

        &.ant-switch-checked {
          background: #667eea;
        }
      }
    }

    .switch-label {
      font-size: 14px;
      font-weight: 500;
      color: #4a5568;
    }
  }

  // 现代化底部
  .modern-modal-footer {
    padding: 24px 32px;
    background: #f7fafc;
    border-top: 1px solid #e2e8f0;

    .footer-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;

      .cancel-btn {
        border-radius: 8px;
        border: 2px solid #e2e8f0;
        color: #4a5568;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover {
          border-color: #cbd5e0;
          background: #edf2f7;
          transform: translateY(-1px);
        }
      }

      .run-btn {
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
          background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%);
        }

        &:focus {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        &.ant-btn-loading {
          transform: none;
        }
      }
    }
  }

  // 重写 Ant Design 的一些默认样式
  :deep(.ant-form-item-label > label) {
    height: auto;

    &::before {
      display: none !important;
    }
  }

  :deep(.ant-form-item-required::before) {
    display: none !important;
  }

  :deep(.ant-modal-close) {
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }
  }
</style>
