<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useConsumableStore, type Consumable, type BatchCreateFormData } from '@/stores/consumable';
import { useBrandStore } from '@/stores/brand';
import { useConsumableTypeStore } from '@/stores/consumableType';
import { useBrandColorStore } from '@/stores/brandColor';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import DataCard from '@/components/mobile/DataCard.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import BrandColorPicker from '@/components/mobile/BrandColorPicker.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const consumableStore = useConsumableStore();
const brandStore = useBrandStore();
const typeStore = useConsumableTypeStore();
const brandColorStore = useBrandColorStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const showFilter = ref(false);
const editingConsumable = ref<Consumable | null>(null);

// Picker 显示状态
const showBrandPicker = ref(false);
const showTypeCascader = ref(false);
const showDatePicker = ref(false);
const showOpenedDatePicker = ref(false);

// 筛选 Picker 状态
const showFilterBrandPicker = ref(false);
const showFilterTypePicker = ref(false);
const showFilterStatusPicker = ref(false);

// 筛选状态
const filterBrandId = ref('');
const filterTypeId = ref('');
const filterStatus = ref(''); // 改为 status 筛选
const showDepleted = ref(false); // 显示已用完开关

// 快捷筛选
const quickFilter = ref<'all' | 'opened'>('all');

// 表单数据
const formData = ref({
  brandId: '',
  typeId: '',
  color: '',
  colorHexList: ['#ffffff'] as string[], // 支持多色
  weight: 1000,
  price: 0,
  purchaseDate: '',
  notes: '',
  quantity: 1,
  isOpened: false,
  openedAt: '',
});

// 添加颜色
function addColor() {
  if (formData.value.colorHexList.length < 5) {
    formData.value.colorHexList.push('#ffffff');
  }
}

// 移除颜色
function removeColor(index: number) {
  if (formData.value.colorHexList.length > 1) {
    formData.value.colorHexList.splice(index, 1);
  }
}

// 生成渐变预览样式
function getGradientStyle(colors: string[]): string {
  if (colors.length === 1) {
    return colors[0];
  }
  return `linear-gradient(90deg, ${colors.join(', ')})`;
}

// 品牌选项 (Picker 格式)
const brandPickerOptions = computed(() => 
  brandStore.brands.map(b => ({ text: b.name, value: b.id }))
);

// 类型级联选择器选项
const typeCascaderOptions = computed(() => {
  return typeStore.hierarchy.categories.map((cat) => ({
    text: cat.name,
    value: cat.id,
    // 如果有子类，显示子类；如果没有子类，添加一个占位选项让用户可以选择大类本身
    children:
      cat.children.length > 0
        ? cat.children.map((sub) => ({
            text: sub.name,
            value: sub.id,
          }))
        : [{ text: '(直接使用此大类)', value: cat.id }],
  }));
});

// 类型选项 (Picker 格式，用于筛选)
const typePickerOptions = computed(() => {
  const options: Array<{ text: string; value: string }> = [];
  for (const cat of typeStore.hierarchy.categories) {
    for (const sub of cat.children) {
      options.push({ text: `${cat.name} ${sub.name}`, value: sub.id });
    }
  }
  return options;
});

// 开封状态选项 - 更新为完整状态
const statusPickerOptions = [
  { text: '全部', value: '' },
  { text: '未开封', value: 'unopened' },
  { text: '已开封', value: 'opened' },
  { text: '已用完', value: 'depleted' },
];

// 获取选中的品牌名称
const selectedBrandName = computed(() => {
  const brand = brandStore.brands.find(b => b.id === formData.value.brandId);
  return brand?.name || '请选择品牌';
});

// 获取选中的类型名称
const selectedTypeName = computed(() => {
  if (!formData.value.typeId) return '请选择类型';
  return typeStore.getTypeDisplayName(formData.value.typeId);
});

// 筛选显示文本
const filterBrandName = computed(() => {
  const brand = brandStore.brands.find(b => b.id === filterBrandId.value);
  return brand?.name || '全部';
});

