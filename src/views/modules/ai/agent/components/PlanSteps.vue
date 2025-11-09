<template>
  <div class="plan-steps">
    <div class="plan-header">
      <div class="header-content">
        <div class="plan-icon">
          <BulbOutlined />
        </div>
        <span class="plan-title">执行计划</span>
      </div>
    </div>
    <div class="steps-list">
      <div
        v-for="(step, index) in steps"
        :key="step.step"
        :class="['step-item', { 'is-last': index === steps.length - 1 }]"
      >
        <div class="step-indicator">
          <div class="step-number">{{ step.step }}</div>
          <div v-if="index !== steps.length - 1" class="step-line"></div>
        </div>
        <div class="step-content">
          <div class="step-goal">{{ step.goal }}</div>
          <div v-if="step.tool" class="step-tool">
            <ToolOutlined class="tool-icon" />
            <span class="tool-name">{{ step.tool }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { BulbOutlined, ToolOutlined } from '@ant-design/icons-vue'

  interface PlanStep {
    step: number
    goal: string
    tool?: string
  }

  interface Props {
    steps: PlanStep[]
  }

  defineProps<Props>()
</script>

<style lang="less" scoped>
  .plan-steps {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-left: 3px solid #6366f1;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }

  .plan-header {
    margin-bottom: 12px;

    .header-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .plan-icon {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        flex-shrink: 0;
      }

      .plan-title {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        letter-spacing: 0.3px;
      }
    }
  }

  .steps-list {
    display: flex;
    flex-direction: column;
  }

  .step-item {
    display: flex;
    gap: 12px;
    padding: 8px 0;

    &.is-last {
      padding-bottom: 0;
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;

      .step-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #f3f4f6;
        color: #6366f1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        border: 2px solid #e5e7eb;
        position: relative;
        z-index: 1;
      }

      .step-line {
        width: 2px;
        flex: 1;
        min-height: 20px;
        background: linear-gradient(to bottom, #e5e7eb 0%, #f3f4f6 100%);
        margin-top: 4px;
      }
    }

    .step-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      padding-top: 2px;

      .step-goal {
        font-size: 13px;
        color: #1f2937;
        line-height: 1.5;
        word-break: break-word;
      }

      .step-tool {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 8px;
        background: #f0f9ff;
        border: 1px solid #e0f2fe;
        border-radius: 4px;
        width: fit-content;
        max-width: 100%;

        .tool-icon {
          font-size: 11px;
          color: #0284c7;
          flex-shrink: 0;
        }

        .tool-name {
          font-size: 11px;
          color: #0369a1;
          font-weight: 500;
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
</style>
