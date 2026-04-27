import http from '@/axios/index.js';

export function subAdminList(params) {
    return http.get('/subAdmin/list', { params: { ...params } })
}

export function subAdminCandidateList(params) {
    return http.get('/subAdmin/candidateList', { params: { ...params } })
}

export function subAdminAdd(params) {
    return http.post('/subAdmin/add', params)
}

export function subAdminSetStatus(params) {
    return http.put('/subAdmin/setStatus', params)
}

export function subAdminSetRemark(params) {
    return http.put('/subAdmin/setRemark', params)
}

export function subAdminDelete(subAdminId) {
    return http.delete('/subAdmin/delete', { params: { subAdminId } })
}
