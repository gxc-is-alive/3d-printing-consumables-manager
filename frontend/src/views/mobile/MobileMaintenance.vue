<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMaintenanceStore, type MaintenanceRecord, type MaintenanceFormData } from '@/stores/maintenance';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const maintenanceStore = useMaintenanceStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const editingRecord = ref<MaintenanceRecord | null>(null);

// Picker 显示状态
const showTypePicker = ref(false);
const showDatePicker = ref(false);

// 保养类型选项
const maintenanceTypes = [
  { text: '清洁', value: 'cleaning' },
  { text: '润滑', value: 'lubrication' },
  { text: '校准', value: 'calibration' },
  { text: '更换零件', value: 'replacement' },
  { text: '其他', value: 'other' },
];

// 表单数据
const formData = ref<MaintenanceFormData>({
  type: 'cleaning',
  description: '',
  date: new Date().toISOString().split('T')[0],
});

// 获取选中的类型名称
const selectedTypeName = computed(() => {
  const type = maintenanceTypes.find(t => t.value === formData.value.type);
  return type?.text || '请选择类型';
});

// 格式化日期显示
function formatDate(dateStr: string): string {
  if (!dateStr) return '请选择日期';
  return dateStr;
}

// Picker 确认处理
function onTypeConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  formData.value.type = selectedOptions[0]?.value || 'cleaning';
  showTypePicker.value = false;
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.value.date = selectedValues.join('-');
  showDatePicker.value = false;
}

onMounted(async () => {
  await maintenanceStore.fetchRecords();
});

async function handleRefresh() {
  isRefreshing.value = true;
  await maintenanceStore.fetchRecords();
  isRefreshing.value = false;
}

function openCreateForm() {
  editingRecord.value = null;
  formData.value = {
    type: 'cleaning',
    description: '',
    date: new Date().toISOString().split('T')[0],
  };
  showForm.value = true;
}

function openEditForm(record: MaintenanceRecord) {
  editingRecord.value = record;
  formData.value = {
    type: record.type,
    description: record.description || '',
    date: record.date.split('T')[0],
  };
  showForm.value = true;
}

async function handleSubmit() {
  if (!formData.value.description) {
    toast.error('请填写保养描述');
    return;
  }

  if (editingRecord.value) {
    const result = await maintenanceStore.updateRecord(editingRecord.value.id, formData.value);
    if (result) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(maintenanceStore.error || '更新失败');
    }
  } else {
    const result = await maintenanceStore.createRecord(formData.value);
    if (result) {
      toast.success('记录成功');
      showForm.value = false;
    } else {
      toast.error(maintenanceStore.error || '记录失败');
    }
  }
}

async function handleDelete(record: MaintenanceRecord) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条保养记录吗？',
    });
    const success = await maintenanceStore.deleteRecord(record.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(maintenanceStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}

// 获取类型标签
function getTypeLabel(type: string): string {
  const item = maintenanceTypes.find(t => t.value === type);
  return item?.text || type;
}

// 获取类型标签颜色
function getTypeTagType(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    cleaning: 'primary',
    lubrication: 'success',
    calibration: 'warning',
    replacement: 'danger',
    other: 'default',
  };
  return map[type] || 'default';
}
</script>

<template>
  <MobileLayout title="保养记录" :show-back="true" :show-tabbar="false">
    <template #headerRight>
      <van-icon name="plus" size="20" @click="openCreateForm" />
    </template>
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="maintenance-page">
        <!-- 加载状态 -->
        <div v-if="maintenanceStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="2" v-for="i in 5" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="maintenanceStore.records.length === 0"
          image="default"
          description="暂无保养记录"
          button-text="添加记录"
          @click="openCreateForm"
        />

        <!-- 保养记录列表 -->
        <div v-else class="maintenance-list">
          <van-swipe-cell v-for="record in maintenanceStore.records" :key="record.id">
            <van-cell
              :title="record.description || '无描述'"
              @click="openEditForm(record)"
            >
              <template #icon>
                <van-tag :type="getTypeTagType(record.type)" class="type-tag">
                  {{ getTypeLabel(record.type) }}
                </van-tag>
              </template>
              <template #value>
                <div class="record-value">
                  <span class="date">{{ record.date.split('T')[0] }}</span>
                </div>
              </template>
            </van-cell>

            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                class="swipe-btn"
                @click="handleDelete(record)"
              />
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </van-pull-refresh>

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="editingRecord ? '编辑记录' : '新增记录'"
      :loading="maintenanceStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-cell
          title="保养类型"
          :value="selectedTypeName"
          is-link
          @click="showTypePicker = true"
        />

        <van-field
          v-model="formData.description"
          label="保养描述"
          required
          placeholder="请描述保养内容"
        />

        <van-cell
          title="保养日期"
          required
          :value="formatDate(formData.date)"
          is-link
          @click="showDatePicker = true"
        />
      </van-cell-group>
    </FormPopup>

    <!-- 表单 Picker -->
    <van-popup v-model:show="showTypePicker" position="bottom" round>
      <van-picker
        title="选择保养类型"
        :columns="maintenanceTypes"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        title="选择日期"
        :min-date="new Date(2020, 0, 1)"
        :max-date="new Date()"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </MobileLayout>
</template>

<style scoped>
.maintenance-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.maintenance-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-tag {
  margin-right: 8px;
}

.record-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.date {
  font-size: 12px;
  color: #969799;
}

.swipe-btn {
  height: 100%;
}

:deep(.van-cell__value) {
  color: #323233;
}

:deep(.van-picker__confirm) {
  color: #42b883;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-cell) {
  background: #fff;
  border-radius: 8px;
}
</style>
