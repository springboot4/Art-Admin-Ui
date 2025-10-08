<template>
  <div class="document-knowledge-base">
    <!-- 知识库标题区域 -->
    <div class="knowledge-base-header">
      <div class="header-content">
        <div class="knowledge-base-info">
          <div class="kb-icon">
            <Icon :size="24" icon="ant-design:database-outlined" />
          </div>
          <div class="kb-details">
            <div class="kb-breadcrumb">
              <span>AI 中心</span>
              <Icon :size="12" icon="ant-design:right-outlined" />
              <span>知识库</span>
              <Icon :size="12" icon="ant-design:right-outlined" />
              <span class="current-kb">{{ datasetName }}</span>
            </div>
            <h1 class="kb-title">{{ datasetName }}</h1>
            <div class="kb-description">文档管理 · 向量化处理 · 知识图谱</div>
          </div>
        </div>
        <div class="header-actions">
          <a-button class="add-doc-btn" type="primary" @click="add">
            <Icon :size="16" icon="ant-design:plus-outlined" />
            上传文档
          </a-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 搜索和筛选区域 -->
      <div class="search-section">
        <div class="search-card">
          <vxe-form class="search-form">
            <vxe-form-item>
              <vxe-input
                v-model="model.queryParam.fileName"
                class="search-input"
                placeholder="输入文件名搜索文档..."
              />
            </vxe-form-item>
            <vxe-form-item>
              <a-space class="search-actions">
                <a-button class="search-btn" type="primary" @click="queryPage">
                  <Icon :size="16" icon="ant-design:search-outlined" />
                  搜索
                </a-button>
                <a-button class="reset-btn" @click="resetQuery">
                  <Icon :size="16" icon="ant-design:reload-outlined" />
                  重置
                </a-button>
              </a-space>
            </vxe-form-item>
          </vxe-form>
        </div>
      </div>

      <!-- 文档列表区域 -->
      <div class="documents-section">
        <div class="table-container">
          <vxe-table
            ref="xTable"
            :column-config="{ resizable: true }"
            :data="pagination.records"
            :loading="loading"
            class="modern-table"
            show-header-overflow
            show-overflow
            stripe
          >
            <vxe-column title="序号" type="seq" width="60" />
            <vxe-column field="fileName" min-width="200" title="文件名">
              <template #default="{ row }">
                <div class="file-info">
                  <Icon :size="16" class="file-icon" icon="ant-design:file-text-outlined" />
                  <span class="file-name">{{ row.fileName }}</span>
                </div>
              </template>
            </vxe-column>
            <vxe-column field="fileName" min-width="200" title="原始文件名">
              <template #default="{ row }">
                <div class="file-info">
                  <Icon :size="16" class="file-icon" icon="ant-design:file-text-outlined" />
                  <span class="file-name">{{ row.originalFilename }}</span>
                </div>
              </template>
            </vxe-column>
            <vxe-column field="title" min-width="200" title="文档标题" />
            <vxe-column field="embeddingStatus" title="向量化状态" width="120">
              <template #default="{ row }">
                <a-tag :color="getStatusColor(row.embeddingStatus)" class="status-tag">
                  {{ row.embeddingStatus }}
                </a-tag>
              </template>
            </vxe-column>
            <vxe-column field="embeddingStatusChangeTime" title="向量化时间" width="180" />
            <vxe-column field="graphicalStatus" title="图谱化状态" width="120">
              <template #default="{ row }">
                <a-tag :color="getStatusColor(row.graphicalStatus)" class="status-tag">
                  {{ row.graphicalStatus }}
                </a-tag>
              </template>
            </vxe-column>
            <vxe-column field="graphicalStatusChangeTime" title="图谱化时间" width="180" />
            <vxe-column field="createBy" title="创建人" width="100" />
            <vxe-column field="createTime" title="创建时间" width="180" />
            <vxe-column fixed="right" title="操作" width="350">
              <template #default="{ row }">
                <a-space class="action-buttons">
                  <a-button class="action-btn view-btn" size="small" type="link" @click="show(row)">
                    <Icon :size="10" icon="ant-design:eye-outlined" />
                    查看
                  </a-button>
                  <a-button
                    class="action-btn segment-btn"
                    size="small"
                    type="link"
                    @click="showSegment(row)"
                  >
                    <Icon :size="10" icon="ant-design:block-outlined" />
                    分块
                  </a-button>
                  <a-button
                    class="action-btn graph-btn"
                    size="small"
                    type="link"
                    @click="showGraph(row)"
                  >
                    <Icon :size="10" icon="ant-design:share-alt-outlined" />
                    图谱
                  </a-button>
                  <a-button
                    class="action-btn retry-btn"
                    size="small"
                    type="link"
                    @click="showReIndexModal(row)"
                  >
                    <Icon :size="10" icon="ant-design:reload-outlined" />
                    重试
                  </a-button>
                  <a-popconfirm
                    cancelText="取消"
                    okText="确认"
                    title="确认删除该文档吗？"
                    @confirm="remove(row)"
                  >
                    <a-button class="action-btn delete-btn" size="small" type="link">
                      <Icon :size="10" icon="ant-design:delete-outlined" />
                      删除
                    </a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </vxe-column>
          </vxe-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <vxe-pager
            :current-page="pagination.current"
            :loading="loading"
            :page-size="pagination.size"
            :total="pagination.total"
            class="modern-pagination"
            size="medium"
            @page-change="handleTableChange"
          />
        </div>
      </div>
    </div>

    <!-- 弹窗保持不变 -->
    <AiDocumentsEdit ref="aiDocumentsEdit" @ok="queryPage" />

    <BasicModal
      :height="600"
      :showOkBtn="false"
      :useWrapper="true"
      :width="1000"
      :wrapper-footer-offset="0"
      class="knowledge-graph-modal"
      title="知识图谱"
      @register="registerModal"
    >
      <GraphViewer :graph-data="graphData" class="knowledge-graph-viewer" />
    </BasicModal>

    <!-- 重新索引弹窗 -->
    <BasicModal
      :height="450"
      :useWrapper="true"
      :width="600"
      title="重新索引"
      @ok="handleReIndex"
      @register="registerReIndexModal"
    >
      <div class="reindex-modal">
        <div class="modal-content">
          <p class="modal-description"> 请选择需要重新构建的索引类型： </p>
          <div class="index-type-selection">
            <CheckboxGroup v-model:value="selectedIndexTypes" class="index-checkboxes">
              <div class="index-option">
                <Checkbox value="EMBEDDING">
                  <div class="option-content">
                    <div class="option-title">向量化索引 (EMBEDDING)</div>
                    <div class="option-description">重新构建文档的向量化索引，用于语义搜索</div>
                  </div>
                </Checkbox>
              </div>
              <div class="index-option">
                <Checkbox value="GRAPH">
                  <div class="option-content">
                    <div class="option-title">知识图谱 (GRAPH)</div>
                    <div class="option-description">重新构建文档的知识图谱，用于关系分析</div>
                  </div>
                </Checkbox>
              </div>
            </CheckboxGroup>
          </div>
          <div v-if="selectedIndexTypes.length === 0" class="warning-text">
            请至少选择一种索引类型
          </div>
        </div>
      </div>
    </BasicModal>
  </div>
