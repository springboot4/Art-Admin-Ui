<template>
  <div class="node-palette">
    <div class="palette-header">
      <div class="palette-title">
        <span class="title-text">节点组件</span>
        <span class="node-count">{{ totalNodeCount }}</span>
      </div>
      <a-input-search
        v-model:value="searchTerm"
        placeholder="搜索节点..."
        size="small"
        class="search-input"
        allow-clear
      />
    </div>

    <div class="palette-content">
      <a-collapse v-model:activeKey="activeKeys" ghost size="small">
        <a-collapse-panel
          v-for="category in filteredCategories"
          :key="category.key"
          class="category-panel"
        >
          <template #header>
            <div class="category-header">
              <span class="category-name">{{ category.name }}</span>
              <a-badge
                :count="category.nodes.length"
                :number-style="{ backgroundColor: '#f0f0f0', color: '#666' }"
              />
            </div>
          </template>

          <div class="category-nodes">
            <div
              v-for="nodeType in category.nodes"
              :key="nodeType.type"
              class="palette-node"
              :draggable="true"
              @dragstart="onDragStart($event, nodeType)"
              @click="onNodeClick(nodeType)"
            >
              <div class="node-content">
                <div class="node-header">
                  <span class="node-icon">{{ nodeType.icon }}</span>
                  <div class="node-title">{{ nodeType.label }}</div>
                </div>
                <div class="node-description">{{ nodeType.description }}</div>
                <div v-if="nodeType.category" class="node-category">
                  <a-tag size="small" :color="getCategoryColor(nodeType.category)">
                    {{ getCategoryLabel(nodeType.category) }}
                  </a-tag>
                </div>
              </div>

              <!-- 节点预览提示 -->
              <div class="node-preview" v-if="hoveredNode === nodeType.type">
                <div class="preview-header">
                  <span class="preview-icon">{{ nodeType.icon }}</span>
                  <span class="preview-title">{{ nodeType.label }}</span>
                </div>
                <div class="preview-description">{{ nodeType.description }}</div>
                <div class="preview-config" v-if="nodeType.configSchema.length > 0">
                  <div class="config-title">主要配置：</div>
                  <ul class="config-list">
                    <li v-for="field in nodeType.configSchema.slice(0, 3)" :key="field.key">
                      {{ field.label }}
                      <span v-if="field.required" class="required">*</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>

      <!-- 空状态 -->
      <div v-if="filteredCategories.length === 0" class="empty-state">
        <a-empty description="未找到匹配的节点" size="small">
          <template #image>
            <search-outlined style="font-size: 24px; color: #ccc" />
          </template>
        </a-empty>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="palette-footer">
      <a-space size="small">
        <a-tooltip title="收起所有分类">
          <a-button size="small" type="text" @click="collapseAll">
            <template #icon><minus-square-outlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="展开所有分类">
          <a-button size="small" type="text" @click="expandAll">
            <template #icon><plus-square-outlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="刷新节点列表">
          <a-button size="small" type="text" @click="refreshNodes">
            <template #icon><reload-outlined /></template>
          </a-button>
        </a-tooltip>
      </a-space>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import {
    Collapse,
    CollapsePanel,
    Input,
    Badge,
    Tag,
    Empty,
    Space,
    Button,
    Tooltip,
    message,
  } from 'ant-design-vue'
  import {
    SearchOutlined,
    MinusSquareOutlined,
    PlusSquareOutlined,
    ReloadOutlined,
  } from '@ant-design/icons-vue'
  import { nodeTypeConfigs, NODE_CATEGORIES, getCategoryLabel } from '../../types/nodeTypes'
  import type { NodeType } from '../../types/workflow'

  const ACollapse = Collapse
  const ACollapsePanel = CollapsePanel
  const AInputSearch = Input.Search
  const ABadge = Badge
  const ATag = Tag
  const AEmpty = Empty
  const ASpace = Space
  const AButton = Button
  const ATooltip = Tooltip

  const searchTerm = ref('')
  const activeKeys = ref(['trigger', 'llm', 'knowledge', 'logic', 'output', 'transform', 'api'])
  const hoveredNode = ref<string | null>(null)

  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    if (event.dataTransfer) {
      const dragData = {
        type: nodeType.type,
        label: nodeType.label,
        data: {
          type: nodeType.type,
          icon: nodeType.icon,
          description: nodeType.description,
          config: nodeType.defaultConfig,
        },
      }
      event.dataTransfer.setData('application/vueflow', JSON.stringify(dragData))
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  const onNodeClick = (nodeType: NodeType) => {
    message.info(`点击了 ${nodeType.label} 节点，拖拽到画布中添加`)
  }

  const categories = computed(() =>
    [
      {
        key: 'trigger',
        name: '触发器',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.TRIGGER),
      },
      {
        key: 'llm',
        name: '大模型',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.LLM),
      },
      {
        key: 'knowledge',
        name: '知识库',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.KNOWLEDGE),
      },
      {
        key: 'transform',
        name: '数据转换',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.TRANSFORM),
      },
      {
        key: 'api',
        name: 'API调用',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.API),
      },
      {
        key: 'logic',
        name: '逻辑处理',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.LOGIC),
      },
      {
        key: 'output',
        name: '输出',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.OUTPUT),
      },
      {
        key: 'custom',
        name: '自定义',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.CUSTOM),
      },
    ].filter((category) => category.nodes.length > 0),
  )

  const filteredCategories = computed(() => {
    if (!searchTerm.value) return categories.value

    return categories.value
      .map((category) => ({
        ...category,
        nodes: category.nodes.filter(
          (node) =>
            node.label.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
            node.description.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
            node.type.toLowerCase().includes(searchTerm.value.toLowerCase()),
        ),
      }))
      .filter((category) => category.nodes.length > 0)
  })

  const totalNodeCount = computed(() => {
    return nodeTypeConfigs.length
  })

  const getCategoryColor = (category: string): string => {
    const colors = {
      [NODE_CATEGORIES.TRIGGER]: 'green',
      [NODE_CATEGORIES.LLM]: 'blue',
      [NODE_CATEGORIES.KNOWLEDGE]: 'purple',
      [NODE_CATEGORIES.TRANSFORM]: 'orange',
      [NODE_CATEGORIES.API]: 'cyan',
      [NODE_CATEGORIES.LOGIC]: 'geekblue',
      [NODE_CATEGORIES.OUTPUT]: 'red',
      [NODE_CATEGORIES.CUSTOM]: 'volcano',
    }
    return colors[category] || 'default'
  }

  const collapseAll = () => {
    activeKeys.value = []
  }

  const expandAll = () => {
    activeKeys.value = categories.value.map((cat) => cat.key)
  }

  const refreshNodes = () => {
    message.success('节点列表已刷新')
    // 这里可以添加重新加载节点配置的逻辑
  }

  // 鼠标悬停事件
  const handleNodeMouseEnter = (nodeType: string) => {
    hoveredNode.value = nodeType
  }

  const handleNodeMouseLeave = () => {
    hoveredNode.value = null
  }

  onMounted(() => {
    // 为所有节点添加鼠标事件监听
    const nodeElements = document.querySelectorAll('.palette-node')
    nodeElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const nodeType = el.getAttribute('data-node-type')
        if (nodeType) handleNodeMouseEnter(nodeType)
      })
      el.addEventListener('mouseleave', handleNodeMouseLeave)
    })
  })

  onUnmounted(() => {
    // 清理事件监听
    const nodeElements = document.querySelectorAll('.palette-node')
    nodeElements.forEach((el) => {
      el.removeEventListener('mouseenter', handleNodeMouseEnter)
      el.removeEventListener('mouseleave', handleNodeMouseLeave)
    })
  })
