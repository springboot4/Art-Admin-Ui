<template>
  <div class="template-library">
    <div class="library-header">
      <a-input-search
        v-model:value="searchTerm"
        placeholder="搜索模板..."
        style="width: 300px"
        @search="onSearch"
      />
      <a-select
        v-model:value="selectedCategory"
        placeholder="选择分类"
        style="width: 150px"
        @change="onCategoryChange"
      >
        <a-select-option value="">全部分类</a-select-option>
        <a-select-option value="ai">AI助手</a-select-option>
        <a-select-option value="automation">自动化</a-select-option>
        <a-select-option value="data">数据处理</a-select-option>
        <a-select-option value="integration">系统集成</a-select-option>
      </a-select>
    </div>

    <div class="template-grid">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
        @click="selectTemplate(template)"
      >
        <div class="card-header">
          <div class="template-icon">
            {{ getCategoryIcon(template.category) }}
          </div>
          <div class="template-meta">
            <h4 class="template-name">{{ template.name }}</h4>
            <div class="template-tags">
              <a-tag
                v-for="tag in template.tags.slice(0, 2)"
                :key="tag"
                size="small"
                :color="getTagColor(tag)"
              >
                {{ tag }}
              </a-tag>
              <span v-if="template.tags.length > 2" class="more-tags">
                +{{ template.tags.length - 2 }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-content">
          <p class="template-description">{{ template.description }}</p>

          <div class="template-stats">
            <span class="stat-item">
              <nodes-outlined />
              {{ template.workflow.nodes?.length || 0 }} 节点
            </span>
            <span class="stat-item">
              <download-outlined />
              {{ template.downloads || 0 }}
            </span>
            <div class="template-rating">
              <a-rate
                :value="template.rating || 0"
                disabled
                :count="5"
                character="★"
                style="font-size: 12px"
              />
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="template-author">
            <user-outlined />
            {{ template.author || '匿名' }}
          </div>
          <div class="template-version"> v{{ template.version }} </div>
        </div>

        <div class="card-actions">
          <a-button type="primary" size="small" @click.stop="selectTemplate(template)">
            使用模板
          </a-button>
          <a-button size="small" @click.stop="previewTemplate(template)"> 预览 </a-button>
        </div>
      </div>
    </div>

    <div v-if="filteredTemplates.length === 0" class="empty-state">
      <a-empty description="未找到匹配的模板">
        <template #image>
          <inbox-outlined style="font-size: 48px; color: #ccc" />
        </template>
      </a-empty>
    </div>

    <!-- 模板预览对话框 -->
    <a-modal v-model:open="showPreview" title="模板预览" width="800px" :footer="null">
      <div v-if="previewingTemplate" class="template-preview">
        <div class="preview-header">
          <h3>{{ previewingTemplate.name }}</h3>
          <p>{{ previewingTemplate.description }}</p>

          <div class="preview-meta">
            <a-space>
              <a-tag :color="getCategoryColor(previewingTemplate.category)">
                {{ getCategoryLabel(previewingTemplate.category) }}
              </a-tag>
              <span>{{ previewingTemplate.workflow.nodes?.length || 0 }} 个节点</span>
              <span>v{{ previewingTemplate.version }}</span>
            </a-space>
          </div>
        </div>

        <div class="preview-content">
          <div class="workflow-diagram">
            <!-- 这里可以放置工作流的简化图表 -->
            <div class="diagram-placeholder">
              <deployment-unit-outlined style="font-size: 48px; color: #ccc" />
              <p>工作流结构图</p>
            </div>
          </div>

          <div class="template-details">
            <h4>包含节点：</h4>
            <div class="node-list">
              <a-tag
                v-for="node in getUniqueNodeTypes(previewingTemplate.workflow.nodes)"
                :key="node"
                class="node-tag"
              >
                {{ getNodeTypeLabel(node) }}
              </a-tag>
            </div>

            <h4>标签：</h4>
            <div class="tag-list">
              <a-tag v-for="tag in previewingTemplate.tags" :key="tag" :color="getTagColor(tag)">
                {{ tag }}
              </a-tag>
            </div>
          </div>
        </div>

        <div class="preview-footer">
          <a-space>
            <a-button @click="showPreview = false">取消</a-button>
            <a-button type="primary" @click="selectTemplate(previewingTemplate)">
              使用此模板
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import {
    InputSearch as AInputSearch,
    Select as ASelect,
    SelectOption as ASelectOption,
    Tag as ATag,
    Button as AButton,
    Empty as AEmpty,
    Modal as AModal,
    Space as ASpace,
    Rate as ARate,
    message,
  } from 'ant-design-vue'
  import {
    NodesOutlined,
    DownloadOutlined,
    UserOutlined,
    InboxOutlined,
    DeploymentUnitOutlined,
  } from '@ant-design/icons-vue'
  import type { WorkflowTemplate } from '../../types/workflow'

  const emit = defineEmits(['select', 'close'])

  const searchTerm = ref('')
  const selectedCategory = ref('')
  const showPreview = ref(false)
  const previewingTemplate = ref<WorkflowTemplate | null>(null)

  // 模拟模板数据
  const templates = ref<WorkflowTemplate[]>([
    {
      id: 'template-1',
      name: 'AI客服助手',
      description: '基于大模型的智能客服工作流，支持多轮对话和知识库检索',
      category: 'ai',
      tags: ['客服', 'AI', '对话'],
      workflow: {
        name: 'AI客服助手',
        description: '',
        nodes: [
          { id: '1', type: 'start', position: { x: 0, y: 0 }, label: '开始', data: {} },
          { id: '2', type: 'llm', position: { x: 200, y: 0 }, label: '大模型', data: {} },
          { id: '3', type: 'knowledge', position: { x: 400, y: 0 }, label: '知识检索', data: {} },
        ],
        edges: [],
        version: '1.0.0',
        status: 'draft',
        tags: ['客服', 'AI'],
      },
      author: 'AI团队',
      version: '1.2.0',
      rating: 4.5,
      downloads: 128,
    },
    {
      id: 'template-2',
      name: '数据处理流水线',
      description: '自动化数据清洗、转换和分析的完整流水线',
      category: 'data',
      tags: ['数据处理', '自动化', 'ETL'],
      workflow: {
        name: '数据处理流水线',
        description: '',
        nodes: [
          { id: '1', type: 'start', position: { x: 0, y: 0 }, label: '开始', data: {} },
          {
            id: '2',
            type: 'data-transform',
            position: { x: 200, y: 0 },
            label: '数据转换',
            data: {},
          },
          { id: '3', type: 'code', position: { x: 400, y: 0 }, label: '数据分析', data: {} },
        ],
        edges: [],
        version: '1.0.0',
        status: 'draft',
        tags: ['数据'],
      },
      author: '数据团队',
      version: '2.1.0',
      rating: 4.8,
      downloads: 89,
    },
    {
      id: 'template-3',
      name: '文档自动化处理',
      description: '批量处理文档，支持格式转换、内容提取和智能分类',
      category: 'automation',
      tags: ['文档', '自动化', 'PDF'],
      workflow: {
        name: '文档自动化处理',
        description: '',
        nodes: [
          { id: '1', type: 'start', position: { x: 0, y: 0 }, label: '开始', data: {} },
          { id: '2', type: 'document', position: { x: 200, y: 0 }, label: '文档处理', data: {} },
          { id: '3', type: 'llm', position: { x: 400, y: 0 }, label: '内容分析', data: {} },
        ],
        edges: [],
        version: '1.0.0',
        status: 'draft',
        tags: ['文档'],
      },
      author: '办公团队',
      version: '1.0.5',
      rating: 4.2,
      downloads: 67,
    },
  ])

  const filteredTemplates = computed(() => {
    return templates.value.filter((template) => {
      const matchesSearch =
        !searchTerm.value ||
        template.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.value.toLowerCase()))

      const matchesCategory =
        !selectedCategory.value || template.category === selectedCategory.value

      return matchesSearch && matchesCategory
    })
  })

  const getCategoryIcon = (category: string): string => {
    const icons = {
      ai: '🤖',
      automation: '⚙️',
      data: '📊',
      integration: '🔗',
    }
    return icons[category] || '📋'
  }

  const getCategoryColor = (category: string): string => {
    const colors = {
      ai: 'blue',
      automation: 'green',
      data: 'orange',
      integration: 'purple',
    }
    return colors[category] || 'default'
  }

  const getCategoryLabel = (category: string): string => {
    const labels = {
      ai: 'AI助手',
      automation: '自动化',
      data: '数据处理',
      integration: '系统集成',
    }
    return labels[category] || category
  }

  const getTagColor = (tag: string): string => {
    const colors = ['blue', 'green', 'orange', 'red', 'purple', 'cyan']
    const index = tag.length % colors.length
    return colors[index]
  }

  const getUniqueNodeTypes = (nodes: any[]): string[] => {
    if (!nodes) return []
    const types = [...new Set(nodes.map((node) => node.type))]
    return types
  }

  const getNodeTypeLabel = (type: string): string => {
    const labels = {
      start: '开始',
      llm: '大模型',
      knowledge: '知识检索',
      'data-transform': '数据转换',
      document: '文档处理',
      code: '代码执行',
      condition: '条件判断',
      webhook: 'Webhook',
      output: '输出',
    }
    return labels[type] || type
  }

  const onSearch = (value: string) => {
    searchTerm.value = value
  }

  const onCategoryChange = (value: string) => {
    selectedCategory.value = value
  }

  const selectTemplate = (template: WorkflowTemplate) => {
    emit('select', template)
    message.success(`已选择模板: ${template.name}`)
  }

  const previewTemplate = (template: WorkflowTemplate) => {
    previewingTemplate.value = template
    showPreview.value = true
  }
