# Implementation Plan: 3D 打印耗材管理系统

## Overview

本实现计划将系统分为后端 API 和前端 UI 两大部分，采用增量开发方式，每个阶段都确保功能可测试和验证。

## Tasks

- [ ] 1. 项目初始化和基础架构

  - [x] 1.1 初始化后端项目结构
    - 创建 Node.js + Express + TypeScript 项目
    - 配置 ESLint、Prettier
    - 设置 Jest 测试框架和 fast-check
    - _Requirements: 9.1_
  - [x] 1.2 初始化前端项目结构
    - 创建 Vue 3 + TypeScript + Vite 项目
    - 配置 Pinia 状态管理
    - 配置 Axios HTTP 客户端
    - 配置 Vue Router
    - _Requirements: 9.1_
  - [x] 1.3 设置数据库和 ORM
    - 配置 SQLite 数据库
    - 使用 Prisma 或 better-sqlite3 作为 ORM
    - 创建数据库迁移脚本
    - _Requirements: 9.1, 9.2_

- [x] 2. 用户认证模块

  - [x] 2.1 实现用户数据模型和认证服务
    - 创建 User 模型和数据库表
    - 实现密码哈希和验证
    - 实现 JWT token 生成和验证
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 实现认证 API 端点
    - POST /api/auth/register
    - POST /api/auth/login
    - POST /api/auth/logout
    - GET /api/auth/me
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 2.3 编写认证属性测试
    - **Property 1: User Authentication Round-Trip**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 2.4 实现前端认证页面和状态管理
    - 创建登录/注册页面组件
    - 实现 auth store (Pinia)
    - 配置路由守卫
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 3. 品牌管理模块

  - [x] 3.1 实现品牌数据模型和服务
    - 创建 Brand 模型和数据库表
    - 实现 CRUD 服务方法
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.2 实现品牌 API 端点
    - GET/POST /api/brands
    - GET/PUT/DELETE /api/brands/:id
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 3.3 编写品牌 CRUD 属性测试
    - **Property 2: CRUD Operations Persistence (Brand)**
    - **Validates: Requirements 2.1, 2.3**
  - [x] 3.4 实现前端品牌管理页面
    - 品牌列表组件
    - 品牌表单组件（新增/编辑）
    - 品牌 store
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. 耗材类型管理模块

  - [x] 4.1 实现耗材类型数据模型和服务
    - 创建 ConsumableType 模型和数据库表
    - 实现 CRUD 服务方法
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 4.2 实现耗材类型 API 端点
    - GET/POST /api/types
    - GET/PUT/DELETE /api/types/:id
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 4.3 编写耗材类型 CRUD 属性测试
    - **Property 2: CRUD Operations Persistence (ConsumableType)**
    - **Validates: Requirements 3.1, 3.3**
  - [x] 4.4 实现前端耗材类型管理页面
    - 类型列表组件
    - 类型表单组件（新增/编辑）
    - 类型 store
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Checkpoint - 基础模块验证

  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 耗材（库存）管理模块

  - [x] 6.1 实现耗材数据模型和服务
    - 创建 Consumable 模型和数据库表
    - 实现 CRUD 服务方法
    - 实现颜色存储（名称和十六进制）
    - _Requirements: 4.1, 6.1, 8.1, 8.4_
  - [x] 6.2 实现耗材 API 端点
    - GET/POST /api/consumables
    - GET/PUT/DELETE /api/consumables/:id
    - PATCH /api/consumables/:id/open
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1_
  - [x] 6.3 编写耗材 CRUD 属性测试
    - **Property 2: CRUD Operations Persistence (Consumable)**
    - **Validates: Requirements 4.1, 4.3**
  - [x] 6.4 实现前端耗材管理页面
    - 耗材列表组件（带颜色显示）
    - 耗材表单组件（新增/编辑）
    - 开封状态切换
    - 耗材 store
    - _Requirements: 4.1, 4.2, 6.1, 6.2, 8.1, 8.2_

- [x] 7. 引用完整性保护

  - [x] 7.1 实现删除保护逻辑
    - 品牌删除前检查关联耗材
    - 类型删除前检查关联耗材
    - _Requirements: 2.5, 3.5_
  - [x] 7.2 编写引用完整性属性测试
    - **Property 3: Referential Integrity Protection**
    - **Validates: Requirements 2.5, 3.5**

- [ ] 8. 使用记录模块

  - [x] 8.1 实现使用记录数据模型和服务
    - 创建 UsageRecord 模型和数据库表
    - 实现 CRUD 服务方法
    - 实现库存自动扣减逻辑
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 8.2 实现使用记录 API 端点
    - GET/POST /api/usages
    - PUT/DELETE /api/usages/:id
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 8.3 编写库存计算属性测试
    - **Property 4: Inventory Calculation Consistency**
    - **Validates: Requirements 5.1, 5.3, 5.4**
  - [x] 8.4 实现前端使用记录页面
    - 使用记录列表组件
    - 使用记录表单组件
    - 超量使用警告提示
    - 使用记录 store
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 9. Checkpoint - 核心功能验证

  - 确保所有测试通过，如有问题请询问用户

- [x] 10. 库存仪表盘模块

  - [x] 10.1 实现仪表盘 API
    - GET /api/dashboard/inventory（按品牌/类型/颜色分组）
    - GET /api/dashboard/stats（统计数据）
    - _Requirements: 7.1, 7.3, 4.5_
  - [x] 10.2 编写聚合计算属性测试
    - **Property 7: Aggregation Calculation Correctness**
    - **Validates: Requirements 4.5, 7.1, 7.3**
  - [x] 10.3 实现前端仪表盘页面
    - 库存概览组件
    - 按品牌/类型/颜色分组显示
    - 低库存警告显示
    - _Requirements: 7.1, 7.3, 7.4_

- [-] 11. 过滤和搜索功能

  - [x] 11.1 实现过滤 API 参数
    - 支持按品牌、类型、颜色、开封状态过滤
    - _Requirements: 6.3, 7.2, 8.3_
  - [x] 11.2 编写过滤属性测试
    - **Property 5: Filter Results Correctness**
    - **Validates: Requirements 6.3, 7.2, 8.3**
  - [x] 11.3 实现前端过滤组件
    - 过滤器组件
    - 颜色搜索组件
    - _Requirements: 6.3, 7.2, 8.3_

- [x] 12. 用户数据隔离

  - [x] 12.1 编写数据隔离属性测试
    - **Property 6: User Data Isolation**
    - **Validates: Requirements 9.3**

- [x] 13. 开封时长计算

  - [x] 13.1 实现开封时长计算逻辑
    - 计算开封至今的天数
    - _Requirements: 6.4_
  - [x] 13.2 编写开封时长属性测试
    - **Property 8: Opening Status Duration Calculation**
    - **Validates: Requirements 6.1, 6.4**
  - [x] 13.3 前端显示开封时长
    - 在耗材列表和详情中显示开封天数
    - _Requirements: 6.4_

- [x] 14. Final Checkpoint - 完整功能验证
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 所有任务均为必需任务
- 每个任务都引用了具体的需求条款以确保可追溯性
- Checkpoint 任务用于阶段性验证
- 属性测试验证系统的正确性属性
