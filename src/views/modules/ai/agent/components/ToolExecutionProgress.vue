<template>
  <div :class="['tool-execution', `status-${execution.status}`]">
    <div class="tool-content">
      <div class="tool-icon-wrapper">
        <div class="icon-container">
          <ToolOutlined v-if="execution.status === 'running'" class="tool-icon running" />
          <CheckCircleOutlined v-else-if="execution.status === 'success'" class="tool-icon success" />
          <CloseCircleOutlined v-else-if="execution.status === 'failed'" class="tool-icon failed" />
        </div>
      </div>
      <div class="tool-info">
        <div class="tool-header">
          <span class="tool-label">{{ execution.label }}</span>
          <span v-if="execution.status !== 'running'" class="tool-elapsed">
            {{ formatElapsed(execution.elapsed) }}
          </span>
        </div>
        <div v-if="execution.status === 'failed' && execution.error" class="tool-error">
          <ExclamationCircleOutlined class="error-icon" />
          <span class="error-message">{{ execution.error }}</span>
        </div>
      </div>
      <div v-if="execution.status === 'running'" class="tool-status">
        <div class="loading-spinner">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    ToolOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
  } from '@ant-design/icons-vue'

  interface ToolExecution {
    name: string
    label: string
    status: 'running' | 'success' | 'failed'
    elapsed?: number
    error?: string
  }

  interface Props {
    execution: ToolExecution
  }

  defineProps<Props>()

  /**
   * 格式化耗时显示
   */
  const formatElapsed = (ms?: number): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }
</script>

<style lang="less" scoped>
  .tool-execution {
    margin-bottom: 12px;
    border-radius: 8px;
    border: 1px solid;
    background: #ffffff;
    transition: all 0.2s ease;

    &.status-running {
      border-color: #dbeafe;
      background: linear-gradient(to right, #ffffff 0%, #f0f9ff 100%);

      .icon-container {
        background: #dbeafe;
      }

      .tool-icon.running {
        color: #2563eb;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    }

    &.status-success {
      border-color: #d1fae5;
      background: #ffffff;

      .icon-container {
        background: #d1fae5;
      }

      .tool-icon.success {
        color: #059669;
      }
    }

    &.status-failed {
      border-color: #fee2e2;
      background: #ffffff;

      .icon-container {
        background: #fee2e2;
      }

      .tool-icon.failed {
        color: #dc2626;
      }
    }

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .tool-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 12px;

    .tool-icon-wrapper {
      flex-shrink: 0;
      padding-top: 2px;

      .icon-container {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        .tool-icon {
          font-size: 14px;
        }
      }
    }

    .tool-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;

      .tool-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;

        .tool-label {
          font-size: 13px;
          font-weight: 500;
          color: #1f2937;
          line-height: 1.4;
        }

        .tool-elapsed {
          font-size: 11px;
          color: #6b7280;
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 3px;
          flex-shrink: 0;
          font-weight: 500;
        }
      }

      .tool-error {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 6px 8px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 4px;

        .error-icon {
          font-size: 12px;
          color: #dc2626;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .error-message {
          font-size: 12px;
          color: #991b1b;
          line-height: 1.4;
          word-break: break-word;
        }
      }
    }

    .tool-status {
      flex-shrink: 0;
      padding-top: 4px;

      .loading-spinner {
        display: flex;
        gap: 3px;
        align-items: center;

        span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #2563eb;
          animation: bounce 1.4s infinite ease-in-out both;

          &:nth-child(1) {
            animation-delay: -0.32s;
          }

          &:nth-child(2) {
            animation-delay: -0.16s;
          }
        }
      }
    }
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
