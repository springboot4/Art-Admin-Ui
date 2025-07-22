<template>
  <a-drawer
    :open="visible"
    title="节点配置"
    width="500"
    @close="onClose"
    :body-style="{ padding: 0 }"
  >
    <div v-if="node" class="drawer-content">
      <div class="node-info">
        <div class="node-icon-large">{{ nodeConfig?.icon }}</div>
        <div class="node-meta">
          <h3 class="node-type-title">{{ nodeConfig?.label }}</h3>
          <p class="node-type-description">{{ nodeConfig?.description }}</p>
          <div v-if="nodeConfig?.category" class="node-category">
            <a-tag :color="getCategoryColor(nodeConfig.category)">
              {{ getCategoryLabel(nodeConfig.category) }}
            </a-tag>
          </div>
        </div>
      </div>

      <a-form
        :model="formData"
        layout="vertical"
        class="node-form"
        :rules="formRules"
        ref="formRef"
        @finish="onSave"
      >
        <!-- 基础信息 -->
        <div class="form-section">
          <div class="section-title">基础信息</div>

          <a-form-item label="节点名称" name="label" required>
            <a-input v-model:value="formData.label" placeholder="请输入节点名称" />
          </a-form-item>

          <a-form-item label="节点描述" name="description">
            <a-textarea
              v-model:value="formData.description"
              placeholder="请输入节点描述"
              :rows="2"
            />
          </a-form-item>
        </div>

        <a-divider>节点配置</a-divider>

        <!-- 分组配置字段 -->
        <template v-for="group in groupedFields" :key="group.name">
          <div v-if="group.fields.length > 0" class="form-section">
            <div v-if="group.name !== 'default'" class="section-title">{{ group.label }}</div>

            <template v-for="field in group.fields" :key="field.key">
              <!-- 依赖条件检查 -->
              <template v-if="!field.dependency || checkDependency(field.dependency)">
                <!-- 文本输入 -->
                <a-form-item
                  v-if="field.type === 'text'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-input
                    v-model:value="formData.config[field.key]"
                    :placeholder="field.placeholder"
                    :maxlength="field.maxLength"
                    :show-count="!!field.maxLength"
                  />
                </a-form-item>

                <!-- 密码输入 -->
                <a-form-item
                  v-else-if="field.type === 'password'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-input-password
                    v-model:value="formData.config[field.key]"
                    :placeholder="field.placeholder"
                  />
                </a-form-item>

                <!-- 文本域 -->
                <a-form-item
                  v-else-if="field.type === 'textarea'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-textarea
                    v-model:value="formData.config[field.key]"
                    :placeholder="field.placeholder"
                    :rows="4"
                    :maxlength="field.maxLength"
                    show-count
                    :auto-size="{ minRows: 3, maxRows: 8 }"
                  />
                  <div v-if="field.key === 'prompt' || field.key === 'code'" class="code-actions">
                    <a-space>
                      <a-button size="small" type="link" @click="formatCode(field.key)">
                        格式化
                      </a-button>
                      <a-button size="small" type="link" @click="insertVariable(field.key)">
                        插入变量
                      </a-button>
                    </a-space>
                  </div>
                </a-form-item>

                <!-- 选择器 -->
                <a-form-item
                  v-else-if="field.type === 'select'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-select
                    v-model:value="formData.config[field.key]"
                    :placeholder="`请选择${field.label}`"
                    :mode="field.multiple ? 'multiple' : undefined"
                    show-search
                    :filter-option="filterOption"
                  >
                    <a-select-option
                      v-for="option in field.options"
                      :key="option.value"
                      :value="option.value"
                      :title="option.description"
                    >
                      {{ option.label }}
                      <span v-if="option.description" class="option-description">
                        - {{ option.description }}
                      </span>
                    </a-select-option>
                  </a-select>
                </a-form-item>

                <!-- 数字输入 -->
                <a-form-item
                  v-else-if="field.type === 'number'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-input-number
                    v-model:value="formData.config[field.key]"
                    :placeholder="`请输入${field.label}`"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step || 1"
                    :precision="field.step && field.step < 1 ? 2 : 0"
                    style="width: 100%"
                  />
                </a-form-item>

                <!-- 布尔值开关 -->
                <a-form-item
                  v-else-if="field.type === 'boolean'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :help="field.description"
                >
                  <a-switch
                    v-model:checked="formData.config[field.key]"
                    :checked-children="field.checkedText || '是'"
                    :un-checked-children="field.uncheckedText || '否'"
                  />
                </a-form-item>

                <!-- JSON编辑器 -->
                <a-form-item
                  v-else-if="field.type === 'json'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <div class="json-editor">
                    <a-textarea
                      v-model:value="jsonFields[field.key]"
                      :placeholder="field.placeholder"
                      :rows="6"
                      @blur="validateJson(field.key)"
                    />
                    <div class="json-actions">
                      <a-space>
                        <a-button size="small" type="link" @click="formatJson(field.key)">
                          格式化JSON
                        </a-button>
                        <a-button size="small" type="link" @click="validateJson(field.key)">
                          验证语法
                        </a-button>
                      </a-space>
                    </div>
                    <div v-if="jsonErrors[field.key]" class="json-error">
                      {{ jsonErrors[field.key] }}
                    </div>
                  </div>
                </a-form-item>

                <!-- 颜色选择器 -->
                <a-form-item
                  v-else-if="field.type === 'color'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <div class="color-picker">
                    <input type="color" v-model="formData.config[field.key]" class="color-input" />
                    <a-input
                      v-model:value="formData.config[field.key]"
                      :placeholder="field.placeholder || '#000000'"
                      style="margin-left: 8px; flex: 1"
                    />
                  </div>
                </a-form-item>

                <!-- 日期选择器 -->
                <a-form-item
                  v-else-if="field.type === 'date'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-date-picker
                    v-model:value="formData.config[field.key]"
                    :placeholder="`请选择${field.label}`"
                    style="width: 100%"
                  />
                </a-form-item>

                <!-- 时间选择器 -->
                <a-form-item
                  v-else-if="field.type === 'time'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-time-picker
                    v-model:value="formData.config[field.key]"
                    :placeholder="`请选择${field.label}`"
                    style="width: 100%"
                  />
                </a-form-item>

                <!-- 文件上传 -->
                <a-form-item
                  v-else-if="field.type === 'file'"
                  :label="field.label"
                  :name="`config.${field.key}`"
                  :required="field.required"
                  :help="field.description"
                >
                  <a-upload
                    v-model:file-list="fileFields[field.key]"
                    :accept="field.accept"
                    :max-count="field.multiple ? undefined : 1"
                    :before-upload="beforeUpload"
                    @change="handleFileChange(field.key, $event)"
                  >
                    <a-button> <upload-outlined /> 选择文件 </a-button>
                  </a-upload>
                </a-form-item>
              </template>
            </template>
          </div>
        </template>

        <!-- 高级配置 -->
        <a-collapse v-if="hasAdvancedConfig" ghost>
          <a-collapse-panel key="advanced" header="高级配置">
            <a-form-item label="节点版本" name="version">
              <a-input v-model:value="formData.version" placeholder="1.0.0" />
            </a-form-item>
            <a-form-item label="执行超时(秒)" name="timeout">
              <a-input-number
                v-model:value="formData.timeout"
                :min="1"
                :max="3600"
                placeholder="300"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="重试次数" name="retries">
              <a-input-number
                v-model:value="formData.retries"
                :min="0"
                :max="10"
                placeholder="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-collapse-panel>
        </a-collapse>
      </a-form>

      <!-- 底部操作按钮 -->
      <div class="drawer-footer">
        <a-space>
          <a-button @click="onClose">取消</a-button>
          <a-button @click="resetForm">重置</a-button>
          <a-button type="primary" @click="onSave" :loading="saving"> 保存配置 </a-button>
        </a-space>
      </div>
    </div>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref, watch, computed, reactive } from 'vue'
  import { Node } from '@vue-flow/core'
  import {
    Drawer as ADrawer,
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    Textarea as ATextarea,
    Select as ASelect,
    SelectOption as ASelectOption,
    InputNumber as AInputNumber,
    Switch as ASwitch,
    Button as AButton,
    Space as ASpace,
    Divider as ADivider,
    Collapse as ACollapse,
    CollapsePanel as ACollapsePanel,
    message,
    InputPassword as AInputPassword,
    Upload as AUpload,
    Tag as ATag,
    DatePicker as ADatePicker,
    TimePicker as ATimePicker,
  } from 'ant-design-vue'
  import { UploadOutlined } from '@ant-design/icons-vue'
  import { getNodeTypeConfig, getCategoryLabel, NODE_CATEGORIES } from '../../types/nodeTypes'

  interface Props {
    visible: boolean
    node: Node | null
  }

  const props = defineProps<Props>()
  const emit = defineEmits(['update:visible', 'save'])

  const formRef = ref()
  const saving = ref(false)
  const formData = ref<any>({})
  const jsonFields = reactive<Record<string, string>>({})
  const jsonErrors = reactive<Record<string, string>>({})
  const fileFields = reactive<Record<string, any[]>>({})

  const nodeConfig = computed(() => {
    return props.node ? getNodeTypeConfig(props.node.data.type) : null
  })

  const hasAdvancedConfig = computed(() => {
    return props.node?.data.type !== 'start'
  })

  const formRules = computed(() => {
    const rules: any = {
      label: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
    }

    nodeConfig.value?.configSchema.forEach((field) => {
      if (field.required) {
        rules[`config.${field.key}`] = [
          { required: true, message: `请输入${field.label}`, trigger: 'blur' },
        ]
      }

      // 添加自定义验证规则
      if (field.validation) {
        const validators = []

        if (field.validation.pattern) {
          validators.push({
            pattern: new RegExp(field.validation.pattern),
            message: field.validation.message || `${field.label}格式不正确`,
            trigger: 'blur',
          })
        }

        if (field.validation.custom) {
          validators.push({
            validator: (rule: any, value: any) => {
              const result = field.validation!.custom!(value)
              if (typeof result === 'string') {
                return Promise.reject(result)
              }
              return result ? Promise.resolve() : Promise.reject(`${field.label}验证失败`)
            },
            trigger: 'blur',
          })
        }

        if (validators.length > 0) {
          rules[`config.${field.key}`] = [...(rules[`config.${field.key}`] || []), ...validators]
        }
      }
    })

    return rules
  })

  const groupedFields = computed(() => {
    if (!nodeConfig.value?.configSchema) return []

    const groups: { name: string; label: string; fields: any[] }[] = []
    const defaultGroup = { name: 'default', label: '基本配置', fields: [] as any[] }

    nodeConfig.value.configSchema.forEach((field) => {
      if (!field.group) {
        defaultGroup.fields.push(field)
      } else {
        let group = groups.find((g) => g.name === field.group)
        if (!group) {
          group = {
            name: field.group,
            label: getGroupLabel(field.group),
            fields: [],
          }
          groups.push(group)
        }
        group.fields.push(field)
      }
    })

    if (defaultGroup.fields.length > 0) {
      groups.unshift(defaultGroup)
    }

    return groups
  })

  const getGroupLabel = (groupName: string): string => {
    const labels: Record<string, string> = {
      model: '模型配置',
      prompt: '提示词配置',
      parameters: '参数配置',
      auth: '认证配置',
      output: '输出配置',
      advanced: '高级配置',
    }
    return labels[groupName] || groupName
  }

  watch(
    () => props.node,
    (newNode) => {
      if (newNode && nodeConfig.value) {
        formData.value = {
          label: newNode.label || nodeConfig.value.label,
          description: newNode.data.description || '',
          version: newNode.data.version || '1.0.0',
          timeout: newNode.data.timeout || 300,
          retries: newNode.data.retries || 0,
          config: { ...newNode.data.config } || {},
        }

        // 初始化JSON字段
        nodeConfig.value.configSchema.forEach((field) => {
          if (field.type === 'json') {
            const value = formData.value.config[field.key]
            jsonFields[field.key] =
              typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)
          }
        })

        // 初始化文件上传字段
        nodeConfig.value.configSchema.forEach((field) => {
          if (field.type === 'file') {
            fileFields[field.key] = formData.value.config[field.key] || []
          }
        })
      }
    },
    { immediate: true },
  )

  const updateJsonField = (key: string) => {
    try {
      formData.value.config[key] = JSON.parse(jsonFields[key] || '{}')
      jsonErrors[key] = ''
    } catch (error) {
      jsonErrors[key] = 'JSON格式错误'
    }
  }

  const validateJson = (key: string) => {
    try {
      const parsed = JSON.parse(jsonFields[key] || '{}')
      formData.value.config[key] = parsed
      jsonErrors[key] = ''
      return true
    } catch (error) {
      jsonErrors[key] = 'JSON格式错误，请检查语法'
      return false
    }
  }

  const formatJson = (key: string) => {
    try {
      const parsed = JSON.parse(jsonFields[key] || '{}')
      jsonFields[key] = JSON.stringify(parsed, null, 2)
      updateJsonField(key)
      message.success('JSON格式化成功')
    } catch (error) {
      message.error('JSON格式错误，无法格式化')
    }
  }

  const beforeUpload = (file: any) => {
    // 这里可以添加文件上传前的验证逻辑
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('文件大小不能超过10MB!')
      return false
    }
    return false // 阻止自动上传，手动处理
  }

  const handleFileChange = (key: string, info: any) => {
    const { fileList } = info
    fileFields[key] = fileList
    formData.value.config[key] = fileList.map((file: any) => ({
      uid: file.uid,
      name: file.name,
      status: file.status,
      url: file.url || file.response?.url,
      size: file.size,
      type: file.type,
    }))
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      [NODE_CATEGORIES.TRIGGER]: 'green',
      [NODE_CATEGORIES.LLM]: 'blue',
      [NODE_CATEGORIES.KNOWLEDGE]: 'purple',
      [NODE_CATEGORIES.TRANSFORM]: 'orange',
      [NODE_CATEGORIES.API]: 'cyan',
      [NODE_CATEGORIES.LOGIC]: 'geekblue',
      [NODE_CATEGORIES.OUTPUT]: 'red',
      [NODE_CATEGORIES.CUSTOM]: 'volcano',
    }
    return colors[category] || 'default'
  }

  const filterOption = (input: string, option: any) => {
    return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
  }

  const checkDependency = (dependency: any) => {
    if (!dependency) return true
    const { field, value, condition } = dependency
    const fieldValue = formData.value.config[field]

    switch (condition) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'not_contains':
        return !String(fieldValue).includes(String(value))
      default:
        return true
    }
  }

  const formatCode = (key: string) => {
    const value = formData.value.config[key]
    if (typeof value === 'string') {
      try {
        // 尝试格式化JavaScript代码
        formData.value.config[key] = value.replace(/\s+/g, ' ').trim()
        message.success('代码格式化成功')
      } catch (error) {
        message.error('代码格式化失败')
      }
    }
  }

  const insertVariable = (key: string) => {
    // 这里可以弹出变量选择器，暂时插入常用变量
    const currentValue = formData.value.config[key] || ''
    formData.value.config[key] = currentValue + (currentValue ? '\n' : '') + '{{input}}'
  }

  const onClose = () => {
    emit('update:visible', false)
  }

  const resetForm = () => {
    if (props.node && nodeConfig.value) {
      formData.value.config = { ...nodeConfig.value.defaultConfig }

      // 重置JSON字段
      nodeConfig.value.configSchema.forEach((field) => {
        if (field.type === 'json') {
          const value = formData.value.config[field.key]
          jsonFields[field.key] =
            typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)
          jsonErrors[field.key] = ''
        }
      })

      // 重置文件上传字段
      nodeConfig.value.configSchema.forEach((field) => {
        if (field.type === 'file') {
          fileFields[field.key] = []
        }
      })

      message.success('表单已重置')
    }
  }

  const onSave = async () => {
    if (!formRef.value || !props.node) return

    try {
      saving.value = true
      await formRef.value.validate()

      // 验证JSON字段
      let hasJsonError = false
      nodeConfig.value?.configSchema.forEach((field) => {
        if (field.type === 'json') {
          if (!validateJson(field.key)) {
            hasJsonError = true
          }
        }
      })

      if (hasJsonError) {
        message.error('请修复JSON格式错误后重试')
        return
      }

      // 更新文件上传字段到formData
      nodeConfig.value?.configSchema.forEach((field) => {
        if (field.type === 'file') {
          formData.value.config[field.key] = fileFields[field.key]
        }
      })

      emit('save', props.node.id, formData.value)
      message.success('节点配置保存成功')
      onClose()
    } catch (error) {
      console.error('表单验证失败:', error)
      message.error('请检查表单输入是否正确')
    } finally {
      saving.value = false
    }
  }
