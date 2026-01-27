<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAccessoryStore, type Accessory, type AccessoryFormData, ACCESSORY_STATUS } from '@/stores/accessory';
import { useAccessoryCategoryStore } from '@/stores/accessoryCategory';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import DataCard from '@/components/mobile/DataCard.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';
import { groupByCategory } from '@/utils/group';

const accessoryStore = useAccessoryStore();
const categoryStore = useAccessoryCategoryStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const showActions = ref(false);
const editingAccessory = ref<Accessory | null>(null);
const selectedAccessory = ref<Accessory | null>(null);

// Picker 显示状态
const showCategoryPicker = ref(false);
const showUsageTypePicker = ref(false);

// 表单数据
const formData = ref<AccessoryFormData>({
  categoryId: '',
  name: '',
  brand: '',
  model: '',
  price: undefined,
  purchaseDate: new Date().toISOString().split('T')[0],
  quantity: 1,
  replacementCycle: undefined,
  lowStockThreshold: undefined,
  notes: '',
  usageType: 'consumable',
});

// 分类选项
const categoryPickerOptions = computed(() =>
  categoryStore.categories.map(c => ({ text: c.name, value: c.id }))
);

// 使用类型选项
const usageTypeOptions = [
  { text: '消耗型', value: 'consumable' },
  { text: '耐用型', value: 'durable' },
];

// 获取选中的分类名称
const selectedCategoryName = computed(() => {
  const cat = categoryStore.categories.find(c => c.id === formData.value.categoryId);
  return cat?.name || '请选择分类';
});

// 获取选中的使用类型名称
const selectedUsageTypeName = computed(() => {
  const opt = usageTypeOptions.find(o => o.value === formData.value.usageType);
  return opt?.text || '消耗型';
});

// 分组后的配件列表
const groupedAccessories = computed(() => {
  const items = accessoryStore.accessories.map(a => ({
    ...a,
    categoryId: a.categoryId,
    categoryName: a.category?.name || '未分类',
  }));
  return groupByCategory(items);
});

// 操作选项
const actionOptions = computed(() => {
  const actions = [
    { name: '编辑', color: '#1989fa' },
    { name: '记录使用', color: '#07c160' },
  ];
  
  if (selectedAccessory.value?.usageType === 'durable') {
    if (selectedAccessory.value.status === 'in_use') {
      actions.push({ name: '结束使用', color: '#ff976a' });
    } else if (selectedAccessory.value.status === 'available') {
      actions.push({ name: '开始使用', color: '#07c160' });
    }
  }
  
  actions.push({ name: '删除', color: '#ee0a24' });
  
  return actions;
});

// 判断是否需要警告
function needsWarning(accessory: Accessory): boolean {
  if (accessory.status === 'low_stock' || accessory.status === 'depleted') {
    return true;
  }
  if (accessory.replacementCycle && accessory.lastReplacedAt) {
    const lastReplaced = new Date(accessory.lastReplacedAt);
    const daysSince = Math.floor((Date.now() - lastReplaced.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= accessory.replacementCycle;
  }
  return false;
}

// 获取状态标签类型
function getStatusTagType(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    available: 'success',
    low_stock: 'warning',
    depleted: 'danger',
    in_use: 'primary',
  };
  return map[status] || 'default';
}

// Picker 确认处理
function onCategoryConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  formData.value.categoryId = selectedOptions[0]?.value || '';
  showCategoryPicker.value = false;
}

function onUsageTypeConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  formData.value.usageType = (selectedOptions[0]?.value as 'consumable' | 'durable') || 'consumable';
  showUsageTypePicker.value = false;
}

onMounted(async () => {
  await Promise.all([
    accessoryStore.fetchAccessories(),
    categoryStore.fetchCategories(),
  ]);
});

async function handleRefresh() {
  isRefreshing.value = true;
  await accessoryStore.fetchAccessories();
  isRefreshing.value = false;
}

