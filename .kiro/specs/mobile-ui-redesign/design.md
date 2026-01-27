# Design Document

## Overview

本设计文档描述了 3D 打印耗材管理系统的移动端专用界面架构。采用移动优先的设计理念，通过设备检测自动切换布局，为手机用户提供原生 App 般的操作体验。

核心设计原则：

- **渐进式增强**：在现有 Vue 项目基础上增加移动端组件，不影响 PC 端功能
- **组件复用**：移动端组件与 PC 端共享 stores 和 API 层
- **响应式切换**：通过 composable 实现设备检测和布局切换
- **触摸优先**：所有交互元素尺寸和间距针对触摸操作优化

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.vue                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              useDeviceDetector()                        ││
│  │         isMobile ? MobileLayout : DesktopLayout         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│     Desktop Layout      │     │     Mobile Layout       │
│   (现有PC端页面)         │     │   (新移动端页面)         │
│                         │     │                         │
│  - HomeView.vue         │     │  - MobileHome.vue       │
│  - ConsumablesView.vue  │     │  - MobileConsumables.vue│
│  - DashboardView.vue    │     │  - MobileDashboard.vue  │
│  - ...                  │     │  - ...                  │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
              ┌─────────────────────────────┐
              │      Shared Layer           │
              │  - stores/ (Pinia)          │
              │  - api/client.ts            │
              │  - types/                   │
              └─────────────────────────────┘
```

### 目录结构

```
frontend/src/
├── composables/
│   └── useDeviceDetector.ts      # 设备检测composable
├── components/
│   └── mobile/                   # 移动端组件
│       ├── MobileLayout.vue      # 移动端布局容器
│       ├── BottomNav.vue         # 底部导航栏
│       ├── MobileHeader.vue      # 移动端头部
│       ├── SwipeCard.vue         # 滑动卡片
│       ├── ActionSheet.vue       # 底部操作面板
│       ├── PullRefresh.vue       # 下拉刷新
│       ├── MobileForm.vue        # 移动端表单容器
│       ├── MobileSelect.vue      # 移动端选择器
│       ├── Toast.vue             # 轻提示
│       └── Skeleton.vue          # 骨架屏
├── views/
│   └── mobile/                   # 移动端页面
│       ├── MobileHome.vue        # 移动端首页
│       ├── MobileConsumables.vue # 移动端耗材管理
│       ├── MobileDashboard.vue   # 移动端仪表盘
│       ├── MobileAccessories.vue # 移动端配件管理
│       ├── MobileUsages.vue      # 移动端使用记录
│       ├── MobileMaintenance.vue # 移动端保养记录
│       ├── MobileMore.vue        # 移动端更多页面
│       ├── MobileBrands.vue      # 移动端品牌管理
│       ├── MobileTypes.vue       # 移动端类型管理
│       ├── MobileBackup.vue      # 移动端数据备份
│       └── MobileLogin.vue       # 移动端登录
└── router/
    └── index.ts                  # 更新路由配置
```

## Components and Interfaces

### 1. useDeviceDetector Composable

```typescript
// composables/useDeviceDetector.ts
interface DeviceInfo {
  isMobile: Ref<boolean>;
  isTablet: Ref<boolean>;
  isDesktop: Ref<boolean>;
  screenWidth: Ref<number>;
  orientation: Ref<"portrait" | "landscape">;
}

function useDeviceDetector(): DeviceInfo {
  // 检测逻辑：
  // 1. 监听 window.innerWidth
  // 2. 检测 User-Agent
  // 3. 响应 resize 和 orientationchange 事件
  // 断点：mobile < 768px, tablet 768-1024px, desktop > 1024px
}
```

### 2. MobileLayout Component

```typescript
// components/mobile/MobileLayout.vue
interface MobileLayoutProps {
  showHeader?: boolean;
  showNav?: boolean;
  title?: string;
  showBack?: boolean;
}

interface MobileLayoutSlots {
  default: () => VNode;
  header?: () => VNode;
  headerRight?: () => VNode;
}
```

### 3. BottomNav Component

```typescript
// components/mobile/BottomNav.vue
interface NavItem {
  name: string;
  path: string;
  icon: string;
  label: string;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
  activeIndex: number;
}

interface BottomNavEmits {
  (e: "change", index: number): void;
}
```

### 4. SwipeCard Component

```typescript
// components/mobile/SwipeCard.vue
interface SwipeAction {
  text: string;
  color: string;
  icon?: string;
  action: () => void;
}

interface SwipeCardProps {
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number; // 触发阈值，默认80px
}

interface SwipeCardEmits {
  (e: "click"): void;
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
}
```

### 5. ActionSheet Component

```typescript
// components/mobile/ActionSheet.vue
interface ActionItem {
  text: string;
  value: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  actions: ActionItem[];
  cancelText?: string;
}

interface ActionSheetEmits {
  (e: "update:visible", value: boolean): void;
  (e: "select", action: ActionItem): void;
  (e: "cancel"): void;
}
```

### 6. PullRefresh Component

```typescript
// components/mobile/PullRefresh.vue
interface PullRefreshProps {
  loading: boolean;
  pullText?: string;
  releaseText?: string;
  loadingText?: string;
  threshold?: number; // 触发阈值，默认60px
}

interface PullRefreshEmits {
  (e: "refresh"): void;
}
```

### 7. MobileForm Component

```typescript
// components/mobile/MobileForm.vue
interface MobileFormProps {
  visible: boolean;
  title: string;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
}

