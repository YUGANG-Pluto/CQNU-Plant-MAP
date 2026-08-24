# Privacy Notes

The CQNU Campus Plant Mapping System is designed as a local-first desktop application.

## Local Project Data

Project data is saved in folders selected by the user. Typical files include `settings.json`, `zones.json`, `points.json`, imported images, logs, backups, and exported files.

## Network Use

The application may contact external services only when the user uses related features:

- online basemap loading;
- GBIF and iNaturalist species reference lookup;
- iNaturalist image comparison after the user actively selects an image.

Access tokens, when entered for a current request, are not saved by the application.

## Diagnostics

Logs and diagnostic exports are local files. Users decide whether to share them.

---

# 隐私说明

重庆师范大学校园植物分区管理系统采用本地优先的桌面应用设计。

## 本地项目数据

项目数据保存在用户选择的文件夹中。典型文件包括 `settings.json`、`zones.json`、`points.json`、导入图片、日志、备份和导出文件。

## 网络使用

应用仅在用户使用相关功能时访问外部服务：

- 在线底图加载；
- GBIF 和 iNaturalist 物种参考查询；
- 用户主动选择图片后的 iNaturalist 图像比对。

若用户为当前请求输入访问令牌，应用不会保存该令牌。

## 诊断

日志和诊断导出均为本地文件。是否分享由用户决定。
