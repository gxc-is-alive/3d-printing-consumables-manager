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
    return `${(weight / 1000).toFixed(2)}kg`;
  }
  return `${weight.toFixed(0)}g`;
}

// 格式化金额
function formatMoney(amount: number): string {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(2)}万`;
  }
  return `¥${amount.toFixed(2)}`;
}

// 低库存耗材
const lowStockItems = computed(() => dashboardStore.stats?.lowStockItems || []);

// 配件警告
const accessoryAlerts = computed(() => accessoryStore.alerts || []);

// 价格趋势数据
const priceStats = computed(() => dashboardStore.priceStats);

onMounted(async () => {
  await Promise.all([
    dashboardStore.fetchAll(),
    dashboardStore.fetchPriceStats(),
    accessoryStore.fetchAlerts(),
  ]);
});

async function handleRefresh() {
  isRefreshing.value = true;
  await Promise.all([
    dashboardStore.fetchAll(),
    dashboardStore.fetchPriceStats(),
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

          <van-tab title="价格" name="price">
            <div class="tab-content">
              <van-skeleton :loading="dashboardStore.isLoading" :row="6">
                <!-- 价格统计卡片 -->
                <div v-if="priceStats" class="price-section">
                  <div class="stats-grid">
                    <StatsCard
                      :value="`¥${priceStats.averagePrice.toFixed(2)}`"
                      label="平均价格"
                      icon="chart-trending-o"
                      color="#42b883"
                    />
                    <StatsCard
                      :value="`¥${priceStats.minPrice.toFixed(2)} - ¥${priceStats.maxPrice.toFixed(2)}`"
                      label="价格区间"
                      icon="bar-chart-o"
                      color="#4a90d9"
                    />
                  </div>

                  <!-- 价格趋势图 -->
                  <div v-if="priceStats.trend.length > 0" class="chart-section">
                    <h3 class="section-title">价格趋势</h3>
                    <div class="price-chart">
                      <div class="chart-container">
                        <div class="chart-y-axis">
                          <span>¥{{ priceStats.maxPrice.toFixed(2) }}</span>
                          <span>¥{{ priceStats.averagePrice.toFixed(2) }}</span>
                          <span>¥{{ priceStats.minPrice.toFixed(2) }}</span>
                        </div>
                        <div class="chart-area">
                          <!-- 均值线 -->
                          <div 
                            class="avg-line" 
                            :style="{ 
                              bottom: `${((priceStats.averagePrice - priceStats.minPrice) / (priceStats.maxPrice - priceStats.minPrice || 1)) * 100}%` 
                            }"
                          >
                            <span class="avg-label">均值</span>
                          </div>
                          <!-- 数据点 -->
                          <div class="chart-points">
                            <div
                              v-for="(item, index) in priceStats.trend"
                              :key="index"
                              class="chart-point"
                              :style="{
                                left: `${(index / (priceStats.trend.length - 1 || 1)) * 100}%`,
                                bottom: `${((item.price - priceStats.minPrice) / (priceStats.maxPrice - priceStats.minPrice || 1)) * 100}%`
                              }"
                              :title="`${item.date}: ¥${item.price} - ${item.brandName} ${item.color}`"
                            />
                          </div>
                          <!-- 连线 -->
                          <svg class="chart-line" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polyline
                              :points="priceStats!.trend.map((item, index) => 
                                `${(index / (priceStats!.trend.length - 1 || 1)) * 100},${100 - ((item.price - priceStats!.minPrice) / (priceStats!.maxPrice - priceStats!.minPrice || 1)) * 100}`
                              ).join(' ')"
                              fill="none"
                              stroke="#42b883"
                              stroke-width="0.5"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 价格历史列表 -->
                  <div class="history-section">
                    <h3 class="section-title">入库记录 ({{ priceStats.totalCount }})</h3>
                    <van-cell-group inset>
                      <van-cell
                        v-for="(item, index) in priceStats.trend.slice().reverse().slice(0, 10)"
                        :key="index"
                        :title="`${item.brandName} ${item.color}`"
                        :label="item.date"
                      >
                        <template #value>
                          <span class="price-value">¥{{ item.price.toFixed(2) }}</span>
                        </template>
                      </van-cell>
                    </van-cell-group>
                  </div>
                </div>

                <van-empty v-else image="search" description="暂无价格数据" />
              </van-skeleton>
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

.price-section {
  margin-bottom: 20px;
}

.chart-section {
  margin: 20px 0;
}

.price-chart {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.chart-container {
  display: flex;
  height: 160px;
}

.chart-y-axis {
  width: 50px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  color: #969799;
  padding-right: 8px;
  text-align: right;
}

.chart-area {
  flex: 1;
  position: relative;
  border-left: 1px solid #ebedf0;
  border-bottom: 1px solid #ebedf0;
}

.avg-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed #e6a23c;
}

.avg-label {
  position: absolute;
  right: 0;
  top: -10px;
  font-size: 10px;
  color: #e6a23c;
  background: #fff;
  padding: 0 4px;
}

.chart-points {
  position: absolute;
  inset: 0;
}

.chart-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #42b883;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  cursor: pointer;
  z-index: 2;
}

.chart-point:hover {
  transform: translate(-50%, 50%) scale(1.5);
}

.chart-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.history-section {
  margin-top: 20px;
}

.price-value {
  font-size: 15px;
  font-weight: 600;
  color: #42b883;
}
</style>
