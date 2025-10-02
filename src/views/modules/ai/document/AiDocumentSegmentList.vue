<template>
  <div>
    <div class="m-3 p-3 bg-white">
      <!--搜索表单-->
      <vxe-form>
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
        <!--        <template #buttons>-->
        <!--          <a-button pre-icon="lucide:folder-plus" type="primary" @click="add">新建</a-button>-->
        <!--        </template>-->
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
        <vxe-column field="segment" title="分段内容" />
        <vxe-column field="createBy" title="创建人" />
        <vxe-column field="createTime" title="创建时间" />
        <vxe-column field="segmentType" title="分块类型" />
        <vxe-column fixed="right" title="操作" width="200">
          <template #default="{ row }">
            <span>
              <a href="javascript:" @click="show(row)">查看</a>
            </span>
            <!--            <a-divider type="vertical" />-->
            <!--            <span>-->
            <!--              <a href="javascript:" @click="edit(row)">编辑</a>-->
            <!--            </span>-->
            <!--            <a-divider type="vertical" />-->
            <!--            <a-popconfirm cancelText="否" okText="是" title="是否删除" @confirm="remove(row)">-->
            <!--              <a href="javascript:" style="color: red">删除</a>-->
            <!--            </a-popconfirm>-->
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
      <AiDocumentSegmentEdit ref="aiDocumentSegmentEdit" @ok="queryPage" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { defineComponent, onMounted, ref } from 'vue'
  import { VxeTableInstance, VxeToolbarInstance } from 'vxe-table'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, page } from '/@/api/ai/document/AiDocumentSegmentIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import AiDocumentSegmentEdit from './AiDocumentSegmentEdit.vue'
  import { useRoute } from 'vue-router'

  const { handleTableChange, pageQueryResHandel, resetQuery, pagination, model, loading } =
    useTablePage(queryPage)
  const { createMessage } = useMessage()
  const xTable = ref<VxeTableInstance>()
  const xToolbar = ref<VxeToolbarInstance>()
  const aiDocumentSegmentEdit = ref()

  const route = useRoute()
  const datasetId = ref(route.query.datasetId)
  const documentId = ref(route.query.documentId)

  onMounted(() => {
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
    if (!datasetId.value || !documentId.value) {
      createMessage.error('缺少知识库ID或文档ID，无法查询分段列表')
      return
    }

    loading.value = true
    page({
      datasetId: datasetId.value,
      documentId: documentId.value,
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
    aiDocumentSegmentEdit.value?.init(null, FormOperationType.ADD)
  }

  /**
   * 查看
   */
  function show(item) {
    aiDocumentSegmentEdit.value?.init(item.id, FormOperationType.SHOW)
  }

  /**
   * 编辑
   */
  function edit(item) {
    aiDocumentSegmentEdit.value?.init(item.id, FormOperationType.EDIT)
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
    name: 'AiDocumentSegmentList',
  })
</script>

<style lang="less" scoped></style>
