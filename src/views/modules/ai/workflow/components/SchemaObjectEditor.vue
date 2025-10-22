<template>
  <div class="schema-object-editor" :class="{ 'is-nested': level > 0 }">
    <!-- 标题区域 -->
    <div v-if="title" class="editor-header">
      <span class="editor-title">{{ title }}</span>
    </div>

    <!-- 属性列表 -->
    <div class="properties-list">
      <!-- 空状态 -->
      <div v-if="propertyEntries.length === 0" class="empty-state">
        <div class="empty-icon">
          <Icon :size="32" color="#d9d9d9" icon="ant-design:file-text-outlined" />
        </div>
        <div class="empty-text">还没有字段，点击下方按钮添加</div>
      </div>

      <!-- 属性项 -->
      <div
        v-for="[propName, propSchema] in propertyEntries"
        :key="propName"
        class="property-item"
        :class="{ 'is-nested': level > 0 }"
      >
        <div class="property-inner">
          <!-- 属性头部 -->
          <div class="property-header">
            <div class="property-header-left">
              <span class="property-name">{{ getDisplayLabel(propName) }}</span>
              <a-tag v-if="isRequired(propName)" color="red" size="small">必填</a-tag>
              <a-tag color="blue" size="small">{{ getTypeLabel(propSchema.type) }}</a-tag>
            </div>
            <a-button danger size="small" type="text" @click="removeProperty(propName)">
              删除
            </a-button>
          </div>

          <!-- 属性配置 -->
          <div class="property-body">
            <div class="property-config-grid">
              <!-- 字段名 -->
              <div class="property-field property-field--name">
                <a-form-item label="字段名" size="small">
                  <a-input
                    class="property-name-input"
                    :value="getEditingName(propName)"
                    placeholder="请输入字段名"
                    @input="(e) => handleNameInput(propName, e.target.value)"
                    @blur="(e) => handleNameBlur(propName, e.target.value)"
                    @press-enter="(e) => e.target.blur()"
                  />
                </a-form-item>
              </div>

              <!-- 数据类型 -->
              <div class="property-field property-field--type">
                <a-form-item label="类型" size="small">
                  <a-select
                    :value="propSchema.type"
                    @change="(val) => changePropertyType(propName, val)"
                  >
                    <a-select-option value="string">文本</a-select-option>
                    <a-select-option value="integer">整数</a-select-option>
                    <a-select-option value="number">数字</a-select-option>
                    <a-select-option value="boolean">布尔</a-select-option>
                    <a-select-option value="array">数组</a-select-option>
                    <a-select-option value="object">对象</a-select-option>
                  </a-select>
                </a-form-item>
              </div>

              <!-- 描述 -->
              <div class="property-field property-field--description">
                <a-form-item label="描述" size="small">
                  <a-input
                    v-model:value="propSchema.description"
                    placeholder="帮助AI理解此字段"
                    @change="emitUpdate"
                  />
                </a-form-item>
              </div>

              <!-- 必填 -->
              <div class="property-field property-field--required">
                <a-form-item label="必填" size="small">
                  <a-checkbox
                    :checked="isRequired(propName)"
                    @change="(e) => toggleRequired(propName, e.target.checked)"
                  />
                </a-form-item>
              </div>
            </div>
            <!-- 字符串枚举 -->
            <div v-if="propSchema.type === 'string'" class="property-extra">
              <a-form-item label="枚举值（可选）" size="small">
                <a-select
                  v-model:value="propSchema.enum"
                  allow-clear
                  mode="tags"
                  placeholder="输入选项，按回车添加"
                  @change="emitUpdate"
                />
              </a-form-item>
            </div>

            <!-- 数字范围 -->
            <div v-if="['integer', 'number'].includes(propSchema.type)" class="property-extra">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="最小值" size="small">
                    <a-input-number
                      v-model:value="propSchema.minimum"
                      placeholder="不限"
                      style="width: 100%"
                      @change="emitUpdate"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="最大值" size="small">
                    <a-input-number
                      v-model:value="propSchema.maximum"
                      placeholder="不限"
                      style="width: 100%"
                      @change="emitUpdate"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </div>

            <!-- 数组配置 -->
            <div v-if="propSchema.type === 'array'" class="property-extra nested-editor">
              <div class="nested-header">
                <span class="nested-title">数组元素配置</span>
              </div>
              <a-form-item label="元素类型" size="small">
                <a-select
                  v-model:value="propSchema.items.type"
                  @change="() => handleArrayItemTypeChange(propName)"
                >
                  <a-select-option value="string">文本</a-select-option>
                  <a-select-option value="integer">整数</a-select-option>
                  <a-select-option value="number">数字</a-select-option>
                  <a-select-option value="boolean">布尔</a-select-option>
                  <a-select-option value="object">对象</a-select-option>
                </a-select>
              </a-form-item>

              <!-- 数组元素是对象 -->
              <SchemaObjectEditor
                v-if="propSchema.items.type === 'object'"
                :schema="propSchema.items"
                :level="level + 1"
                title="数组元素字段"
                @update:schema="emitUpdate"
              />
            </div>

            <!-- 对象嵌套 -->
            <div v-if="propSchema.type === 'object'" class="property-extra nested-editor">
              <SchemaObjectEditor
                :schema="propSchema"
                :level="level + 1"
                :title="`${propName} 的子字段`"
                @update:schema="emitUpdate"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 添加字段按钮 -->
    <div class="add-property-container">
      <a-button block class="add-property-btn" size="large" type="dashed" @click="addProperty">
        <PlusOutlined />
        {{ level === 0 ? '添加根字段' : '添加字段' }}
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref } from 'vue'
  import {
    Button as AButton,
    Checkbox as ACheckbox,
    Col as ACol,
    FormItem as AFormItem,
    Input as AInput,
    InputNumber as AInputNumber,
    message,
    Row as ARow,
    Select as ASelect,
    SelectOption as ASelectOption,
    Tag as ATag,
  } from 'ant-design-vue'
  import { PlusOutlined } from '@ant-design/icons-vue'
  import Icon from '/@/components/Icon'

  // Props
  const props = defineProps<{
    schema: any
    level: number
    title?: string
  }>()

  const emit = defineEmits<{
    'update:schema': [schema: any]
  }>()

  const TEMP_FIELD_PREFIX = 'field_'

  // 编辑中的字段名（用于输入框的实时显示）
  const editingNames = ref<Record<string, string | null>>({})

  // 计算属性列表
  const propertyEntries = computed(() => {
    const properties = props.schema.properties || {}
    return Object.entries(properties)
  })

  // 判断字段是否必填
  function isRequired(propName: string): boolean {
    const required = props.schema.required || []
    return required.includes(propName)
  }

  // 获取类型标签
  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      string: '文本',
      integer: '整数',
      number: '数字',
      boolean: '布尔',
      array: '数组',
      object: '对象',
    }
    return labels[type] || type
  }

  // 获取编辑中的字段名（如果正在编辑则返回编辑值，否则返回原值）
  function getEditingName(propName: string): string {
    const editing = editingNames.value[propName]
    if (typeof editing === 'string') {
      return editing
    }
    return propName
  }

  function getDisplayLabel(propName: string): string {
    const editingValue = editingNames.value[propName]
    if (typeof editingValue === 'string') {
      const trimmed = editingValue.trim()
      return trimmed || '未命名字段'
    }
    if (propName.startsWith(TEMP_FIELD_PREFIX)) {
      return '未命名字段'
    }
    return propName
  }

  // 处理字段名输入
  function handleNameInput(propName: string, newValue: string) {
    editingNames.value[propName] = newValue
  }

  // 处理字段名失焦
  function handleNameBlur(propName: string, newValue: string) {
    const trimmed = newValue.trim()
    if (trimmed && trimmed !== propName) {
      renameProperty(propName, trimmed)
    }
    // 清除编辑状态
    delete editingNames.value[propName]
  }

  // 添加属性
  function addProperty() {
    const newName = `${TEMP_FIELD_PREFIX}${Date.now()}`

    if (!props.schema.properties) {
      props.schema.properties = {}
    }

    props.schema.properties[newName] = {
      type: 'string',
      description: '',
    }

    editingNames.value[newName] = ''

    emitUpdate()

    nextTick(() => {
      if (typeof window === 'undefined') {
        return
      }
      const input = document.querySelector<HTMLInputElement>(
        '.schema-object-editor .property-item:last-of-type .property-name-input',
      )
      if (input) {
        input.focus()
      }
    })
  }

  // 删除属性
  function removeProperty(propName: string) {
    if (props.schema.properties) {
      delete props.schema.properties[propName]
    }

    // 从 required 中移除
    if (props.schema.required) {
      const index = props.schema.required.indexOf(propName)
      if (index > -1) {
        props.schema.required.splice(index, 1)
      }
    }

    emitUpdate()
  }

  // 重命名属性
  function renameProperty(oldName: string, newName: string) {
    newName = newName.trim()

    if (!newName || newName === oldName) {
      return
    }

    // 检查重复
    if (props.schema.properties[newName]) {
      message.warning(`字段名 "${newName}" 已存在`)
      return
    }

    // 重命名
    const propSchema = props.schema.properties[oldName]
    delete props.schema.properties[oldName]
    props.schema.properties[newName] = propSchema

    // 更新 required
    if (props.schema.required) {
      const index = props.schema.required.indexOf(oldName)
      if (index > -1) {
        props.schema.required[index] = newName
      }
    }

    emitUpdate()
  }

  // 修改属性类型
  function changePropertyType(propName: string, newType: string) {
    const propSchema = props.schema.properties[propName]

    propSchema.type = newType

    // 重置类型特定的配置
    delete propSchema.enum
    delete propSchema.minimum
    delete propSchema.maximum
    delete propSchema.items
    delete propSchema.properties
    delete propSchema.required
    delete propSchema.additionalProperties

    // 初始化新类型的配置
    if (newType === 'array') {
      propSchema.items = { type: 'string' }
    } else if (newType === 'object') {
      propSchema.properties = {}
      propSchema.required = []
      propSchema.additionalProperties = false
    }

    emitUpdate()
  }

  // 切换必填
  function toggleRequired(propName: string, required: boolean) {
    if (!props.schema.required) {
      props.schema.required = []
    }

    const index = props.schema.required.indexOf(propName)

    if (required && index === -1) {
      props.schema.required.push(propName)
    } else if (!required && index > -1) {
      props.schema.required.splice(index, 1)
    }

    emitUpdate()
  }

  // 数组元素类型变更
  function handleArrayItemTypeChange(propName: string) {
    const propSchema = props.schema.properties[propName]
    const itemType = propSchema.items.type

    // 如果改为对象，初始化
    if (itemType === 'object') {
      propSchema.items = {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      }
    } else {
      propSchema.items = { type: itemType }
    }

    emitUpdate()
  }

  // 触发更新
  function emitUpdate() {
    emit('update:schema', props.schema)
  }
