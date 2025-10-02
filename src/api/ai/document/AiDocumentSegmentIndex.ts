import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiDocumentSegmentDTO } from './AiDocumentSegmentTypes'

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiDocumentSegmentDTO>>({
    url: '/ai/ai/document/segment/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiDocumentSegmentDTO>({
    url: '/ai/ai/document/segment/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiDocumentSegmentDTO) {
  return defHttp.post<AiDocumentSegmentDTO>({
    url: '/ai/ai/document/segment/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiDocumentSegmentDTO) {
  return defHttp.post<AiDocumentSegmentDTO>({
    url: '/ai/ai/document/segment/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiDocumentSegmentDTO>({
    url: `/ai/ai/document/segment/delete?id=${id}`,
  })
}
