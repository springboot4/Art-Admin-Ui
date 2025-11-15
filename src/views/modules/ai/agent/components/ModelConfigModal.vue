<template>
  <a-modal :visible="visible" title="模型配置" :width="520" @ok="handleOk" @cancel="handleCancel">
    <a-form layout="vertical">
      <a-form-item label="选择模型">
        <a-select
          v-model:value="localModelId"
          :loading="modelLoading"
          :options="modelOptions"
          allow-clear
          placeholder="选择模型"
          show-search
          option-filter-prop="label"
          @change="handleModelChange"
        />
      </a-form-item>

      <a-form-item label="最大输出 Token">
        <a-input-number
          v-model:value="localMaxTokens"
          :min="1"
          :precision="0"
          placeholder="留空使用模型默认值"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="采样温度">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
          <span style="font-size: 16px; font-weight: 600; color: #1890ff">
            {{ localTemperature?.toFixed(2) || '0.70' }}
          </span>
          <span style="font-size: 12px; color: #6b7280">
            {{ temperatureLabel }}
          </span>
        </div>
        <a-slider
          v-model:value="localTemperature"
          :max="1"
          :min="0"
          :step="0.01"
          :marks="temperatureMarks"
          :tooltip-formatter="(val) => val?.toFixed(2)"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'

  interface Props {
    visible: boolean
    modelId: string | null
    maxTokens: number | null
    temperature: number
    modelOptions: Array<{ label: string; value: string }>
    modelLoading: boolean
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'update:modelId', value: string | null): void
    (e: 'update:maxTokens', value: number | null): void
    (e: 'update:temperature', value: number): void
    (e: 'change'): void
  }>()

  const localModelId = ref(props.modelId)
  const localMaxTokens = ref(props.maxTokens)
  const localTemperature = ref(props.temperature)

  const temperatureMarks = {
    0: '精确',
    0.5: '平衡',
    1: '创意',
  }

  const temperatureLabel = computed(() => {
    const temp = localTemperature.value ?? 0.7
    if (temp < 0.3) return '更确定、一致'
    if (temp < 0.7) return '平衡准确与创意'
    return '更多样、创造性'
  })

  watch(
    () => props.modelId,
    (val) => {
      localModelId.value = val
    },
  )

  watch(
    () => props.maxTokens,
    (val) => {
      localMaxTokens.value = val
    },
  )

  watch(
    () => props.temperature,
    (val) => {
      localTemperature.value = val
    },
  )

  function handleModelChange(value: string | null) {
    localModelId.value = value
    emit('update:modelId', value)
    emit('change')
  }

  function handleOk() {
    emit('update:maxTokens', localMaxTokens.value)
    emit('update:temperature', localTemperature.value)
    emit('update:visible', false)
    emit('change')
  }

  function handleCancel() {
    // 恢复原值
    localModelId.value = props.modelId
    localMaxTokens.value = props.maxTokens
    localTemperature.value = props.temperature
    emit('update:visible', false)
  }
</script>

<style scoped>
  /* 使用 scoped 样式隔离，防止污染 */
</style>
