# 实现任务列表

## 任务 1：数据库模型扩展

- [x] 1.1 创建数据库迁移文件
  - 在 `backend/prisma/schema.prisma` 中为 Consumable 模型添加 `status` 字段（String，默认值 "unopened"）
  - 添加 `depletedAt` 字段（DateTime，可选）
  - 运行 `npx prisma migrate dev --name add_consumable_status`

- [x] 1.2 编写数据迁移脚本
  - 将现有 `isOpened = false` 的记录设置 `status = 'unopened'`
  - 将现有 `isOpened = true` 的记录设置 `status = 'opened'`

## 任务 2：后端服务层实现

- [x] 2.1 扩展 ConsumableService
  - 在 `backend/src/services/consumable.service.ts` 中添加 `markAsDepleted` 方法
  - 添加 `restoreFromDepleted` 方法
  - 更新 `ConsumableResponse` 接口，添加 `status` 和 `depletedAt` 字段
  - 更新 `addOpenedDays` 函数以处理 depleted 状态

- [x] 2.2 扩展筛选功能
  - 更新 `ConsumableFilters` 接口，添加 `status` 和 `includeDepleted` 参数
  - 修改 `findAllByUser` 方法，支持新的筛选参数
  - 默认不返回已用完的耗材（`includeDepleted = false`）

## 任务 3：后端 API 路由

- [x] 3.1 添加新的 API 端点
  - 在 `backend/src/routes/consumable.routes.ts` 中添加 `PATCH /consumables/:id/deplete` 路由
  - 添加 `PATCH /consumables/:id/restore` 路由
  - 更新 `GET /consumables` 路由以支持新的查询参数

## 任务 4：前端 Store 扩展

- [x] 4.1 更新 Consumable 接口
  - 在 `frontend/src/stores/consumable.ts` 中添加 `status` 字段类型
  - 添加 `depletedAt` 字段类型
  - 添加 `CONSUMABLE_STATUS` 常量对象

- [x] 4.2 添加新的 Store 方法
  - 添加 `markAsDepleted(id: string, depletedAt?: string)` 方法
  - 添加 `restoreFromDepleted(id: string)` 方法
  - 更新 `ConsumableFilters` 接口

## 任务 5：前端 UI 实现 - 标记用完功能

- [x] 5.1 添加滑动操作按钮
  - 在 `MobileConsumables.vue` 的 SwipeCell 左侧添加"用完"按钮
  - 仅对已开封状态的耗材显示此按钮

- [x] 5.2 实现确认对话框
  - 点击"用完"按钮时显示确认对话框
  - 确认后调用 `markAsDepleted` 方法

- [x] 5.3 实现撤销功能
  - 对已用完的耗材显示"恢复"按钮
  - 点击后调用 `restoreFromDepleted` 方法

## 任务 6：前端 UI 实现 - 已用完耗材显示

- [x] 6.1 更新筛选面板
  - 修改状态筛选选项：全部、未开封、已开封、已用完
  - 添加"显示已用完"开关选项

- [x] 6.2 实现已用完耗材样式
  - 已用完耗材使用灰色/半透明样式
  - 显示"已用完"标签和用完日期
  - 禁用已用完耗材的编辑功能

## 任务 7：前端 UI 实现 - 已开封耗材快速筛选

- [x] 7.1 添加快捷筛选入口
  - 在页面顶部添加"已开封"快捷筛选标签/按钮
  - 点击后快速筛选已开封状态的耗材

- [x] 7.2 优化已开封列表显示
  - 按开封时间排序（最早开封的在前）
  - 显示开封天数
  - 超过30天的耗材显示提醒标记（如橙色/红色图标）

## 任务 8：属性测试

- [x] 8.1 编写状态转换属性测试
  - 测试 unopened → opened → depleted 状态转换
  - 测试 depleted → opened 撤销操作
  - 验证状态转换的数据一致性

- [x] 8.2 编写筛选功能属性测试
  - 测试 `includeDepleted` 参数的正确性
  - 测试状态筛选与其他筛选条件的组合
  - 验证筛选结果的正确性
