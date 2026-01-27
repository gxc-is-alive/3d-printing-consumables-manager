<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { useAccessoryStore } from '@/stores/accessory';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import StatsCard from '@/components/mobile/StatsCard.vue';

const dashboardStore = useDashboardStore();
const accessoryStore = useAccessoryStore();

const isRefreshing = ref(false);
const activeTab = ref('overview');

// 格式化重量
function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)}kg`;
  }
  return `${weight}g`;
}

// 格式化金额
function formatMoney(amount: number): string {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(1)}万`;
  }
  return `¥${amount.toFixed(0)}`;
}

// 低库存耗材
const lowStockItems = computed(() => dashboardStore.stats?.lowStockItems || []);

// 配件警告
const accessoryAlerts = computed(() => accessoryStore.alerts || []);

onMounted(async () => {
  await Promise.all([
    dashboardStore.fetchAll(),
    accessoryStore.fetchAlerts(),
  ]);
});

async function handleRefresh() {
  isRefreshing.value = true;
  await Promise.all([
    dashboardStore.fetchAll(),
    accessoryStore.fetchAlerts(),
  ]);
  isRefreshing.value = false;
}
</script>

<template>
  <MobileLayout title="仪表盘" :show-back="true" :show-tabbar="false">
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="dashboard-page">
        <!-- Tab 切换 -->
        <van-tabs v-model:active="activeTab" sticky>
          <van-tab title="概览" name="overview">
            <div class="tab-content">
              <!-- 统计卡片 -->
              <van-skeleton :loading="dashboardStore.isLoading" :row="4">
                <div class="stats-section">
                  <div class="stats-grid">
                    <StatsCard
                      :value="dashboardStore.stats?.totalConsumables || 0"
                      label="耗材总数"
                      icon="goods-collect-o"
                      color="#42b883"
                    />
                    <StatsCard
                      :value="formatWeight(dashboardStore.stats?.totalRemainingWeight || 0)"
                      label="剩余总量"
                      icon="balance-o"
                      color="#4a90d9"
                    />
                    <StatsCard
                      :value="dashboardStore.stats?.openedCount || 0"
                      label="已开封"
                      icon="completed"
                      color="#e6a23c"
                    />
                    <StatsCard
                      :value="dashboardStore.stats?.unopenedCount || 0"
                      label="未开封"
                      icon="gift-o"
                      color="#909399"
                    />
                  </div>
                </div>

                <!-- 价值统计 -->
                <div class="value-section">
                  <h3 class="section-title">资产价值</h3>
                  <van-cell-group inset>
                    <van-cell title="耗材总价值" :value="formatMoney(dashboardStore.stats?.totalSpending || 0)" />
                    <van-cell title="总重量" :value="formatWeight(dashboardStore.stats?.totalWeight || 0)" />
                    <van-cell title="剩余重量" :value="formatWeight(dashboardStore.stats?.totalRemainingWeight || 0)" />
                  </van-cell-group>
                </div>

                <!-- 品牌分布 -->
                <div v-if="dashboardStore.inventory?.byBrand?.length" class="distribution-section">
                  <h3 class="section-title">品牌分布</h3>
                  <van-cell-group inset>
                    <van-cell
                      v-for="item in dashboardStore.inventory.byBrand"
                      :key="item.brandId"
                      :title="item.brandName"
                      :value="`${item.count} 个`"
                    >
                      <template #label>
                        <van-progress
                          :percentage="Math.round((item.count / (dashboardStore.stats?.totalConsumables || 1)) * 100)"
                          :show-pivot="false"
                          stroke-width="4"
                          color="#42b883"
                        />
                      </template>
                    </van-cell>
                  </van-cell-group>
                </div>
              </van-skeleton>
            </div>
          </van-tab>

          <van-tab title="警告" name="alerts">
            <div class="tab-content">
              <!-- 低库存耗材 -->
              <div v-if="lowStockItems.length" class="alert-section">
                <h3 class="section-title warning">
                  <van-icon name="warning-o" />
                  低库存耗材 ({{ lowStockItems.length }})
                </h3>
                <van-cell-group inset>
                  <van-cell
                    v-for="item in lowStockItems"
                    :key="item.id"
                    :title="`${item.brandName} ${item.typeName}`"
                    :label="item.color"
                  >
                    <template #value>
                      <div class="alert-value">
                        <span class="remaining">{{ formatWeight(item.remainingWeight) }}</span>
                        <van-tag type="danger">{{ item.percentRemaining }}%</van-tag>
                      </div>
                    </template>
                  </van-cell>
                </van-cell-group>
              </div>

              <!-- 配件警告 -->
              <div v-if="accessoryAlerts.length" class="alert-section">
                <h3 class="section-title warning">
                  <van-icon name="warning-o" />
                  配件警告 ({{ accessoryAlerts.length }})
                </h3>
                <van-cell-group inset>
                  <van-cell
                    v-for="alert in accessoryAlerts"
                    :key="alert.id"
                    :title="alert.name"
                    :label="alert.message"
                  >
                    <template #value>
                      <van-tag :type="alert.type === 'low_stock' ? 'warning' : 'danger'">
                        {{ alert.type === 'low_stock' ? '低库存' : '需更换' }}
                      </van-tag>
                    </template>
                  </van-cell>
                </van-cell-group>
              </div>

              <!-- 无警告 -->
              <van-empty
                v-if="!lowStockItems.length && !accessoryAlerts.length"
                image="search"
                description="暂无警告信息"
              />
            </div>
          </van-tab>
        </van-tabs>
      </div>
    </van-pull-refresh>
  </MobileLayout>
</template>

<style scoped>
.dashboard-page {
  min-height: calc(100vh - 46px);
}

.tab-content {
  padding: 16px;
}

.stats-section {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title.warning {
  color: #ee0a24;
}

.value-section,
.distribution-section,
.alert-section {
  margin-bottom: 20px;
}

.alert-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.remaining {
  color: #ee0a24;
  font-weight: 500;
}

:deep(.van-tabs__nav) {
  background: #f7f8fa;
}

:deep(.van-tab--active) {
  color: #42b883;
}

:deep(.van-tabs__line) {
  background: #42b883;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-cell__label) {
  margin-top: 8px;
}
</style>
