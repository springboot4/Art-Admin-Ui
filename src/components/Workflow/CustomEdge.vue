<template>
  <g>
    <!-- 边路径 -->
    <path
      :d="path[0]"
      :style="edgeStyle"
      class="vue-flow__edge-path custom-edge-path"
      :class="{
        'edge-animated': animated,
        'edge-selected': selected,
        'edge-error': data?.status === 'error',
        'edge-success': data?.status === 'success',
      }"
    />

    <!-- 箭头标记 -->
    <defs>
      <marker
        :id="`arrowhead-${id}`"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0 0, 10 3.5, 0 7" :fill="edgeColor" class="arrow-marker" />
      </marker>
    </defs>

    <!-- 边标签 -->
    <foreignObject
      v-if="label || data?.condition"
      :width="labelWidth"
      :height="labelHeight"
      :x="path[1] - labelWidth / 2"
      :y="path[2] - labelHeight / 2"
    >
      <div class="edge-label-wrapper">
        <div class="edge-label" :class="{ 'label-condition': data?.condition }">
          {{ displayLabel }}
        </div>
      </div>
    </foreignObject>

    <!-- 删除按钮 -->
    <foreignObject
      v-if="selected"
      :width="24"
      :height="24"
      :x="path[1] + labelWidth / 2 + 10"
      :y="path[2] - 12"
    >
      <div class="edge-button-wrapper">
        <button class="edge-delete-button" @click="onDeleteClick" title="删除连接">
          <close-outlined />
        </button>
      </div>
    </foreignObject>

    <!-- 流动效果的点 -->
    <circle v-if="animated" r="3" :fill="edgeColor" class="flow-dot">
      <animateMotion :dur="animationDuration" repeatCount="indefinite" :path="path[0]" />
    </circle>
  </g>
</template>

<script lang="ts" setup>
  import { EdgeProps, getBezierPath } from '@vue-flow/core'
  import { computed } from 'vue'
  import { CloseOutlined } from '@ant-design/icons-vue'

  interface CustomEdgeData {
    condition?: string
    status?: 'success' | 'error' | 'active'
  }

  interface CustomEdgeProps extends EdgeProps {
    data?: CustomEdgeData
  }

  const props = defineProps<CustomEdgeProps>()
  const emit = defineEmits(['remove'])

  const path = computed(() => getBezierPath(props))

  const displayLabel = computed(() => {
    if (props.data?.condition) {
      return props.data.condition
    }
    return props.label || ''
  })

  const labelWidth = computed(() => {
    const text = displayLabel.value
    return Math.max(60, Math.min(200, text.length * 8 + 20))
  })

  const labelHeight = computed(() => 28)

  const edgeColor = computed(() => {
    if (props.data?.status === 'error') return '#ff4d4f'
    if (props.data?.status === 'success') return '#52c41a'
    if (props.data?.status === 'active') return '#1890ff'
    if (props.selected) return '#1890ff'
    return '#b1b1b7'
  })

  const edgeStyle = computed(() => ({
    stroke: edgeColor.value,
    strokeWidth: props.selected ? 3 : 2,
    markerEnd: `url(#arrowhead-${props.id})`,
    ...props.style,
  }))

  const animationDuration = computed(() => {
    if (props.data?.status === 'error') return '3s'
    if (props.data?.status === 'active') return '1s'
    return '2s'
  })

  const onDeleteClick = () => {
    emit('remove', props.id)
  }
</script>

<style scoped>
  .custom-edge-path {
    transition: all 0.2s ease;
  }

  .edge-animated {
    stroke-dasharray: 5;
    animation: dash 1s linear infinite;
  }

  .edge-selected {
    filter: drop-shadow(0 0 4px rgba(24, 144, 255, 0.4));
  }

  .edge-error {
    animation: pulse-error 1s ease-in-out infinite alternate;
  }

  .edge-success {
    animation: pulse-success 2s ease-in-out infinite alternate;
  }

  .edge-label-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .edge-label {
    background: #fff;
    border: 1px solid #d9d9d9;
    border-radius: 14px;
    padding: 4px 12px;
    font-size: 12px;
    color: #595959;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    max-width: 180px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .label-condition {
    background: #e6f7ff;
    border-color: #91d5ff;
    color: #0958d9;
  }

  .edge-button-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
  }

  .edge-delete-button {
    cursor: pointer;
    pointer-events: all;
    background: #ff4d4f;
    border: none;
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .edge-delete-button:hover {
    background: #cf1322;
    transform: scale(1.1);
  }

  .flow-dot {
    opacity: 0.8;
  }

  .arrow-marker {
    transition: fill 0.2s ease;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }

  @keyframes pulse-error {
    0% {
      filter: drop-shadow(0 0 2px rgba(255, 77, 79, 0.6));
    }
    100% {
      filter: drop-shadow(0 0 8px rgba(255, 77, 79, 0.8));
    }
  }

  @keyframes pulse-success {
    0% {
      filter: drop-shadow(0 0 2px rgba(82, 196, 26, 0.4));
    }
    100% {
      filter: drop-shadow(0 0 6px rgba(82, 196, 26, 0.6));
    }
  }
</style>
