# 需求文档

## 简介

本功能增强了 3D 打印耗材管理系统的耗材和配件管理能力，包括：批量添加耗材、耗材开封状态设置、以及配件使用状态优化。这些改进旨在提升用户在管理大量耗材和长期使用配件时的效率和体验。

## 术语表

- **Consumable（耗材）**: 3D 打印使用的材料，如 PLA、ABS 等线材
- **Accessory（配件）**: 3D 打印机的辅助部件，如喷嘴、打印板、热床贴纸等
- **Batch_Add（批量添加）**: 一次性添加多个相同属性的耗材记录
- **Opened_Status（开封状态）**: 耗材是否已被拆封使用
- **Accessory_Usage_Type（配件使用类型）**: 配件的消耗方式，分为消耗型和耐用型
- **In_Use_Status（使用中状态）**: 配件当前正在被使用的状态

## 需求

### 需求 1：批量添加耗材

**用户故事:** 作为一个 3D 打印爱好者，我想要一次添加多个同品牌同类型同颜色的耗材，这样当我批量购买耗材时不需要重复操作多次。

#### 验收标准

1. WHEN 用户在新增耗材表单中设置数量大于 1 THEN Consumable_Service SHALL 创建指定数量的独立耗材记录
2. WHEN 批量创建耗材时 THEN Consumable_Service SHALL 为每个耗材记录生成唯一的 ID
3. WHEN 批量创建耗材时 THEN Consumable_Service SHALL 确保所有记录共享相同的品牌、类型、颜色、重量、价格和购买日期
4. WHEN 批量创建过程中发生错误 THEN Consumable_Service SHALL 回滚所有已创建的记录，保持数据一致性
5. WHEN 批量创建成功 THEN Consumable_UI SHALL 显示成功创建的耗材数量

### 需求 2：新增耗材时设置开封状态

**用户故事:** 作为一个 3D 打印爱好者，我想要在新增耗材时设置其开封状态，这样我可以准确记录已开封和未开封的耗材库存。

#### 验收标准

1. WHEN 用户新增耗材时 THEN Consumable_UI SHALL 提供开封状态选项（默认为未开封）
2. WHEN 用户选择"已开封"状态 THEN Consumable_UI SHALL 显示开封日期输入框
3. WHEN 用户选择"已开封"但未指定开封日期 THEN Consumable_Service SHALL 使用当前日期作为开封日期
4. WHEN 用户选择"未开封"状态 THEN Consumable_Service SHALL 将 isOpened 设为 false 且 openedAt 设为 null
5. WHEN 批量添加耗材时 THEN Consumable_Service SHALL 将开封状态应用到所有创建的耗材记录

### 需求 3：配件使用类型区分

**用户故事:** 作为一个 3D 打印爱好者，我想要区分消耗型配件和耐用型配件，这样我可以更准确地管理不同类型配件的使用状态。

#### 验收标准

1. THE Accessory_Model SHALL 包含 usageType 字段，区分"consumable"（消耗型）和"durable"（耐用型）配件
2. WHEN 用户创建配件时 THEN Accessory_UI SHALL 提供使用类型选择（默认为消耗型）
3. WHEN 配件类型为"durable"（耐用型）THEN Accessory_Service SHALL 支持"in_use"（使用中）状态
4. WHEN 配件类型为"consumable"（消耗型）THEN Accessory_Service SHALL 保持现有的数量消耗逻辑

### 需求 4：耐用型配件使用状态管理

**用户故事:** 作为一个 3D 打印爱好者，我想要将耐用型配件标记为"使用中"，这样我可以追踪哪些配件正在被使用。

#### 验收标准

1. WHEN 配件为耐用型且状态为"available" THEN Accessory_UI SHALL 显示"开始使用"按钮
2. WHEN 用户点击"开始使用" THEN Accessory_Service SHALL 将配件状态更新为"in_use"并记录开始使用时间
3. WHEN 配件状态为"in_use" THEN Accessory_UI SHALL 显示"结束使用"按钮和使用时长
4. WHEN 用户点击"结束使用" THEN Accessory_Service SHALL 将配件状态恢复为"available"并创建使用记录
5. WHEN 耐用型配件处于"in_use"状态 THEN Accessory_UI SHALL 显示该配件的使用开始时间
6. WHILE 配件处于"in_use"状态 THEN Accessory_Service SHALL 不允许删除该配件

### 需求 5：配件状态显示优化

**用户故事:** 作为一个 3D 打印爱好者，我想要清晰地看到配件的当前状态，这样我可以快速了解配件的可用性。

#### 验收标准

1. THE Accessory_UI SHALL 为耐用型配件显示以下状态：可用(available)、使用中(in_use)、库存不足(low_stock)、已耗尽(depleted)
2. THE Accessory_UI SHALL 为消耗型配件显示以下状态：可用(available)、库存不足(low_stock)、已耗尽(depleted)
3. WHEN 配件状态为"in_use" THEN Accessory_UI SHALL 使用蓝色标识显示"使用中"状态
4. WHEN 筛选配件时 THEN Accessory_UI SHALL 支持按"使用中"状态筛选
