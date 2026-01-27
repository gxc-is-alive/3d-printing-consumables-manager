# Requirements Document

## Introduction

为 3D 打印耗材管理系统设计一套专门针对移动端的用户界面。现有界面是从 PC 端直接适配的，在手机上体验较差。新的移动端界面将采用移动优先的设计理念，提供原生 App 般的操作体验，包括底部导航栏、卡片式布局、手势操作、下拉刷新等移动端常见交互模式。

## Glossary

- **Mobile_Layout**: 移动端布局系统，包含底部导航栏、页面容器、头部组件等基础布局组件
- **Bottom_Navigation**: 底部导航栏组件，提供主要功能模块的快速切换
- **Card_Component**: 卡片组件，用于展示列表项和数据摘要
- **Pull_Refresh**: 下拉刷新组件，用于刷新页面数据
- **Action_Sheet**: 底部弹出操作面板，用于展示操作选项
- **Swipe_Action**: 滑动操作组件，支持左滑删除、右滑编辑等手势
- **Mobile_Form**: 移动端表单组件，优化触摸输入体验
- **Toast**: 轻提示组件，用于操作反馈
- **Device_Detector**: 设备检测服务，用于判断当前设备类型并自动切换布局

## Requirements

### Requirement 1: 设备检测与布局切换

**User Story:** 作为用户，我希望系统能自动检测我的设备类型，在手机上显示移动端界面，在电脑上显示 PC 端界面，这样我可以在不同设备上获得最佳体验。

#### Acceptance Criteria

1. WHEN 用户访问系统 THEN THE Device_Detector SHALL 检测设备屏幕宽度和 User-Agent
2. WHEN 屏幕宽度小于 768px THEN THE Mobile_Layout SHALL 自动启用移动端布局
3. WHEN 屏幕宽度大于等于 768px THEN THE System SHALL 显示原有 PC 端布局
4. WHEN 用户旋转设备导致屏幕宽度变化 THEN THE System SHALL 实时响应并切换对应布局
5. WHEN 移动端布局启用时 THEN THE Bottom_Navigation SHALL 显示在屏幕底部

### Requirement 2: 移动端首页设计

**User Story:** 作为移动端用户，我希望首页能快速展示关键信息和常用功能入口，这样我可以高效地管理耗材。

#### Acceptance Criteria

1. WHEN 用户进入移动端首页 THEN THE System SHALL 显示简洁的欢迎信息和用户名
2. WHEN 首页加载完成 THEN THE System SHALL 显示库存概览卡片（总数、剩余量、低库存警告数）
3. WHEN 首页显示功能入口 THEN THE System SHALL 以大图标网格形式展示所有功能模块
4. WHEN 用户点击功能入口 THEN THE System SHALL 导航到对应的移动端页面
5. WHEN 存在低库存或配件提醒 THEN THE System SHALL 在首页顶部显示醒目的提醒徽章

### Requirement 3: 底部导航栏

**User Story:** 作为移动端用户，我希望通过底部导航栏快速切换主要功能，这样我可以单手操作手机。

#### Acceptance Criteria

1. THE Bottom_Navigation SHALL 固定显示在屏幕底部，高度适合拇指点击（约 56px）
2. THE Bottom_Navigation SHALL 包含 5 个主要入口：首页、耗材、配件、记录、更多
3. WHEN 用户点击导航项 THEN THE System SHALL 切换到对应页面并高亮当前项
4. WHEN 页面滚动时 THEN THE Bottom_Navigation SHALL 保持固定位置不随页面滚动
5. THE Bottom_Navigation SHALL 使用图标+文字的形式，图标大小不小于 24px

### Requirement 4: 移动端耗材列表

**User Story:** 作为移动端用户，我希望耗材列表以卡片形式展示，支持滑动操作，这样我可以快速浏览和管理耗材。

#### Acceptance Criteria