</script>

<style lang="less" scoped>
  .template-library {
    .library-header {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      align-items: center;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .template-card {
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #fff;

      &:hover {
        border-color: #1890ff;
        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
        transform: translateY(-2px);
      }

      .card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;

        .template-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 6px;
        }

        .template-meta {
          flex: 1;

          .template-name {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #262626;
          }

          .template-tags {
            display: flex;
            align-items: center;
            gap: 4px;

            .more-tags {
              font-size: 12px;
              color: #8c8c8c;
            }
          }
        }
      }

      .card-content {
        margin-bottom: 12px;

        .template-description {
          font-size: 14px;
          color: #595959;
          line-height: 1.5;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .template-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #8c8c8c;

          .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .template-rating {
            margin-left: auto;
          }
        }
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
        font-size: 12px;
        color: #8c8c8c;

        .template-author {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      .card-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 48px 0;
    }

    .template-preview {
      .preview-header {
        margin-bottom: 24px;

        h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        p {
          color: #595959;
          margin-bottom: 16px;
        }
      }

      .preview-content {
        display: flex;
        gap: 24px;
        margin-bottom: 24px;

        .workflow-diagram {
          flex: 1;
          border: 1px solid #e8e8e8;
          border-radius: 6px;
          padding: 24px;
          text-align: center;

          .diagram-placeholder {
            color: #8c8c8c;

            p {
              margin: 8px 0 0 0;
            }
          }
        }

        .template-details {
          flex: 1;

          h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
          }

          .node-list,
          .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;

            .node-tag {
              background: #f0f0f0;
              color: #666;
              border: none;
            }
          }
        }
      }

      .preview-footer {
        text-align: right;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;
      }
    }
  }
</style>