</template>

<script lang="ts" setup>
  import { defineComponent, nextTick, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { VxeTableInstance, VxeToolbarInstance } from 'vxe-table'
  import { Checkbox, CheckboxGroup } from 'ant-design-vue'
  import { Icon } from '/@/components/Icon'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, graphInfo, page, reIndex } from '/@/api/ai/document/AiDocumentIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import AiDocumentsEdit from '/@/views/modules/ai/document/AiDocumentsEdit.vue'
  import GraphViewer from '/@/components/Graph/GraphViewer.vue'
  import { BasicModal, useModal } from '/@/components/Modal'

  const [registerModal, { openModal }] = useModal()
  const [registerReIndexModal, { openModal: openReIndexModal, closeModal: closeReIndexModal }] =
    useModal()
  const graphData = ref()
  const selectedIndexTypes = ref<string[]>([])
  const currentDocument = ref<any>(null)

  const { handleTableChange, pageQueryResHandel, resetQuery, pagination, model, loading } =
    useTablePage(queryPage)
  const { createMessage } = useMessage()
  const xTable = ref<VxeTableInstance>()
  const xToolbar = ref<VxeToolbarInstance>()
  const aiDocumentsEdit = ref()
  const route = useRoute()
  const datasetId = ref(route.query.datasetId)
  const datasetName = ref(route.query.datasetName)
  const router = useRouter()

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      已向量化: 'success',
      已图谱化: 'success',
      向量化中: 'processing',
      图谱化中: 'processing',
      向量化失败: 'error',
      图谱化失败: 'error',
      未向量化: 'default',
      未图谱化: 'default',
    }
    return colorMap[status] || 'default'
  }

  onMounted(() => {
    if (!datasetId.value) {
      createMessage.error('缺少知识库ID，无法查询文档列表')
      return
    }
    vxeBind()
    queryPage()
  })

  /**
   * vxe表格、工具栏绑定
   */
  function vxeBind() {
    const $table = xTable.value
    const $toolbar = xToolbar.value
    $table?.connect($toolbar as VxeToolbarInstance)
  }

  /**
   * 分页查询
   */
  function queryPage() {
    if (!datasetId.value) {
      return
    }
    loading.value = true
    page({
      datasetId: datasetId.value,
      ...model.queryParam,
      ...model.pages,
    }).then((res) => {
      pageQueryResHandel(res)
    })
  }

  /**
   * 添加
   */
  function add() {
    aiDocumentsEdit.value?.init(datasetId.value, FormOperationType.ADD)
  }

  /**
   * 查看
   */
  function show(item) {
    aiDocumentsEdit.value?.init(item.id, FormOperationType.SHOW)
  }

  function showSegment(item) {
    router.push({
      path: '/ai/document/segment',
      query: {
        datasetId: item.datasetId,
        documentId: item.id,
      },
    })
  }

  function showGraph(item) {
    graphInfo(item.id).then((res) => {
      openModal(true)
      nextTick(() => {
        setTimeout(() => {
          graphData.value = res
        }, 100)
      })
    })
  }

  /**
   * 编辑
   */
  function edit(item) {
    aiDocumentsEdit.value?.init(item.id, FormOperationType.EDIT)
  }

  /**
   * 删除
   */
  function remove(item) {
    del(item.id).then((_) => {
      createMessage.success('删除成功')
      queryPage()
    })
  }

  /**
   * 显示重新索引弹窗
   */
  function showReIndexModal(item) {
    currentDocument.value = item
    selectedIndexTypes.value = []
    openReIndexModal(true)
  }

  /**
   * 处理重新索引
   */
  function handleReIndex() {
    if (selectedIndexTypes.value.length === 0) {
      createMessage.warning('请至少选择一种索引类型')
      return
    }

    if (!currentDocument.value) {
      createMessage.error('文档信息丢失，请重试')
      return
    }

    // 将选择的索引类型用逗号连接作为indexType参数
    const indexType = selectedIndexTypes.value.join(',')

    reIndex({
      documentId: currentDocument.value.id,
      indexType: indexType,
    })
      .then(() => {
        createMessage.success('重新索引任务已提交，请稍后查看结果')
        closeReIndexModal()
        queryPage() // 刷新列表以更新状态
      })
      .catch((error) => {
        createMessage.error('重新索引失败：' + (error.message || '未知错误'))
      })
  }

  defineComponent({
    name: 'AiDocumentsList',
  })
