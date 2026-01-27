# Implementation Plan: Mobile UI Redesign

## Overview

为 3D 打印耗材管理系统实现专门的移动端界面。采用渐进式方式，先创建基础组件和布局，然后逐步实现各功能页面。

## Tasks

- [x] 1. 创建设备检测和基础布局

  - [x] 1.1 创建 useDeviceDetector composable
    - 实现屏幕宽度检测逻辑
    - 监听 resize 和 orientationchange 事件
    - 导出 isMobile, isTablet, isDesktop, screenWidth
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]\* 1.2 编写设备检测属性测试
    - **Property 1: 设备检测阈值判断**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 1.3 创建 MobileLayout 组件
    - 实现移动端页面容器
    - 包含头部插槽和内容区域
    - 支持 showHeader, showNav, title, showBack 属性
    - _Requirements: 1.5_
  - [x] 1.4 创建 BottomNav 底部导航组件
    - 实现 5 个导航项（首页、耗材、配件、记录、更多）
    - 固定在底部，高度 56px
    - 支持图标+文字显示，支持徽章
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 1.5 创建 MobileHeader 头部组件
    - 实现返回按钮、标题、右侧操作区
    - 固定在顶部
    - _Requirements: 2.1_

- [x] 2. 创建移动端通用组件

  - [x] 2.1 创建 SwipeCard 滑动卡片组件
    - 支持左滑、右滑显示操作按钮
    - 支持点击事件
    - 滑动阈值 80px
    - _Requirements: 4.3, 4.4, 12.3_
  - [x] 2.2 创建 ActionSheet 底部操作面板组件
    - 支持标题、操作列表、取消按钮
    - 滑入/滑出动画
    - _Requirements: 5.1, 8.4, 15.3_
  - [x] 2.3 创建 PullRefresh 下拉刷新组件
    - 支持下拉触发刷新
    - 显示加载状态
    - 阈值 60px
    - _Requirements: 4.5, 7.5_
  - [x] 2.4 创建 MobileForm 移动端表单容器
    - 全屏模态展示
    - 支持标题、提交、取消
    - 大尺寸输入框（44px 高度）
    - _Requirements: 6.1, 6.2_
  - [x] 2.5 创建 Toast 轻提示组件和 useToast composable
    - 支持 success, error, warning, info 类型
    - 自动关闭（默认 2000ms）
    - 支持顶部、中间、底部位置
    - _Requirements: 6.6, 13.5, 14.4_
  - [x] 2.6 创建 Skeleton 骨架屏组件
    - 支持卡片、列表、文本骨架
    - _Requirements: 15.5_

- [x] 3. Checkpoint - 基础组件完成

  - 确保所有基础组件可正常渲染
  - 确保所有测试通过，如有问题请询问用户

- [x] 4. 更新路由配置和 App 入口

  - [x] 4.1 更新 App.vue 添加设备检测和布局切换
    - 使用 useDeviceDetector 检测设备
    - 根据 isMobile 切换布局
    - _Requirements: 1.2, 1.3_
  - [x] 4.2 更新路由配置支持移动端页面
    - 添加移动端页面路由
    - 保持 PC 端路由不变
    - _Requirements: 2.4, 11.3, 11.4, 11.5_

- [x] 5. 实现移动端首页

  - [x] 5.1 创建 MobileHome 页面
    - 显示欢迎信息和用户名
    - 显示库存概览卡片
    - 显示功能入口网格
    - 显示警告徽章
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]\* 5.2 编写警告状态显示属性测试
    - **Property 2: 警告状态显示逻辑**
    - **Validates: Requirements 2.5, 8.3**

- [x] 6. 实现移动端耗材管理

  - [x] 6.1 创建筛选工具函数
    - 实现 applyFilter 函数
    - 实现 countActiveFilters 函数
    - _Requirements: 5.3, 5.4_
  - [ ]\* 6.2 编写筛选逻辑属性测试
    - **Property 3: 筛选逻辑正确性**
    - **Validates: Requirements 5.3, 5.4**
  - [x] 6.3 创建 MobileConsumables 页面
    - 使用 SwipeCard 展示耗材列表
    - 集成 PullRefresh 下拉刷新
    - 集成 ActionSheet 筛选面板
    - 实现新增/编辑表单
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]\* 6.4 编写卡片信息完整性属性测试
    - **Property 4: 卡片信息完整性**
    - **Validates: Requirements 4.2**