function openCreateForm() {
  editingAccessory.value = null;
  formData.value = {
    categoryId: '',
    name: '',
    brand: '',
    model: '',
    price: undefined,
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    replacementCycle: undefined,
    lowStockThreshold: undefined,
    notes: '',
    usageType: 'consumable',
  };
  showForm.value = true;
}

function openEditForm(accessory: Accessory) {
  editingAccessory.value = accessory;
  formData.value = {
    categoryId: accessory.categoryId,
    name: accessory.name,
    brand: accessory.brand || '',
    model: accessory.model || '',
    price: accessory.price || undefined,
    purchaseDate: accessory.purchaseDate?.split('T')[0] || '',
    quantity: accessory.quantity,
    replacementCycle: accessory.replacementCycle || undefined,
    lowStockThreshold: accessory.lowStockThreshold || undefined,
    notes: accessory.notes || '',
    usageType: accessory.usageType || 'consumable',
  };
  showForm.value = true;
}

function handleCardClick(accessory: Accessory) {
  selectedAccessory.value = accessory;
  showActions.value = true;
}

async function handleActionSelect(action: { name: string }) {
  if (!selectedAccessory.value) return;
  
  switch (action.name) {
    case '编辑':
      openEditForm(selectedAccessory.value);
      break;
    case '记录使用':
      await handleRecordUsage(selectedAccessory.value.id);
      break;
    case '开始使用':
      await handleStartUsing(selectedAccessory.value.id);
      break;
    case '结束使用':
      await handleStopUsing(selectedAccessory.value.id);
      break;
    case '删除':
      await handleDelete(selectedAccessory.value);
      break;
  }
  
  showActions.value = false;
}

async function handleSubmit() {
  if (!formData.value.categoryId || !formData.value.name) {
    toast.error('请填写必填项');
    return;
  }

  if (editingAccessory.value) {
    const result = await accessoryStore.updateAccessory(editingAccessory.value.id, formData.value);
    if (result) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(accessoryStore.error || '更新失败');
    }
  } else {
    const result = await accessoryStore.createAccessory(formData.value);
    if (result) {
      toast.success('添加成功');
      showForm.value = false;
    } else {
      toast.error(accessoryStore.error || '添加失败');
    }
  }
}

