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
  { href: '/', label: '科研导航' },
  { href: '/workspace', label: '本地工作区' },
  { href: '/manage', label: '访问管理' },
  { href: '/docs', label: '使用文档' },
  { href: '/web', label: 'Web 架构' },
  { href: '/release', label: '版本 1.1 Beta' }
]);

export const researchNavigationGroups = Object.freeze([
  {
    id: 'research-workspaces',
    title: '研究工作区',
    description: '进入实际数据记录、整理与分析工具。',
    items: [
      {
        id: 'plant-map',
        title: 'CQNU Plant MAP',
        description: '校园植物点位、分区、物候、图片证据与研究型统计。',
        href: '/workspace',
        label: '本地应用',
        state: 'available',
        keywords: '植物 地图 点位 分区 物候 统计 SQLite 本地'
      },
      {
        id: 'field-files',
        title: '野外调查文件夹',
        description: '后续接入调查批次、原始表格与图片归档导航。',
        label: '研究资料',
        state: 'planned',
        keywords: '调查 文件 图片 原始数据'
      },
      {
        id: 'analysis-notebooks',
        title: '分析笔记与脚本',
        description: '后续集中管理可复现分析入口、方法说明和交付材料。',
        label: '可复现分析',
        state: 'planned',
        keywords: '分析 脚本 笔记 可复现'
      }
    ]
  },
  {
    id: 'project-services',
    title: '项目服务',
    description: '账户、安全、文档和发布状态。',
    items: [
      {
        id: 'access-management',
        title: '访问与成员管理',
        description: '管理账户、工作区权限、密码重置和安全审计。',
        href: '/manage',
        label: '受限访问',
        state: 'available',
        keywords: '账户 用户 管理员 权限 密码 审计'
      },
      {
        id: 'documentation',
        title: '使用与数据文档',
        description: '浏览安装、浏览器兼容、数据、备份、隐私和网络边界。',
        href: '/docs',
        label: '文档',
        state: 'available',
        keywords: '文档 安装 数据 备份 隐私 网络'
      },
      {
        id: 'release-center',
        title: '版本与发布记录',
        description: `查看 ${siteMeta.version} Beta 版本能力、下载入口和版本策略。`,
        href: '/release',
        label: siteMeta.releaseChannelLabel,
        state: 'available',
        keywords: '版本 发布 下载 beta changelog'
      }
    ]
  },
  {
    id: 'future-research',
    title: '后续科研模块',
    description: '预留统一导航位置，模块完成验收后再开放。',
    items: [
      {
        id: 'specimen-catalog',
        title: '标本与凭证目录',
        description: '预留标本编号、凭证图片和保存位置的检索入口。',
        label: '待接入',
        state: 'planned',
        keywords: '标本 凭证 目录 检索'
      },
      {
        id: 'literature-index',
        title: '研究文献导航',
        description: '预留项目文献、研究方法与引用材料的统一入口。',
        label: '待接入',
        state: 'planned',
        keywords: '文献 方法 引用 阅读'
      },
      {
        id: 'shared-reports',
        title: '报告与成果目录',
        description: '预留论文图表、调研报告和答辩材料的版本导航。',
        label: '待接入',
        state: 'planned',
        keywords: '论文 报告 图表 答辩 成果'
      }
    ]
  }
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
    state: '本地编辑 Beta',
    detail: '浏览器版本使用用户授权目录、OPFS 与 SQLite WASM 保存项目；项目数据保留在本机，不进入站点服务端。'
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
    id: 'web-workspace',
    title: '浏览器本地工作区',
    items: [
      '本地工作区仅在用户主动选择项目目录或文件后读取 settings.json、zones.json、points.json、CSV 或 GeoJSON。',
      '项目主副本保存在浏览器 OPFS 的 SQLite 数据库中；获得目录权限时，同时写入兼容 JSON 镜像。',
      '工作区标题下方会显示当前浏览器能力：完整本地模式支持目录镜像；兼容文件模式使用文件选择和下载；缺少关键能力时会明确停止写入。',
      '浏览器会尝试恢复已授权的目录句柄；如果权限已被撤销，会提示重新选择目录，不会静默扩大访问范围。',
      '站点服务端不接收项目文件、图片、坐标或本地路径；清除浏览器站点数据会删除未另行导出的 OPFS 数据。',
      '同一时间只允许一个工作区标签页持有浏览器数据库写锁；如提示已占用，请关闭其他工作区标签页，首页和文档不受影响。',
      '浏览器 OPFS 数据库与桌面 data.db 为独立运行时格式，跨端交换使用兼容 JSON 文件。'
    ]
  },
  {
    id: 'browser-compatibility',
    title: '浏览器兼容性',
    items: [
      '当前发布流程在 Chromium 内核的隐藏验收环境中验证完整工作区；其他浏览器按实际检测到的 WebAssembly、Worker、OPFS、Web Locks、IndexedDB、Cache Storage、文件选择和下载能力决定可用模式。',
      'Chromium、Firefox 与 Safari 均使用同一项逐项检测，不按浏览器名称假定支持；检测满足全部关键能力时开放本地编辑，否则进入文件回退或阻止写入。',
      '不支持目录选择但具备本地数据库能力时，项目仍保存在 OPFS SQLite，并通过用户选择的 JSON、CSV、GeoJSON 或备份 ZIP 与本地文件交换。',
      '缺少 OPFS、Web Locks 或其他关键能力时，工作区会禁用本地写入并建议使用当前 Chromium 浏览器或桌面版，不会静默改用远程存储。',
      '浏览器能力检测只读取功能是否存在，不读取项目内容，也不发送设备能力报告。'
    ]
  },
  {
    id: 'access-management',
    title: '账户与工作区权限',
    items: [
      '首次登录或管理员创建的成员链接必须先完成账户激活；激活后可修改登录名、显示名称和密码。',
      '只读权限可打开项目、浏览、查询、统计和导出；编辑权限增加会话草稿但不写入项目；保存权限增加本地持久化、图片、备份、恢复和存储转换。',
      '管理员最多 3 名，可管理其他成员、权限、激活链接、一次性密码重置链接和安全审计；管理员不能通过成员表修改自己的权限。',
      '账户服务只保存认证、权限和安全审计信息，不接收项目记录、图片、坐标、本地路径或目录句柄。',
      '浏览器离线或心跳中断后短租约会失效；持续在线的会话最长 24 小时，之后需要重新登录。'
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
      '浏览器手动备份导出标准 ZIP，包含 settings、zones、points 和实际可读取的图片文件；内置恢复会同时恢复记录与图片字节。',
      '外部备份 ZIP 必须先通过格式版本、路径、加密、条目数量、解压体积、JSON 结构、图片类型与 CRC 校验；通过后才可双重确认恢复。',
      '目录权限或存储配额变化导致个别图片无法恢复时，其余记录和图片仍继续处理，并显示恢复与跳过数量。',
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
