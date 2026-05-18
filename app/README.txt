CQNU Campus Plant Mapping System / 重庆师范大学校园植物分区管理系统

Version: 9.0.1 beta line
Suggested tag: v9.0.1-beta.1
Author: YUGANG Zuo
Copyright © YU GangZuo. All rights reserved.

中文说明
本软件是一个 Electron 本地桌面应用，用于校园植物调查中的地图分区、点位记录、植物与物候信息维护、图片归档、查询统计、项目备份和项目合并。

项目数据保存在用户选择的本地项目目录中，核心数据目录通常为：

information/
  settings.json
  zones.json
  points.json
  images/

请勿手动破坏 information/ 内 JSON 文件的字段结构。共享项目时，建议共享整个项目目录，至少应包含 information/ 目录和其中的 images/ 文件夹。

运行方式
在应用源码目录执行：

npm install
npm start

打包方式

npm run dist

输出目标为 Windows NSIS 安装包。生成的安装包建议作为单独发布文件管理，不建议长期放入源码仓库。

English Notes
This software is a local Electron desktop application for campus plant survey workflows, including map zoning, point records, plant and phenology data, image archiving, query/statistics, project backup, and project merge.

Project data is stored in a local directory selected by the user. The core data folder is usually:

information/
  settings.json
  zones.json
  points.json
  images/

Do not manually break the JSON field structure inside information/. When sharing a project, share the whole project directory when possible, or at least include information/ and its images/ folder.

Run:

npm install
npm start

Package:

npm run dist

The packaging target is a Windows NSIS installer. Installer files should be managed as separate release assets rather than stored permanently in the source repository.