async function handleDelete(accessory: Accessory) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除 ${accessory.name} 吗？`,
    });
    const success = await accessoryStore.deleteAccessory(accessory.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(accessoryStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}

async function handleRecordUsage(id: string) {
  const result = await accessoryStore.recordUsage(id, {
    usageDate: new Date().toISOString().split('T')[0],
    quantity: 1,
  });
  if (result) {
    toast.success('已记录使用');
  } else {
    toast.error(accessoryStore.error || '记录失败');
  }
}

async function handleStartUsing(id: string) {
  const result = await accessoryStore.startUsing(id);
  if (result) {
    toast.success('已开始使用');
  } else {
    toast.error(accessoryStore.error || '操作失败');
  }
}

async function handleStopUsing(id: string) {
  const result = await accessoryStore.stopUsing(id);
  if (result) {
    toast.success('已结束使用');
  } else {
    toast.error(accessoryStore.error || '操作失败');
  }
}
</script>

<template>
  <MobileLayout title="配件管理" :show-back="true" :show-tabbar="true">
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="accessories-page">
        <!-- 加载状态 -->
        <div v-if="accessoryStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="3" v-for="i in 3" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="accessoryStore.accessories.length === 0"
          image="default"
          description="暂无配件数据"
          button-text="添加配件"
          @click="openCreateForm"
        />

        <!-- 配件列表（按分类分组） -->
        <div v-else class="accessory-groups">
          <div v-for="group in groupedAccessories" :key="group.categoryId" class="accessory-group">
            <van-divider content-position="left">{{ group.categoryName }}</van-divider>
            
            <div class="accessory-list">
              <van-swipe-cell v-for="accessory in group.items" :key="accessory.id">
                <DataCard
                  :title="accessory.name"
                  :subtitle="accessory.brand ? `${accessory.brand} ${accessory.model || ''}` : ''"
                  :tag="ACCESSORY_STATUS[accessory.status as keyof typeof ACCESSORY_STATUS] || accessory.status"
                  :tag-type="getStatusTagType(accessory.status)"
                  :show-warning="needsWarning(accessory)"
                  @click="handleCardClick(accessory)"
                >
                  <div class="card-info">
                    <span class="quantity">库存: {{ accessory.remainingQty }}/{{ accessory.quantity }}</span>
                    <van-progress
                      :percentage="Math.round((accessory.remainingQty / accessory.quantity) * 100)"
                      :show-pivot="false"
                      stroke-width="4"
                      :color="needsWarning(accessory) ? '#ee0a24' : '#42b883'"
                    />
                  </div>
                  <template #footer>
                    <span v-if="accessory.price" class="price">¥{{ accessory.price.toFixed(2) }}</span>
                    <span v-if="accessory.lastReplacedAt" class="last-replaced">
                      上次更换: {{ accessory.lastReplacedAt.split('T')[0] }}
                    </span>
                  </template>
                </DataCard>

                <template #right>
                  <van-button
                    square
                    type="danger"
                    text="删除"
                    class="swipe-btn"
                    @click="handleDelete(accessory)"
                  />
                </template>
              </van-swipe-cell>
            </div>
          </div>
        </div>
      </div>
    </van-pull-refresh>

    <!-- 操作面板 -->
    <van-action-sheet
      v-model:show="showActions"
      :title="selectedAccessory?.name"
      :actions="actionOptions"
      cancel-text="取消"
      close-on-click-action
      @select="handleActionSelect"
    />

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="editingAccessory ? '编辑配件' : '新增配件'"
      :loading="accessoryStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-cell
          title="分类"
          required
          :value="selectedCategoryName"
          is-link
          @click="showCategoryPicker = true"
        />

        <van-field
          v-model="formData.name"
          label="名称"
          required
          placeholder="配件名称"
        />

        <van-field
          v-model="formData.brand"
          label="品牌"
          placeholder="品牌（可选）"
        />

        <van-field
          v-model="formData.model"
          label="型号"
          placeholder="型号（可选）"
        />

        <van-field
          v-model.number="formData.quantity"
          label="数量"
          type="digit"
        />

        <van-field
          v-model.number="formData.price"
          label="价格(¥)"
          type="number"
          placeholder="0"
        />

        <van-cell
          title="使用类型"
          :value="selectedUsageTypeName"
          is-link
          @click="showUsageTypePicker = true"
        />

        <van-field
          v-model.number="formData.replacementCycle"
          label="更换周期"
          type="digit"
          placeholder="天数（可选）"
        />

        <van-field
          v-model.number="formData.lowStockThreshold"
          label="低库存阈值"
          type="digit"
          placeholder="数量（可选）"
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

    <!-- Picker 弹窗 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        title="选择分类"
        :columns="categoryPickerOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showUsageTypePicker" position="bottom" round>
      <van-picker
        title="选择使用类型"
        :columns="usageTypeOptions"
        @confirm="onUsageTypeConfirm"
        @cancel="showUsageTypePicker = false"
      />
    </van-popup>
  </MobileLayout>
</template>

<style scoped>
.accessories-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.accessory-groups {
  display: flex;
  flex-direction: column;
}

.accessory-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-info {
  margin-top: 8px;
}

.quantity {
  font-size: 13px;
  color: #969799;
  display: block;
  margin-bottom: 6px;
}

.price {
  font-size: 15px;
  color: #42b883;
  font-weight: 600;
}

.last-replaced {
  font-size: 12px;
  color: #969799;
}

.swipe-btn {
  height: 100%;
}

:deep(.van-divider) {
  margin: 16px 0 12px;
  font-size: 13px;
  color: #969799;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-cell__value) {
  color: #323233;
}

:deep(.van-picker__confirm) {
  color: #42b883;
}
</style>
