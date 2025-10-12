<template>
  <div class="qa-pairs-container">
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
            <div class="kb-description">预设回答</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制区域 -->
    <div class="controls-section">
      <div class="search-filter">
        <a-input-search
          v-model:value="model.queryParam.question"
          class="search-input"
          placeholder="搜索问题或答案..."
          @search="queryPage"
        />
        <a-select
          v-model:value="model.queryParam.enabled"
          allow-clear
          class="filter-select"
          placeholder="启用状态"
          @change="queryPage"
        >
          <a-select-option :value="true">已启用</a-select-option>
          <a-select-option :value="false">已禁用</a-select-option>
        </a-select>
        <a-select
          v-model:value="model.queryParam.priority"
          allow-clear
          class="filter-select"
          placeholder="优先级"
          @change="queryPage"
        >
          <a-select-option value="5">最高</a-select-option>
          <a-select-option value="4">高</a-select-option>
          <a-select-option value="3">中</a-select-option>
          <a-select-option value="2">低</a-select-option>
          <a-select-option value="1">最低</a-select-option>
        </a-select>
        <a-button @click="resetQuery">重置</a-button>
        <a-button class="add-btn" type="primary" @click="add">
          <template #icon>
            <Icon icon="ant-design:plus-outlined" />
          </template>
          新建QA对
        </a-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-section">
      <!-- 空状态 -->
      <div v-if="!loading && recordsList.length === 0" class="empty-state-container">
        <a-empty :description="false" class="empty-state">
          <template #image>
            <div class="empty-icon">
              <Icon :size="80" icon="ant-design:question-circle-outlined" />
            </div>
          </template>
          <div class="empty-content">
            <h3 class="empty-title">暂无QA对数据</h3>
            <p class="empty-description">创建您的第一个问答对，开始智能问答</p>
            <a-button size="large" type="primary" @click="add">
              <template #icon>
                <Icon icon="ant-design:plus-outlined" />
              </template>
              新建QA对
            </a-button>
          </div>
        </a-empty>
      </div>

      <!-- QA卡片网格 -->
      <div v-else-if="recordsList.length > 0" class="qa-grid">
        <div v-for="item in recordsList" :key="item.id" class="qa-card" @click="showDetail(item)">
          <!-- 卡片头部 -->
          <div class="card-header">
            <div class="header-left">
              <a-badge
                :status="item.enabled ? 'success' : 'default'"
                :text="item.enabled ? '已启用' : '已禁用'"
              />
            </div>
            <div class="header-right">
              <a-dropdown :trigger="['click']" placement="bottomRight">
                <a class="action-btn" @click.stop>
                  <Icon icon="ant-design:more-outlined" />
                </a>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="edit(item)">
                      <Icon icon="ant-design:edit-outlined" />
                      编辑
                    </a-menu-item>
                    <a-menu-item @click="toggleEnable(item)">
                      <Icon
                        :icon="
                          item.enabled
                            ? 'ant-design:stop-outlined'
                            : 'ant-design:check-circle-outlined'
                        "
                      />
                      {{ item.enabled ? '禁用' : '启用' }}
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item>
                      <a-popconfirm
                        cancel-text="取消"
                        ok-text="确定删除"
                        ok-type="danger"
                        title="确认删除此QA对？"
                        @confirm="remove(item)"
                        @click.stop
                      >
                        <span class="delete-action" @click.stop>
                          <Icon icon="ant-design:delete-outlined" />
                          删除
                        </span>
                      </a-popconfirm>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>

          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="question-section">
              <div class="question-text">{{ item.question }}</div>
            </div>
            <div class="answer-section">
              <div class="answer-text">{{ getAnswerPreview(item.answer, 80) }}</div>
            </div>
          </div>

          <!-- 卡片底部 -->
          <div class="card-footer">
            <div class="meta-tags">
              <a-tag :color="getPriorityColor(item.priority)" class="priority-tag">
                {{ getPriorityText(item.priority) }}
              </a-tag>
              <a-tag v-if="item.vectorIndexed" class="vector-tag" color="blue">
                <Icon icon="ant-design:thunderbolt-outlined" />
                已向量化
              </a-tag>
              <span class="hit-count">
                <Icon icon="ant-design:eye-outlined" />
                {{ item.hitCount || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <a-spin size="large" />
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="recordsList.length > 0" class="pagination-section">
      <a-pagination
        v-model:current="pagination.current"
        v-model:page-size="pagination.size"
        :show-size-changer="true"
        :show-total="(total) => `共 ${total} 条`"
        :total="pagination.total"
        @change="handleTableChange"
      />
    </div>

    <!-- 详情抽屉 -->
    <AiQaPairsDetail ref="detailDrawer" @refresh="queryPage" />

    <!-- 编辑表单 -->
    <AiQaPairsEdit ref="aiQaPairsEdit" @ok="queryPage" />
  </div>
</template>

<script lang="ts" setup>
  import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import useTablePage from '/@/hooks/art/useTablePage'
  import { del, page, toggleEnabled } from '/@/api/ai/qa/AiQaPairsIndex'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { useMessage } from '/@/hooks/web/useMessage'
  import { Icon } from '/@/components/Icon'
  import AiQaPairsEdit from './AiQaPairsEdit.vue'
  import AiQaPairsDetail from './AiQaPairsDetail.vue'

  const { handleTableChange, pageQueryResHandel, resetQuery, pagination, model, loading } =
    useTablePage(queryPage)
  const { createMessage } = useMessage()
  const aiQaPairsEdit = ref()
  const detailDrawer = ref()
  const route = useRoute()
  const datasetId = ref(route.query.datasetId)
  const datasetName = ref(route.query.datasetName)

  // 统计信息
  const statistics = reactive({
    enabledCount: 0,
    totalHits: 0,
    vectorizedCount: 0,
  })

  // 安全获取records列表
  const recordsList = computed(() => {
    return pagination.records || []
  })

  onMounted(() => {
    if (!datasetId.value) {
      createMessage.error('缺少知识库ID，无法查询QA列表')
      return
    }
    queryPage()
  })

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
      // 计算统计信息
      calculateStatistics()
    })
  }

  /**
   * 计算统计信息
   */
  function calculateStatistics() {
    const records = recordsList.value
    statistics.enabledCount = records.filter((r) => r.enabled === true).length
    statistics.totalHits = records.reduce((sum, r) => sum + (r.hitCount || 0), 0)
    statistics.vectorizedCount = records.filter((r) => r.vectorIndexed === true).length
  }

  /**
   * 获取答案预览
   */
  function getAnswerPreview(answer: string, maxLength = 100): string {
    if (!answer) return '暂无答案'
    return answer.length > maxLength ? answer.substring(0, maxLength) + '...' : answer
  }

  /**
   * 获取优先级颜色
   */
  function getPriorityColor(priority: string): string {
    const colorMap = {
      '5': 'red',
      '4': 'orange',
      '3': 'blue',
      '2': 'green',
      '1': 'default',
    }
    return colorMap[priority] || 'default'
  }

  /**
   * 获取优先级文本
   */
  function getPriorityText(priority: string): string {
    const textMap = {
      '5': '最高',
      '4': '高',
      '3': '中',
      '2': '低',
      '1': '最低',
    }
    return textMap[priority] || '中'
  }

  /**
   * 获取来源类型颜色
   */
  function getSourceTypeColor(sourceType: string): string {
    const colorMap = {
      manual: 'cyan',
      llm: 'purple',
      import: 'geekblue',
    }
    return colorMap[sourceType] || 'default'
  }

  /**
   * 获取来源类型文本
   */
  function getSourceTypeText(sourceType: string): string {
    const textMap = {
      manual: '手动创建',
      llm: 'AI生成',
      import: '批量导入',
    }
    return textMap[sourceType] || sourceType
  }

  /**
   * 查看详情
   */
  function showDetail(item) {
    detailDrawer.value?.show(item.id)
  }

  /**
   * 添加
   */
  function add() {
    aiQaPairsEdit.value?.init(null, FormOperationType.ADD, datasetId.value)
  }

  /**
   * 编辑
   */
  function edit(item) {
    aiQaPairsEdit.value?.init(item.id, FormOperationType.EDIT, datasetId.value)
  }

  /**
   * 切换启用状态
   */
  function toggleEnable(item) {
    toggleEnabled({ id: item.id, enabled: !item.enabled }).then(() => {
      createMessage.success(item.enabled ? '已禁用' : '已启用')
      queryPage()
    })
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
    name: 'AiQaPairsList',
  })