1. WHEN 用户进入耗材页面 THEN THE System SHALL 以垂直卡片列表形式展示耗材
2. THE Card_Component SHALL 显示颜色条、品牌、类型、颜色名、剩余量、开封状态
3. WHEN 用户左滑卡片 THEN THE Swipe_Action SHALL 显示删除按钮
4. WHEN 用户右滑卡片 THEN THE Swipe_Action SHALL 显示编辑和标记开封按钮
5. WHEN 用户下拉列表 THEN THE Pull_Refresh SHALL 触发数据刷新
6. WHEN 用户点击卡片 THEN THE System SHALL 展开显示详细信息

### Requirement 5: 移动端筛选功能

**User Story:** 作为移动端用户，我希望通过简洁的筛选面板快速过滤耗材，这样我可以找到需要的耗材。

#### Acceptance Criteria

1. WHEN 用户点击筛选按钮 THEN THE Action_Sheet SHALL 从底部弹出筛选面板
2. THE Action_Sheet SHALL 提供品牌、类型、颜色、开封状态的筛选选项
3. WHEN 用户选择筛选条件 THEN THE System SHALL 实时更新列表结果
4. WHEN 存在活跃筛选条件 THEN THE System SHALL 在筛选按钮上显示数量徽章
5. WHEN 用户点击重置按钮 THEN THE System SHALL 清除所有筛选条件

### Requirement 6: 移动端表单设计

**User Story:** 作为移动端用户，我希望表单输入体验流畅，适合触摸操作，这样我可以方便地添加和编辑数据。

#### Acceptance Criteria

1. WHEN 用户打开新增/编辑表单 THEN THE Mobile_Form SHALL 以全屏模态形式展示
2. THE Mobile_Form SHALL 使用大尺寸输入框（高度不小于 44px）
3. WHEN 用户点击选择框 THEN THE System SHALL 使用原生选择器或底部弹出选择面板
4. WHEN 用户点击颜色选择 THEN THE System SHALL 显示颜色选择器面板
5. WHEN 用户点击日期输入 THEN THE System SHALL 使用原生日期选择器
6. WHEN 表单提交成功 THEN THE Toast SHALL 显示成功提示并自动关闭表单

### Requirement 7: 移动端仪表盘

**User Story:** 作为移动端用户，我希望仪表盘信息紧凑清晰，支持横向滑动查看更多数据，这样我可以快速了解库存状况。

#### Acceptance Criteria

1. WHEN 用户进入仪表盘 THEN THE System SHALL 显示统计数据卡片（2x2 网格布局）
2. THE System SHALL 显示总体使用进度条，宽度占满屏幕
3. WHEN 存在低库存警告 THEN THE System SHALL 以醒目卡片形式展示在顶部
4. THE System SHALL 支持横向滑动切换品牌/类型/颜色分布视图
5. WHEN 用户下拉页面 THEN THE Pull_Refresh SHALL 刷新所有仪表盘数据

### Requirement 8: 移动端配件管理

**User Story:** 作为移动端用户，我希望配件管理界面简洁易用，支持快速记录更换，这样我可以方便地管理打印机配件。

#### Acceptance Criteria

1. WHEN 用户进入配件页面 THEN THE System SHALL 按分类分组显示配件列表
2. THE Card_Component SHALL 显示配件名称、分类、库存数量、上次更换时间
3. WHEN 配件需要更换或库存不足 THEN THE Card_Component SHALL 显示警告标识
4. WHEN 用户点击配件卡片 THEN THE Action_Sheet SHALL 显示操作选项（记录更换、调整库存、编辑、删除）
5. WHEN 用户记录更换 THEN THE Mobile_Form SHALL 显示简化的更换记录表单

### Requirement 9: 移动端使用记录

**User Story:** 作为移动端用户，我希望快速记录耗材使用情况，这样我可以追踪耗材消耗。

#### Acceptance Criteria

1. WHEN 用户进入使用记录页面 THEN THE System SHALL 显示最近的使用记录列表
2. THE Card_Component SHALL 显示耗材信息、使用量、使用日期、备注
3. WHEN 用户点击添加按钮 THEN THE Mobile_Form SHALL 显示使用记录表单
4. THE Mobile_Form SHALL 支持快速选择耗材（显示颜色预览）
5. WHEN 用户输入使用量 THEN THE System SHALL 显示数字键盘

### Requirement 10: 移动端保养记录

