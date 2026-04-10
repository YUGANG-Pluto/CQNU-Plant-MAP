# CQNU Campus Plant Mapping System

重庆师范大学校园植物分区管理系统（本地桌面版 / Electron 方案）。

## 1. 项目用途

本项目用于校园植物调查与管理，核心目标包括：

- 在地图上进行校园区域分区
- 在分区内记录植物点位
- 为点位绑定唯一物种与多个物候阶段记录
- 管理图片、统计、查询、导入导出、回收站、项目备份与目录合并
- 以本地项目目录 `information/` 的形式实现可迁移、可共享、可维护的数据管理

## 2. 当前技术栈

### 前端 / 桌面界面
- HTML
- CSS
- JavaScript
- Leaflet
- Electron 渲染层

### 主进程 / 桌面能力
- Electron Main Process
- Electron Preload Bridge

### 打包与发布
- electron-builder
- NSIS（Windows 安装包）

### 依赖能力
- exifr（图片 EXIF 读取）
- adm-zip（ZIP 备份与压缩）

## 3. 设计思路

本项目采用“**地图主链路稳定 + 功能附加层扩展**”的策略持续演进：

1. 先保证分区、点位、图片和数据持久化可用。
2. 再追加统计、查询、回收站、主题设置、合并与备份等附加功能。
3. 尽量不频繁改动核心主链路，以降低渲染错误、数据结构漂移和兼容性问题。
4. 统一数据字段，确保搜索、导出、统计、维护和未来接口接入时口径一致。

## 4. 功能概要

### 地图与数据
- 分区创建、编辑、删除
- 点位创建、确认、编辑、删除
- 单点位单物种、多物候记录
- 本地项目目录 `information/` 持久化
- 自定义底图 / 天地图支持

### 管理能力
- 统计中心
- 查询中心
- 回收站
- 图片预览（缩放、拖动、切换）
- CSV / GeoJSON 导出
- 批量导入
- 项目目录合并
- 项目目录备份

### 体验能力
- 中英文界面
- 主题设置
- 图表自由统计

## 5. 目录建议

建议仓库采用如下结构：

```text
cqnu-plant-map/
├─ app/                   # 当前维护主线源码（只放一个可运行版本）
├─ archives/              # 历史归档说明（建议放说明，不放大体积源码包）
├─ docs/                  # 项目文档
├─ templates/             # 示例配置、示例数据、辅助模板
├─ .gitignore
├─ README.md
├─ CHANGELOG.md
├─ REPOSITORY_SETUP_DESKTOP.md
├─ VERSION_POLICY.md
└─ CONTRIBUTING_PRIVATE.md
```

## 6. 启动方式

进入 `app/` 目录后执行：

```bash
npm install
npm start
```

## 7. 中国大陆网络环境建议

在 PowerShell 中建议先设置镜像：

```powershell
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

然后再安装依赖：

```powershell
npm install
```

## 8. 打包方式

```powershell
npm run dist
```

## 9. 数据目录说明

真实项目数据默认位于用户自选项目目录下：

```text
information/
├─ settings.json
├─ zones.json
├─ points.json
├─ images/
└─ ...
```

不建议将真实 `information/` 直接提交到 GitHub 仓库。推荐在仓库中仅保留脱敏后的示例数据。

## 10. 版本管理建议

- `main`：当前稳定主线
- `dev`：开发与试验分支
- 使用 Git Tag 记录阶段节点
- 安装包建议通过 GitHub Releases 或外部文件分发，不直接长期提交到源码目录

## 11. 文档索引

- `CHANGELOG.md`：版本迭代日志
- `REPOSITORY_SETUP_DESKTOP.md`：GitHub Desktop 建仓与上传步骤
- `VERSION_POLICY.md`：版本迭代结构与分支策略
- `CONTRIBUTING_PRIVATE.md`：私有仓库维护规范
- `docs/ARCHIVE_PLAN.md`：历史源码包归档建议

## 12. 版权信息

- Publisher: CQNU
- Author: YU GangZuo
