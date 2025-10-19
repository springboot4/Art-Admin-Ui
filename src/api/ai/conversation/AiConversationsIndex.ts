import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import {
  AiConversationsDTO,
  ConversationCreateDTO,
  ConversationQueryDTO,
  ConversationUpdateNameDTO,
} from './AiConversationsTypes'

/**
 * 创建会话
 */
export function add(data: ConversationCreateDTO) {
  return defHttp.post<ConversationCreateDTO>({
    url: 'ai/ai/conversation/create',
    data,
  })
}

/**
 * 分页
 */
export function page(params: ConversationQueryDTO) {
  return defHttp.get<PageResult<AiConversationsDTO>>({
    url: 'ai/ai/conversation/page',
    params,
  })
}

/**
 * 更新会话名称
 */
export function updateName(data: ConversationUpdateNameDTO) {
  return defHttp.post({
    url: 'ai/ai/conversation/name',
    data,
  })
}

/**
 * 删除
 */
export function del(conversationId) {
  return defHttp.delete<AiConversationsDTO>({
    url: `ai/ai/conversation/delete/${conversationId}`,
  })
}
