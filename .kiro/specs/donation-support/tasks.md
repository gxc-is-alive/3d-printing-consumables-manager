# 实现计划：捐赠支持功能

## 概述

实现一个捐赠支持页面，展示微信收款码、支付宝收款码和 MakerWorld 助力链接三种支持方式。

## 任务

- [x] 1. 创建 DonateView 组件

  - 在 `frontend/src/views/` 目录下创建 `DonateView.vue`
  - 实现页面头部，包含标题和返回首页链接
  - 实现感谢语说明文字
  - 实现三个支持方式卡片布局
  - 微信支付卡片：显示 `wx.jpg` 二维码图片和标签
  - 支付宝支付卡片：显示 `zfb.jpg` 二维码图片和标签
  - MakerWorld 助力卡片：显示链接按钮，点击在新标签页打开
  - 实现响应式样式，与系统整体风格保持一致
  - _需求: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 2. 配置路由

  - 在 `frontend/src/router/index.ts` 中添加 `/donate` 路由
  - 设置 `meta: { requiresAuth: false }` 允许未登录访问
  - _需求: 1.2_

- [x] 3. 更新首页导航

  - 在 `frontend/src/views/HomeView.vue` 中添加"捐赠支持"导航卡片
  - 使用爱心图标和适当的描述文字
  - _需求: 1.1, 1.3_

- [x] 4. 检查点 - 功能验证
  - 确保页面正常渲染
  - 确保路由导航正常工作
  - 确保二维码图片正确显示
  - 确保 MakerWorld 链接在新标签页打开
  - 如有问题请询问用户

## 备注

- 该功能为纯前端实现，不涉及后端 API
- 二维码图片已存在于 `frontend/src/assets/images/` 目录
- MakerWorld 链接: https://makerworld.com.cn/zh/@ganxiaochuan
