# Implementation Plan: 品牌配置文件上传

## Overview

本实现计划将品牌配置文件上传功能分解为后端数据库、服务层、路由层和前端四个主要部分，采用增量开发方式确保每个步骤都可验证。

## Tasks

- [x] 1. 数据库模型和迁移

  - [x] 1.1 更新 Prisma Schema 添加 BrandConfigFile 模型
    - 添加 BrandConfigFile 模型定义
    - 添加与 User 和 Brand 的关联关系
    - 更新 Brand 模型添加 configFiles 关联
    - _Requirements: 5.2, 5.3_
  - [x] 1.2 运行数据库迁移
    - 执行 `prisma migrate dev` 创建新表
    - _Requirements: 1.1_

- [x] 2. 后端文件存储服务

  - [x] 2.1 创建文件存储服务 fileStorage.service.ts
    - 实现 saveFile 方法保存文件到指定路径
    - 实现 deleteFile 方法删除文件
    - 实现 getFilePath 方法获取文件完整路径
    - 实现目录自动创建逻辑
    - _Requirements: 1.1, 4.1_
  - [x] 2.2 编写文件存储服务属性测试
    - **Property 5: 文件下载 Round-Trip**
    - **Validates: Requirements 3.1**

- [x] 3. 后端配置文件服务

  - [x] 3.1 创建 brandConfigFile.service.ts
    - 实现 upload 方法上传文件并创建数据库记录
    - 实现 findByBrand 方法获取品牌下所有文件
    - 实现 getFilePath 方法获取下载路径
    - 实现 delete 方法删除文件和记录
    - _Requirements: 1.1, 1.3, 1.5, 2.1, 2.2, 3.1, 4.1_
  - [x] 3.2 编写配置文件服务属性测试
    - **Property 1: 文件上传创建数据库记录**
    - **Property 3: 上传返回完整元数据**
    - **Property 4: 文件列表完整性**
    - **Property 7: 删除移除文件和记录**
    - **Validates: Requirements 1.1, 1.3, 1.5, 2.1, 2.2, 4.1**

- [x] 4. 后端 API 路由

  - [x] 4.1 安装 multer 依赖并配置文件上传中间件
    - 安装 multer 和 @types/multer
    - 配置文件大小限制 50MB
    - 配置临时存储目录
    - _Requirements: 1.2_
  - [x] 4.2 创建品牌配置文件路由 brandConfigFile.routes.ts
    - POST /brands/:brandId/files - 上传文件
    - GET /brands/:brandId/files - 获取文件列表
    - GET /brand-files/:fileId/download - 下载文件
    - DELETE /brand-files/:fileId - 删除文件
    - _Requirements: 1.1, 2.1, 3.1, 4.1_
  - [x] 4.3 注册路由到主路由文件
    - 在 routes/index.ts 中注册新路由
    - _Requirements: 1.1_
  - [x] 4.4 编写用户数据隔离属性测试
    - **Property 6: 用户数据隔离**
    - **Validates: Requirements 3.3, 4.3, 5.1**

- [x] 5. Checkpoint - 后端功能验证

  - 确保所有后端测试通过
  - 使用 API 工具测试各端点
  - 如有问题请询问用户

- [x] 6. 前端 Store 实现

  - [x] 6.1 创建 brandConfigFile.ts store
    - 定义 BrandConfigFile 接口
    - 实现 fetchFiles 方法
    - 实现 uploadFiles 方法（支持多文件）
    - 实现 downloadFile 方法
    - 实现 deleteFile 方法
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 7. 前端 UI 实现

  - [x] 7.1 更新 BrandsView.vue 添加配置文件管理
    - 在品牌卡片中添加"配置文件"按钮
    - 创建配置文件管理弹窗
    - 实现文件上传区域（支持多文件选择）
    - 实现文件列表显示（文件名、大小、时间）
    - 实现文件下载功能
    - 实现文件删除功能（带确认）
    - 实现空状态提示
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2_

- [x] 8. 数据库初始化脚本更新

  - [x] 8.1 更新 backend/src/index.ts 中的 createTables 函数
    - 添加 BrandConfigFile 表的创建 SQL
    - _Requirements: 1.1_

- [x] 9. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证前后端集成正常
  - 如有问题请询问用户

## Notes

- 所有任务均为必需，包含完整的属性测试覆盖
- 每个任务都引用了具体的需求条款以便追溯
- 属性测试验证核心正确性属性
- 单元测试验证具体示例和边界情况