const filterTypeName = computed(() => {
  if (!filterTypeId.value) return '全部';
  return typeStore.getTypeDisplayName(filterTypeId.value);
});

const filterStatusName = computed(() => {
  const opt = statusPickerOptions.find(o => o.value === filterStatus.value);
  return opt?.text || '全部';
});

// 活跃筛选数量
const activeFilterCount = computed(() => {
  let count = 0;
  if (filterBrandId.value) count++;
  if (filterTypeId.value) count++;
  if (filterStatus.value) count++;
  if (showDepleted.value) count++;
  if (quickFilter.value !== 'all') count++;
  return count;
});

// 获取耗材状态标签
function getStatusTag(consumable: Consumable): { text: string; type: 'success' | 'warning' | 'default' } {
  if (consumable.status === 'depleted') {
    return { text: '已用完', type: 'default' };
  }
  if (consumable.status === 'opened' || consumable.isOpened) {
    return { text: '已开封', type: 'warning' };
  }
  return { text: '未开封', type: 'success' };
}

// 判断是否超期开封（超过30天）
function isOverdue(consumable: Consumable): boolean {
  return consumable.openedDays !== null && consumable.openedDays > 30;
}

// 格式化开封天数
function formatOpenedDays(openedDays: number | null): string {
  if (openedDays === null) return '';
  if (openedDays === 0) return '今天开封';
  return `${openedDays}天前`;
}

// 格式化日期显示
function formatDate(dateStr: string): string {
  if (!dateStr) return '请选择日期';
  return dateStr;
}

onMounted(async () => {
  await Promise.all([
    consumableStore.fetchConsumables(),
    brandStore.fetchBrands(),
    typeStore.fetchHierarchy(),
  ]);
});

async function handleRefresh() {
  isRefreshing.value = true;
  const filters: Record<string, unknown> = {};
  if (filterBrandId.value) filters.brandId = filterBrandId.value;
  if (filterTypeId.value) filters.typeId = filterTypeId.value;
  
  // 快捷筛选优先
  if (quickFilter.value === 'opened') {
    filters.status = 'opened';
  } else if (filterStatus.value) {
    filters.status = filterStatus.value;
  }
  
  // 是否显示已用完
  if (showDepleted.value || filterStatus.value === 'depleted') {
    filters.includeDepleted = true;
  }
  
  await consumableStore.fetchConsumables(filters);
  isRefreshing.value = false;
}

// 快捷筛选切换
function setQuickFilter(filter: 'all' | 'opened') {
  quickFilter.value = filter;
  // 清除状态筛选
  filterStatus.value = '';
  handleRefresh();
}

function openCreateForm() {
  editingConsumable.value = null;
  formData.value = {
    brandId: '',
    typeId: '',
    color: '',
    colorHexList: ['#ffffff'],
    weight: 1000,
    price: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    quantity: 1,
    isOpened: false,
    openedAt: '',
  };
  showForm.value = true;
}

function openEditForm(consumable: Consumable) {
  editingConsumable.value = consumable;
  // 解析多色：colorHex 可能是逗号分隔的多个颜色
  const colors = consumable.colorHex ? consumable.colorHex.split(',').map(c => c.trim()) : ['#ffffff'];
  formData.value = {
    brandId: consumable.brandId,
    typeId: consumable.typeId,
    color: consumable.color,
    colorHexList: colors,
    weight: consumable.weight,
    price: consumable.price,
    purchaseDate: consumable.purchaseDate.split('T')[0],
    notes: consumable.notes || '',
    quantity: 1,
    isOpened: consumable.isOpened,
    openedAt: consumable.openedAt ? consumable.openedAt.split('T')[0] : '',
  };
  showForm.value = true;
}

// Picker 确认处理
function onBrandConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  formData.value.brandId = selectedOptions[0]?.value || '';
  showBrandPicker.value = false;
}