interface MobileFormEmits {
  (e: "update:visible", value: boolean): void;
  (e: "submit"): void;
  (e: "cancel"): void;
}
```

### 8. Toast Service

```typescript
// composables/useToast.ts
interface ToastOptions {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number; // 默认2000ms
  position?: "top" | "center" | "bottom";
}

interface ToastService {
  show(options: ToastOptions): void;
  success(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  info(message: string): void;
}

function useToast(): ToastService;
```

## Data Models

移动端复用现有的数据模型，不需要新增数据结构。主要使用的类型：

```typescript
// 复用现有stores中的类型
import type { Consumable, ConsumableFormData } from "@/stores/consumable";
import type { Brand } from "@/stores/brand";
import type { ConsumableType } from "@/stores/consumableType";
import type { Accessory } from "@/stores/accessory";
import type { UsageRecord } from "@/stores/usageRecord";
import type { MaintenanceRecord } from "@/stores/maintenance";
import type { DashboardStats, InventoryData } from "@/stores/dashboard";
```

### 移动端特有的视图模型

```typescript
// 首页快捷入口
interface QuickAction {
  id: string;
  icon: string;
  label: string;
  route: string;
  badge?: number;
  color?: string;
}

// 底部导航配置
interface BottomNavConfig {
  items: NavItem[];
}

// 筛选状态
interface MobileFilterState {
  brandId: string;
  typeId: string;
  color: string;
  isOpened: string;
  isActive: boolean;
  activeCount: number;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

基于需求分析，以下是可测试的正确性属性：

### Property 1: 设备检测阈值判断

_For any_ 屏幕宽度值，当宽度小于 768px 时，设备检测器应返回 `isMobile: true`；当宽度大于等于 768px 时，应返回 `isMobile: false`。

**Validates: Requirements 1.2, 1.3**

### Property 2: 警告状态显示逻辑

_For any_ 耗材或配件数据，当存在低库存（剩余量低于阈值）或配件需要更换（超过更换周期）时，系统应正确计算并返回警告状态为 true。

**Validates: Requirements 2.5, 8.3**

### Property 3: 筛选逻辑正确性

_For any_ 筛选条件组合（品牌、类型、颜色、开封状态），筛选后的结果列表中的每一项都应满足所有指定的筛选条件，且活跃筛选数量应等于非空筛选条件的数量。

**Validates: Requirements 5.3, 5.4**

### Property 4: 卡片信息完整性

_For any_ 数据项（耗材、配件、使用记录、保养记录、品牌/类型），渲染的卡片组件应包含该类型所有必要的显示字段。

**Validates: Requirements 4.2, 8.2, 9.2, 10.2, 12.2**

### Property 5: 配件分组正确性

_For any_ 配件列表，按分类分组后，每个分组内的所有配件应具有相同的分类 ID，且所有配件都应被分配到某个分组中。

**Validates: Requirements 8.1**

### Property 6: 使用记录时间排序

_For any_ 使用记录列表，显示的记录应按使用日期降序排列（最近的在前）。

**Validates: Requirements 9.1**

## Error Handling

### 网络错误处理

```typescript
// 统一的错误处理
interface ErrorHandler {
  // 网络请求失败
  onNetworkError(error: Error): void;
  // API返回错误
  onApiError(status: number, message: string): void;
  // 表单验证错误
  onValidationError(errors: Record<string, string>): void;
}

// 移动端错误展示
// 1. 网络错误：显示Toast提示"网络连接失败，请检查网络"
// 2. API错误：显示Toast提示具体错误信息
// 3. 表单错误：在对应输入框下方显示红色错误文字
// 4. 加载失败：显示空状态页面，带重试按钮
```

### 边界情况处理

1. **空数据状态**：显示友好的空状态插图和提示文字
2. **加载状态**：显示骨架屏或加载动画
3. **离线状态**：检测网络状态，离线时显示提示
4. **Token 过期**：自动跳转登录页面

## Testing Strategy

### 单元测试

使用 Vitest 进行单元测试：

1. **Composables 测试**

   - `useDeviceDetector`: 测试不同屏幕宽度下的检测结果
   - `useToast`: 测试 Toast 显示和自动关闭

2. **工具函数测试**
   - 筛选函数
   - 分组函数
   - 格式化函数

### 属性测试

使用 fast-check 进行属性测试：

```typescript
// 配置：每个属性测试运行100次迭代
// 标签格式：Feature: mobile-ui-redesign, Property N: property_text

// Property 1: 设备检测阈值判断
test("Property 1: 设备检测阈值判断", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 2000 }), (width) => {
      const result = detectDevice(width);
      if (width < 768) {
        return result.isMobile === true;
      } else {
        return result.isMobile === false;
      }
    }),
    { numRuns: 100 }
  );
});

// Property 3: 筛选逻辑正确性
test("Property 3: 筛选逻辑正确性", () => {
  fc.assert(
    fc.property(
      fc.array(consumableArbitrary),
      filterArbitrary,
      (consumables, filter) => {
        const result = applyFilter(consumables, filter);
        return result.every((item) => matchesFilter(item, filter));
      }
    ),
    { numRuns: 100 }
  );
});
```

### 组件测试

使用 Vue Test Utils 进行组件测试：

1. **布局组件**：验证正确渲染和插槽内容
2. **交互组件**：验证事件触发和状态变化
3. **表单组件**：验证输入和验证逻辑

### E2E 测试

使用 Playwright 进行端到端测试：

1. **设备模拟**：使用移动设备视口测试
2. **核心流程**：登录、查看耗材、添加记录等
3. **手势操作**：滑动、下拉刷新等
