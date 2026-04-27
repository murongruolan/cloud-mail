<template>
  <div class="sub-admin-box">
    <div class="header-actions">
      <Icon class="icon" icon="ion:add-outline" width="23" height="23" @click="openAdd"/>
      <div class="search">
        <el-input v-model="params.email" class="search-input" :placeholder="$t('searchByEmail')"/>
      </div>
      <el-select v-model="params.status" class="status-select" :style="`width: ${locale === 'en' ? 95 : 80 }px`">
        <el-option :key="-1" :label="$t('all')" :value="-1"/>
        <el-option :key="0" :label="$t('active')" :value="0"/>
        <el-option :key="1" :label="$t('banned')" :value="1"/>
      </el-select>
      <Icon class="icon" icon="iconoir:search" @click="search" width="20" height="20"/>
      <Icon class="icon" icon="ion:reload" width="18" height="18" @click="refresh"/>
    </div>

    <el-scrollbar class="scrollbar">
      <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'" :style="first ? 'background: transparent' : ''">
        <loading/>
      </div>
      <el-table :data="list" style="width: 100%" :empty-text="first ? '' : null">
        <el-table-column :label="$t('tabEmailAddress')" min-width="220">
          <template #default="{ row }">
            <div class="email-row">{{ row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('tabRegisteredAt')" min-width="160">
          <template #default="{ row }">
            {{ tzDayjs(row.createTime).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('tabStatus')" min-width="70">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="primary">{{ $t('active') }}</el-tag>
            <el-tag v-else type="danger">{{ $t('banned') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('remark')" min-width="180">
          <template #default="{ row }">
            <div class="remark">{{ row.remark || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('tabSetting')" width="220" fixed="right">
          <template #default="{ row }">
            <div class="setting-actions">
              <el-button size="small" type="primary" plain @click="openRemark(row)">{{ $t('remark') }}</el-button>
              <el-button size="small" type="warning" plain @click="toggleStatus(row)">
                {{ row.status === 0 ? $t('btnBan') : $t('enable') }}
              </el-button>
              <el-button size="small" type="danger" plain @click="remove(row)">{{ $t('delete') }}</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination" v-if="total > 10">
        <el-pagination
            :current-page="params.num"
            :page-size="params.size"
            :page-sizes="[10, 15, 20, 30, 50]"
            background
            layout="prev, pager, next, sizes, total"
            :total="total"
            @size-change="sizeChange"
            @current-change="numChange"
        />
      </div>
    </el-scrollbar>

    <el-dialog v-model="addShow" :title="$t('addSubAdmin')" class="candidate-dialog" @closed="resetCandidateDialog">
      <div class="header-actions candidate-actions">
        <div class="search">
          <el-input v-model="candidateParams.email" class="search-input" :placeholder="$t('searchByEmail')"/>
        </div>
        <el-select v-model="candidateParams.status" class="status-select" :style="`width: ${locale === 'en' ? 95 : 80 }px`">
          <el-option :key="-1" :label="$t('all')" :value="-1"/>
          <el-option :key="0" :label="$t('active')" :value="0"/>
          <el-option :key="1" :label="$t('banned')" :value="1"/>
        </el-select>
        <Icon class="icon" icon="iconoir:search" @click="loadCandidates(true)" width="20" height="20"/>
        <Icon class="icon" icon="ion:reload" width="18" height="18" @click="resetCandidateFilters"/>
      </div>
      <el-table
          :data="candidateList"
          height="360"
          highlight-current-row
          @current-change="row => selectedCandidate = row"
          v-loading="candidateLoading"
          :empty-text="candidateLoading ? '' : null"
      >
        <el-table-column :label="$t('tabEmailAddress')" min-width="220">
          <template #default="{ row }">
            <div class="email-row">{{ row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('tabStatus')" min-width="70">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="primary">{{ $t('active') }}</el-tag>
            <el-tag v-else type="danger">{{ $t('banned') }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination candidate-pagination" v-if="candidateTotal > 10">
        <el-pagination
            :current-page="candidateParams.num"
            :page-size="candidateParams.size"
            background
            layout="prev, pager, next"
            :total="candidateTotal"
            @current-change="candidateNumChange"
        />
      </div>
      <div class="selected-user">
        <span>{{ $t('selectUser') }}:</span>
        <span>{{ selectedCandidate?.email || '-' }}</span>
      </div>
      <el-input v-model="addForm.remark" type="textarea" :rows="4" :maxlength="100" :placeholder="$t('remark')" show-word-limit/>
      <el-button class="btn" type="primary" :loading="addLoading" @click="submitAdd">{{ $t('add') }}</el-button>
    </el-dialog>

    <el-dialog v-model="remarkShow" :title="$t('changeRemark')" @closed="resetRemarkForm">
      <div class="container">
        <el-input v-model="remarkForm.remark" type="textarea" :rows="4" :maxlength="100" :placeholder="$t('remark')" show-word-limit/>
        <el-button class="btn" type="primary" :loading="settingLoading" @click="saveRemark">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { defineOptions, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import loading from '@/components/loading/index.vue'
import { useI18n } from 'vue-i18n'
import { tzDayjs } from '@/utils/day.js'
import {
  subAdminAdd,
  subAdminCandidateList,
  subAdminDelete,
  subAdminList,
  subAdminSetRemark,
  subAdminSetStatus
} from '@/request/sub-admin.js'

defineOptions({
  name: 'sub-admin'
})

const { t, locale } = useI18n()

const list = ref([])
const total = ref(0)
const tableLoading = ref(true)
const first = ref(true)
const addShow = ref(false)
const addLoading = ref(false)
const candidateLoading = ref(false)
const candidateList = ref([])
const candidateTotal = ref(0)
const selectedCandidate = ref(null)
const remarkShow = ref(false)
const settingLoading = ref(false)
const currentRow = ref(null)

const params = reactive({
  email: '',
  status: -1,
  num: 1,
  size: 15
})

const candidateParams = reactive({
  email: '',
  status: -1,
  num: 1,
  size: 10
})

const addForm = reactive({
  remark: ''
})

const remarkForm = reactive({
  subAdminId: 0,
  remark: ''
})

getList()

function getList(loadingFlag = true) {
  tableLoading.value = loadingFlag
  subAdminList(params).then(({ list: rows, total: count }) => {
    list.value = rows
    total.value = count
  }).finally(() => {
    tableLoading.value = false
    setTimeout(() => {
      first.value = false
    }, 200)
  })
}

function search() {
  params.num = 1
  getList()
}

function refresh() {
  params.email = ''
  params.status = -1
  params.num = 1
  getList()
}

function sizeChange(size) {
  params.size = size
  getList()
}

function numChange(num) {
  params.num = num
  getList()
}

function openAdd() {
  addShow.value = true
  loadCandidates(true)
}

function loadCandidates(loadingFlag = false) {
  candidateLoading.value = loadingFlag
  subAdminCandidateList(candidateParams).then(({ list: rows, total: count }) => {
    candidateList.value = rows
    candidateTotal.value = count
    if (rows.length === 0) {
      selectedCandidate.value = null
    }
  }).finally(() => {
    candidateLoading.value = false
  })
}

function candidateNumChange(num) {
  candidateParams.num = num
  loadCandidates(true)
}

function resetCandidateFilters() {
  candidateParams.email = ''
  candidateParams.status = -1
  candidateParams.num = 1
  loadCandidates(true)
}

function resetCandidateDialog() {
  candidateParams.email = ''
  candidateParams.status = -1
  candidateParams.num = 1
  addForm.remark = ''
  selectedCandidate.value = null
}

function submitAdd() {
  if (!selectedCandidate.value) {
    ElMessage({
      message: t('selectUser'),
      type: 'error',
      plain: true
    })
    return
  }

  addLoading.value = true
  subAdminAdd({ userId: selectedCandidate.value.userId, remark: addForm.remark }).then(() => {
    addShow.value = false
    ElMessage({
      message: t('addSuccessMsg'),
      type: 'success',
      plain: true
    })
    getList(false)
  }).finally(() => {
    addLoading.value = false
  })
}

function openRemark(row) {
  currentRow.value = row
  remarkForm.subAdminId = row.subAdminId
  remarkForm.remark = row.remark || ''
  remarkShow.value = true
}

function resetRemarkForm() {
  remarkForm.subAdminId = 0
  remarkForm.remark = ''
}

function saveRemark() {
  settingLoading.value = true
  const remark = remarkForm.remark.trim()
  subAdminSetRemark({ subAdminId: remarkForm.subAdminId, remark }).then(() => {
    if (currentRow.value) {
      currentRow.value.remark = remark
    }
    remarkShow.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true
    })
  }).finally(() => {
    settingLoading.value = false
  })
}

function toggleStatus(row) {
  const status = row.status === 0 ? 1 : 0
  subAdminSetStatus({ subAdminId: row.subAdminId, status }).then(() => {
    row.status = status
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true
    })
  })
}

function remove(row) {
  ElMessageBox.confirm(t('delConfirm', { msg: row.email }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    subAdminDelete(row.subAdminId).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true
      })
      getList(true)
    })
  })
}
</script>

<style scoped lang="scss">
.sub-admin-box {
  height: 100%;
  overflow: hidden;
}

.scrollbar {
  height: calc(100% - 48px);
  position: relative;
  background: var(--extra-light-fill);
}

.header-actions {
  padding: 9px 15px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
  box-shadow: var(--header-actions-border);
  font-size: 18px;

  .search-input {
    width: min(200px, calc(100vw - 140px));
  }

  .search {
    :deep(.el-input-group) {
      height: 28px;
    }

    :deep(.el-input__inner) {
      height: 28px;
    }
  }

  .icon {
    cursor: pointer;
  }
}

.loading {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--loadding-background);
  left: 0;
  z-index: 2;
  top: 0;
  width: 100%;
  height: 100%;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}

.pagination {
  margin-top: 15px;
  margin-bottom: 20px;
  padding-right: 30px;
  display: flex;
  justify-content: end;
}

.candidate-pagination {
  padding-right: 0;
  margin-top: 10px;
  margin-bottom: 10px;
}

.container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.candidate-actions {
  padding: 0 0 10px 0;
  box-shadow: none;
}

.email-row, .remark {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setting-actions {
  display: flex;
  gap: 8px;
}

.selected-user {
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
}

.status-select {
  :deep(.el-select__wrapper) {
    min-height: 28px;
  }
}

.btn {
  width: 100%;
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.candidate-dialog.el-dialog) {
  width: 760px !important;
  @media (max-width: 800px) {
    width: calc(100% - 40px) !important;
  }
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}
</style>