</script>

<style scoped lang="less">
  .schema-object-editor {
    display: flex;
    flex-direction: column;
    gap: 20px;

    &.is-nested {
      margin-left: 0;
      padding: 18px;
      border-left: none;
      border-radius: 12px;
      background: #f5f9ff;
      border: 1px solid #d6e4ff;
      box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.08);
    }
  }

  .editor-header {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .editor-title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .properties-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .empty-state {
    padding: 40px 24px;
    text-align: center;
    background: linear-gradient(180deg, #f8fafc 0%, #f2f6fb 100%);
    border: 1px dashed #d0d7e3;
    border-radius: 12px;
    color: #6b7280;

    .empty-icon {
      margin-bottom: 12px;
    }

    .empty-text {
      font-size: 13px;
    }
  }

  .property-item {
    padding: 18px 20px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.04);
    transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease;

    &:hover {
      border-color: #1677ff;
      box-shadow: 0 14px 28px rgba(22, 119, 255, 0.18);
      transform: translateY(-2px);
    }

    &.is-nested {
      background: linear-gradient(180deg, #f6faff 0%, #ffffff 100%);
      border-color: #cbd5f5;
    }
  }

  .property-inner {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .property-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-bottom: 14px;
    margin-bottom: 16px;
    border-bottom: 1px solid #eef2f7;
  }

  .property-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .property-name {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .property-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .property-config-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr);
    grid-template-areas:
      'name type'
      'description description'
      'required required';
    column-gap: 20px;
    row-gap: 18px;
    align-items: start;
  }

  .property-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .property-field--name {
    grid-area: name;
  }

  .property-field--type {
    grid-area: type;
  }

  .property-field--description {
    grid-area: description;
  }

  .property-field--required {
    grid-area: required;
  }

  .property-field :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  .property-field :deep(.ant-form-item-label) {
    line-height: 20px;
  }

  .property-field :deep(.ant-input),
  .property-field :deep(.ant-select-selector),
  .property-field :deep(.ant-input-number) {
    border-radius: 10px;
  }

  .property-name-input {
    transition: box-shadow 0.2s ease;
  }

  .property-name-input:focus {
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
  }

  .property-field--description :deep(.ant-input) {
    padding-right: 8px;
  }

  .property-field--required :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  .property-field--required :deep(.ant-form-item-label) {
    padding: 0;
    margin-bottom: 0;
  }

  .property-field--required :deep(.ant-form-item-control-input-content) {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .property-item.is-nested .property-config-grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.1fr);
    grid-template-areas:
      'name type'
      'description description'
      'required required';
    column-gap: 18px;
    row-gap: 14px;
  }

  .property-item.is-nested .property-field--required :deep(.ant-form-item-control-input-content) {
    justify-content: flex-start;
  }

  .nested-editor .property-item {
    margin-top: 12px;
  }

  .property-field--required :deep(.ant-form-item-label) {
    padding: 0;
    margin-bottom: 0;
  }

  .property-item.is-nested .property-field--required :deep(.ant-form-item-control-input-content) {
    justify-content: flex-start;
  }

  .property-extra {
    margin: 0;
    margin-top: 12px;
    padding: 16px;
    background: #f8fafc;
    border: 1px dashed #d0d7e3;
    border-radius: 12px;

    &.nested-editor {
      border-style: solid;
      border-color: rgba(82, 196, 26, 0.4);
      background: linear-gradient(180deg, #f6ffed 0%, #ffffff 100%);
    }
  }

  .nested-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  }

  .nested-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  .add-property-container {
    margin-top: 4px;
  }

  .add-property-btn {
    width: 100%;
    height: 46px;
    font-size: 14px;
    font-weight: 500;
    color: #1677ff;
    border: 1px dashed rgba(22, 119, 255, 0.5);
    border-radius: 12px;
    background: rgba(22, 119, 255, 0.08);
    transition: all 0.3s ease;

    &:hover {
      color: #0b64d9;
      border-color: #0b64d9;
      background: rgba(11, 100, 217, 0.12);
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(22, 119, 255, 0.2);
    }
  }

  @media (max-width: 900px) {
    .property-config-grid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      grid-template-areas:
        'name type'
        'description description'
        'required required';
    }
  }
</style>
