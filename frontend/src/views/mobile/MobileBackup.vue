<script setup lang="ts">
import { ref } from 'vue';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import { useToast } from '@/composables/useToast';
import apiClient from '@/api/client';

const toast = useToast();
const isLoading = ref(false);

async function handleExportData() {
  isLoading.value = true;
  try {
    const response = await apiClient.get('/backup/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '3dprint-backup-' + new Date().toISOString().split('T')[0] + '.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('导出成功');
  } catch {
    toast.error('导出失败');
  } finally {
    isLoading.value = false;
  }
}

async function handleImportData(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    toast.error('请选择 JSON 格式的备份文件');
    input.value = '';
    return;
  }

  isLoading.value = true;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await apiClient.post('/backup/import', data);
    toast.success('导入成功，页面将在3秒后刷新');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      toast.error('无效的备份文件格式');
    } else {
      toast.error(error.response?.data?.error || '导入失败');
    }
  } finally {
    isLoading.value = false;
    input.value = '';
  }
}
</script>

<template>
  <MobileLayout title="数据备份" :show-back="true" :show-tabbar="false">
    <div class="backup-page">
      <van-notice-bar left-icon="info-o" text="备份包含所有耗材、配件、使用记录等数据。建议定期备份以防数据丢失。" />
      <div class="action-section">
        <van-cell-group inset>
          <van-cell title="导出数据" label="将所有数据导出为 JSON 文件" is-link :clickable="!isLoading" @click="handleExportData">
            <template #icon><van-icon name="down" color="#42b883" size="20" class="cell-icon" /></template>
            <template #right-icon>
              <van-loading v-if="isLoading" size="20" />
              <van-icon v-else name="arrow" />
            </template>
          </van-cell>
          <van-cell title="导入数据" label="从 JSON 文件恢复数据">
            <template #icon><van-icon name="upgrade" color="#4a90d9" size="20" class="cell-icon" /></template>
            <template #extra>
              <label class="import-label">
                <input type="file" accept=".json" class="import-input" :disabled="isLoading" @change="handleImportData" />
                <van-button size="small" type="primary" :loading="isLoading">选择文件</van-button>
              </label>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
      <div class="tips-section">
        <h3 class="section-title">注意事项</h3>
        <van-cell-group inset>
          <van-cell title="导出数据" label="导出的文件包含您的所有数据，请妥善保管" />
          <van-cell title="导入数据" label="导入会覆盖现有数据，请谨慎操作" />
          <van-cell title="定期备份" label="建议每周至少备份一次数据" />
        </van-cell-group>
      </div>
    </div>
  </MobileLayout>
</template>

<style scoped>
.backup-page { padding: 16px; padding-bottom: 32px; min-height: calc(100vh - 96px); }
.action-section { margin-top: 16px; }
.tips-section { margin-top: 24px; }
.section-title { font-size: 15px; font-weight: 600; color: #323233; margin: 0 0 12px 4px; }
.cell-icon { margin-right: 12px; }
.import-label { cursor: pointer; }
.import-input { display: none; }
:deep(.van-notice-bar) { border-radius: 8px; }
:deep(.van-cell-group--inset) { margin: 0; }
:deep(.van-button--primary) { background: #42b883; border-color: #42b883; }
</style>
