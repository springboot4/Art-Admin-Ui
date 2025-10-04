<template>
  <PageWrapper :title="`知识库：${datasetName}`">
    <div class="m-3 p-3 bg-white">
      <!--搜索表单-->
      <vxe-form>
        <vxe-form-item title="文件名">
          <vxe-input v-model="model.queryParam.fileName" placeholder="请输入" />
        </vxe-form-item>
        <vxe-form-item>
          <a-space>
            <a-button pre-icon="ant-design:search-outlined" type="primary" @click="queryPage">
              查询
            </a-button>
            <a-button ghost pre-icon="iconamoon:restart-bold" type="primary" @click="resetQuery"
              >重置
            </a-button>
          </a-space>
        </vxe-form-item>
      </vxe-form>

      <!--表格工具栏-->
      <vxe-toolbar ref="xToolbar" :refresh="{ query: queryPage }" custom export print>
        <template #buttons>
          <a-button pre-icon="lucide:folder-plus" type="primary" @click="add">新建</a-button>
        </template>
      </vxe-toolbar>

      <!--表格-->
      <vxe-table
        ref="xTable"
        :column-config="{ resizable: true }"
        :data="pagination.records"
        :export-config="{}"
        :loading="loading"
        :print-config="{}"
        align="center"
        border
        show-header-overflow
        show-overflow
      >
        <vxe-column title="序号" type="seq" width="60" />
        <vxe-column field="fileName" title="文件名" />
        <vxe-column field="title" title="文档标题" />
        <vxe-column field="embeddingStatus" title="向量化状态" />
        <vxe-column field="embeddingStatusChangeTime" title="向量化状态改变时间" />
        <vxe-column field="graphicalStatus" title="图谱化状态" />
        <vxe-column field="graphicalStatusChangeTime" title="图谱状态改变时间" />
        <vxe-column field="createBy" title="创建人" />
        <vxe-column field="createTime" title="创建时间" />
        <vxe-column fixed="right" title="操作" width="250">
          <template #default="{ row }">
            <span>
              <a href="javascript:" @click="show(row)">查看</a>
            </span>
            <a-divider type="vertical" />
            <span>
              <a href="javascript:" @click="showSegment(row)">分块</a>
            </span>
            <a-divider type="vertical" />
            <span>
              <a href="javascript:" @click="showGraph(row)">图谱</a>
            </span>
            <a-divider type="vertical" />
            <span>
              <a href="javascript:" @click="showReIndexModal(row)">重试</a>
            </span>
            <a-divider type="vertical" />
            <a-popconfirm cancelText="否" okText="是" title="是否删除" @confirm="remove(row)">
              <a href="javascript:" style="color: red">删除</a>
            </a-popconfirm>
          </template>
        </vxe-column>
      </vxe-table>

      <!--表格分页-->
      <vxe-pager
        :current-page="pagination.current"
        :loading="loading"
        :page-size="pagination.size"
        :total="pagination.total"
        size="medium"
        @page-change="handleTableChange"
      />

      <!--编辑表单-->
      <AiDocumentsEdit ref="aiDocumentsEdit" @ok="queryPage" />

      <BasicModal
        :height="600"
        :showOkBtn="false"
        :useWrapper="true"
        :width="1000"
        :wrapper-footer-offset="0"
        title="知识图谱"
        @register="registerModal"
        class="knowledge-graph-modal"
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
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { defineComponent, nextTick, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { VxeTableInstance, VxeToolbarInstance } from 'vxe-table'
  import { Checkbox, CheckboxGroup } from 'ant-design-vue'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, graphInfo, page, reIndex } from '/@/api/ai/document/AiDocumentIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import AiDocumentsEdit from '/@/views/modules/ai/document/AiDocumentsEdit.vue'
  import { PageWrapper } from '/@/components/Page'
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
