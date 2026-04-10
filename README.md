# CQNU Campus Plant Mapping System  
# 重庆师范大学校园植物分区管理系统

> Copyright © YU GangZuo. All rights reserved.  
> Publisher: CQNU  
> 本仓库公开可见，仅用于项目展示、学术交流与参考阅读。  
> 未经版权所有者书面许可，不得复制、修改、再发布、商用或制作衍生作品。  
>
> This repository is publicly visible for project display, academic communication, and reference only.  
> Unless prior written permission is obtained from the copyright holder, no reproduction, modification, redistribution, commercial use, or derivative use is allowed.

---

## 目录 | Table of Contents

1. [项目简介 | Project Overview](#项目简介--project-overview)  
2. [项目目标 | Project Goals](#项目目标--project-goals)  
3. [主要功能 | Core Features](#主要功能--core-features)  
4. [技术栈 | Tech Stack](#技术栈--tech-stack)  
5. [系统设计思路 | Design Philosophy](#系统设计思路--design-philosophy)  
6. [项目目录结构 | Project Structure](#项目目录结构--project-structure)  
7. [安装与运行 | Installation and Run](#安装与运行--installation-and-run)  
8. [打包说明 | Packaging](#打包说明--packaging)  
9. [数据目录说明 | Data Directory](#数据目录说明--data-directory)  
10. [使用说明概要 | Usage Summary](#使用说明概要--usage-summary)  
11. [版本与维护 | Versioning and Maintenance](#版本与维护--versioning-and-maintenance)  
12. [版权与使用限制 | Copyright and Usage Restrictions](#版权与使用限制--copyright-and-usage-restrictions)  
13. [联系与维护说明 | Contact and Maintenance](#联系与维护说明--contact-and-maintenance)

---

## 项目简介 | Project Overview

### 中文
本项目是一个面向校园植物调查与分区管理的本地桌面系统，主要用于在地图底图上完成分区绘制、点位管理、植物信息记录、物候阶段管理、图片归档、统计分析、查询筛选、项目合并与备份等工作。  

该系统最初服务于重庆师范大学相关校园植物调查需求，后逐步扩展为一个适合本地长期维护、可持续演进的调查记录与管理工具。

### English
This project is a local desktop system for campus plant survey and zoning management. It supports map-based zone drawing, point management, plant record entry, phenology stage management, image archiving, statistics, filtering, project merge, and backup.  

It was initially designed for campus plant investigation needs related to Chongqing Normal University, and later evolved into a maintainable local survey and management tool.

---

## 项目目标 | Project Goals

### 中文
本项目的核心目标包括：

- 建立校园植物调查的标准化记录方式  
- 支持基于地图的分区与点位管理  
- 支持单点位对应单物种、单物种对应多物候记录的管理模式  
- 提供可视化统计分析与筛选查询能力  
- 支持本地项目目录保存、共享、备份与合并  
- 为后续可能的网页化、接口化和服务器化迁移保留结构基础  

### English
The core goals of this project are:

- To establish a standardized workflow for campus plant survey records  
- To support map-based zone and point management  
- To support the model of one point corresponding to one species, and one species corresponding to multiple phenological records  
- To provide visual statistics and filtering capabilities  
- To support local project storage, sharing, backup, and merge  
- To preserve a structural foundation for possible future web/API/server migration  

---

## 主要功能 | Core Features

### 中文
当前主线版本已实现以下功能：

#### 1. 地图与底图
- 多种底图切换
- 自定义底图源管理
- 地图自动定位与视野调整

#### 2. 分区管理
- 分区创建
- 分区编辑
- 分区删除
- 分区信息展示

#### 3. 点位管理
- 点位创建
- 点位确认建立
- 点位编辑
- 点位删除
- 点位地图定位与选中

#### 4. 物候录入中心
- 一个点位对应一个物种
- 一个物种可录入多个物候阶段
- 支持预设物候与自定义物候
- 支持旧数据兼容映射到相应物候或“不明”

#### 5. 图片管理
- 本地图片导入
- 图片缩略图展示
- 图片预览放大
- 滚轮缩放
- 拖动查看
- 上一张 / 下一张切换
- 双击恢复 1 倍

#### 6. 查询中心
- 关键词检索
- 高级联合筛选
- 支持按物候、来源属性、生活型、微生境、记录者、日期区间等查询

#### 7. 统计中心
- 分区统计
- 物种统计
- 时间统计
- 自由统计
- 柱状图、折线图、圆环图、复合图
- 图表可视化样式增强

#### 8. 回收站
- 删除前二次确认
- 回收站恢复
- 彻底删除

#### 9. 项目工具
- 项目备份
- 项目目录合并
- 风险操作前自动备份
- 历史备份自动清理机制

#### 10. 导入导出
- CSV 导出
- GeoJSON 导出
- CSV/GeoJSON 批量导入
- 旧项目目录兼容读取

### English
The current mainline version includes:

#### 1. Map and basemaps
- Multiple basemap switching
- Custom basemap source management
- Automatic map focusing and view adjustment

#### 2. Zone management
- Create zones
- Edit zones
- Delete zones
- Display zone information

#### 3. Point management
- Create points
- Confirm point creation
- Edit points
- Delete points
- Focus and select points on the map

#### 4. Phenology entry center
- One point corresponds to one species
- One species can contain multiple phenology records
- Supports predefined and custom phenology stages
- Supports legacy data mapping to corresponding stages or “Unknown”

#### 5. Image management
- Local image import
- Thumbnail display
- Enlarged image preview
- Mouse wheel zoom
- Drag-to-pan
- Previous / next image switching
- Double-click to reset to 1x

#### 6. Query center
- Keyword search
- Advanced combined filtering
- Supports filtering by phenology, origin type, growth form, habitat, observer, date range, etc.

#### 7. Statistics center
- Zone statistics
- Species statistics
- Time statistics
- Custom statistics
- Bar chart, line chart, donut chart, combined chart
- Improved chart styling and readability

#### 8. Recycle bin
- Secondary confirmation before deletion
- Restore deleted items
- Permanently delete items

#### 9. Project tools
- Project backup
- Project directory merge
- Automatic backup before risky operations
- Historical backup cleanup mechanism

#### 10. Import / Export
- CSV export
- GeoJSON export
- CSV/GeoJSON batch import
- Legacy project directory compatibility

---

## 技术栈 | Tech Stack

### 中文
本项目当前以本地桌面应用形式运行，主要技术栈包括：

- Electron  
- HTML  
- CSS  
- JavaScript  
- Leaflet  
- 本地项目目录持久化  
- JSON 数据存储  
- ZIP 形式的项目备份  

### English
This project currently runs as a local desktop application and is built with:

- Electron  
- HTML  
- CSS  
- JavaScript  
- Leaflet  
- Local project-directory-based persistence  
- JSON-based data storage  
- ZIP-based project backup  

---

## 系统设计思路 | Design Philosophy

### 中文
本项目在设计上坚持以下原则：

#### 1. 以本地长期可用为前提
项目优先保证本地运行稳定、数据可保存、可备份、可共享。

#### 2. 以调查工作流为核心
设计不是围绕“数据库形式”展开，而是围绕实际调查流程展开：
- 先定分区
- 再定点位
- 再录植物与物候
- 再做图片、查询、统计、导出

#### 3. 尽量不破坏核心链路
功能增强优先做成附加层或二级窗口，尽量不影响：
- 分区主链路
- 点位主链路
- 图片主链路
- 项目保存主链路

#### 4. 数据字段逐步统一
项目演进过程中逐步将字段统一，减少后续维护成本，并为未来接口化或网页化保留基础。

### English
The design follows these principles:

#### 1. Long-term local usability first
The project prioritizes stable local execution, persistent data storage, backup, and sharing.

#### 2. Survey workflow oriented
The design is centered on real survey workflow rather than abstract database-first modeling:
- define zones first
- then points
- then species and phenology
- then images, query, statistics, and export

#### 3. Avoid breaking core workflows
Enhancements are preferably implemented as additional layers or secondary windows, without breaking:
- zone workflow
- point workflow
- image workflow
- project save workflow

#### 4. Gradual field standardization
Data fields are gradually standardized to reduce maintenance cost and preserve compatibility for future API/web evolution.

---

## 项目目录结构 | Project Structure

### 中文
推荐的项目仓库结构如下：

```text
cqnu-plant-map/
├─ app/                # 主程序源码
├─ docs/               # 文档目录
├─ README.md
├─ CHANGELOG.md
├─ VERSION_POLICY.md
├─ CONTRIBUTING_PRIVATE.md
├─ REPOSITORY_SETUP_DESKTOP.md
└─ .gitignore
```

项目运行时使用的本地项目目录通常包含：

```text
项目目录/
├─ information/
│  ├─ zones.json
│  ├─ points.json
│  ├─ species.json
│  ├─ settings.json
│  └─ images/
```

### English
Recommended repository structure:

```text
cqnu-plant-map/
├─ app/                # Application source code
├─ docs/               # Documentation directory
├─ README.md
├─ CHANGELOG.md
├─ VERSION_POLICY.md
├─ CONTRIBUTING_PRIVATE.md
├─ REPOSITORY_SETUP_DESKTOP.md
└─ .gitignore
```

A typical runtime local project directory contains:

```text
project-directory/
├─ information/
│  ├─ zones.json
│  ├─ points.json
│  ├─ species.json
│  ├─ settings.json
│  └─ images/
```

---

## 安装与运行 | Installation and Run

### 中文
进入 `app/` 目录后，建议先执行镜像源设置：

```powershell
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

然后安装依赖并启动：

```bash
npm install
npm start
```

### English
Enter the `app/` directory and, for mainland China environments, set the mirrors first:

```powershell
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

Then install dependencies and start the application:

```bash
npm install
npm start
```

---

## 打包说明 | Packaging

### 中文
打包命令如下：

```bash
npm run dist
```

建议生成的安装包作为单独发布文件管理，不建议直接长期存放在源码仓库中。

### English
Packaging command:

```bash
npm run dist
```

The generated installer is better managed as a separate release asset instead of being permanently stored in the source repository.

---

## 数据目录说明 | Data Directory

### 中文
项目的实际调查数据默认保存在本地项目目录中的 `information/` 文件夹内。  
本仓库建议只保留代码和文档，不建议上传真实项目数据。

请勿将以下内容提交到公开仓库：

- 真实 `information/`
- API key / token
- 本地绝对路径
- 打包输出目录
- 真实图片资料库

### English
Actual survey data is stored in the local project directory under `information/`.  
This repository should contain source code and documentation only; real project data should not be uploaded.

Do not commit the following to a public repository:

- real `information/`
- API keys / tokens
- local absolute paths
- packaged output directories
- real image archives

---

## 使用说明概要 | Usage Summary

### 中文
典型使用流程如下：

1. 选择项目目录  
2. 切换或配置底图  
3. 创建分区  
4. 在分区内创建点位  
5. 打开物候录入中心  
6. 为该点位对应的物种录入多个物候阶段  
7. 导入图片并自动读取 EXIF（若存在）  
8. 使用查询中心检索记录  
9. 使用统计中心进行分析  
10. 在必要时进行备份、合并与导出  

### English
Typical usage workflow:

1. Select a project directory  
2. Switch or configure basemaps  
3. Create zones  
4. Create points inside zones  
5. Open the phenology entry center  
6. Record multiple phenology stages for the species at that point  
7. Import images and read EXIF automatically when available  
8. Use the query center to search records  
9. Use the statistics center for analysis  
10. Backup, merge, and export when necessary  

---

## 版本与维护 | Versioning and Maintenance

### 中文
本项目建议采用“主线稳定版优先”的维护策略：

- 仅在确认稳定的版本上继续演进
- 对出现严重问题的试验性版本应及时废止
- 功能增强应尽量做成附加层，而不是破坏核心层
- 更新日志、维护日志和版本说明应同步保留

### English
This project follows a “stable-mainline-first” maintenance strategy:

- Continue development only on confirmed stable versions  
- Discontinue problematic experimental branches when necessary  
- Prefer enhancement via additional layers instead of rewriting core workflows  
- Keep changelog, maintenance notes, and version descriptions in sync  

---

## 版权与使用限制 | Copyright and Usage Restrictions

### 中文
本项目采用“公开可见，但不授予开源许可”的管理方式。  
除 GitHub 平台浏览与引用所需的最低限度展示外，不对第三方授予复制、修改、分发、商用或衍生开发许可。

### English
This project is publicly visible but is not released under an open-source license.  
Except for the minimum visibility and interaction required by the GitHub platform, no permission is granted for copying, modification, redistribution, commercial use, or derivative development.

---

## 联系与维护说明 | Contact and Maintenance

### 中文
本项目当前由版权所有者维护。  
如需：

- 功能扩展
- bug 修复
- 结构调整
- 迁移到服务器 / Web
- 接口化改造

建议在现有稳定主线基础上继续维护，不建议跳过中间版本直接重构。

### English
The project is currently maintained by the copyright holder.  
For:

- feature expansion
- bug fixes
- structural adjustments
- server/Web migration
- API-oriented refactoring

it is recommended to continue from the current stable mainline instead of skipping versions and rebuilding from scratch.
