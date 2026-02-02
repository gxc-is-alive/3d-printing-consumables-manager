# 实现计划：品牌颜色管理

## 概述

本计划将品牌颜色管理功能分解为可执行的编码任务，从数据库模型开始，逐步实现后端服务、API、前端组件，最后完成数据迁移。

## 任务

- [x] 1. 数据库模型和迁移
  - [x] 1.1 在 schema.prisma 中添加 BrandColor 模型
    - 添加 id, userId, brandId, colorName, colorHex, createdAt, updatedAt 字段
    - 添加 User 和 Brand 的关联关系
    - 添加 @@unique([brandId, colorName]) 约束
    - 更新 User 和 Brand 模型添加 brandColors 关联
    - _需求: 1.1, 1.3, 1.4_
  - [x] 1.2 执行 Prisma 迁移
    - 运行 npx prisma migrate dev 创建数据库表
    - _需求: 1.1_

- [x] 2. 后端服务层实现
  - [x] 2.1 创建 BrandColorService
    - 实现 findAllByBrand 方法（按 colorName 排序）
    - 实现 create 方法（含验证逻辑）
    - 实现 update 方法
    - 实现 delete 方法
    - 实现 findByName 方法（用于去重检查）
    - _需求: 1.2, 1.3, 1.5, 2.1-2.4_
  - [x] 2.2 编写 BrandColorService 属性测试
    - **Property 1: 颜色创建验证**
    - **验证: 需求 1.2, 1.3**
  - [x] 2.3 编写颜色列表排序属性测试
    - **Property 3: 颜色列表排序**
    - **验证: 需求 1.5**

- [x] 3. 后端 API 路由实现
  - [x] 3.1 创建 brandColor.routes.ts
    - GET /api/brands/:brandId/colors - 获取颜色列表
    - POST /api/brands/:brandId/colors - 创建颜色
    - PUT /api/brands/:brandId/colors/:colorId - 更新颜色
    - DELETE /api/brands/:brandId/colors/:colorId - 删除颜色
    - 添加权限验证（检查品牌归属）
    - _需求: 2.1-2.5_
  - [x] 3.2 在 app.ts 中注册路由
    - _需求: 2.1-2.4_
  - [x] 3.3 编写权限隔离属性测试
    - **Property 4: 权限隔离**
    - **验证: 需求 2.5**

- [x] 4. 检查点 - 后端功能验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 5. 前端 Store 实现
  - [x] 5.1 创建 brandColor.ts store
    - 实现 fetchColors 方法
    - 实现 createColor 方法
    - 实现 updateColor 方法
    - 实现 deleteColor 方法
    - 实现 getColors 和 colorExists 辅助方法
    - 使用 Map 缓存不同品牌的颜色列表
    - _需求: 3.1, 4.1, 4.2_

- [x] 6. 前端颜色选择器组件
  - [x] 6.1 创建 BrandColorPicker.vue 组件
    - 接收 brandId、modelValue、colorHex props
    - 品牌变化时自动加载颜色列表
    - 显示颜色列表供选择（带颜色预览）
    - 支持手动输入新颜色
    - 选择颜色时触发 update 事件
    - _需求: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.2 编写品牌切换清空状态属性测试
    - **Property 5: 品牌切换清空状态**
    - **验证: 需求 3.3**

- [x] 7. 集成颜色选择器到耗材表单
  - [x] 7.1 修改 MobileConsumables.vue
    - 替换颜色输入为 BrandColorPicker 组件
    - 保存耗材时检查颜色是否为新颜色
    - 新颜色自动添加到品牌颜色库
    - _需求: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4_
  - [x] 7.2 编写新颜色自动添加幂等性测试
    - **Property 6: 新颜色自动添加幂等性**
    - **验证: 需求 4.1, 4.4**

- [x] 8. 检查点 - 颜色选择功能验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 9. 品牌颜色管理界面
  - [x] 9.1 创建 MobileBrandColors.vue 页面
    - 显示品牌颜色列表（带颜色预览）
    - 添加颜色按钮和表单弹窗
    - 左滑显示编辑和删除按钮
    - 删除确认对话框
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 9.2 添加路由和导航入口
    - 在品牌详情页添加"管理颜色"入口
    - _需求: 5.1_

- [x] 10. 数据迁移脚本
  - [x] 10.1 创建 migrateBrandColors.ts 脚本
    - 扫描所有现有耗材记录
    - 提取唯一的 (brandId, colorName) 组合
    - 创建 BrandColor 记录（使用现有 colorHex 或默认值）
    - 记录迁移结果日志
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 10.2 编写迁移数据完整性属性测试
    - **Property 7: 迁移数据完整性**
    - **验证: 需求 6.2, 6.3, 6.4**
  - [x] 10.3 执行迁移脚本
    - 运行迁移脚本导入现有颜色数据
    - _需求: 6.1_

- [x] 11. 最终检查点
  - 确保所有测试通过，如有问题请询问用户

## 备注

- 所有任务均为必需，包括属性测试
- 每个任务都引用了具体的需求编号以便追溯
- 检查点用于阶段性验证，确保增量开发的正确性
- 属性测试验证核心业务逻辑的正确性