**User Story:** 作为移动端用户，我希望方便地记录打印机保养情况，这样我可以追踪维护历史。

#### Acceptance Criteria

1. WHEN 用户进入保养记录页面 THEN THE System SHALL 显示保养记录时间线
2. THE Card_Component SHALL 显示保养日期、保养类型、保养内容摘要
3. WHEN 用户点击添加按钮 THEN THE Mobile_Form SHALL 显示保养记录表单
4. THE Mobile_Form SHALL 提供常用保养类型的快速选择
5. WHEN 用户点击记录卡片 THEN THE System SHALL 展开显示完整保养内容

### Requirement 11: 移动端更多页面

**User Story:** 作为移动端用户，我希望在更多页面访问次要功能和设置，这样我可以管理账户和数据。

#### Acceptance Criteria

1. WHEN 用户进入更多页面 THEN THE System SHALL 显示功能列表（品牌管理、类型管理、数据备份、捐赠、退出登录）
2. THE System SHALL 以列表形式展示各功能入口，每项高度不小于 48px
3. WHEN 用户点击品牌管理 THEN THE System SHALL 导航到移动端品牌管理页面
4. WHEN 用户点击类型管理 THEN THE System SHALL 导航到移动端类型管理页面
5. WHEN 用户点击数据备份 THEN THE System SHALL 导航到移动端备份页面
6. WHEN 用户点击退出登录 THEN THE System SHALL 显示确认对话框

### Requirement 12: 移动端品牌和类型管理

**User Story:** 作为移动端用户，我希望在手机上也能管理品牌和耗材类型，这样我可以随时维护基础数据。

#### Acceptance Criteria

1. WHEN 用户进入品牌/类型管理页面 THEN THE System SHALL 显示简洁的列表视图
2. THE Card_Component SHALL 显示名称、描述（如有）、关联耗材数量
3. WHEN 用户左滑卡片 THEN THE Swipe_Action SHALL 显示删除按钮
4. WHEN 用户点击卡片 THEN THE Mobile_Form SHALL 显示编辑表单
5. WHEN 用户点击添加按钮 THEN THE Mobile_Form SHALL 显示新增表单

### Requirement 13: 移动端数据备份

**User Story:** 作为移动端用户，我希望在手机上也能备份和导出数据，这样我可以保护我的数据安全。

#### Acceptance Criteria

1. WHEN 用户进入备份页面 THEN THE System SHALL 显示备份操作按钮
2. WHEN 用户点击导出 JSON THEN THE System SHALL 下载 JSON 格式的备份文件
3. WHEN 用户点击导出 Excel THEN THE System SHALL 下载 Excel 格式的报表
4. WHEN 导出操作进行中 THEN THE System SHALL 显示加载状态
5. WHEN 导出完成 THEN THE Toast SHALL 显示成功提示

### Requirement 14: 移动端登录注册

**User Story:** 作为移动端用户，我希望登录和注册界面简洁美观，适合手机操作，这样我可以方便地访问系统。

#### Acceptance Criteria

1. WHEN 用户访问登录页面 THEN THE System SHALL 显示居中的登录表单
2. THE Mobile_Form SHALL 使用大尺寸输入框和按钮
3. WHEN 用户点击密码输入框 THEN THE System SHALL 显示密码可见性切换按钮
4. WHEN 登录失败 THEN THE Toast SHALL 显示错误信息
5. WHEN 登录成功 THEN THE System SHALL 导航到移动端首页

### Requirement 15: 交互反馈与动画

**User Story:** 作为移动端用户，我希望操作有流畅的动画反馈，这样我可以获得原生 App 般的体验。

#### Acceptance Criteria

1. WHEN 页面切换时 THEN THE System SHALL 使用平滑的过渡动画
2. WHEN 用户点击按钮 THEN THE System SHALL 显示点击涟漪效果
3. WHEN 弹出面板显示/隐藏时 THEN THE Action_Sheet SHALL 使用滑入/滑出动画
4. WHEN 列表项被删除时 THEN THE Card_Component SHALL 使用淡出动画
5. WHEN 数据加载中 THEN THE System SHALL 显示骨架屏或加载动画
