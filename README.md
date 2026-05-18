# CQNU Campus Plant Mapping System
# 重庆师范大学校园植物分区管理系统

> Copyright © YU GangZuo. All rights reserved.
> 本仓库公开可见，仅用于项目展示、学术交流与参考阅读。
> 未经版权所有者书面许可，不得复制、修改、再发布、商用或制作衍生作品。
>
> This repository is publicly visible for project display, academic communication, and reference only.
> Unless prior written permission is obtained from the copyright holder, no reproduction, modification, redistribution, commercial use, or derivative use is allowed.

---

## 目录 | Table of Contents

1. [项目简介 | Project Overview](#项目简介--project-overview)
2. [版本说明 | Version Notes](#版本说明--version-notes)
3. [主要功能 | Core Features](#主要功能--core-features)
4. [技术栈 | Tech Stack](#技术栈--tech-stack)
5. [项目结构 | Project Structure](#项目结构--project-structure)
6. [安装与运行 | Installation and Run](#安装与运行--installation-and-run)
7. [打包说明 | Packaging](#打包说明--packaging)
8. [数据与安全边界 | Data and Safety Boundaries](#数据与安全边界--data-and-safety-boundaries)
9. [版本与维护 | Versioning and Maintenance](#版本与维护--versioning-and-maintenance)
10. [版权与使用限制 | Copyright and Usage Restrictions](#版权与使用限制--copyright-and-usage-restrictions)

---

## 项目简介 | Project Overview

### 中文

本项目是一个面向校园植物调查、分区绘制、点位记录和长期项目维护的本地桌面系统。软件以 Electron 单机应用形式运行，项目数据保存在用户选择的本地项目目录中，不依赖服务器。

当前版本围绕“地图分区 -> 点位记录 -> 植物与物候信息 -> 图片归档 -> 查询统计 -> 备份与合并”的调查链路进行维护，重点提升了安全边界、错误日志、主题设置、统计中心图表和界面工程化结构。

### English

This project is a local desktop system for campus plant survey, zone drawing, point recording, and long-term project maintenance. It runs as an Electron application and stores project data in a local directory selected by the user, without requiring a server.

The current version focuses on the workflow of map zoning, point records, plant and phenology data, image archiving, query and statistics, backup, and project merge. Recent maintenance improves safety boundaries, error logging, theme settings, statistical charts, and frontend structure.

---

## 版本说明 | Version Notes

### 中文

当前同步版本建议标记为：

```text
v9.0.1-beta.1
```

本版本是 9.0.1 主线的 beta 更新，主要用于记录安全修复、工程化拆分、设置精简、VibeUI/design-md 风格适配、统计中心图表优化和动效收束。该 tag 仅作为源码版本标记，不附带 GitHub Release 安装包。

### English

The recommended tag for this synchronized version is:

```text
v9.0.1-beta.1
```

This is a beta update on the 9.0.1 mainline. It records safety fixes, structural refactoring, settings simplification, VibeUI/design-md visual adaptation, statistics center chart polish, and motion consolidation. The tag is intended as a source-code version marker only, without a GitHub Release installer asset.

---

## 主要功能 | Core Features

### 中文

- 地图底图切换与自定义底图源配置
- 分区绘制、编辑、删除和信息展示
- 点位创建、编辑、删除、定位和选中
- 单点位对应单物种，单物种支持多物候记录
- 图片导入、EXIF 读取、图片归档和预览
- 查询中心、高级筛选和结果定位
- 统计中心、自由统计、柱状图、折线图、圆环图和组合图
- 回收站、恢复与彻底删除
- 项目备份、过期备份清理和项目合并
- CSV / GeoJSON 导入导出
- 中英文界面切换
- 主题预设、玻璃效果、动效、状态色和品牌图标设置
- 本地日志、用户错误弹窗和后台错误记录

### English

- Basemap switching and custom basemap source configuration
- Zone drawing, editing, deletion, and information display
- Point creation, editing, deletion, focusing, and selection
- One point corresponds to one species; one species supports multiple phenology records
- Image import, EXIF reading, image archiving, and preview
- Query center, advanced filtering, and result focusing
- Statistics center, custom statistics, bar chart, line chart, donut chart, and combined chart
- Recycle bin, restore, and permanent deletion
- Project backup, expired backup cleanup, and project merge
- CSV / GeoJSON import and export
- Chinese / English interface switching
- Theme presets, glass effects, motion, status colors, and brand icon settings
- Local logging, user-facing error dialogs, and backend error records

---

## 技术栈 | Tech Stack

### 中文

- Electron
- HTML / CSS / JavaScript
- Leaflet
- JSON 本地数据存储
- CSV / GeoJSON 数据交换
- ZIP 项目备份
- Node.js 主进程文件能力

### English

- Electron
- HTML / CSS / JavaScript
- Leaflet
- Local JSON-based data storage
- CSV / GeoJSON data exchange
- ZIP-based project backup
- Node.js file capabilities in the main process

---

## 项目结构 | Project Structure

### 中文

推荐仓库结构如下：

```text
CQNU-Plant-MAP/
├─ app/                 # Electron 应用源码
├─ docs/                # 工程化、设置精简和视觉设计记录
├─ README.md
├─ Copyright.md
├─ CHANGELOG.md
├─ VERSION_POLICY.md
└─ .gitignore
```

应用运行时选择的本地项目目录通常包含：

```text
project-directory/
└─ information/
   ├─ settings.json
   ├─ zones.json
   ├─ points.json
   └─ images/
```

### English

Recommended repository structure:

```text
CQNU-Plant-MAP/
├─ app/                 # Electron application source
├─ docs/                # Engineering, settings, and design notes
├─ README.md
├─ Copyright.md
├─ CHANGELOG.md
├─ VERSION_POLICY.md
└─ .gitignore
```

A runtime local project directory usually contains:

```text
project-directory/
└─ information/
   ├─ settings.json
   ├─ zones.json
   ├─ points.json
   └─ images/
```

---

## 安装与运行 | Installation and Run

### 中文

进入应用源码目录：

```powershell
cd app
```

安装依赖并运行：

```powershell
npm install
npm start
```

如果在中国大陆网络环境下 Electron 下载较慢，可先设置镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

### English

Enter the application source directory:

```powershell
cd app
```

Install dependencies and run:

```powershell
npm install
npm start
```

For mainland China network environments, Electron mirrors can be configured before installation:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

---

## 打包说明 | Packaging

### 中文

Windows NSIS 安装包打包命令：

```powershell
cd app
npm run dist
```

生成的安装包建议作为单独发布文件管理。本次 `v9.0.1-beta.1` 只同步源码并打 tag，暂不上传 GitHub Release 安装包。

### English

Windows NSIS packaging command:

```powershell
cd app
npm run dist
```

The generated installer should be managed as a separate release asset. For `v9.0.1-beta.1`, only source code and the tag are synchronized; no GitHub Release installer asset is uploaded.

---

## 数据与安全边界 | Data and Safety Boundaries

### 中文

本仓库只建议保存源码、构建配置和维护文档，不建议上传真实调查项目数据。

请勿提交以下内容：

- 真实 `information/` 项目数据目录
- 真实图片资料库
- 日志文件
- 备份压缩包
- 打包输出目录
- API key、token 或本地私密路径

当前版本持续维护以下安全边界：

- 主进程统一处理文件读写、导入导出、图片归档和备份
- 渲染进程通过受控 preload API 调用能力
- 项目文件写入采用更稳妥的原子写入策略
- 用户可见错误使用弹窗提示，后台同步记录日志

### English

This repository should contain source code, build configuration, and maintenance documents only. Real survey project data should not be committed.

Do not commit:

- Real `information/` project data directories
- Real image archives
- Log files
- Backup archives
- Packaged output directories
- API keys, tokens, or private local paths

The current version maintains the following safety boundaries:

- The main process handles file writes, import/export, image archiving, and backup
- The renderer process uses controlled preload APIs
- Project file writes use a safer atomic-write strategy
- User-facing errors are shown with dialogs while backend logs record error context

---

## 版本与维护 | Versioning and Maintenance

### 中文

本项目采用“主线稳定版优先”的维护方式。功能增强应尽量保持核心链路稳定，并优先通过小步修复、结构化拆分和可验证的自检来推进。

后续维护 README 和版权声明时，应继续保持当前中英双文风格。除非功能有明显差异、版本说明需要更新，或版权所有者提出要求，不应随意改写版权声明口径。

### English

This project follows a stable-mainline-first maintenance approach. Enhancements should preserve core workflow stability and proceed through controlled fixes, structural separation, and verifiable self-checks.

Future README and copyright updates should keep the current Chinese/English bilingual style. Unless functionality changes significantly, version notes need updates, or the copyright holder requests changes, the copyright statement should not be casually rewritten.

---

## 版权与使用限制 | Copyright and Usage Restrictions

### 中文

本项目公开可见，但不授予开源许可。除 GitHub 平台浏览与引用所需的最低限度展示外，不对第三方授予复制、修改、再发布、商用或制作衍生作品的许可。

### English

This project is publicly visible but is not released under an open-source license. Except for the minimum visibility and interaction required by the GitHub platform, no permission is granted for copying, modification, redistribution, commercial use, or derivative development.
