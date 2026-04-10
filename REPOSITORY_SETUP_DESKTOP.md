# 使用 GitHub Desktop 建立私有仓库的详细步骤

> 适用于你已经安装 GitHub Desktop，且希望把当前项目整理为一个私有仓库的情况。

## 一、开始前先做两件事

### 1. 先确认当前要作为主线的源码版本
建议不要把所有压缩包全部直接混进一个工作目录。  
请先选出一个“当前稳定可维护版本”作为 `app/` 目录内容。

### 2. 真实数据不要直接上传
以下内容建议不要直接提交：

- 真实 `information/`
- 图片原始库
- 天地图 `tk`
- 带绝对路径的本地配置
- 打包生成的 `dist/`

---

## 二、推荐的本地整理方式

### 新建一个总目录
例如：

```text
D:\GitProjects\cqnu-plant-map
```

### 然后整理为：

```text
cqnu-plant-map/
├─ app/
├─ docs/
├─ templates/
├─ .gitignore
├─ README.md
├─ CHANGELOG.md
├─ REPOSITORY_SETUP_DESKTOP.md
├─ VERSION_POLICY.md
└─ CONTRIBUTING_PRIVATE.md
```

### 放置内容
- `app/`：当前主线源码（从某一个你认可的压缩包中解压）
- `docs/`：已有说明书、维护文档、教程
- `templates/`：脱敏示例数据、示例配置

---

## 三、在 GitHub Desktop 中建立仓库

### 步骤 1
打开 **GitHub Desktop**。

### 步骤 2
点击：

- **File**
- **Add local repository...**

如果目录还不是 Git 仓库，GitHub Desktop 会提示可以创建。

### 步骤 3
选择你整理好的项目目录，例如：

```text
D:\GitProjects\cqnu-plant-map
```

### 步骤 4
如果提示“不是 Git 仓库”，点击：

- **create a repository**

### 步骤 5
填写仓库信息：

- **Name**：`cqnu-plant-map`
- **Description**：`重庆师范大学校园植物分区管理系统（本地桌面版）`
- **Local Path**：你的项目目录
- 取消勾选自动生成 README（因为我们已经准备了）

点击 **Create Repository**。

---

## 四、首次检查提交内容

在 GitHub Desktop 左侧会看到即将提交的文件。

### 重点检查
确保以下内容没有被误加入：

- `node_modules/`
- `dist/`
- 真实 `information/`
- 带 token 的设置文件
- 打包出的 `.exe`

如果看到了这些内容，先返回本地检查 `.gitignore` 是否生效。

---

## 五、首次提交

### Summary 中可填写：

```text
Initialize private repository with stable desktop source and docs
```

### Description 可选填写：

- 导入当前主线源码
- 初始化文档与仓库结构
- 保留历史归档策略

点击 **Commit to main**。

---

## 六、发布到 GitHub 私有仓库

### 步骤 1
点击右上角：

- **Publish repository**

### 步骤 2
填写：

- Repository name：`cqnu-plant-map`
- Description：可与本地一致

### 步骤 3
**确保勾选为 Private / Keep this code private**。

### 步骤 4
点击 **Publish Repository**。

---

## 七、历史压缩包的处理建议

你当前有多个历史源码包，例如：

- `2.0源码.zip`
- `3.0.zip`
- `4.0源码.zip`
- `5.0.zip`
- `6.0.zip`
- `7统计优化和改写.zip`
- `8.0备份和合并.zip`

### 不建议做法
- 不建议把全部 zip 直接长期提交到仓库根目录
- 不建议把多个版本全部解压后混在 `app/` 里

### 推荐做法
- 只保留一个当前维护版本放进 `app/`
- 其他版本在 `CHANGELOG.md` 和 `docs/ARCHIVE_PLAN.md` 里留痕
- 需要时再用 Git Tag / Release / 外部备份保存这些 zip

---

## 八、后续日常使用 GitHub Desktop 的建议

### 每次修改后
1. 打开 GitHub Desktop
2. 检查改动文件
3. 写清楚本次修改的 Summary
4. Commit to main 或 dev
5. Push origin

### 建议的提交风格
- `fix: 修复统计中心图表布局`
- `feat: 新增项目目录合并与备份`
- `docs: 更新使用说明与维护文档`

---

## 九、上传前最后检查清单

在首次发布前，再检查一遍：

- [ ] `.gitignore` 已生效
- [ ] 真实 `information/` 未上传
- [ ] `node_modules/` 未上传
- [ ] `dist/` 未上传
- [ ] token 未上传
- [ ] `README.md` 可正常阅读
- [ ] `CHANGELOG.md` 已写入历史节点
- [ ] 仓库设置为 Private
