校园植物分区管理系统 v4（Electron + NSIS 安装包配置版）

一、这版新增内容
1. 浅色系、圆角化、紧凑排版的新界面
2. 中文 / English 界面切换
3. 自定义底图源管理
   - 支持 XYZ
   - 支持 WMS
   - WMTS 若提供 XYZ 风格模板地址，可按 XYZ 接入
4. 分区删除
5. 点位删除
6. 纯浏览 / 平移模式
7. 本地图片导入到项目目录
8. 项目目录 information/ 持久化保存
9. NSIS 安装包配置（安装时可选择目录）

二、项目数据目录结构
首次运行时，选择一个项目目录。程序会自动创建：
information/
  settings.json
  zones.json
  points.json
  images/

三、开发运行
1. 安装 Node.js LTS
2. 在本项目目录打开 PowerShell
3. 执行：
   npm install
4. 运行：
   npm start

四、中国大陆网络环境下的 Electron 下载建议
如果 npm install 时 Electron 下载失败，可在当前 PowerShell 会话执行：
   $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
然后重新执行：
   npm install

五、制作 Windows 安装包（NSIS）
1. 确认 npm install 成功
2. 执行：
   npm run dist
3. 打包完成后，在 dist\ 目录查找 Setup.exe
4. 该安装包使用 NSIS assisted installer，允许用户手动选择安装目录

六、说明
1. 当前未设置自定义应用图标，打包时可能提示使用默认 Electron 图标
2. 共享数据时，建议共享整个项目目录，或至少共享 information/ 文件夹
3. 若对方使用同版本程序，只需在程序中选择同一个项目目录即可读取数据

[统一化更新]
- CSV 导出列名已改为中文。
- 数据字段顺序已固定，便于长期归档与后续网页化。
- 多度/数量、生活型、物候状态、来源属性等字段已统一为建议标准项。
- 微生境与多度/数量输入框增加了推荐选项。