</script>

<style lang="less" scoped>
  .document-knowledge-base {
    background: #fff;
    min-height: 100vh;
  }

  // 知识库标题区域 - 简洁内敛设计
  .knowledge-base-header {
    background: #fafbfc;
    border-bottom: 1px solid #e8e8e8;
    padding: 24px;
    margin-bottom: 16px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .knowledge-base-info {
      display: flex;
      align-items: center;
      gap: 16px;

      .kb-icon {
        width: 48px;
        height: 48px;
        background: #f0f2f5;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #595959;
        border: 1px solid #e8e8e8;
      }

      .kb-details {
        .kb-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8c8c8c;
          font-size: 12px;
          margin-bottom: 4px;

          .current-kb {
            color: #1890ff;
            font-weight: 500;
          }
        }

        .kb-title {
          color: #262626;
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .kb-description {
          color: #8c8c8c;
          font-size: 13px;
          line-height: 1.5;
        }
      }
    }

    .header-actions {
      .add-doc-btn {
        height: 36px;
        padding: 0 16px;
        border-radius: 6px;
        font-weight: 500;
      }
    }
  }

  // 主内容区域 - 移除宽度限制
  .main-content {
    padding: 0 24px;
  }

  .reindex-modal {
    .modal-content {
      padding: 24px 0;

      .modal-description {
        font-size: 15px;
        color: #595959;
        margin-bottom: 24px;
        line-height: 1.6;
        text-align: center;
        font-weight: 500;
      }

      .index-type-selection {
        .index-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 20px;

          .index-option {
            border: 2px solid #f0f0f0;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
            background: #fafbfc;
            cursor: pointer;
            position: relative;
            overflow: hidden;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #1890ff, #40a9ff);
              transform: scaleX(0);
              transition: transform 0.3s ease;
            }

            &:hover {
              border-color: #1890ff;
              background: #f6ffed;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);

              &::before {
                transform: scaleX(1);
              }
            }

            :deep(.ant-checkbox-wrapper) {
              width: 100%;
              align-items: flex-start;
              margin: 0;

              .ant-checkbox {
                margin-top: 4px;
                margin-right: 12px;

                .ant-checkbox-inner {
                  width: 18px;
                  height: 18px;
                  border-radius: 4px;
                  border-color: #d9d9d9;
                }
              }

              .option-content {
                flex: 1;
                margin-left: 0;

                .option-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: #262626;
                  margin-bottom: 8px;
                  display: flex;
                  align-items: center;
                  gap: 8px;

                  &::before {
                    content: '';
                    width: 4px;
                    height: 16px;
                    background: #1890ff;
                    border-radius: 2px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                  }
                }

                .option-description {
                  font-size: 13px;
                  color: #8c8c8c;
                  line-height: 1.5;
                  margin-left: 12px;
                }
              }
            }

            :deep(.ant-checkbox-wrapper-checked) {
              .option-content {
                .option-title {
                  color: #1890ff;

                  &::before {
                    opacity: 1;
                  }
                }
              }
            }
          }
        }
      }

      .warning-text {
        font-size: 13px;
        color: #ff7875;
        margin-top: 16px;
        text-align: center;
        padding: 8px 16px;
        background: #fff2f0;
        border: 1px solid #ffccc7;
        border-radius: 6px;
        display: inline-block;
        width: 100%;
      }
    }
  }

  // 弹窗标题样式优化
  :deep(.ant-modal-header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 24px;

    .ant-modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #262626;
    }
  }

  // 弹窗底部按钮样式优化
  :deep(.ant-modal-footer) {
    border-top: 1px solid #f0f0f0;
    padding: 16px 24px;
    text-align: right;

    .ant-btn {
      height: 36px;
      padding: 0 20px;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s ease;

      &.ant-btn-primary {
        background: #1890ff;
        border-color: #1890ff;
        box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);

        &:hover {
          background: #40a9ff;
          border-color: #40a9ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
        }
      }

      &.ant-btn-default {
        &:hover {
          border-color: #40a9ff;
          color: #40a9ff;
        }
      }
    }
  }

  // 知识图谱弹窗样式优化
  :deep(.knowledge-graph-modal) {
    .ant-modal {
      .ant-modal-content {
        .ant-modal-body {
          padding: 0;

          .knowledge-graph-viewer {
            width: 100% !important;
            height: 100% !important;
            min-height: 500px;

            > div {
              width: 100% !important;
              height: 100% !important;
              min-height: 500px !important;
            }
          }
        }
      }

      // 全屏状态下的样式
      &.ant-modal-fullscreen {
        .ant-modal-content {
          height: 100vh;
          display: flex;
          flex-direction: column;

          .ant-modal-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;

            .knowledge-graph-viewer {
              flex: 1;
              min-height: 0;
              height: auto !important;

              > div {
                height: 100% !important;
                min-height: calc(100vh - 120px) !important;
              }
            }
          }
        }
      }
    }
  }
</style>
