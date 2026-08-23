# CQNU Campus Plant Mapping System
# 重庆师范大学校园植物分区管理系统

> 当前测试版 `1.1.0-beta.1` · Tag `v1.1.0-beta.1` · 稳定基线 `1.0.0` · 2026-08-23
> Copyright © YU GangZuo. All rights reserved.  
> 本仓库公开可见，仅用于项目展示、学术交流与参考阅读。未经版权所有者书面许可，不得复制、修改、再发布、商用或制作衍生作品。  
> This repository is publicly visible for project display, academic communication, and reference only. Unless prior written permission is obtained from the copyright holder, no reproduction, modification, redistribution, commercial use, or derivative use is allowed.

---

## 简介 | Overview

### 中文

重庆师范大学校园植物分区管理系统是一款本地桌面应用，用于校园植物资源调查、分区绘制、点位记录、图片归档、查询统计和项目维护。软件以“本地项目目录”为核心保存数据，支持 JSON 与 SQLite 本地存储，不依赖业务服务器；底图可使用在线地图服务，避免把底图资源本地化造成空间浪费。

### English

CQNU Campus Plant Mapping System is a local desktop application for campus plant surveys, zone drawing, point records, image archiving, query, statistics, and project maintenance. Data is stored locally in a user-selected project folder with JSON and SQLite storage options. Online basemap services can be used directly, avoiding large local map assets.

---

## 适用场景 | Use Cases

### 中文

- 校园植物资源普查与持续补充。
- 按道路、片区、绿地或管理单元建立植物分区。
- 为每个植物点位保存名称、坐标、物候、图片和备注。
- 在校内查找植物、核对分区记录、输出 CSV 或 GeoJSON。
- 对项目进行备份、合并、健康检查和日志诊断。

### English

- Campus plant resource survey and continuous updates.
- Zone-based management by road, area, green space, or management unit.
- Point-level records for plant names, coordinates, phenology, images, and notes.
- Plant lookup, zone review, CSV export, and GeoJSON export.
- Project backup, merge, health check, and diagnostics.

---

## 主要功能 | Main Features

### 中文

- 地图工作台：浏览地图、绘制分区、添加点位、选择对象并定位。
- 分区管理：编辑分区编号、名称、描述和边界。
- 点位管理：编辑点位编号、植物中文名、学名、坐标和调查信息。
- 物候记录：同一植物点位可维护多条物候记录。
- 图片归档：导入图片、归档到项目目录，并支持预览。
- 查询中心：按名称、分区、生活型、物候状态、来源、调查人、日期和记录完整性筛选，并可从点位结果手动打开物种参考。
- 物种参考：按当前点位中文名或学名查询 GBIF 与 iNaturalist，可查看来源、图片、分类层级和特征备注；也可由用户主动选择图片进行 iNaturalist 图像比对。建议仅临时显示，由用户选择是否吸收到学名、中文名或物候备注。
- 统计中心：查看项目总览、分区组成、多样性指数、相似性矩阵、物候趋势、数据质量和可导出研究图表。
- 回收站：恢复误删记录或确认彻底删除。
- 项目备份：手动备份项目，并处理过期备份。
- 项目合并：辅助合并两个本地项目并提示疑似重合点位。
- 维护中心：执行项目健康检查、保守修复、日志查看、诊断导出、设置导入导出和安全模式。
- 界面设置：切换主题、布局、玻璃效果、动效和状态颜色。
- 中英双语：支持中文和 English 界面切换。

### English

- Map workspace: browse maps, draw zones, add points, select records, and focus locations.
- Zone management: edit zone code, name, description, and boundary.
- Point management: edit point code, Chinese name, scientific name, coordinates, and survey fields.
- Phenology records: multiple phenology entries can be maintained for one plant point.
- Image archive: import images into the project folder and preview them.
- Query center: filter by name, zone, growth form, phenology state, source, observer, date, and record completeness, with a manual species-reference action on point results.
- Species reference: query GBIF and iNaturalist by the selected point's common name or scientific name, inspect source links, images, taxonomy, and feature notes, or manually choose an image for iNaturalist image comparison. Suggestions are temporary until the user chooses whether to absorb them into scientific name, common name, or phenology notes.
- Statistics center: review project summaries, zone composition, diversity metrics, similarity matrices, phenology trends, data quality, and exportable research charts.
- Recycle bin: restore deleted records or permanently delete them.
- Project backup: create manual backups and handle expired backups.
- Project merge: merge two local projects and review possible duplicate points.
- Maintenance center: run health checks, safe repairs, log review, diagnostic export, settings import/export, and safe mode.
- UI settings: switch themes, layouts, glass effects, motion, and status colors.
- Bilingual UI: Chinese and English interface switching.

---

## 基本使用流程 | Basic Workflow

### 中文

1. 打开软件后，点击“选择项目目录”。
2. 选择一个已有项目目录，或选择一个空目录让软件创建项目结构。
3. 在左侧地图工具中选择“绘制分区”，在地图上画出分区边界。
4. 选中分区后选择“添加点位”，在地图上放置植物点位。
5. 在右侧检查器中填写分区、点位和植物信息。
6. 在“物候录入中心”中补充物候、图片和调查备注。
7. 使用“查询中心”和“统计中心”查找、核对和汇总记录。
8. 定期使用“项目备份”和“维护中心”保存备份、检查项目健康状态。

### English

