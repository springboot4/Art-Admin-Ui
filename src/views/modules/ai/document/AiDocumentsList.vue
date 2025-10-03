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
        <vxe-column fixed="right" title="操作" width="200">
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
      >
        <GraphViewer :graph-data="graphData" />
      </BasicModal>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { defineComponent, nextTick, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { VxeTableInstance, VxeToolbarInstance } from 'vxe-table'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, graphInfo, page } from '/@/api/ai/document/AiDocumentIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import AiDocumentsEdit from '/@/views/modules/ai/document/AiDocumentsEdit.vue'
  import { PageWrapper } from '/@/components/Page'
  import GraphViewer from '/@/components/Graph/GraphViewer.vue'
  import { BasicModal, useModal } from '/@/components/Modal'

  const [registerModal, { openModal }] = useModal()
  const graphData = ref()

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

  defineComponent({
    name: 'AiDocumentsList',
  })
</script>

<style lang="less" scoped></style>