</script>

<style lang="less" scoped>
  .drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .node-info {
    display: flex;
    align-items: center;
    padding: 24px;
    background: linear-gradient(135deg, #f0f2f5, #fafafa);
    border-bottom: 1px solid #f0f0f0;

    .node-icon-large {
      font-size: 48px;
      margin-right: 16px;
      line-height: 1;
    }

    .node-meta {
      flex: 1;

      .node-type-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #262626;
      }

      .node-type-description {
        margin: 0;
        color: #8c8c8c;
        font-size: 14px;
        line-height: 1.4;
      }

      .node-category {
        margin-top: 8px;
      }
    }
  }

  .node-form {
    flex: 1;
    padding: 24px;
    overflow-y: auto;

    .field-description {
      margin-top: 4px;
      font-size: 12px;
      color: #8c8c8c;
      line-height: 1.4;
    }

    .code-actions {
      margin-top: 8px;
    }

    .json-editor {
      position: relative;
      .json-actions {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
      }
      .json-error {
        color: #f5222d;
        font-size: 12px;
        margin-top: 4px;
      }
    }

    .color-picker {
      display: flex;
      align-items: center;
      .color-input {
        width: 40px;
        height: 30px;
        padding: 0;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        margin-left: 8px;
        flex: 1;
      }
    }

    :deep(.ant-form-item-label) {
      font-weight: 500;
    }

    :deep(.ant-divider) {
      margin: 24px 0 16px 0;
      font-weight: 600;
      color: #262626;
    }

    :deep(.ant-collapse) {
      margin-top: 16px;
      background: transparent;
      border: 1px solid #f0f0f0;
      border-radius: 6px;

      .ant-collapse-header {
        font-weight: 500 !important;
      }
    }
  }

  .drawer-footer {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px 24px;
    background: #fff;
    border-top: 1px solid #f0f0f0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
    z-index: 1;
  }
</style>