function onTypeCascaderFinish({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
  if (selectedOptions.length > 0) {
    formData.value.typeId = selectedOptions[selectedOptions.length - 1].value;
  }
  showTypeCascader.value = false;
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.value.purchaseDate = selectedValues.join('-');
  showDatePicker.value = false;
}

function onOpenedDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.value.openedAt = selectedValues.join('-');
  showOpenedDatePicker.value = false;
}

// 筛选 Picker 确认
function onFilterBrandConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  filterBrandId.value = selectedOptions[0]?.value || '';
  showFilterBrandPicker.value = false;
}

function onFilterTypeConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  filterTypeId.value = selectedOptions[0]?.value || '';
  showFilterTypePicker.value = false;
}

function onFilterStatusConfirm({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) {
  filterStatus.value = selectedOptions[0]?.value || '';
  quickFilter.value = 'all'; // 清除快捷筛选
  showFilterStatusPicker.value = false;
}

async function handleSubmit() {
  if (!formData.value.brandId || !formData.value.typeId || !formData.value.color) {
    toast.error('请填写必填项');
    return;
  }

  // 将多色数组转为逗号分隔的字符串
  const colorHex = formData.value.colorHexList.join(',');

  // 检查是否为新颜色，如果是则自动添加到品牌颜色库
  const isNewColor = !brandColorStore.colorExists(formData.value.brandId, formData.value.color);
  if (isNewColor && formData.value.brandId) {
    try {
      await brandColorStore.createColor(formData.value.brandId, {
        colorName: formData.value.color,
        colorHex: formData.value.colorHexList[0] || '#CCCCCC',
      });
    } catch {
      // 颜色添加失败不阻止耗材保存，只显示提示
      toast.warning('颜色已保存到耗材，但添加到颜色库失败');
    }
  }

  const submitData = {
    brandId: formData.value.brandId,
    typeId: formData.value.typeId,
    color: formData.value.color,
    colorHex: colorHex || undefined,
    weight: formData.value.weight,
    price: formData.value.price,
    purchaseDate: formData.value.purchaseDate,
    notes: formData.value.notes || undefined,
    quantity: formData.value.quantity,
    isOpened: formData.value.isOpened,
  };

  if (editingConsumable.value) {
    const result = await consumableStore.updateConsumable(editingConsumable.value.id, submitData);
    if (result) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(consumableStore.error || '更新失败');
    }
  } else {
    const batchData: BatchCreateFormData = {
      ...submitData,
      openedAt: formData.value.isOpened ? formData.value.openedAt : undefined,
    };
    const result = await consumableStore.batchCreateConsumable(batchData);
    if (result) {
      toast.success(`添加${formData.value.quantity}个耗材成功`);
      showForm.value = false;
    } else {
      toast.error(consumableStore.error || '添加失败');
    }
  }
}

