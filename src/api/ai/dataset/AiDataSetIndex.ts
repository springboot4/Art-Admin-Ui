import { defHttp } from '/@/utils/http/axios'
import { PageResult } from '/#/axios'
import { AiDatasetsDocument, AiDatasetsDTO } from './AiDataSetTypes'

/**
 * 上传文档并索引
 */
export function document(data: AiDatasetsDocument) {
  return defHttp.post<AiDatasetsDocument>({
    url: '/ai/ai/dataset/document',
    data,
  })
}

/**
 * 分页
 */
export function page(params) {
  return defHttp.get<PageResult<AiDatasetsDTO>>({
    url: '/ai/ai/dataset/page',
    params,
  })
}

/**
 * 获取单条
 */
export function get(id) {
  return defHttp.get<AiDatasetsDTO>({
    url: '/ai/ai/dataset/findById',
    params: { id },
  })
}

/**
 * 修改
 */
export function update(data: AiDatasetsDTO) {
  return defHttp.post<AiDatasetsDTO>({
    url: '/ai/ai/dataset/update',
    data,
  })
}

/**
 * 保存
 */
export function add(data: AiDatasetsDTO) {
  return defHttp.post<AiDatasetsDTO>({
    url: '/ai/ai/dataset/add',
    data,
  })
}

/**
 * 删除
 */
export function del(id) {
  return defHttp.delete<AiDatasetsDTO>({
    url: `/ai/ai/dataset/delete?id=${id}`,
  })
}
