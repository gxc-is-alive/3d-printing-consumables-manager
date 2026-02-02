<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUsageRecordStore, type UsageRecord, type UsageRecordFormData } from '@/stores/usageRecord';
import { useConsumableStore } from '@/stores/consumable';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const usageStore = useUsageRecordStore();
const consumableStore = useConsumableStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const editingRecord = ref<UsageRecord | null>(null);

// Picker 显示状态
const showConsumablePicker = ref(false);
const showDatePicker = ref(false);

// 表单数据
const formData = ref<UsageRecordFormData>({
  consumableId: '',
  amountUsed: 0,
  usageDate: new Date().toISOString().split('T')[0],
  projectName: '',
  notes: '',
});

// 耗材选项 (Picker 格式) - 只显示已开封的耗材
const consumablePickerOptions = computed(() =>
  consumableStore.consumables
    .filter(c => c.isOpened) // 只显示已开封的
    .map(c => ({
      text: `${c.brand?.name} ${c.color} (剩余${c.remainingWeight.toFixed(0)}g)`,
      value: c.id,
    }))
);

// 获取选中的耗材名称
const selectedConsumableName = computed(() => {
  const consumable = consumableStore.consumables.find(c => c.id === formData.value.consumableId);
  if (consumable) {
    return `${consumable.brand?.name} ${consumable.color}`;
  }
  return '请选择耗材';
});

// 格式化日期显示
function formatDate(dateStr: string): string {
  if (!dateStr) return '请选择日期';
  return dateStr;
}

// Picker 确认处理
function onConsumableConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  formData.value.consumableId = selectedOptions[0]?.value || '';
  showConsumablePicker.value = false;
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.value.usageDate = selectedValues.join('-');
  showDatePicker.value = false;
}

onMounted(async () => {
  await Promise.all([
    usageStore.fetchUsageRecords(),
    consumableStore.fetchConsumables(),
  ]);
});

async function handleRefresh() {
  isRefreshing.value = true;
  await usageStore.fetchUsageRecords();
  isRefreshing.value = false;
}

function openCreateForm() {
  editingRecord.value = null;
  formData.value = {
    consumableId: '',
    amountUsed: 0,
    usageDate: new Date().toISOString().split('T')[0],
    projectName: '',
    notes: '',
  };
  showForm.value = true;
}

function openEditForm(record: UsageRecord) {
  editingRecord.value = record;
  formData.value = {
    consumableId: record.consumableId,
    amountUsed: record.amountUsed,
    usageDate: record.usageDate.split('T')[0],
    projectName: record.projectName || '',
    notes: record.notes || '',
  };
  showForm.value = true;
}

async function handleSubmit() {
  if (!formData.value.consumableId || !formData.value.amountUsed) {
    toast.error('请填写必填项');
    return;
  }

  const submitData: UsageRecordFormData = {
    consumableId: formData.value.consumableId,
    amountUsed: formData.value.amountUsed,
    usageDate: formData.value.usageDate,
    projectName: formData.value.projectName || undefined,
    notes: formData.value.notes || undefined,
  };

  if (editingRecord.value) {
    const result = await usageStore.updateUsageRecord(editingRecord.value.id, submitData);
    if (result.record) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(usageStore.error || '更新失败');
    }
  } else {
    const result = await usageStore.createUsageRecord(submitData);
    if (result.record) {
      toast.success('记录成功');
      showForm.value = false;
      // 刷新耗材列表以更新剩余量
      consumableStore.fetchConsumables();
    } else {
      toast.error(usageStore.error || '记录失败');
    }
  }
}

async function handleDelete(record: UsageRecord) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条使用记录吗？',
    });
    const success = await usageStore.deleteUsageRecord(record.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(usageStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <MobileLayout title="使用记录" :show-back="true" :show-tabbar="false">
    <template #headerRight>
      <van-icon name="plus" size="20" @click="openCreateForm" />
    </template>
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="usages-page">
        <!-- 加载状态 -->
        <div v-if="usageStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="2" v-for="i in 5" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="usageStore.usageRecords.length === 0"
          image="default"
          description="暂无使用记录"
          button-text="添加记录"
          @click="openCreateForm"
        />

        <!-- 使用记录列表 -->
        <div v-else class="usage-list">
          <van-swipe-cell v-for="record in usageStore.usageRecords" :key="record.id">
            <van-cell
              :title="record.consumable ? `${record.consumable.brand?.name} ${record.consumable.color}` : '未知耗材'"
              :label="record.projectName || '无项目名称'"
              @click="openEditForm(record)"
            >
              <template #value>
                <div class="usage-value">
                  <span class="weight">-{{ record.amountUsed }}g</span>
                  <span class="date">{{ record.usageDate.split('T')[0] }}</span>
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
      :loading="usageStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-cell
          title="耗材"
          required
          :value="selectedConsumableName"
          is-link
          @click="showConsumablePicker = true"
        />

        <van-field
          v-model.number="formData.amountUsed"
          label="使用量(g)"
          type="number"
          required
          placeholder="0"
        />

        <van-cell
          title="使用日期"
          required
          :value="formatDate(formData.usageDate)"
          is-link
          @click="showDatePicker = true"
        />

        <van-field
          v-model="formData.projectName"
          label="项目名称"
          placeholder="可选"
        />

        <van-field
          v-model="formData.notes"
          label="备注"
          type="textarea"
          rows="2"
          placeholder="可选备注"
        />
      </van-cell-group>
    </FormPopup>

    <!-- 表单 Picker -->
    <van-popup v-model:show="showConsumablePicker" position="bottom" round>
      <van-picker
        title="选择耗材"
        :columns="consumablePickerOptions"
        @confirm="onConsumableConfirm"
        @cancel="showConsumablePicker = false"
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
.usages-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usage-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.weight {
  font-size: 15px;
  font-weight: 600;
  color: #ee0a24;
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