async function handleDelete(consumable: Consumable) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除 ${consumable.brand?.name} ${consumable.color} 吗？`,
    });
    const success = await consumableStore.deleteConsumable(consumable.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(consumableStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}

async function handleMarkAsOpened(consumable: Consumable) {
  const result = await consumableStore.markAsOpened(consumable.id);
  if (result) {
    toast.success('已标记为开封');
  } else {
    toast.error(consumableStore.error || '操作失败');
  }
}

// 标记为已用完
async function handleMarkAsDepleted(consumable: Consumable) {
  try {
    await showConfirmDialog({
      title: '确认用完',
      message: `确定要将 ${consumable.brand?.name} ${consumable.color} 标记为已用完吗？`,
    });
    const result = await consumableStore.markAsDepleted(consumable.id);
    if (result) {
      toast.success('已标记为用完');
      // 如果当前不显示已用完，则从列表中移除
      if (!showDepleted.value && filterStatus.value !== 'depleted') {
        handleRefresh();
      }
    } else {
      toast.error(consumableStore.error || '操作失败');
    }
  } catch {
    // 用户取消
  }
}

// 恢复已用完的耗材
async function handleRestoreFromDepleted(consumable: Consumable) {
  try {
    await showConfirmDialog({
      title: '确认恢复',
      message: `确定要将 ${consumable.brand?.name} ${consumable.color} 恢复为已开封状态吗？`,
    });
    const result = await consumableStore.restoreFromDepleted(consumable.id);
    if (result) {
      toast.success('已恢复为已开封');
    } else {
      toast.error(consumableStore.error || '操作失败');
    }
  } catch {
    // 用户取消
  }
}

function clearFilter() {
  filterBrandId.value = '';
  filterTypeId.value = '';
  filterStatus.value = '';
  showDepleted.value = false;
  quickFilter.value = 'all';
  handleRefresh();
}
</script>

<template>
  <MobileLayout title="耗材管理" :show-back="true" :show-tabbar="true">
    <template #headerRight>
      <van-badge :content="activeFilterCount || ''" :show-zero="false">
        <van-icon name="filter-o" size="20" @click="showFilter = true" />
      </van-badge>
    </template>

    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="consumables-page">
        <!-- 快捷筛选标签 -->
        <div class="quick-filters">
          <van-tag 
            :type="quickFilter === 'all' ? 'primary' : 'default'"
            size="medium"
            @click="setQuickFilter('all')"
          >
            全部
          </van-tag>
          <van-tag 
            :type="quickFilter === 'opened' ? 'primary' : 'default'"
            size="medium"
            @click="setQuickFilter('opened')"
          >
            已开封
          </van-tag>
        </div>

        <!-- 加载状态 -->
        <div v-if="consumableStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="3" v-for="i in 3" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="consumableStore.consumables.length === 0"
          image="default"
          description="暂无耗材数据"
          button-text="添加耗材"
          @click="openCreateForm"
        />

        <!-- 耗材列表 -->
        <div v-else class="consumable-list">
          <!-- 悬浮新增按钮 -->
          <div class="fab-button" @click="openCreateForm">
            <van-icon name="plus" size="24" />
          </div>
          <van-swipe-cell
            v-for="consumable in consumableStore.consumables"
            :key="consumable.id"
            :disabled="consumable.status === 'depleted'"
          >
            <DataCard
              :title="`${consumable.brand?.name} · ${consumable.type?.name}`"
              :subtitle="consumable.color"
              :tag="getStatusTag(consumable).text"
              :tag-type="getStatusTag(consumable).type"
              :color-bar="getGradientStyle(consumable.colorHex ? consumable.colorHex.split(',') : ['#ccc'])"
              :class="{ 'depleted-card': consumable.status === 'depleted' }"
              @click="consumable.status !== 'depleted' && openEditForm(consumable)"
            >
              <div class="card-info">
                <span class="weight">{{ consumable.remainingWeight.toFixed(0) }}g / {{ consumable.weight.toFixed(0) }}g</span>
                <van-progress
                  :percentage="Math.round((consumable.remainingWeight / consumable.weight) * 100)"
                  :show-pivot="false"
                  stroke-width="4"
                  :color="consumable.status === 'depleted' ? '#c8c9cc' : '#42b883'"
                />
              </div>
              <template #footer>
                <span class="price" :class="{ 'depleted-text': consumable.status === 'depleted' }">
                  ¥{{ consumable.price.toFixed(2) }}
                </span>
                <span v-if="consumable.status === 'depleted' && consumable.depletedAt" class="depleted-date">
                  {{ new Date(consumable.depletedAt).toLocaleDateString() }} 用完
                </span>
                <span v-else-if="consumable.isOpened && consumable.openedDays !== null" class="opened-days" :class="{ 'overdue': isOverdue(consumable) }">
                  {{ formatOpenedDays(consumable.openedDays) }}
                  <van-icon v-if="isOverdue(consumable)" name="warning-o" color="#ff976a" />
                </span>
              </template>
            </DataCard>

            <template #left>
              <!-- 已用完的耗材显示恢复按钮 -->
              <van-button
                v-if="consumable.status === 'depleted'"
                square
                type="success"
                text="恢复"
                class="swipe-btn"
                @click="handleRestoreFromDepleted(consumable)"
              />
              <!-- 正常耗材显示编辑和其他操作 -->
              <template v-else>
                <van-button
                  square
                  type="primary"
                  text="编辑"
                  class="swipe-btn"
                  @click="openEditForm(consumable)"
                />
                <van-button
                  v-if="!consumable.isOpened"
                  square
                  type="success"
                  text="开封"
                  class="swipe-btn"
                  @click="handleMarkAsOpened(consumable)"
                />
                <van-button
                  v-if="consumable.isOpened && consumable.status !== 'depleted'"
                  square
                  type="warning"
                  text="用完"
                  class="swipe-btn"
                  @click="handleMarkAsDepleted(consumable)"
                />
              </template>
            </template>
            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                class="swipe-btn"
                @click="handleDelete(consumable)"
              />
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </van-pull-refresh>

    <!-- 筛选面板 -->
    <van-action-sheet v-model:show="showFilter" title="筛选">
      <div class="filter-content">
        <van-cell-group inset>
          <van-cell
            title="品牌"
            :value="filterBrandName"
            is-link
            @click="showFilterBrandPicker = true"
          />
          <van-cell
            title="类型"
            :value="filterTypeName"
            is-link
            @click="showFilterTypePicker = true"
          />
          <van-cell
            title="状态"
            :value="filterStatusName"
            is-link
            @click="showFilterStatusPicker = true"
          />
          <van-cell title="显示已用完">
            <template #right-icon>
              <van-switch v-model="showDepleted" size="20" />
            </template>
          </van-cell>
        </van-cell-group>
        <div class="filter-actions">
          <van-button block plain @click="clearFilter">清除筛选</van-button>
          <van-button block type="primary" @click="showFilter = false; handleRefresh()">确定</van-button>
        </div>
      </div>
    </van-action-sheet>

    <!-- 筛选 Picker -->
    <van-popup v-model:show="showFilterBrandPicker" position="bottom" round>
      <van-picker
        title="选择品牌"
        :columns="[{ text: '全部', value: '' }, ...brandPickerOptions]"
        @confirm="onFilterBrandConfirm"
        @cancel="showFilterBrandPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showFilterTypePicker" position="bottom" round>
      <van-picker
        title="选择类型"
        :columns="[{ text: '全部', value: '' }, ...typePickerOptions]"
        @confirm="onFilterTypeConfirm"
        @cancel="showFilterTypePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showFilterStatusPicker" position="bottom" round>
      <van-picker
        title="选择状态"
        :columns="statusPickerOptions"
        @confirm="onFilterStatusConfirm"
        @cancel="showFilterStatusPicker = false"
      />
    </van-popup>

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="editingConsumable ? '编辑耗材' : '新增耗材'"
      :loading="consumableStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-cell
          title="品牌"
          required
          :value="selectedBrandName"
          is-link
          @click="showBrandPicker = true"
        />

        <van-cell
          title="类型"
          required
          :value="selectedTypeName"
          is-link
          @click="showTypeCascader = true"
        />

        <!-- 使用 BrandColorPicker 组件 -->
        <BrandColorPicker
          :brand-id="formData.brandId"
          v-model="formData.color"
          v-model:color-hex="formData.colorHexList[0]"
        />

        <!-- 多色支持 -->
        <van-field v-if="formData.colorHexList.length > 1 || formData.brandId" label="多色渐变">
          <template #input>
            <div class="color-picker-multi">
              <div class="color-list">
                <div 
                  v-for="(_color, index) in formData.colorHexList" 
                  :key="index"
                  class="color-item"
                >
                  <input 
                    v-model="formData.colorHexList[index]" 
                    type="color" 
                    class="color-input" 
                  />
                  <van-icon 
                    v-if="formData.colorHexList.length > 1"
                    name="cross" 
                    class="color-remove"
                    @click="removeColor(index)"
                  />
                </div>
                <div 
                  v-if="formData.colorHexList.length < 5"
                  class="color-add"
                  @click="addColor"
                >
                  <van-icon name="plus" />
                </div>
              </div>
              <div 
                v-if="formData.colorHexList.length > 1"
                class="gradient-preview"
                :style="{ background: getGradientStyle(formData.colorHexList) }"
              />
            </div>
          </template>
        </van-field>

        <van-field
          v-model.number="formData.weight"
          label="重量(g)"
          type="digit"
          required
          placeholder="1000"
        />

        <van-field
          v-model.number="formData.price"
          label="价格(¥)"
          type="number"
          required
          placeholder="0"
        />

        <van-cell
          title="购买日期"
          required
          :value="formatDate(formData.purchaseDate)"
          is-link
          @click="showDatePicker = true"
        />

        <van-field
          v-if="!editingConsumable"
          v-model.number="formData.quantity"
          label="数量"
          type="digit"
        >
          <template #extra>
            <span class="field-hint">批量添加</span>
          </template>
        </van-field>

        <van-cell v-if="!editingConsumable" title="已开封">
          <template #right-icon>
            <van-switch v-model="formData.isOpened" size="20" />
          </template>
        </van-cell>

        <van-cell
          v-if="!editingConsumable && formData.isOpened"
          title="开封日期"
          :value="formatDate(formData.openedAt)"
          is-link
          @click="showOpenedDatePicker = true"
        />

        <van-field
          v-model="formData.notes"
          label="备注"
          type="textarea"
          rows="2"
          placeholder="可选备注信息"
        />
      </van-cell-group>
    </FormPopup>

    <!-- 表单 Picker -->
    <van-popup v-model:show="showBrandPicker" position="bottom" round>
      <van-picker
        title="选择品牌"
        :columns="brandPickerOptions"
        @confirm="onBrandConfirm"
        @cancel="showBrandPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showTypeCascader" position="bottom" round>
      <van-cascader
        v-model="formData.typeId"
        title="选择类型"
        :options="typeCascaderOptions"
        @close="showTypeCascader = false"
        @finish="onTypeCascaderFinish"
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

    <van-popup v-model:show="showOpenedDatePicker" position="bottom" round>
      <van-date-picker
        title="选择开封日期"
        :min-date="new Date(2020, 0, 1)"
        :max-date="new Date()"
        @confirm="onOpenedDateConfirm"
        @cancel="showOpenedDatePicker = false"
      />
    </van-popup>
  </MobileLayout>
</template>

<style scoped>
.consumables-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.quick-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.quick-filters .van-tag {
  cursor: pointer;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.consumable-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fab-button {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #42b883;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.4);
  z-index: 100;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.fab-button:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(66, 184, 131, 0.3);
}

.card-info {
  margin-top: 8px;
}

.weight {
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

.opened-days {
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
  gap: 4px;
}

.opened-days.overdue {
  color: #ff976a;
}

.depleted-card {
  opacity: 0.6;
}

.depleted-text {
  color: #c8c9cc !important;
}

.depleted-date {
  font-size: 12px;
  color: #969799;
}

.swipe-btn {
  height: 100%;
}

.filter-content {
  padding: 16px;
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.filter-actions .van-button {
  flex: 1;
}

.color-picker-multi {
  width: 100%;
}

.color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.color-item {
  position: relative;
}

.color-input {
  width: 40px;
  height: 40px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  padding: 2px;
  cursor: pointer;
}

.color-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #ee0a24;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
}

.color-add {
  width: 40px;
  height: 40px;
  border: 1px dashed #c8c9cc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c8c9cc;
  cursor: pointer;
}

.color-add:active {
  background: #f7f8fa;
}

.gradient-preview {
  margin-top: 8px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
}

.field-hint {
  font-size: 12px;
  color: #969799;
}

:deep(.van-button--primary) {
  background: #42b883;
  border-color: #42b883;
}

:deep(.van-tag--primary) {
  background: #42b883;
}

:deep(.van-switch--on) {
  background: #42b883;
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
