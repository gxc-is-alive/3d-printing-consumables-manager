# Implementation Plan: 打印机配件管理模块

## Overview

本实现计划将打印机配件管理功能分解为可执行的编码任务。按照数据库模型 → 后端服务 → API 路由 → 前端 Store → 前端视图的顺序实现。

## Tasks

- [x] 1. 数据库模型设计与迁移

  - [x] 1.1 更新 Prisma Schema，添加 AccessoryCategory、Accessory、AccessoryUsage 模型
    - 添加三个新模型及其关系
    - 在 User 模型中添加关联
    - _Requirements: 2.1, 6.1, 8.3_
  - [x] 1.2 运行数据库迁移
    - 执行 `npx prisma migrate dev` 创建迁移
    - _Requirements: 2.1_
  - [x] 1.3 创建预设分类的种子数据脚本
    - 创建 6 个预设分类（打印板、润滑剂、喷嘴、传动部件、电子元件、其他）
    - _Requirements: 1.1_

- [x] 2. 后端配件分类服务

  - [x] 2.1 创建 accessoryCategory.service.ts
    - 实现 getPresetCategories、findAllByUser、create、delete 方法
    - 实现分类删除前检查是否有配件使用
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 2.2 编写分类服务属性测试
    - **Property 12: 分类删除约束**
    - **Validates: Requirements 1.4, 1.5**

- [x] 3. 后端配件服务

  - [x] 3.1 创建 accessory.service.ts
    - 实现 create、findAllByUser、findById、update、delete 方法
    - 实现筛选功能（按分类、状态）
    - 实现状态自动更新逻辑
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.2, 5.2_
  - [x] 3.2 编写配件服务属性测试 - 创建和验证
    - **Property 1: 创建配件返回完整数据**
    - **Property 2: 必填字段验证**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
  - [x] 3.3 编写配件服务属性测试 - 列表和筛选
    - **Property 3: 列表查询完整性**
    - **Property 4: 筛选功能正确性**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - [x] 3.4 编写配件服务属性测试 - 更新和删除
    - **Property 5: 更新记录 Round-Trip**
    - **Property 6: 删除移除记录**
    - **Validates: Requirements 4.2, 5.2**

- [x] 4. 后端配件使用记录服务

  - [x] 4.1 在 accessory.service.ts 中添加 recordUsage 方法
    - 实现使用记录创建
    - 实现剩余数量自动扣减
    - 实现状态自动更新（depleted/low_stock）
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 4.2 在 accessory.service.ts 中添加获取使用历史方法
    - 在 findById 中包含使用记录
    - _Requirements: 6.4_
  - [x] 4.3 编写使用记录属性测试
    - **Property 7: 使用记录更新数量和状态**
    - **Property 8: 使用历史完整性**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 5. 后端配件提醒服务

  - [x] 5.1 在 accessory.service.ts 中添加 getAlerts 方法
    - 实现更换周期提醒计算
    - 实现库存不足提醒计算
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 5.2 编写提醒服务属性测试
    - **Property 9: 更换周期提醒计算**
    - **Property 10: 库存不足提醒计算**
    - **Validates: Requirements 7.1, 7.2**

- [x] 6. Checkpoint - 后端服务测试

  - 确保所有后端服务测试通过，如有问题请询问用户

- [x] 7. 后端 API 路由

  - [x] 7.1 创建 accessoryCategory.routes.ts
    - GET /api/accessory-categories - 获取所有分类
    - POST /api/accessory-categories - 创建自定义分类
    - DELETE /api/accessory-categories/:id - 删除自定义分类
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 7.2 创建 accessory.routes.ts
    - POST /api/accessories - 创建配件
    - GET /api/accessories - 获取配件列表（支持筛选）
    - GET /api/accessories/alerts - 获取配件提醒
    - GET /api/accessories/:id - 获取配件详情
    - PUT /api/accessories/:id - 更新配件
    - DELETE /api/accessories/:id - 删除配件
    - POST /api/accessories/:id/usage - 记录使用
    - _Requirements: 2.1, 3.1, 3.4, 4.2, 5.2, 6.1, 7.1, 7.2_
  - [x] 7.3 在 index.ts 中注册路由
    - 添加 accessoryCategory 和 accessory 路由
    - _Requirements: 2.1_

- [x] 8. 后端数据隔离测试

  - [x] 8.1 编写用户数据隔离属性测试
    - **Property 11: 用户数据隔离**
    - **Validates: Requirements 8.1, 8.2**

- [x] 9. Checkpoint - 后端完成

  - 确保所有后端测试通过，如有问题请询问用户

- [x] 10. 前端 Store 实现

  - [x] 10.1 创建 accessoryCategory.store.ts
    - 实现 categories 状态管理
    - 实现 fetchCategories、createCategory、deleteCategory 方法
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 10.2 创建 accessory.store.ts
    - 实现 accessories、alerts 状态管理
    - 实现 fetchAccessories、createAccessory、updateAccessory、deleteAccessory 方法
    - 实现 recordUsage、fetchAlerts 方法
    - _Requirements: 2.1, 3.1, 3.4, 4.2, 5.2, 6.1, 7.1_

- [x] 11. 前端视图实现

  - [x] 11.1 完成 AccessoriesView.vue 视图
    - 完成配件列表展示模板（按分类分组）
    - 实现筛选功能 UI（分类、状态下拉框）
    - 实现添加/编辑配件对话框
    - 实现删除确认对话框
    - 实现使用记录对话框
    - 实现自定义分类管理对话框
    - 添加样式
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 5.1, 6.1, 9.1_
  - [x] 11.2 更新 DashboardView.vue
    - 引入 accessory store
    - 添加配件提醒展示区域
    - 显示需要更换和库存不足的配件
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 11.3 更新路由和导航配置
    - 在 router/index.ts 添加 /accessories 路由
    - 在 HomeView.vue 添加配件管理导航卡片
    - _Requirements: 3.1_

- [x] 12. 前端备注功能

  - [x] 12.1 实现备注摘要显示
    - 在 AccessoriesView.vue 列表中显示备注前 50 个字符
    - 实现展开/收起功能
    - _Requirements: 9.2, 9.3, 9.4_

- [x] 13. Final Checkpoint - 功能完成
  - 确保所有测试通过
  - 验证前后端集成正常
  - 如有问题请询问用户

## Notes

- 每个任务都引用了具体的需求以便追溯
- Checkpoint 任务用于阶段性验证
- 属性测试验证正确性属性的通用规则
- 任务 10 的前端 Store 已全部完成
- 任务 11.1 的 AccessoriesView.vue 已有基础脚本，需要完成模板和样式
- 任务 12.2 的备注完整性属性测试已在后端测试中覆盖（Property 13 通过 findById 返回完整备注验证）
