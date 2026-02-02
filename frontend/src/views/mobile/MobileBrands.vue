<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBrandStore, type Brand } from '@/stores/brand';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const router = useRouter();
const brandStore = useBrandStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const editingBrand = ref<Brand | null>(null);

// 表单数据
const formData = ref({
  name: '',
  website: '',
  description: '',
});

onMounted(async () => {
  await brandStore.fetchBrands();
});

async function handleRefresh() {
  isRefreshing.value = true;
  await brandStore.fetchBrands();
  isRefreshing.value = false;
}

function openCreateForm() {
  editingBrand.value = null;
  formData.value = {
    name: '',
    website: '',
    description: '',
  };
  showForm.value = true;
}

function openEditForm(brand: Brand) {
  editingBrand.value = brand;
  formData.value = {
    name: brand.name,
    website: brand.website || '',
    description: brand.description || '',
  };
  showForm.value = true;
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    toast.error('请输入品牌名称');
    return;
  }

  const submitData = {
    name: formData.value.name.trim(),
    website: formData.value.website || undefined,
    description: formData.value.description || undefined,
  };

  if (editingBrand.value) {
    const result = await brandStore.updateBrand(editingBrand.value.id, submitData);
    if (result) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(brandStore.error || '更新失败');
    }
  } else {
    const result = await brandStore.createBrand(submitData);
    if (result) {
      toast.success('添加成功');
      showForm.value = false;
    } else {
      toast.error(brandStore.error || '添加失败');
    }
  }
}

async function handleDelete(brand: Brand) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除品牌 "${brand.name}" 吗？`,
    });
    const success = await brandStore.deleteBrand(brand.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(brandStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}

function goToColors(brand: Brand) {
  router.push({ name: 'MobileBrandColors', params: { brandId: brand.id } });
}
</script>

<template>
  <MobileLayout title="品牌管理" :show-back="true" :show-tabbar="false">
    <template #headerRight>
      <van-icon name="plus" size="20" @click="openCreateForm" />
    </template>
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="brands-page">
        <!-- 加载状态 -->
        <div v-if="brandStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="1" v-for="i in 5" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="brandStore.brands.length === 0"
          image="default"
          description="暂无品牌数据"
          button-text="添加品牌"
          @click="openCreateForm"
        />

        <!-- 品牌列表 -->
        <van-cell-group v-else inset>
          <van-swipe-cell v-for="brand in brandStore.brands" :key="brand.id">
            <van-cell
              :title="brand.name"
              :label="brand.website || ''"
              is-link
              @click="openEditForm(brand)"
            >
              <template #right-icon>
                <van-button
                  size="small"
                  plain
                  type="primary"
                  icon="color"
                  @click.stop="goToColors(brand)"
                >
                  颜色
                </van-button>
              </template>
            </van-cell>

            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                class="swipe-btn"
                @click="handleDelete(brand)"
              />
            </template>
          </van-swipe-cell>
        </van-cell-group>
      </div>
    </van-pull-refresh>

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="editingBrand ? '编辑品牌' : '新增品牌'"
      :loading="brandStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-field
          v-model="formData.name"
          label="品牌名称"
          required
          placeholder="请输入品牌名称"
        />

        <van-field
          v-model="formData.website"
          label="官网"
          placeholder="可选"
        />

        <van-field
          v-model="formData.description"
          label="描述"
          type="textarea"
          rows="2"
          placeholder="可选描述"
        />
      </van-cell-group>
    </FormPopup>
  </MobileLayout>
</template>

<style scoped>
.brands-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.swipe-btn {
  height: 100%;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}
</style>
