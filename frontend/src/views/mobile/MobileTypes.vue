<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConsumableTypeStore, type ConsumableType } from '@/stores/consumableType';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import FormPopup from '@/components/mobile/FormPopup.vue';
import EmptyState from '@/components/mobile/EmptyState.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const typeStore = useConsumableTypeStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const editingType = ref<ConsumableType | null>(null);

// 表单数据
const formData = ref({
  name: '',
  description: '',
});

onMounted(async () => {
  await typeStore.fetchTypes();
});

async function handleRefresh() {
  isRefreshing.value = true;
  await typeStore.fetchTypes();
  isRefreshing.value = false;
}

function openCreateForm() {
  editingType.value = null;
  formData.value = {
    name: '',
    description: '',
  };
  showForm.value = true;
}

function openEditForm(type: ConsumableType) {
  editingType.value = type;
  formData.value = {
    name: type.name,
    description: type.description || '',
  };
  showForm.value = true;
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    toast.error('请输入类型名称');
    return;
  }

  const submitData = {
    name: formData.value.name.trim(),
    description: formData.value.description || undefined,
  };

  if (editingType.value) {
    const result = await typeStore.updateType(editingType.value.id, submitData);
    if (result) {
      toast.success('更新成功');
      showForm.value = false;
    } else {
      toast.error(typeStore.error || '更新失败');
    }
  } else {
    const result = await typeStore.createType(submitData);
    if (result) {
      toast.success('添加成功');
      showForm.value = false;
    } else {
      toast.error(typeStore.error || '添加失败');
    }
  }
}

async function handleDelete(type: ConsumableType) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除类型 "${type.name}" 吗？`,
    });
    const success = await typeStore.deleteType(type.id);
    if (success) {
      toast.success('删除成功');
    } else {
      toast.error(typeStore.error || '删除失败');
    }
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <MobileLayout title="类型管理" :show-back="true" :show-tabbar="false">
    <template #headerRight>
      <van-icon name="plus" size="20" @click="openCreateForm" />
    </template>
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="types-page">
        <!-- 加载状态 -->
        <div v-if="typeStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="1" v-for="i in 5" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="typeStore.types.length === 0"
          image="default"
          description="暂无类型数据"
          button-text="添加类型"
          @click="openCreateForm"
        />

        <!-- 类型列表 -->
        <van-cell-group v-else inset>
          <van-swipe-cell v-for="type in typeStore.types" :key="type.id">
            <van-cell
              :title="type.name"
              :label="type.description || ''"
              is-link
              @click="openEditForm(type)"
            />

            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                class="swipe-btn"
                @click="handleDelete(type)"
              />
            </template>
          </van-swipe-cell>
        </van-cell-group>
      </div>
    </van-pull-refresh>

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="editingType ? '编辑类型' : '新增类型'"
      :loading="typeStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <van-field
          v-model="formData.name"
          label="类型名称"
          required
          placeholder="如: PLA, ABS, PETG"
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
.types-page {
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