1. Open the app and click “Choose Project Folder”.
2. Select an existing project folder, or choose an empty folder so the app can create the project structure.
3. Use “Draw Zone” in the map tools to draw a zone boundary.
4. Select a zone, then choose “Add Point” and place a plant point on the map.
5. Fill in zone, point, and plant information in the right inspector.
6. Add phenology entries, images, and survey notes in the phenology editor.
7. Use the query center and statistics center to search, review, and summarize records.
8. Use project backup and maintenance center regularly to protect and check the project.

---

## 项目数据 | Project Data

### 中文

每个项目目录通常包含：

```text
project-folder/
└─ information/
   ├─ settings.json
   ├─ zones.json
   ├─ points.json
   └─ images/
```

- `settings.json` 保存界面、底图、统计偏好和回收站等设置。
- `zones.json` 保存分区记录。
- `points.json` 保存植物点位和物候记录。
- `images/` 保存导入到项目中的图片。

### English

A project folder usually contains:

```text
project-folder/
└─ information/
   ├─ settings.json
   ├─ zones.json
   ├─ points.json
   └─ images/
```

- `settings.json` stores UI, basemap, statistics preferences, and recycle-bin settings.
- `zones.json` stores zone records.
- `points.json` stores plant points and phenology records.
- `images/` stores images imported into the project.

---

## 维护中心 | Maintenance Center

### 中文

维护中心用于处理日常维护问题：

- 项目健康检查：检查缺失编号、重复编号、孤立点位、异常坐标、缺失名称、物候记录和图片引用。
- 保守修复：只处理安全项，例如补齐缺失 ID、规范化记录结构、去除同一物候记录中的重复图片引用。
- 日志与诊断：查看最近日志、清理过期日志、导出诊断文件。
- 安全模式：进入轻量线性主题、关闭玻璃效果并停用动效，同时锁定编辑、导入导出、合并、备份、底图配置和主题写入；仍可浏览信息、查询统计并拖动查看地图，退出时恢复进入前的界面设置。
- 设置导入导出：只导入或导出语言、界面主题和统计偏好，不覆盖分区、点位、图片或底图策略。

### English

The maintenance center supports routine project maintenance:

- Health check: checks missing codes, duplicate codes, orphan points, invalid coordinates, missing names, phenology records, and image references.
- Safe repair: only handles conservative fixes such as missing IDs, record normalization, and duplicate image references inside one phenology entry.
- Logs and diagnostics: review recent logs, clean expired logs, and export diagnostic files.
- Safe mode: switch to a lightweight linear theme, disable glass effects, turn motion off, and lock editing, import/export, merge, backup, basemap configuration, and theme writes. Browsing, query, statistics viewing, and map dragging remain available; exiting safe mode restores previous UI settings.
- Settings import/export: only handles language, UI theme, and statistics preferences. Zones, points, images, and basemap strategy are not overwritten.

---

## 导入导出 | Import and Export

### 中文

- CSV：适合表格编辑、校内资料整理和人工核对。
- GeoJSON：适合 GIS 工具、地图数据交换和空间核对。
- 诊断 JSON：适合排查日志、项目健康检查和界面设置问题。
- 设置 JSON：适合迁移界面偏好，不迁移业务数据。

### English

- CSV: suitable for spreadsheet editing, campus data organization, and manual review.
- GeoJSON: suitable for GIS tools, map data exchange, and spatial review.
- Diagnostic JSON: useful for log, health-check, and UI-settings troubleshooting.
- Settings JSON: useful for moving UI preferences without moving project records.

---

## 数据安全提示 | Data Safety Notes

### 中文

- 建议在大量编辑、导入、合并或修复前先备份项目。
- 不建议把真实调查数据、图片、日志或备份压缩包提交到公开仓库。
- 在线底图加载依赖外部地图服务，若网络或服务不可用，地图显示可能受影响。使用高德等第三方底图服务前，应在底图设置中配置授权 Key、来源展示、服务条款链接和适用的审图号或备案信息。
- 物种参考和图像比对依赖外部 API。图像比对只在用户主动选择图片时上传，不会把图片复制到项目目录；若 iNaturalist 要求访问令牌，令牌仅用于本次请求，不会保存。
- 保守修复不会删除记录、不会自动修改坐标、不会把孤立点位自动归属到某个分区。

### English

- Create a backup before large edits, imports, merges, or repairs.
- Do not commit real survey data, images, logs, or backup archives to a public repository.
- Online basemaps depend on external map services; map display may be affected by network or service availability. Configure the authorized key, source display, provider terms URL, and applicable map review or filing information before using Amap or other third-party basemap services.
- Species reference and image comparison depend on external APIs. Image comparison uploads an image only after the user chooses it, and the image is not copied into the project folder. If iNaturalist requires an access token, it is used only for the current request and is not saved.
- Safe repair does not delete records, automatically change coordinates, or assign orphan points to zones.

---

## 版权与使用限制 | Copyright and Usage Restrictions

### 中文

本项目公开可见，但不授予开源许可。除 GitHub 平台浏览与引用所需的最低限度展示外，不对第三方授予复制、修改、再发布、商用或制作衍生作品的许可。

授权范围以仓库中的正式授权文件为准。校内教学、科研、植物资源统计和维护用途可在授权范围内使用；对外分发、改名发布、商业销售、云服务部署或作为其他项目组成部分再发布，均需取得版权所有者书面许可。

### English

This project is publicly visible but is not released under an open-source license. Except for the minimum visibility and interaction required by the GitHub platform, no permission is granted for copying, modification, redistribution, commercial use, or derivative development.

The formal license files in this repository define the authorized scope. Internal campus use for teaching, research, plant resource statistics, and maintenance is permitted only within that scope. External distribution, renamed publishing, commercial sale, hosted service deployment, or redistribution as part of another project requires written permission from the copyright holder.