- [x] 7. Checkpoint - 耗材管理完成

  - 确保耗材列表、筛选、新增、编辑、删除功能正常
  - 确保所有测试通过，如有问题请询问用户

- [x] 8. 实现移动端仪表盘

  - [x] 8.1 创建 MobileDashboard 页面
    - 显示统计数据卡片（2x2 网格）
    - 显示总体使用进度条
    - 显示低库存警告卡片
    - 支持横向滑动切换视图
    - 集成 PullRefresh
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. 实现移动端配件管理

  - [x] 9.1 创建配件分组工具函数
    - 实现 groupByCategory 函数
    - _Requirements: 8.1_
  - [ ]\* 9.2 编写配件分组属性测试
    - **Property 5: 配件分组正确性**
    - **Validates: Requirements 8.1**
  - [x] 9.3 创建 MobileAccessories 页面
    - 按分类分组显示配件
    - 使用 SwipeCard 展示配件卡片
    - 显示警告标识
    - 集成 ActionSheet 操作面板
    - 实现记录更换表单
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. 实现移动端使用记录

  - [x] 10.1 创建使用记录排序工具函数
    - 实现按日期降序排序
    - _Requirements: 9.1_
  - [ ]\* 10.2 编写使用记录排序属性测试
    - **Property 6: 使用记录时间排序**
    - **Validates: Requirements 9.1**
  - [x] 10.3 创建 MobileUsages 页面
    - 显示使用记录列表
    - 使用 SwipeCard 展示记录卡片
    - 实现新增使用记录表单
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. 实现移动端保养记录

  - [x] 11.1 创建 MobileMaintenance 页面
    - 显示保养记录时间线
    - 使用卡片展示记录
    - 实现新增保养记录表单
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Checkpoint - 核心功能完成

  - 确保仪表盘、配件、使用记录、保养记录功能正常
  - 确保所有测试通过，如有问题请询问用户

- [x] 13. 实现移动端更多页面和次要功能

  - [x] 13.1 创建 MobileMore 页面
    - 显示功能列表入口
    - 实现退出登录确认
    - _Requirements: 11.1, 11.2, 11.6_
  - [x] 13.2 创建 MobileBrands 品牌管理页面
    - 显示品牌列表
    - 支持滑动删除
    - 实现新增/编辑表单
    - _Requirements: 11.3, 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 13.3 创建 MobileTypes 类型管理页面
    - 显示类型列表
    - 支持滑动删除
    - 实现新增/编辑表单
    - _Requirements: 11.4, 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 13.4 创建 MobileBackup 数据备份页面
    - 显示备份操作按钮
    - 实现 JSON/Excel 导出
    - _Requirements: 11.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 14. 实现移动端登录页面

  - [x] 14.1 创建 MobileLogin 页面
    - 居中显示登录表单
    - 大尺寸输入框和按钮
    - 密码可见性切换
    - 登录成功/失败反馈
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15. 添加动画和交互优化

  - [x] 15.1 添加页面切换过渡动画
    - 使用 Vue Transition 组件
    - _Requirements: 15.1_
  - [x] 15.2 添加按钮点击涟漪效果
    - 创建 ripple 指令
    - _Requirements: 15.2_
  - [x] 15.3 优化弹出面板动画
    - ActionSheet 滑入/滑出
    - MobileForm 淡入/淡出
    - _Requirements: 15.3_
  - [x] 15.4 添加列表项删除动画
    - 使用 TransitionGroup
    - _Requirements: 15.4_

- [x] 16. Final Checkpoint - 全部功能完成
  - 确保所有页面和功能正常工作
  - 确保所有测试通过
  - 使用 Playwright 进行移动端 E2E 测试
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选测试任务，可跳过以加快 MVP 开发
- 每个任务引用了具体的需求编号以便追溯
- Checkpoint 任务用于阶段性验证
- 属性测试验证核心业务逻辑的正确性
- 单元测试验证具体示例和边界情况
