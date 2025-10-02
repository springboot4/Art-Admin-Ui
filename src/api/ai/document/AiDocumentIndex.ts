import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiDocumentsDTO } from './AiDocumentTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiDocumentsDTO>>({
    url: '/ai/ai/document/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiDocumentsDTO>({
    url: '/ai/ai/document/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiDocumentsDTO) {
  return defHttp.post<AiDocumentsDTO>({
    url: '/ai/ai/document/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiDocumentsDTO) {
  return defHttp.post<AiDocumentsDTO>({
    url: '/ai/ai/document/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiDocumentsDTO>({
    url: `/ai/ai/document/delete?id=${id}`,
  })
}
