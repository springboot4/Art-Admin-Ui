<template>
  <a-modal
    v-model:visible="visible"
    :closable="false"
    :confirm-loading="confirmLoading"
    :footer="null"
    :keyboard="true"
    :mask-closable="true"
    :title="null"
    :width="1400"
    class="recall-test-modal-wrapper"
    @cancel="handleCancel"
  >
    <template v-if="visible">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            <Icon :size="24" icon="ant-design:experiment-outlined" />
          </div>
          <div class="header-info">
            <h2 class="modal-title">召回测试</h2>
          </div>
        </div>
        <a-button class="close-btn" size="large" type="text" @click="handleCancel">
          <template #icon>
            <CloseOutlined />
          </template>
        </a-button>
      </div>

      <!-- Modal Content -->
      <div class="modal-content">
        <!-- 左侧：查询配置区 -->
        <div class="left-panel">
          <div class="query-section">
            <div class="section-header">
              <Icon :size="18" icon="ant-design:setting-outlined" />
              <span>测试配置</span>
            </div>

            <a-form class="test-form" layout="vertical">
              <a-form-item label="查询语句" required>
                <a-textarea
                  v-model:value="queryText"
                  :auto-size="{ minRows: 3, maxRows: 6 }"
                  class="query-input"
                  placeholder="请输入查询语句"
                />
              </a-form-item>

              <a-form-item label="检索类型" required>
                <a-radio-group v-model:value="selectedRetrievalType" class="retrieval-type-group">
                  <div class="retrieval-options">
                    <div
                      :class="['retrieval-option', { active: selectedRetrievalType === 'vector' }]"
                      @click="selectedRetrievalType = 'vector'"
                    >
                      <a-radio value="vector">
                        <div class="option-wrapper">
                          <div class="option-icon vector">
                            <Icon :size="18" icon="ant-design:node-index-outlined" />
                          </div>
                          <div class="option-info">
                            <div class="option-title">向量检索</div>
                            <div class="option-desc">语义相似度</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>

                    <div
                      :class="['retrieval-option', { active: selectedRetrievalType === 'graph' }]"
                      @click="selectedRetrievalType = 'graph'"
                    >
                      <a-radio value="graph">
                        <div class="option-wrapper">
                          <div class="option-icon graph">
                            <Icon :size="18" icon="ant-design:share-alt-outlined" />
                          </div>
                          <div class="option-info">
                            <div class="option-title">图谱检索</div>
                            <div class="option-desc">关系图谱</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>

                    <div
                      :class="['retrieval-option', { active: selectedRetrievalType === 'hybrid' }]"
                      @click="selectedRetrievalType = 'hybrid'"
                    >
                      <a-radio value="hybrid">
                        <div class="option-wrapper">
                          <div class="option-icon hybrid">
                            <Icon :size="18" icon="ant-design:sync-outlined" />
                          </div>
                          <div class="option-info">
                            <div class="option-title">混合检索</div>
                            <div class="option-desc">融合检索</div>
                          </div>
                        </div>
                      </a-radio>
                    </div>
                  </div>
                </a-radio-group>
              </a-form-item>

              <div class="action-buttons">
                <a-button
                  :loading="confirmLoading"
                  block
                  size="large"
                  type="primary"
                  @click="handleTest"
                >
                  <template #icon>
                    <Icon :size="16" icon="ant-design:thunderbolt-outlined" />
                  </template>
                  开始测试
                </a-button>
              </div>
            </a-form>
          </div>
        </div>

        <!-- 右侧：结果展示区 -->
        <div class="right-panel">
          <!-- 有结果时显示 -->
          <div v-if="testResult" class="result-section">
            <!-- 结果统计头部 -->
            <div class="result-header">
              <div class="header-left">
                <Icon :size="20" icon="ant-design:pie-chart-outlined" />
                <span class="header-title">检索结果</span>
              </div>
              <div class="header-stats">
                <div class="stat-item">
                  <span class="stat-label">总数</span>
                  <span class="stat-value primary">{{ testResult.totalCount }}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-label">耗时</span>
                  <span class="stat-value success">{{ testResult.costTime }}ms</span>
                </div>
              </div>
            </div>

            <!-- 类型统计 -->
            <div v-if="testResult.typeCount" class="type-stats">
              <div v-for="(count, type) in testResult.typeCount" :key="type" class="type-stat-item">
                <div class="type-info">
                  <Icon :icon="getTypeIcon(type)" :size="16" />
                  <span>{{ getTypeName(type) }}</span>
                </div>
                <a-badge :count="count" :number-style="getBadgeStyle(type)" show-zero />
              </div>
            </div>

            <!-- 结果列表 -->
            <div class="results-container">
              <div v-for="(item, index) in testResult.results" :key="index" class="result-card">
                <!-- 卡片头部 -->
                <div class="card-header">
                  <div class="card-header-left">
                    <div class="result-rank">{{ index + 1 }}</div>
                    <a-tag :color="getTypeColor(item.retrievalType)" class="type-tag">
                      {{ getTypeName(item.retrievalType) }}
                    </a-tag>
                  </div>
                  <div class="card-header-right">
                    <div class="score-badge">
                      <Icon :size="12" icon="ant-design:fire-outlined" />
                      <span class="score-text">{{ item.score.toFixed(4) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 卡片内容 -->
                <div class="card-content">
                  <div class="content-text">{{ item.content }}</div>
                </div>

                <!-- 卡片底部 -->
                <div class="card-footer">
                  <div class="meta-info">
                    <div class="meta-item">
                      <Icon :size="12" icon="ant-design:file-text-outlined" />
                      <span class="meta-label">文档</span>
                      <span class="meta-value">{{ item.documentId }}</span>
                    </div>
                    <div class="meta-item">
                      <Icon :size="12" icon="ant-design:block-outlined" />
                      <span class="meta-label">分块</span>
                      <span class="meta-value">{{ item.segmentId }}</span>
                    </div>
                  </div>
                  <a-button
                    v-if="item.metadata && Object.keys(item.metadata).length > 0"
                    size="small"
                    type="link"
                    @click="toggleMetadata(index)"
                  >
                    <Icon :size="12" icon="ant-design:info-circle-outlined" />
                    {{ expandedMetadata[index] ? '收起' : '详情' }}
                  </a-button>
                </div>

                <!-- 元数据展开区 -->
                <div v-if="expandedMetadata[index] && item.metadata" class="metadata-panel">
                  <div class="metadata-header">
                    <Icon :size="14" icon="ant-design:code-outlined" />
                    <span>元数据</span>
                  </div>
                  <pre class="metadata-content">{{ JSON.stringify(item.metadata, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <!-- 调试信息 -->
            <div v-if="testResult.debugInfo" class="debug-panel">
              <ACollapse ghost>
                <ACollapsePanel key="1">
                  <template #header>
                    <div class="collapse-header">
                      <Icon :size="14" icon="ant-design:bug-outlined" />
                      <span>调试信息</span>
                    </div>
                  </template>
                  <pre class="debug-content">{{
                    JSON.stringify(testResult.debugInfo, null, 2)
                  }}</pre>
                </ACollapsePanel>
              </ACollapse>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <div class="empty-icon">
              <Icon :size="80" color="#d9d9d9" icon="ant-design:file-search-outlined" />
            </div>
            <div class="empty-title">等待测试</div>
            <div class="empty-desc">配置查询参数后，点击"开始测试"查看召回结果</div>
          </div>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue'
  import { Collapse, message } from 'ant-design-vue'
  import { CloseOutlined } from '@ant-design/icons-vue'
  import { Icon } from '/@/components/Icon'
  import { recallTest } from '/@/api/ai/dataset/AiDataSetIndex'
  import type { RecallTestResponse } from '/@/api/ai/dataset/AiDataSetTypes'

  // 定义组件别名
  const ACollapse = Collapse
  const ACollapsePanel = Collapse.Panel

  const visible = ref(false)
  const confirmLoading = ref(false)
  const datasetId = ref<string>('')
  const queryText = ref<string>('')
  const selectedRetrievalType = ref<string>('hybrid')
  const testResult = ref<RecallTestResponse | null>(null)
  const expandedMetadata = reactive<Record<number, boolean>>({})

  /**
   * 初始化
   */
  function init(id: string) {
    visible.value = true
    datasetId.value = id
    queryText.value = ''
    selectedRetrievalType.value = 'hybrid'
    testResult.value = null
    Object.keys(expandedMetadata).forEach((key) => {
      delete expandedMetadata[Number(key)]
    })
  }

  /**
   * 关闭
   */
  function handleCancel() {
    visible.value = false
    testResult.value = null
  }

  /**
   * 开始测试
   */
  async function handleTest() {
    if (!queryText.value?.trim()) {
      message.warning('请输入查询语句')
      return
    }

    if (!selectedRetrievalType.value) {
      message.warning('请选择检索类型')
      return
    }

    try {
      confirmLoading.value = true

      testResult.value = await recallTest({
        query: queryText.value.trim(),
        datasetId: datasetId.value,
        retrievalTypes: [selectedRetrievalType.value],
      })

      message.success('测试完成')
    } catch (error: any) {
      message.error('测试失败：' + (error?.message || '未知错误'))
    } finally {
      confirmLoading.value = false
    }
  }

  /**
   * 切换元数据展示
   */
  function toggleMetadata(index: number) {
    expandedMetadata[index] = !expandedMetadata[index]
  }

  /**
   * 获取类型名称
   */
  function getTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      vector: '向量检索',
      graph: '图谱检索',
      hybrid: '混合检索',
      VECTOR: '向量检索',
      GRAPH: '图谱检索',
      HYBRID: '混合检索',
    }
    return typeMap[type] || type
  }

  /**
   * 获取类型颜色
   */
  function getTypeColor(type: string): string {
    const typeKey = type?.toLowerCase()
    const colorMap: Record<string, string> = {
      vector: 'blue',
      graph: 'purple',
      hybrid: 'green',
    }
    return colorMap[typeKey] || 'default'
  }

  /**
   * 获取类型图标
   */
  function getTypeIcon(type: string): string {
    const typeKey = type?.toLowerCase()
    const iconMap: Record<string, string> = {
      vector: 'ant-design:node-index-outlined',
      graph: 'ant-design:share-alt-outlined',
      hybrid: 'ant-design:sync-outlined',
    }
    return iconMap[typeKey] || 'ant-design:question-circle-outlined'
  }

  /**
   * 获取徽章样式
   */
  function getBadgeStyle(type: string): Record<string, string> {
    const typeKey = type?.toLowerCase()
    const styleMap: Record<string, Record<string, string>> = {
      vector: { backgroundColor: '#1890ff' },
      graph: { backgroundColor: '#722ed1' },
      hybrid: { backgroundColor: '#52c41a' },
    }
    return styleMap[typeKey] || { backgroundColor: '#d9d9d9' }
  }

  defineExpose({
    init,
  })
</script>

<style lang="less" scoped>
  .recall-test-modal-wrapper {
    :deep(.ant-modal) {
      top: 30px;
      padding-bottom: 0;
    }

    :deep(.ant-modal-content) {
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
    }

    :deep(.ant-modal-body) {
      padding: 0;
      max-height: calc(100vh - 120px);
      overflow: hidden;
    }

    // ==================== Modal Header ====================
    .modal-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        border-radius: 50%;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;
        position: relative;
        z-index: 1;

        .header-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          backdrop-filter: blur(10px);
        }

        .header-info {
          .modal-title {
            font-size: 24px;
            font-weight: 600;
            color: #fff;
            margin: 0 0 4px 0;
            line-height: 1.2;
          }

          .modal-subtitle {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.85);
            margin: 0;
            line-height: 1.4;
          }
        }
      }

      .close-btn {
        color: #fff;
        border: none;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
        z-index: 1;

        &:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
          transform: rotate(90deg);
        }
      }
    }

    // ==================== Modal Content ====================
    .modal-content {
      display: flex;
      height: calc(100vh - 240px);
      background: #f5f7fa;

      // ==================== Left Panel ====================
      .left-panel {
        width: 420px;
        background: #fff;
        border-right: 1px solid #e8e8e8;
        display: flex;
        flex-direction: column;

        .query-section {
          flex: 1;
          padding: 24px;
          overflow-y: auto;

          &::-webkit-scrollbar {
            width: 6px;
          }

          &::-webkit-scrollbar-thumb {
            background: #d9d9d9;
            border-radius: 3px;
          }

          .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
            color: #262626;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #f0f0f0;
          }

          .test-form {
            .query-input {
              font-size: 14px;
              border-radius: 8px;
              transition: all 0.3s;

              &:focus {
                box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
              }
            }

            // 检索类型组
            .retrieval-type-group {
              width: 100%;

              .retrieval-options {
                display: flex;
                flex-direction: column;
                gap: 12px;

                .retrieval-option {
                  position: relative;
                  background: #fafafa;
                  border: 2px solid #e8e8e8;
                  border-radius: 10px;
                  padding: 14px;
                  cursor: pointer;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

                  &:hover {
                    border-color: #1890ff;
                    background: #f6f9ff;
                    transform: translateX(4px);
                  }

                  &.active {
                    border-color: #1890ff;
                    background: linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%);
                    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.15);

                    .option-icon {
                      &.vector {
                        background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
                        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
                      }

                      &.graph {
                        background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
                        box-shadow: 0 4px 12px rgba(114, 46, 209, 0.4);
                      }

                      &.hybrid {
                        background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
                        box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
                      }
                    }
                  }

                  :deep(.ant-radio-wrapper) {
                    width: 100%;
                    margin: 0;
                    display: flex;
                    align-items: center;

                    .ant-radio {
                      position: absolute;
                      top: 14px;
                      right: 14px;
                    }

                    .option-wrapper {
                      display: flex;
                      align-items: center;
                      gap: 12px;
                      width: 100%;
                      padding-right: 28px;

                      .option-icon {
                        width: 42px;
                        height: 42px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #fff;
                        flex-shrink: 0;
                        transition: all 0.3s ease;

                        &.vector {
                          background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
                        }

                        &.graph {
                          background: linear-gradient(135deg, #9254de 0%, #b37feb 100%);
                        }

                        &.hybrid {
                          background: linear-gradient(135deg, #73d13d 0%, #95de64 100%);
                        }
                      }

                      .option-info {
                        flex: 1;

                        .option-title {
                          font-size: 15px;
                          font-weight: 600;
                          color: #262626;
                          margin-bottom: 2px;
                          line-height: 1.3;
                        }

                        .option-desc {
                          font-size: 12px;
                          color: #8c8c8c;
                          line-height: 1.3;
                        }
                      }
                    }
                  }
                }
              }
            }

            .action-buttons {
              margin-top: 24px;

              .ant-btn {
                height: 44px;
                border-radius: 10px;
                font-size: 15px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);

                &:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.3);
                }
              }
            }
          }
        }
      }

      // ==================== Right Panel ====================
      .right-panel {
        flex: 1;
        background: #f5f7fa;
        overflow-y: auto;

        &::-webkit-scrollbar {
          width: 8px;
        }

        &::-webkit-scrollbar-thumb {
          background: #d9d9d9;
          border-radius: 4px;

          &:hover {
            background: #bfbfbf;
          }
        }

        // 结果区域
        .result-section {
          padding: 24px;

          // 结果头部
          .result-header {
            background: #fff;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
              color: #262626;

              .header-title {
                font-size: 18px;
                font-weight: 600;
              }
            }

            .header-stats {
              display: flex;
              align-items: center;
              gap: 20px;

              .stat-item {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;

                .stat-label {
                  font-size: 12px;
                  color: #8c8c8c;
                }

                .stat-value {
                  font-size: 20px;
                  font-weight: 600;
                  font-family: 'Monaco', 'Menlo', monospace;

                  &.primary {
                    color: #1890ff;
                  }

                  &.success {
                    color: #52c41a;
                  }
                }
              }

              .stat-divider {
                width: 1px;
                height: 32px;
                background: #e8e8e8;
              }
            }
          }

          // 类型统计
          .type-stats {
            background: #fff;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 20px;
            display: flex;
            gap: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

            .type-stat-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 8px 16px;
              background: #fafafa;
              border-radius: 8px;

              .type-info {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                color: #595959;
                font-weight: 500;
              }
            }
          }

          // 结果卡片容器
          .results-container {
            display: flex;
            flex-direction: column;
            gap: 12px;

            .result-card {
              background: #fff;
              border-radius: 12px;
              padding: 20px;
              transition: all 0.3s ease;
              border: 1px solid transparent;

              &:hover {
                border-color: #1890ff;
                box-shadow: 0 4px 16px rgba(24, 144, 255, 0.12);
                transform: translateY(-2px);
              }

              // 卡片头部
              .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;

                .card-header-left {
                  display: flex;
                  align-items: center;
                  gap: 12px;

                  .result-rank {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                  }

                  .type-tag {
                    font-size: 12px;
                    border-radius: 6px;
                    padding: 2px 10px;
                    border: none;
                  }
                }

                .card-header-right {
                  .score-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: linear-gradient(135deg, #fff5e6 0%, #ffe7ba 100%);
                    border-radius: 20px;
                    border: 1px solid #ffd591;

                    .score-text {
                      font-size: 13px;
                      font-weight: 600;
                      color: #d48806;
                      font-family: 'Monaco', 'Menlo', monospace;
                    }
                  }
                }
              }

              // 卡片内容
              .card-content {
                background: #fafbfc;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                border-left: 3px solid #1890ff;

                .content-text {
                  font-size: 14px;
                  color: #262626;
                  line-height: 1.8;
                  white-space: pre-wrap;
                  word-break: break-word;
                }
              }

              // 卡片底部
              .card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 12px;
                border-top: 1px solid #f0f0f0;

                .meta-info {
                  display: flex;
                  gap: 20px;

                  .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #8c8c8c;

                    .meta-label {
                      color: #8c8c8c;
                    }

                    .meta-value {
                      color: #595959;
                      font-family: 'Monaco', 'Menlo', monospace;
                      background: #f5f5f5;
                      padding: 2px 6px;
                      border-radius: 4px;
                    }
                  }
                }
              }

              // 元数据面板
              .metadata-panel {
                margin-top: 16px;
                background: #f6f8fa;
                border: 1px solid #e1e4e8;
                border-radius: 8px;
                overflow: hidden;

                .metadata-header {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 12px 16px;
                  background: #fff;
                  border-bottom: 1px solid #e1e4e8;
                  font-size: 13px;
                  font-weight: 600;
                  color: #262626;
                }

                .metadata-content {
                  margin: 0;
                  padding: 16px;
                  font-size: 12px;
                  color: #24292e;
                  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                  overflow-x: auto;
                  background: #f6f8fa;
                }
              }
            }
          }

          // 调试面板
          .debug-panel {
            margin-top: 20px;

            :deep(.ant-collapse) {
              background: #fff;
              border: 1px solid #e8e8e8;
              border-radius: 10px;

              .ant-collapse-item {
                border-bottom: none;
              }

              .collapse-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #595959;
              }

              .debug-content {
                margin: 0;
                padding: 16px;
                font-size: 12px;
                color: #24292e;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                background: #f6f8fa;
                border-radius: 6px;
                max-height: 400px;
                overflow: auto;
              }
            }
          }
        }

        // 空状态
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 60px 20px;

          .empty-icon {
            margin-bottom: 24px;
            opacity: 0.6;
          }

          .empty-title {
            font-size: 18px;
            font-weight: 600;
            color: #262626;
            margin-bottom: 8px;
          }

          .empty-desc {
            font-size: 14px;
            color: #8c8c8c;
            text-align: center;
            max-width: 400px;
            line-height: 1.6;
          }
        }
      }
    }
  }
</style>
