<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useBrandColorStore, type BrandColor } from '@/stores/brandColor';
import { useBrandStore } from '@/stores/brand';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const route = useRoute();
const brandColorStore = useBrandColorStore();
const brandStore = useBrandStore();
const toast = useToast();

const brandId = computed(() => route.params.brandId as string);
const isRefreshing = ref(false);
const showForm = ref(false);
const editingColor = ref<BrandColor | null>(null);

// 表单数据
const formData = ref({
  colorName: '',
  colorHex: '#CCCCCC',
});

// 获取品牌名称
const brandName = computed(() => {
  const brand = brandStore.brands.find(b => b.id === brandId.value);
  return brand?.name || '品牌';
});

// 获取颜色列表
const colors = computed(() => brandColorStore.getColors(brandId.value));

onMounted(async () => {
  if (brandStore.brands.length === 0) {
    await brandStore.fetchBrands();
  }
  if (brandId.value) {
    await brandColorStore.fetchColors(brandId.value);
  }
});

async function handleRefresh() {
  isRefreshing.value = true;
  await brandColorStore.fetchColors(brandId.value);
  isRefreshing.value = false;
}

function openCreateForm() {
  editingColor.value = null;
  formData.value = {
    colorName: '',
    colorHex: '#CCCCCC',
  };
  showForm.value = true;
}

function openEditForm(color: BrandColor) {
  editingColor.value = color;
  formData.value = {
    colorName: color.colorName,
    colorHex: color.colorHex,
  };
  showForm.value = true;
}

async function handleSubmit() {
  if (!formData.value.colorName.trim()) {
    toast.error('请输入颜色名称');
    return;
  }

  const submitData = {
    colorName: formData.value.colorName.trim(),
    colorHex: formData.value.colorHex,
  };

  if (editingColor.value) {
    const result = await brandColorStore.updateColor(
      brandId.value,
      editingColor.value.id,
      submitData
    );
    if (result) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(brandColorStore.error || '更新失败');
    }
  } else {
    const result = await brandColorStore.createColor(brandId.value, submitData);
    if (result) {
      toast.success('添加成功');
      showForm.value = false;
    } else {
      toast.error(brandColorStore.error || '添加失败');
    }
  }
}

async function handleDelete(color: BrandColor) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除颜色 "${color.colorName}" 吗？`,
    });
    const success = await brandColorStore.deleteColor(brandId.value, color.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(brandColorStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <MobileLayout :title="`${brandName} - 颜色管理`" :show-back="true" :show-tabbar="false">
    <template #headerRight>
      <van-icon name="plus" size="20" @click="openCreateForm" />
    </template>

    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="colors-page">
        <!-- 加载状态 -->
        <div v-if="brandColorStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="1" v-for="i in 5" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="colors.length === 0"
          image="default"
          description="暂无颜色数据"
          button-text="添加颜色"
          @click="openCreateForm"
        />

        <!-- 颜色列表 -->
        <div v-else class="color-list">
          <van-swipe-cell v-for="color in colors" :key="color.id">
            <div class="color-card" @click="openEditForm(color)">
              <div
                class="color-swatch"
                :style="{ backgroundColor: color.colorHex }"
              />
              <div class="color-info">
                <span class="color-name">{{ color.colorName }}</span>
                <span class="color-hex">{{ color.colorHex }}</span>
              </div>
              <van-icon name="arrow" class="arrow-icon" />
            </div>

            <template #left>
              <van-button
                square
                type="primary"
                text="编辑"
                class="swipe-btn"
                @click="openEditForm(color)"
              />
            </template>
            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                class="swipe-btn"
                @click="handleDelete(color)"
              />
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </van-pull-refresh>

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="editingColor ? '编辑颜色' : '新增颜色'"
      :loading="brandColorStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-field
          v-model="formData.colorName"
          label="颜色名称"
          required
          placeholder="如: 白色、哑光黑"
        />

        <van-field label="颜色代码">
          <template #input>
            <div class="color-hex-input">
              <input
                v-model="formData.colorHex"
                type="text"
                class="hex-text"
                placeholder="#CCCCCC"
              />
              <input
                v-model="formData.colorHex"
                type="color"
                class="hex-picker"
              />
            </div>
          </template>
        </van-field>

        <van-cell title="颜色预览">
          <template #value>
            <div
              class="preview-swatch"
              :style="{ backgroundColor: formData.colorHex }"
            />
          </template>
        </van-cell>
      </van-cell-group>
    </FormPopup>
  </MobileLayout>
</template>

<style scoped>
.colors-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-card {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #ebedf0;
  flex-shrink: 0;
}

.color-info {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-name {
  font-size: 15px;
  color: #323233;
  font-weight: 500;
}

.color-hex {
  font-size: 13px;
  color: #969799;
  font-family: monospace;
}

.arrow-icon {
  color: #969799;
}

.swipe-btn {
  height: 100%;
}

.color-hex-input {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.hex-text {
  flex: 1;
  border: none;
  font-size: 14px;
  font-family: monospace;
  color: #323233;
  background: transparent;
}

.hex-text:focus {
  outline: none;
}

.hex-picker {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  cursor: pointer;
  background: transparent;
}

.hex-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.hex-picker::-webkit-color-swatch {
  border: 1px solid #ebedf0;
  border-radius: 4px;
}

.preview-swatch {
  width: 60px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}
</style>
