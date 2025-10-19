import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiMessagesDTO, SendMessageDTO } from './AiMessagesTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiMessagesDTO>>({
    url: 'ai/ai/message/page',
    params,
  })
}

/**
 * 获取会话的最近N条消息
 */
export function getRecentMessages(conversationId, limit) {
  return defHttp.get<AiMessagesDTO>({
    url: `ai/ai/message/recent/${conversationId}?limit=${limit}`,
  })
}

/**
 * 发送消息
 */
export function sendMessages(data: SendMessageDTO) {
  return defHttp.post<SendMessageDTO>({
    url: 'ai/ai/message/send',
    data,
  })
}
