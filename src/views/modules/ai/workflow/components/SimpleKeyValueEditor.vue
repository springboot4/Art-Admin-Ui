<template>
  <div class="simple-key-value-editor">
    <div class="kv-header">
      <span class="kv-title">{{ title }}</span>
      <a-button size="small" type="dashed" @click="addItem" :icon="h(PlusOutlined)">
        添加{{ title }}
      </a-button>
    </div>

    <div class="kv-list">
      <div v-for="(item, index) in items" :key="item.id || index" class="kv-item">
        <div class="kv-item-content">
          <!-- Key 输入框 -->
          <div class="kv-field">
            <label class="kv-label">Key</label>
            <a-input
              v-model:value="item.key"
              :placeholder="placeholderKey"
              size="small"
              @change="handleChange"
            />
          </div>

          <!-- Value 输入框 -->
          <div class="kv-field kv-value-field">
            <label class="kv-label">Value</label>
            <a-input
              v-model:value="item.value"
              :placeholder="placeholderValue"
              size="small"
              @change="handleChange"
            />
          </div>

          <!-- 启用/禁用开关 -->
          <div class="kv-field kv-enabled-field">
            <a-switch v-model:checked="item.enabled" size="small" @change="handleChange" />
          </div>

          <!-- 删除按钮 -->
          <div class="kv-field kv-actions">
            <a-button
              size="small"
              type="text"
              danger
              @click="removeItem(index)"
              :disabled="items.length <= 1"
            >
              <template #icon>
                <DeleteOutlined />
              </template>
            </a-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="items.length === 0" class="kv-empty">
        <a-empty :image="false" :description="`暂无${title}配置`">
          <a-button type="dashed" @click="addItem"> 添加第一个{{ title }} </a-button>
        </a-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { h, ref, watch, computed } from 'vue'
  import {
    Button as AButton,
    Input as AInput,
    Switch as ASwitch,
    Empty as AEmpty,
  } from 'ant-design-vue'
  import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'

  const props = defineProps({
    title: {
      type: String,
      default: '参数',
    },
    value: {
      type: Array,
      default: () => [],
    },
    placeholderKey: {
      type: String,
      default: '请输入Key',
    },
    placeholderValue: {
      type: String,
      default: '请输入Value',
    },
  })

  const emit = defineEmits(['update:value'])

  // 计算属性
  const items = computed({
    get: () => {
      if (!props.value || props.value.length === 0) {
        return [{ id: Date.now(), key: '', value: '', enabled: true }]
      }
      return props.value
    },
    set: (value) => {
      emit('update:value', value)
    },
  })

  // 添加项目
  const addItem = () => {
    const newItems = [...items.value]
    newItems.push({
      id: Date.now(),
      key: '',
      value: '',
      enabled: true,
    })
    items.value = newItems
  }

  // 删除项目
  const removeItem = (index) => {
    if (items.value.length <= 1) return

    const newItems = [...items.value]
    newItems.splice(index, 1)
    items.value = newItems
  }

  // 处理变化
  const handleChange = () => {
    emit('update:value', items.value)
  }
</script>

<style lang="less" scoped>
  .simple-key-value-editor {
    position: relative;
  }

  .kv-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .kv-title {
    font-weight: 500;
    color: #262626;
    font-size: 14px;
  }

  .kv-list {
    min-height: 120px;
  }

  .kv-item {
    margin-bottom: 8px;
    padding: 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      background: #f5f5f5;
      border-color: #d9d9d9;
    }
  }

  .kv-item-content {
    display: grid;
    grid-template-columns: 1fr 2fr auto auto;
    gap: 12px;
    align-items: end;
  }

  .kv-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .kv-label {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  .kv-enabled-field {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 20px;
  }

  .kv-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 20px;
  }

  .kv-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    border: 2px dashed #d9d9d9;
    border-radius: 6px;
    background: #fafafa;
  }

  @media (max-width: 768px) {
    .kv-item-content {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .kv-enabled-field,
    .kv-actions {
      padding-top: 0;
      justify-content: flex-start;
    }
  }
</style>