</script>

<style lang="less" scoped>
  .qa-pairs-container {
    min-height: 100vh;
    background: #f5f7fa;

    // 知识库标题区域
    .knowledge-base-header {
      background: #fafbfc;
      border-bottom: 1px solid #e8e8e8;
      padding: 24px 32px;
      position: sticky;
      top: 0;
      z-index: 10;

      .header-content {
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
      }
    }

    // 控制区域
    .controls-section {
      padding: 20px 32px;
      background: #fafbfc;
      border-bottom: 1px solid #e8e8e8;

      .search-filter {
        display: flex;
        align-items: center;
        gap: 12px;

        .search-input {
          width: 280px;
        }

        .filter-select {
          width: 120px;
        }

        .add-btn {
          margin-left: auto;
          height: 36px;
          padding: 0 20px;
          border-radius: 6px;
        }
      }
    }

    // 内容区域
    .content-section {
      padding: 24px 32px;
      min-height: 400px;

      // 空状态
      .empty-state-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;

        .empty-state {
          text-align: center;

          .empty-icon {
            font-size: 64px;
            color: #d9d9d9;
            margin-bottom: 24px;
          }

          .empty-content {
            .empty-title {
              font-size: 18px;
              font-weight: 500;
              color: #262626;
              margin-bottom: 8px;
            }

            .empty-description {
              font-size: 14px;
              color: #8c8c8c;
              margin-bottom: 24px;
            }
          }
        }
      }

      // QA卡片网格
      .qa-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;

        .qa-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          min-height: 200px;

          &:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transform: translateY(-2px);
          }

          // 卡片头部
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;

            .header-left {
              :deep(.ant-badge) {
                font-size: 12px;
              }
            }

            .header-right {
              .action-btn {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #9ca3af;
                background: transparent;
                transition: all 0.15s ease;
                text-decoration: none;

                &:hover {
                  background: #f3f4f6;
                  color: #6b7280;
                }
              }
            }
          }

          // 卡片内容
          .card-content {
            flex: 1;
            margin-bottom: 12px;

            .question-section {
              margin-bottom: 12px;

              .question-text {
                font-size: 15px;
                font-weight: 600;
                color: #111827;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                word-break: break-word;
              }
            }

            .answer-section {
              .answer-text {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.5;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }
            }
          }

          // 卡片底部
          .card-footer {
            border-top: 1px solid #f3f4f6;
            padding-top: 12px;

            .meta-tags {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;

              .priority-tag,
              .vector-tag {
                font-size: 11px;
                padding: 0 6px;
                height: 20px;
                line-height: 20px;
                border-radius: 4px;
                border: none;
              }

              .hit-count {
                font-size: 11px;
                color: #9ca3af;
                display: flex;
                align-items: center;
                gap: 4px;
                margin-left: auto;
              }
            }
          }
        }
      }

      // 加载状态
      .loading-state {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
      }
    }

    // 分页区域
    .pagination-section {
      padding: 24px 32px;
      display: flex;
      justify-content: flex-end;
    }

    // 下拉菜单样式
    :deep(.ant-dropdown-menu) {
      .delete-action {
        color: #ff4d4f;
      }
    }
  }

  // 响应式设计
  @media (max-width: 992px) {
    .qa-pairs-container {
      .controls-section,
      .content-section,
      .pagination-section {
        padding-left: 20px;
        padding-right: 20px;
      }

      .controls-section .search-filter {
        flex-wrap: wrap;

        .search-input {
          flex: 1;
          min-width: 200px;
        }
      }

      .content-section .qa-grid {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      }
    }
  }

  @media (max-width: 768px) {
    .qa-pairs-container {
      .controls-section,
      .content-section,
      .pagination-section {
        padding-left: 16px;
        padding-right: 16px;
      }

      .content-section .qa-grid {
        grid-template-columns: 1fr;
      }

      .pagination-section {
        justify-content: center;
      }
    }
  }
</style>
