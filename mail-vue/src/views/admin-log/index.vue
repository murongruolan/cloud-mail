<template>
  <div class="admin-log-box">
    <div class="header-actions">
      <el-select v-model="params.adminType" class="status-select" :style="`width: ${locale === 'en' ? 120 : 100 }px`">
        <el-option value="all" :label="$t('all')"/>
        <el-option value="main" :label="$t('mainAdmin')"/>
        <el-option value="sub" :label="$t('subAdmin')"/>
      </el-select>
      <div class="search">
        <el-input v-model="params.email" class="search-input" :placeholder="$t('searchByEmail')"/>
      </div>
      <el-button size="small" type="primary" @click="search">{{ $t('search') }}</el-button>
      <el-button size="small" @click="refresh">{{ $t('reset') }}</el-button>
    </div>

    <el-scrollbar class="scrollbar">
      <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'" :style="first ? 'background: transparent' : ''">
        <loading/>
      </div>
      <el-table :data="list" style="width: 100%" :empty-text="first ? '' : null">
        <el-table-column prop="email" :label="$t('tabEmailAddress')" min-width="220" />
        <el-table-column :label="$t('adminType')" min-width="120">
          <template #default="{ row }">
            <el-tag type="primary" v-if="row.adminType === 'main'">{{ $t('mainAdmin') }}</el-tag>
            <el-tag type="warning" v-else>{{ $t('subAdmin') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" :label="$t('actionName')" min-width="180" />
        <el-table-column :label="$t('date')" min-width="160">
          <template #default="{ row }">
            {{ tzDayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination" v-if="total > 10">
        <el-pagination
            :current-page="params.num"
            :page-size="params.size"
            :page-sizes="[10, 20, 30, 50, 100]"
            background
            layout="prev, pager, next, sizes, total"
            :total="total"
            @size-change="sizeChange"
            @current-change="numChange"
        />
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { defineOptions, reactive, ref } from 'vue'
import loading from '@/components/loading/index.vue'
import { useI18n } from 'vue-i18n'
import { tzDayjs } from '@/utils/day.js'
import { adminLogList } from '@/request/admin-log.js'

defineOptions({
  name: 'admin-log'
})

const { t, locale } = useI18n()

const list = ref([])
const total = ref(0)
const tableLoading = ref(true)
const first = ref(true)

const params = reactive({
  adminType: 'all',
  email: '',
  num: 1,
  size: 20
})

getList()

function getList(loadingFlag = true) {
  tableLoading.value = loadingFlag
  adminLogList(params).then(({ list: rows, total: count }) => {
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
  params.adminType = 'all'
  params.email = ''
  params.num = 1
  getList()
}

function numChange(num) {
  params.num = num
  getList()
}

function sizeChange(size) {
  params.size = size
  getList()
}
</script>

<style scoped lang="scss">
.admin-log-box {
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
    width: min(220px, calc(100vw - 160px));
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

.status-select {
  :deep(.el-select__wrapper) {
    min-height: 28px;
  }
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}
</style>
