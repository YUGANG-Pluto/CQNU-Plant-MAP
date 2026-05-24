# Changelog

> 本文件用于记录 GitHub 私有仓库中的阶段性版本演进。  
> 由于现有源码归档以多个压缩包形式保存，以下日志按“归档源码包 → 推荐 Git 标签”方式整理。

## Unreleased

- Refined the statistics center layout so wide screens use available space more effectively while narrow screens collapse to a single column.
- Added session-based chart display controls, fullscreen chart review, warm/default heatmap palettes, long zone-name truncation, and localized export labels for the statistics center.

- 将统计中心重构为研究型统计中心，新增分区统计、分类组成、生活型与来源属性、多样性指数、分区相似性、物候、时间趋势、数据质量、导出和口径说明视图。
- 新增 DOM 无关统计核心，覆盖 Shannon、Simpson、Pielou、Margalef、Menhinick、Berger-Parker、Hill numbers、Jaccard、Sørensen、Bray-Curtis、Whittaker beta、疑似重复点位和数据质量评分。
- 新增表格热力矩阵和 SVG 热力图导出，支持 Jaccard、Sørensen、Bray-Curtis、月份 × 物候状态、分区 × 数据质量问题矩阵。
- 新增统计 CSV、JSON、Markdown 和热力矩阵 CSV/JSON/Markdown/SVG 导出能力。
- 在物种参考图像比对区域增加 iNaturalist 临时令牌获取入口和使用步骤说明。
- 修复物种参考来源链接点击无跳转问题，改为通过受控主进程通道调用系统默认浏览器打开 GBIF 与 iNaturalist 链接。
- 同步物种参考来源链接、iNaturalist 临时令牌和数据库结构变更暂缓的测试文档与自检要求。
- 补齐中性工程文档、开发/测试/发布/维护指南、ADR、协作模板与 CI 覆盖范围。
- 将应用包授权元数据调整为 `UNLICENSED`，并标记为私有包，避免误表达为开放授权项目。
- 补齐正式授权、校内使用、隐私、第三方声明和安全说明文档。
- 新增 JavaScript 语法检查、仓库卫生检查和 `verify` 串联脚本。
- 新增依赖锁文件生成要求和打包图标跟踪规则，提升可复现维护能力。
- 新增测试指南、维护指南和发布检查清单，并纳入本地自检入口。
- 新增最小 CI、PR 模板和问题模板，并纳入仓库卫生检查。
- 加固 Electron 安全边界：IPC 来源校验、项目目录授信、轻量 CSP、受控外部链接打开和安全模型文档。

## 版本结构说明

建议不要直接以 Electron `package.json` 中的 `0.3.0` / `0.4.0` 作为唯一历史依据，  
而是以当前已有的源码包归档名作为历史节点，后续在 GitHub 中统一转换为清晰的 Tag。

---

## archive/2.0-source
**对应文件**：`2.0源码.zip`

### 建议标签
- `archive/2.0-source`

### 阶段定位
- 早期 Electron 可运行源码归档
- 形成项目目录持久化和桌面应用打包基础

### 主要意义
- 为后续所有版本提供可运行基础
- 建立本地项目目录 `information/` 的基本形态

---

## archive/3.0-stable
**对应文件**：`3.0.zip`

### 建议标签
- `archive/3.0-stable`

### 阶段定位
- 主线稳定包之一
- 适合作为中期基线归档

### 主要意义
- 稳定地图、点位、项目目录、打包链路
- 为后续图片预览与查询统计增强做准备

---

## archive/4.0-source
**对应文件**：`4.0源码.zip`

### 建议标签
- `archive/4.0-source`

### 阶段定位
- 物候与结构升级前后的源码节点之一

### 主要意义
- 保留当时的源码结构，便于追溯某些功能引入前的实现方式

---

## archive/5.0-ui-base
**对应文件**：`5.0.zip`

### 建议标签
- `archive/5.0-ui-base`

### 阶段定位
- 本地桌面版中期功能增强包

### 主要意义
- 为统计、查询、主题和录入中心的进一步演进提供过渡节点

---

## archive/6.0-chart-layout
**对应文件**：`6.0.zip`

### 建议标签
- `archive/6.0-chart-layout`

### 阶段定位
- 图表布局和统计中心优化阶段节点

### 主要意义
- 作为统计窗口改造前后的参考点

---

## archive/7.0-stats-opt
**对应文件**：`7统计优化和改写.zip`

### 建议标签
- `archive/7.0-stats-opt`

### 阶段定位
- 统计中心增强版本

### 主要意义
- 统计图表、可视化、统计逻辑与展示策略优化
- 适合作为统计模块的独立回溯节点

---

## archive/8.0-merge-backup
**对应文件**：`8.0备份和合并.zip`

### 建议标签
- `archive/8.0-merge-backup`

### 阶段定位
- 项目目录合并与备份能力引入节点

### 主要意义
- 新增项目目录合并
- 新增手动与自动备份逻辑
- 为后续项目级维护能力打下基础

---

## 当前 GitHub 建议主线

建议你在 GitHub 中只维护**一个当前稳定工作目录**，例如：

- `main` 分支：当前稳定可维护版源码
- 通过 `Tag` 记录历史压缩包节点

### 推荐当前主线标识
可按你当前最稳定、经你亲测无问题的版本命名，例如：

- `mainline/local-stable`
- 或 `v3.0-mainline`

### 推荐说明
历史压缩包保留为归档材料，不建议全部展开混入主线源码目录。
