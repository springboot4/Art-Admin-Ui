import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiQaPairsDTO } from './AiQaPairsTypes'
import { AiQaSimilarQuestionsDTO } from './AiQaSimilarQuestionsTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiQaPairsDTO>>({
    url: '/ai/ai/qa/pairs/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiQaPairsDTO>({
    url: '/ai/ai/qa/pairs/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiQaPairsDTO) {
  return defHttp.post<AiQaPairsDTO>({
    url: '/ai/ai/qa/pairs/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiQaPairsDTO) {
  return defHttp.post<AiQaPairsDTO>({
    url: '/ai/ai/qa/pairs/add',
    data,
  })
}

/**
 * 启用/禁用QA对
 */
export function toggleEnabled(data: AiQaPairsDTO) {
  return defHttp.post<AiQaPairsDTO>({
    url: '/ai/ai/qa/pairs/toggleEnabled',
    data,
  })
}

/**
 * 添加相似问
 */
export function similarQuestionAdd(data: AiQaSimilarQuestionsDTO) {
  return defHttp.post<AiQaPairsDTO>({
    url: '/ai/ai/qa/pairs/similarQuestion/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiQaPairsDTO>({
    url: `/ai/ai/qa/pairs/delete?id=${id}`,
  })
}

/**
 * 删除相似问
 */
export function delSimilarQuestion(id) {
  return defHttp.delete<AiQaPairsDTO>({
    url: `/ai/ai/qa/pairs/similarQuestion/delete?id=${id}`,
  })
}

/**
 * 获取qa下相似问列表
 */
export function getSimilarQuestion(qaPairId) {
  return defHttp.get<AiQaPairsDTO>({
    url: '/ai/ai/qa/pairs/similarQuestion/list',
    params: { qaPairId },
  })
}
