import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

export const siteMeta = Object.freeze({
  title: 'CQNU Plant MAP',
  description: '面向校园植物资源记录、物候归档、分区比较与研究统计的本地优先桌面工具。',
  repositoryUrl: 'https://github.com/YUGANG-Pluto/CQNU-Plant-MAP',
  releasesUrl: 'https://github.com/YUGANG-Pluto/CQNU-Plant-MAP/releases',
  version: packageJson.version,
  releaseTag: `v${packageJson.version}`,
  releaseChannelLabel: 'Beta 测试版',
  stableVersion: '1.0.0'
});

export const navigation = Object.freeze([
  { href: '/', label: '产品' },
  { href: '/docs', label: '使用文档' },
  { href: '/web', label: 'Web 架构' },
  { href: '/release', label: '版本 1.1 Beta' }
]);

export const capabilities = Object.freeze([
  {
    index: '01',
    title: '定点与分区记录',
    body: '在校园地图中维护分区、植物点位、坐标、调查信息与图片证据。'
  },
  {
    index: '02',
    title: '物候信息管理',
    body: '按点位持续归档开花、结果、展叶等物候记录，保留时间和观察信息。'
  },
  {
    index: '03',
    title: '研究型统计中心',
    body: '提供分区比较、多样性指数、相似性矩阵、数据质量诊断与可复核导出。'
  },
  {
    index: '04',
    title: '本地数据控制',
    body: '项目数据、备份和转换日志保存在用户选择的位置，网络查询仅由用户主动触发。'
  }
]);

export const researchFlow = Object.freeze([
  { step: '记录', detail: '建立分区与点位，保存名称、坐标、图片和调查信息。' },
  { step: '复核', detail: '检查分类信息、图片引用、重复点位和记录完整性。' },
  { step: '分析', detail: '比较分区组成、多样性、相似性、物候分布和时间趋势。' },
  { step: '交付', detail: '导出 CSV、JSON、Markdown 与 SVG，用于调研和论文材料。' }
]);

export const architectureLayers = Object.freeze([
  {
    title: '共享 Web renderer',
    state: '可复用',
    detail: 'Preact、TypeScript、CSS 设计系统、统计纯函数和领域模型可在桌面端与浏览器端共用。'
  },
  {
    title: '桌面能力适配器',
    state: '桌面端',
    detail: 'Electron IPC 提供项目目录、SQLite、备份、系统对话框、日志和安全外链能力。'
  },
  {
    title: '浏览器能力适配器',
    state: '规划中',
    detail: '浏览器版本使用用户授权的文件句柄或浏览器存储，不直接模拟本地路径和主进程权限。'
  },
  {
    title: '发布与文档站',
    state: '受限访问',
    detail: '当前站点仅向所有者开放，只发布文档、版本信息和产品预览，不包含任何用户项目数据。'
  }
]);

export const docsSections = Object.freeze([
  {
    id: 'install',
    title: '安装与启动',
    items: [
      '从 GitHub Releases 获取 Windows 安装程序或便携发布包。',
      '首次启动后选择或创建项目目录；应用不会自动扫描其他文件夹。',
      '源代码开发环境在 app 目录运行 npm start，启动前会完成本地构建。'
    ]
  },
  {
    id: 'project',
    title: '项目与数据',
    items: [
      '项目包含 settings、zones、points、information、图片与维护记录。',
      'SQLite 与 JSON 可以按维护中心提供的受控流程互换；转换前必须建立备份。',
      '同一项目同时存在两种存储时默认优先读取 SQLite，并允许用户明确选择 JSON。'
    ]
  },
  {
    id: 'backup',
    title: '备份与恢复',
    items: [
      '转换备份位于 information 统计目录下的 backup 区域。',
      '备份、数据库和日志均由用户选择查看或删除，不按过期时间自动清理。',
      '删除唯一数据库时会出现二次确认，防止误删最后一份可读数据。'
    ]
  },
  {
    id: 'network',
    title: '地图与物种参考',
    items: [
      '地图服务 Key 由用户配置；界面展示来源和服务使用提示。',
      'iNaturalist 与 GBIF 查询仅发送必要的中文名或学名。',
      '第三方候选是录入辅助，科属信息需经人工核验后用于正式统计。'
    ]
  }
]);