</script>

<style lang="less" scoped>
  .node-palette {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    width: 240px;
    max-height: calc(100vh - 100px);
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .palette-header {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      background: #fafbfc;
      flex-shrink: 0;

      .palette-title {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        letter-spacing: -0.01em;

        .title-text {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .node-count {
          font-size: 11px;
          color: #9ca3af;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 500;
        }
      }

      .search-input {
        width: 100%;

        :deep(.ant-input) {
          font-size: 12px;
          border-radius: 6px;
          border-color: #e5e7eb;

          &:hover {
            border-color: #d1d5db;
          }

          &:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
        }

        :deep(.ant-input-search-button) {
          border-radius: 0 6px 6px 0;
        }
      }
    }

    .palette-content {
      padding: 8px;
      overflow-y: auto;
      flex: 1;
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f9fafb;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f9fafb;
      }

      &::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;

        &:hover {
          background: #9ca3af;
        }
      }
    }

    .category-panel {
      margin-bottom: 6px;

      :deep(.ant-collapse-header) {
        padding: 8px 10px !important;
        font-weight: 600;
        font-size: 12px;
        color: #374151;
        background: transparent;
        border-bottom: none;
      }

      :deep(.ant-collapse-content-box) {
        padding: 6px 0 !important;
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        .category-name {
          font-size: 12px;
        }

        :deep(.ant-badge) {
          .ant-badge-count {
            background: #f3f4f6;
            color: #6b7280;
            font-size: 10px;
            height: 18px;
            line-height: 18px;
            padding: 0 6px;
            border-radius: 9px;
            font-weight: 500;
            box-shadow: none;
          }
        }
      }

      .category-nodes {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }

    .palette-node {
      padding: 8px;
      border-radius: 6px;
      background-color: #ffffff;
      cursor: grab;
      border: 1px solid #e5e7eb;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 6px;

      &:hover {
        background-color: #f9fafb;
        border-color: #3b82f6;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      &:active {
        cursor: grabbing;
        transform: scale(0.98);
      }

      .node-content {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .node-header {
          display: flex;
          align-items: center;
          gap: 6px;

          .node-icon {
            font-size: 16px;
            line-height: 1;
            flex-shrink: 0;
          }

          .node-title {
            font-size: 12px;
            font-weight: 500;
            color: #111827;
            line-height: 1.3;
            flex: 1;
          }
        }

        .node-description {
          font-size: 11px;
          color: #9ca3af;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .node-category {
          display: flex;
          gap: 4px;

          :deep(.ant-tag) {
            font-size: 10px;
            padding: 1px 5px;
            margin: 0;
            border-radius: 3px;
            line-height: 16px;
          }
        }
      }

      .node-preview {
        margin-top: 6px;
        padding: 8px;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background-color: #f8f9fa;
        font-size: 11px;
        color: #6b7280;

        .preview-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;

          .preview-icon {
            font-size: 14px;
            line-height: 1;
            flex-shrink: 0;
          }

          .preview-title {
            font-size: 11px;
            font-weight: 600;
            color: #374151;
          }
        }

        .preview-description {
          margin-bottom: 6px;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          font-size: 10px;
        }

        .preview-config {
          .config-title {
            font-size: 10px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .config-list {
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 10px;

            li {
              padding: 2px 0;
              color: #6b7280;
            }

            .required {
              color: #ef4444;
              font-size: 10px;
              margin-left: 2px;
            }
          }
        }
      }
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 32px 16px;
      text-align: center;

      :deep(.ant-empty) {
        .ant-empty-description {
          font-size: 12px;
          color: #9ca3af;
        }
      }
    }

    .palette-footer {
      padding: 8px;
      border-top: 1px solid #f3f4f6;
      background: #fafbfc;
      flex-shrink: 0;

      :deep(.ant-space) {
        width: 100%;
        justify-content: center;
      }

      :deep(.ant-btn) {
        color: #6b7280;
        font-size: 14px;
        padding: 0 6px;

        &:hover {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.08);
        }
      }
    }
  }
</style>
