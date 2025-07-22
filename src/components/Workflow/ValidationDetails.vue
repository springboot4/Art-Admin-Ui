<template>
  <div class="validation-details">
    <div class="validation-summary">
      <div class="summary-stats">
        <a-statistic
          title="错误"
          :value="result?.errors?.length || 0"
          :value-style="{ color: '#ff4d4f' }"
        />
        <a-statistic
          title="警告"
          :value="result?.warnings?.length || 0"
          :value-style="{ color: '#faad14' }"
        />
        <a-statistic
          title="验证状态"
          :value="result?.isValid ? '通过' : '失败'"
          :value-style="{ color: result?.isValid ? '#52c41a' : '#ff4d4f' }"
        />
      </div>
    </div>

    <a-tabs v-model:activeKey="activeTab" type="card">
      <a-tab-pane key="errors" tab="错误" :disabled="!result?.errors?.length">
        <div class="issue-list">
          <div v-for="(error, index) in result?.errors" :key="index" class="issue-item error-item">
            <div class="issue-header">
              <div class="issue-icon">
                <close-circle-outlined style="color: #ff4d4f" />
              </div>
              <div class="issue-content">
                <div class="issue-title">{{ getErrorTitle(error.type) }}</div>
                <div class="issue-message">{{ error.message }}</div>
              </div>
              <div class="issue-actions">
                <a-button size="small" type="primary" @click="fixIssue(error)"> 修复 </a-button>
                <a-button size="small" @click="locateIssue(error)"> 定位 </a-button>
              </div>
            </div>

            <div v-if="error.nodeId" class="issue-location">
              <span class="location-label">位置:</span>
              <a-tag color="red">{{ getNodeLabel(error.nodeId) }}</a-tag>
            </div>

            <div v-if="error.suggestion" class="issue-suggestion">
              <div class="suggestion-label">建议修复:</div>
              <div class="suggestion-content">{{ error.suggestion }}</div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="warnings" tab="警告" :disabled="!result?.warnings?.length">
        <div class="issue-list">
          <div
            v-for="(warning, index) in result?.warnings"
            :key="index"
            class="issue-item warning-item"
          >
            <div class="issue-header">
              <div class="issue-icon">
                <warning-outlined style="color: #faad14" />
              </div>
              <div class="issue-content">
                <div class="issue-title">{{ getWarningTitle(warning.type) }}</div>
                <div class="issue-message">{{ warning.message }}</div>
              </div>
              <div class="issue-actions">
                <a-button size="small" @click="fixIssue(warning)"> 优化 </a-button>
                <a-button size="small" @click="ignoreWarning(warning)"> 忽略 </a-button>
              </div>
            </div>

            <div v-if="warning.nodeId" class="issue-location">
              <span class="location-label">位置:</span>
              <a-tag color="orange">{{ getNodeLabel(warning.nodeId) }}</a-tag>
            </div>

            <div v-if="warning.suggestion" class="issue-suggestion">
              <div class="suggestion-label">优化建议:</div>
              <div class="suggestion-content">{{ warning.suggestion }}</div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="rules" tab="验证规则">
        <div class="validation-rules">
          <a-collapse>
            <a-collapse-panel
              v-for="category in validationRules"
              :key="category.name"
              :header="category.name"
            >
              <div class="rule-list">
                <div v-for="rule in category.rules" :key="rule.id" class="rule-item">
                  <div class="rule-header">
                    <span class="rule-name">{{ rule.name }}</span>
                    <a-switch
                      v-model:checked="rule.enabled"
                      size="small"
                      @change="updateRule(rule)"
                    />
                  </div>
                  <div class="rule-description">{{ rule.description }}</div>
                  <div v-if="rule.severity" class="rule-severity">
                    <a-tag :color="getSeverityColor(rule.severity)">
                      {{ getSeverityLabel(rule.severity) }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </a-tab-pane>
    </a-tabs>

    <div class="validation-footer">
      <a-space>
        <a-button @click="$emit('close')">关闭</a-button>
        <a-button type="primary" @click="revalidate" :loading="validating"> 重新验证 </a-button>
        <a-button @click="exportReport">导出报告</a-button>
      </a-space>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue'
  import {
    Tabs as ATabs,
    TabPane as ATabPane,
    Statistic as AStatistic,
    Button as AButton,
    Tag as ATag,
    Space as ASpace,
    Switch as ASwitch,
    Collapse as ACollapse,
    CollapsePanel as ACollapsePanel,
    message,
  } from 'ant-design-vue'
  import { CloseCircleOutlined, WarningOutlined } from '@ant-design/icons-vue'
  import type { WorkflowValidationResult } from '../../types/workflow'

  interface Props {
    result: WorkflowValidationResult | null
  }

  const props = defineProps<Props>()
  const emit = defineEmits(['fix', 'close'])

  const activeTab = ref('errors')
  const validating = ref(false)

  // 验证规则配置
  const validationRules = reactive([
    {
      name: '基础结构',
      rules: [
        {
          id: 'start-node',
          name: '开始节点检查',
          description: '工作流必须包含一个开始节点',
          severity: 'error',
          enabled: true,
        },
        {
          id: 'end-node',
          name: '结束节点检查',
          description: '工作流必须包含至少一个输出节点',
          severity: 'error',
          enabled: true,
        },
        {
          id: 'disconnected',
          name: '孤立节点检查',
          description: '检查是否存在未连接的节点',
          severity: 'warning',
          enabled: true,
        },
      ],
    },
    {
      name: '节点配置',
      rules: [
        {
          id: 'required-config',
          name: '必需配置检查',
          description: '检查节点是否配置了所有必需参数',
          severity: 'error',
          enabled: true,
        },
        {
          id: 'valid-config',
          name: '配置有效性检查',
          description: '验证节点配置的格式和值是否正确',
          severity: 'error',
          enabled: true,
        },
        {
          id: 'performance',
          name: '性能优化建议',
          description: '检查可能影响性能的配置',
          severity: 'warning',
          enabled: false,
        },
      ],
    },
    {
      name: '逻辑一致性',
      rules: [
        {
          id: 'circular-dependency',
          name: '循环依赖检查',
          description: '检查工作流中是否存在循环依赖',
          severity: 'error',
          enabled: true,
        },
        {
          id: 'data-flow',
          name: '数据流检查',
          description: '验证节点间的数据传递是否合理',
          severity: 'warning',
          enabled: true,
        },
      ],
    },
  ])

  const getErrorTitle = (type: string): string => {
    const titles = {
      missing_start: '缺少开始节点',
      missing_end: '缺少结束节点',
      disconnected_node: '存在孤立节点',
      invalid_config: '配置错误',
      circular_dependency: '循环依赖',
    }
    return titles[type] || '未知错误'
  }

  const getWarningTitle = (type: string): string => {
    const titles = {
      unused_node: '未使用的节点',
      missing_config: '配置不完整',
      performance: '性能问题',
    }
    return titles[type] || '未知警告'
  }

  const getNodeLabel = (nodeId: string): string => {
    // 这里应该根据实际的节点ID获取节点名称
    return `节点 ${nodeId}`
  }

  const getSeverityColor = (severity: string): string => {
    const colors = {
      error: 'red',
      warning: 'orange',
      info: 'blue',
    }
    return colors[severity] || 'default'
  }

  const getSeverityLabel = (severity: string): string => {
    const labels = {
      error: '错误',
      warning: '警告',
      info: '信息',
    }
    return labels[severity] || severity
  }

  const fixIssue = (issue: any) => {
    emit('fix', issue)
    message.info(`正在修复: ${issue.message}`)
  }

  const locateIssue = (issue: any) => {
    if (issue.nodeId) {
      // 定位到具体节点
      message.info(`定位到节点: ${getNodeLabel(issue.nodeId)}`)
    }
  }

  const ignoreWarning = (warning: any) => {
    message.success('warning:', warning)
  }

  const updateRule = (rule: any) => {
    message.success(`规则 "${rule.name}" 已${rule.enabled ? '启用' : '禁用'}`)
  }

  const revalidate = async () => {
    validating.value = true
    try {
      // 模拟重新验证
      await new Promise((resolve) => setTimeout(resolve, 1000))
      message.success('重新验证完成')
    } catch (error) {
      message.error('验证失败')
    } finally {
      validating.value = false
    }
  }

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      isValid: props.result?.isValid,
      errors: props.result?.errors || [],
      warnings: props.result?.warnings || [],
      rules: validationRules,
    }

    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow-validation-report-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    message.success('验证报告导出成功')
  }
