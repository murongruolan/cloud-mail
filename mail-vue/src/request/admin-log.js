import http from '@/axios/index.js';

export function adminLogList(params) {
    return http.get('/adminLog/list', { params: { ...params } })
}
