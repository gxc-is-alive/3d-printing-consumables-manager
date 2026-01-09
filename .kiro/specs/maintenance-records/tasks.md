# Implementation Plan: 保养记录模块

## Overview

本实现计划将保养记录模块分解为后端数据库、服务层、路由层和前端四个主要部分，采用增量开发方式确保每个步骤都可验证。

## Tasks

- [x] 1. 数据库模型和迁移

  - [x] 1.1 更新 Prisma Schema 添加 MaintenanceRecord 模型
    - 添加 MaintenanceRecord 模型定义
    - 添加与 User 的关联关系
    - 更新 User 模型添加 maintenanceRecords 关联
    - _Requirements: 5.3_
  - [x] 1.2 运行数据库迁移
    - 执行 `prisma migrate dev` 创建新表
    - _Requirements: 1.1_

- [x] 2. 后端保养记录服务

  - [x] 2.1 创建 maintenance.service.ts
    - 实现 create 方法创建保养记录
    - 实现 findAllByUser 方法获取用户所有记录（按时间倒序）
    - 实现 findById 方法获取单个记录
    - 实现 update 方法更新记录
    - 实现 delete 方法删除记录
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 3.2, 4.2_
  - [x] 2.2 编写保养记录服务属性测试
    - **Property 1: 创建记录返回完整数据**
    - **Property 3: 列表完整性与排序**
    - **Property 4: 更新记录 Round-Trip**
    - **Property 5: 删除移除记录**
    - **Validates: Requirements 1.1, 1.5, 2.1, 2.2, 2.3, 3.2, 4.2**

- [x] 3. 后端 API 路由

  - [x] 3.1 创建 maintenance.routes.ts
    - POST /maintenance - 创建保养记录
    - GET /maintenance - 获取用户所有保养记录
    - GET /maintenance/:id - 获取单个保养记录
    - PUT /maintenance/:id - 更新保养记录
    - DELETE /maintenance/:id - 删除保养记录
    - _Requirements: 1.1, 2.1, 3.2, 4.2_
  - [x] 3.2 注册路由到主路由文件
    - 在 routes/index.ts 中注册新路由
    - _Requirements: 1.1_
  - [x] 3.3 编写用户数据隔离属性测试
    - **Property 6: 用户数据隔离**
    - **Validates: Requirements 5.1, 5.2**

- [x] 4. Checkpoint - 后端功能验证

  - 所有后端测试通过 ✓

- [x] 5. 前端 Store 实现

  - [x] 5.1 创建 maintenance.ts store
    - 定义 MaintenanceRecord 接口
    - 实现 fetchRecords 方法
    - 实现 createRecord 方法
    - 实现 updateRecord 方法
    - 实现 deleteRecord 方法
    - _Requirements: 1.1, 2.1, 3.2, 4.2_

- [x] 6. 前端 UI 实现

  - [x] 6.1 创建 MaintenanceView.vue 页面
    - 实现保养记录列表显示
    - 实现新增保养记录表单弹窗
    - 实现编辑保养记录功能
    - 实现删除保养记录功能（带确认）
    - 实现空状态提示
    - 实现保养类型选择器
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_
  - [x] 6.2 添加路由配置
    - 在 router/index.ts 中添加 /maintenance 路由
    - _Requirements: 2.1_
  - [x] 6.3 更新首页导航
    - 在 HomeView.vue 中添加保养记录入口卡片
    - _Requirements: 2.1_

- [x] 7. 数据库初始化脚本更新

  - [x] 7.1 更新 backend/src/index.ts 中的 createTables 函数
    - 添加 MaintenanceRecord 表的创建 SQL
    - _Requirements: 1.1_

- [x] 8. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证前后端集成正常
  - 如有问题请询问用户

## Notes

- 所有任务均为必需，包含完整的属性测试覆盖
- 每个任务都引用了具体的需求条款以便追溯
- 属性测试验证核心正确性属性
