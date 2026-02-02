# 实现计划: 耗材类型多级分类

## 概述

本计划将耗材类型从单级分类改造为两级分类结构（大类+小类），包括数据库迁移、后端服务、前端组件和数据迁移脚本的实现。

## 任务列表

- [x] 1. 数据库层改造
  - [x] 1.1 修改 Prisma Schema，为 ConsumableType 添加 parentId 字段和自引用关系
    - 添加 parentId 字段（可选，null 表示大类）
    - 添加 parent 和 children 自引用关系
    - 修改唯一约束为 [userId, name, parentId]
    - 添加 parentId 索引
    - _需求: 1.1, 2.1_
  - [x] 1.2 创建数据库迁移文件并执行迁移
    - 运行 prisma migrate dev 生成迁移
    - 验证迁移成功
    - _需求: 1.1_

- [x] 2. 后端服务层实现
  - [x] 2.1 扩展 ConsumableTypeService，实现大类 CRUD 操作
    - 实现 createCategory 方法
    - 实现 updateCategory 方法
    - 实现 deleteCategory 方法（检查是否有子类）
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 2.2 实现小类 CRUD 操作
    - 实现 createSubtype 方法
    - 实现 updateSubtype 方法
    - 实现 moveSubtype 方法
    - 实现 deleteSubtype 方法（检查是否有引用）
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 2.3 实现层级查询方法
    - 实现 findAllHierarchy 方法，返回树形结构
    - 实现 findCategoryById 和 findSubtypeById 方法
    - _需求: 3.1, 3.2_
  - [x] 2.4 编写属性测试：名称验证和唯一性约束
    - **Property 2: 名称验证规则**
    - **Property 3: 唯一性约束**
    - **验证: 需求 1.2, 1.3, 2.2, 2.3**

- [x] 3. 数据迁移服务实现
  - [x] 3.1 实现 MigrationService 的 parseTypeName 方法
    - 按第一个空格拆分类型名称
    - 无空格时大类设为"未分类"
    - _需求: 4.1, 4.2, 4.3_
  - [x] 3.2 编写属性测试：类型名称解析
    - **Property 1: 类型名称解析一致性**
    - **验证: 需求 4.1, 4.2, 4.3**
  - [x] 3.3 实现 migrateToHierarchy 方法
    - 遍历现有类型数据
    - 创建或复用大类
    - 更新小类的 parentId
    - 记录迁移日志
    - _需求: 4.4, 4.5, 4.6_
  - [x] 3.4 编写属性测试：迁移后关联完整性
    - **Property 6: 迁移后关联完整性**
    - **验证: 需求 4.5, 7.1, 7.2**

- [x] 4. 检查点 - 后端服务测试
  - 确保所有后端测试通过，如有问题请询问用户

- [x] 5. API 路由实现
  - [x] 5.1 实现类型层级 API 路由
    - GET /api/types/hierarchy
    - POST /api/types/categories
    - PUT /api/types/categories/:id
    - DELETE /api/types/categories/:id
    - _需求: 1.1, 1.4, 1.5, 1.6, 5.1_
  - [x] 5.2 实现小类 API 路由
    - POST /api/types/subtypes
    - PUT /api/types/subtypes/:id
    - PUT /api/types/subtypes/:id/move
    - DELETE /api/types/subtypes/:id
    - _需求: 2.1, 2.4, 2.5, 2.6, 2.7_
  - [x] 5.3 实现迁移 API 路由
    - POST /api/types/migrate
    - GET /api/types/migrate/preview
    - _需求: 4.6_

- [x] 6. 前端 Store 层实现
  - [x] 6.1 扩展 consumableType store，添加层级数据管理
    - 添加 categories 状态
    - 实现 fetchHierarchy 方法
    - 实现大类 CRUD 方法
    - 实现小类 CRUD 方法
    - _需求: 1.1, 2.1, 3.1_

- [x] 7. 前端组件实现
  - [x] 7.1 创建 TypeCascadeSelector 组件（PC端）
    - 实现级联选择逻辑
    - 支持 v-model 双向绑定
    - 处理无小类时直接选择大类的场景
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 7.2 创建移动端 TypeCascadePicker 组件
    - 使用 Vant Cascader 组件
    - 适配移动端交互
    - _需求: 6.2_

- [x] 8. PC 端视图改造
  - [x] 8.1 改造 ConsumableTypesView.vue，支持树形展示
    - 以树形结构展示大类和小类
    - 支持新增大类和小类
    - 支持编辑和删除操作
    - _需求: 5.1, 5.2_
  - [x] 8.2 改造 ConsumablesView.vue，使用级联选择器
    - 替换原有类型选择为 TypeCascadeSelector
    - 编辑时正确显示当前选择
    - _需求: 5.3, 5.4_
  - [x] 8.3 改造 BrandsView.vue 中的类型选择
    - BrandType 配置使用级联选择器
    - _需求: 5.3_

- [x] 9. 移动端视图改造
  - [x] 9.1 改造 MobileTypes.vue，支持分组列表展示
    - 按大类分组显示小类
    - 支持新增大类和小类
    - _需求: 6.1, 6.3_
  - [x] 9.2 改造 MobileConsumables.vue，使用级联选择器
    - 使用 TypeCascadePicker 组件
    - _需求: 6.2_

- [x] 10. 检查点 - 前端功能测试
  - 确保所有前端功能正常，如有问题请询问用户

- [x] 11. 数据迁移脚本
  - [x] 11.1 创建迁移脚本 migrateTypeHierarchy.ts
    - 实现命令行迁移工具
    - 支持预览模式和执行模式
    - 输出迁移统计信息
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 12. 最终检查点
  - 确保所有测试通过，如有问题请询问用户

## 备注

- 每个任务都引用了具体的需求编号以便追溯
- 检查点用于确保增量验证
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