</script>

<style lang="less" scoped>
  .validation-details {
    .validation-summary {
      margin-bottom: 24px;
      padding: 16px;
      background: #fafafa;
      border-radius: 6px;

      .summary-stats {
        display: flex;
        gap: 32px;
        justify-content: center;
      }
    }

    .issue-list {
      .issue-item {
        border: 1px solid #e8e8e8;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 12px;

        &.error-item {
          border-left: 4px solid #ff4d4f;
        }

        &.warning-item {
          border-left: 4px solid #faad14;
        }

        .issue-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;

          .issue-icon {
            font-size: 18px;
            margin-top: 2px;
          }

          .issue-content {
            flex: 1;

            .issue-title {
              font-size: 16px;
              font-weight: 600;
              color: #262626;
              margin-bottom: 4px;
            }

            .issue-message {
              color: #595959;
              line-height: 1.5;
            }
          }

          .issue-actions {
            display: flex;
            gap: 8px;
          }
        }

        .issue-location {
          margin: 12px 0 0 30px;
          display: flex;
          align-items: center;
          gap: 8px;

          .location-label {
            font-size: 12px;
            color: #8c8c8c;
          }
        }

        .issue-suggestion {
          margin: 12px 0 0 30px;
          padding: 12px;
          background: #f6ffed;
          border: 1px solid #b7eb8f;
          border-radius: 4px;

          .suggestion-label {
            font-size: 12px;
            font-weight: 600;
            color: #52c41a;
            margin-bottom: 4px;
          }

          .suggestion-content {
            font-size: 14px;
            color: #262626;
            line-height: 1.5;
          }
        }
      }
    }

    .validation-rules {
      .rule-list {
        .rule-item {
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          .rule-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;

            .rule-name {
              font-weight: 500;
              color: #262626;
            }
          }

          .rule-description {
            color: #595959;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
          }

          .rule-severity {
            display: flex;
            align-items: center;
          }
        }
      }
    }

    .validation-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
      text-align: right;
    }
  }
</style>
