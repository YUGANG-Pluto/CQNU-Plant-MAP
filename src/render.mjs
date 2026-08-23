import {
  architectureLayers,
  capabilities,
  docsSections,
  navigation,
  researchFlow,
  siteMeta
} from './content.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function nav(activePath) {
  const links = navigation.map(item => {
    const active = item.href === activePath ? ' aria-current="page" class="is-active"' : '';
    return `<a href="${item.href}"${active}>${escapeHtml(item.label)}</a>`;
  }).join('');
  return `
    <header class="site-header" data-header>
      <a class="brand" href="/" aria-label="CQNU Plant MAP 首页">
        <img src="/assets/cqnu-logo.svg" alt="" width="38" height="38" />
        <span><strong>CQNU Plant MAP</strong><small>校园植物研究地图</small></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="siteNavigation" data-nav-toggle>菜单</button>
      <nav id="siteNavigation" class="site-nav" aria-label="主导航" data-nav>${links}</nav>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div><strong>CQNU Plant MAP</strong><span>本地优先的校园植物记录与研究工具</span></div>
      <div class="footer-links">
        <a href="${siteMeta.repositoryUrl}" target="_blank" rel="noreferrer">GitHub</a>
        <a href="/docs">文档</a>
        <a href="/privacy">隐私与网络</a>
      </div>
      <p>Version ${siteMeta.version} · Copyright © YUGANG Zuo</p>
    </footer>`;
}

function layout({ activePath, title, description, body }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description || siteMeta.description)}" />
  <meta name="theme-color" content="#f7fbf8" />
  <title>${escapeHtml(title)} · CQNU Plant MAP</title>
  <link rel="icon" href="/assets/cqnu-logo.svg" />
  <link rel="stylesheet" href="/assets/styles.css" />
  <script src="/assets/client.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#mainContent">跳至主要内容</a>
  ${nav(activePath)}
  <main id="mainContent">${body}</main>
  ${footer()}
</body>
</html>`;
}

function metricStrip() {
  return `
    <div class="metric-strip" aria-label="版本能力摘要" data-reveal>
      <div><strong>1.0</strong><span>正式版本</span></div>
      <div><strong>Local</strong><span>项目数据优先保存在本地</span></div>
      <div><strong>5</strong><span>研究型相似性与质量矩阵</span></div>
      <div><strong>4</strong><span>CSV / JSON / Markdown / SVG</span></div>
    </div>`;
}

function homePage() {
  const capabilityCards = capabilities.map(item => `
    <article class="feature-card" data-reveal>
      <span>${item.index}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>`).join('');
  const flow = researchFlow.map((item, index) => `
    <li data-reveal>
      <span>${String(index + 1).padStart(2, '0')}</span>
      <div><strong>${escapeHtml(item.step)}</strong><p>${escapeHtml(item.detail)}</p></div>
    </li>`).join('');

  return layout({
    activePath: '/',
    title: '校园植物资源记录与研究统计',
    body: `
      <section class="hero hero-product">
        <img class="hero-media" src="/assets/app-preview.png" alt="CQNU Plant MAP 桌面应用界面预览" />
        <div class="hero-shade"></div>
        <div class="hero-content" data-reveal>
          <span class="eyebrow">RESEARCH DESKTOP · VERSION ${siteMeta.version}</span>
          <h1>CQNU Plant MAP</h1>
          <p>面向校园植物资源动态更新、定点记录、物候追踪、图片证据归档、分区比较与可视化管理研究。</p>
          <div class="hero-actions">
            <a class="button button-primary" href="${siteMeta.releasesUrl}" target="_blank" rel="noreferrer">获取正式版</a>
            <a class="button button-secondary" href="/docs">阅读使用文档</a>
          </div>
          <p class="hero-note">Windows 桌面端 · 本地优先 · 用户主动触发网络查询</p>
        </div>
      </section>
      <section class="content-band band-plain"><div class="content-wrap">${metricStrip()}</div></section>
      <section class="content-band band-soft">
        <div class="content-wrap">
          <div class="section-heading" data-reveal><span>核心模块</span><h2>围绕调查、复核、分析和交付组织工作</h2></div>
          <div class="feature-grid">${capabilityCards}</div>
        </div>
      </section>
      <section class="content-band band-white">
        <div class="content-wrap research-layout">
          <div class="section-heading sticky-heading" data-reveal>
            <span>研究工作流</span>
            <h2>让每一个结论都能回到原始记录</h2>
            <p>统计结果服务于调研与论文材料，但不会替代原始数据、人工核验和研究设计说明。</p>
          </div>
          <ol class="research-flow">${flow}</ol>
        </div>
      </section>
      <section class="content-band band-dark">
        <div class="content-wrap platform-callout" data-reveal>
          <div><span>Web-ready renderer</span><h2>同一套界面基础，明确区分桌面权限与浏览器权限</h2></div>
          <p>Preact、TypeScript、统计纯函数和设计系统可以共用；本地文件、SQLite、备份与系统能力由平台适配器提供。</p>
          <a class="button button-light" href="/web">查看 Web 化边界</a>
        </div>
      </section>
      <section class="content-band band-plain">
        <div class="content-wrap final-cta" data-reveal>
          <span>Version ${siteMeta.version}</span>
          <h2>从一份可复核的校园植物项目开始</h2>
          <div><a class="button button-primary" href="${siteMeta.releasesUrl}" target="_blank" rel="noreferrer">前往 GitHub Releases</a><a class="text-link" href="/release">查看版本内容</a></div>
        </div>
      </section>`
  });
}

function docsPage() {
  const toc = docsSections.map(section => `<a href="#${section.id}">${section.title}</a>`).join('');
  const sections = docsSections.map(section => `
    <section id="${section.id}" class="doc-section" data-reveal>
      <h2>${escapeHtml(section.title)}</h2>
      <ol>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    </section>`).join('');
  return layout({
    activePath: '/docs',
    title: '使用文档',
    description: 'CQNU Plant MAP 安装、项目数据、备份和网络服务使用说明。',
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal><span>DOCUMENTATION</span><h1>使用文档</h1><p>从安装启动到项目维护，按真实工作流组织的快速参考。</p></div></section>
      <section class="content-band band-plain"><div class="content-wrap docs-layout">
        <aside class="doc-toc" aria-label="文档目录"><strong>目录</strong>${toc}</aside>
        <div class="doc-content">${sections}
          <section class="doc-section notice-block" data-reveal><h2>需要进一步核对时</h2><p>先保留项目备份和相关日志，再通过维护中心读取诊断结果。不要直接修改数据库文件或删除唯一数据源。</p><a class="text-link" href="${siteMeta.repositoryUrl}/issues" target="_blank" rel="noreferrer">前往问题反馈</a></section>
        </div>
      </div></section>`
  });
}

function webPage() {
  const layers = architectureLayers.map((item, index) => `
    <article class="architecture-layer" data-reveal>
      <div><span>${String(index + 1).padStart(2, '0')}</span><em>${escapeHtml(item.state)}</em></div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.detail)}</p>
    </article>`).join('');
  return layout({
    activePath: '/web',
    title: 'Web 架构',
    description: 'CQNU Plant MAP 桌面端与浏览器端的共享界面和权限适配边界。',
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal><span>PLATFORM ARCHITECTURE</span><h1>Web 化不是重写界面，而是替换平台能力</h1><p>renderer 可以复用；本地文件和数据库能力必须使用浏览器认可的授权机制。</p></div></section>
      <section class="content-band band-soft"><div class="content-wrap architecture-grid">${layers}</div></section>
      <section class="content-band band-white"><div class="content-wrap comparison" data-reveal>
        <div><span>可直接共用</span><h2>界面、统计与领域模型</h2><p>组件、主题、动画、统计计算、图表数据、表格和导出内容生成保持同源。</p></div>
        <div><span>按平台实现</span><h2>存储、系统与网络边界</h2><p>桌面端使用白名单 IPC；浏览器端使用文件选择、下载、IndexedDB 或用户授权的文件句柄。</p></div>
      </div></section>
      <section class="content-band band-plain"><div class="content-wrap roadmap" data-reveal>
        <span>实施顺序</span><h2>先只读展示，再受控编辑，最后评估完整 Web 工作区</h2>
        <ol><li>发布文档与版本站</li><li>导入脱敏统计快照的只读研究看板</li><li>浏览器文件与存储适配器</li><li>跨平台一致性和数据回归验证</li></ol>
      </div></section>`
  });
}

function releasePage() {
  return layout({
    activePath: '/release',
    title: `版本 ${siteMeta.version}`,
    body: `
      <section class="page-hero release-hero"><div class="content-wrap" data-reveal><span>STABLE RELEASE</span><h1>Version ${siteMeta.version}</h1><p>形成可本地运行、可验证、可维护和可发布的校园植物研究桌面工具。</p><a class="button button-primary" href="${siteMeta.releasesUrl}" target="_blank" rel="noreferrer">打开发布页</a></div></section>
      <section class="content-band band-plain"><div class="content-wrap release-grid">
        <article data-reveal><span>数据工作流</span><h2>受控 JSON / SQLite 互换</h2><p>转换前备份、转换日志、数据源选择、数据库清理确认和兼容字段保留形成完整闭环。</p></article>
        <article data-reveal><span>研究能力</span><h2>模块化统计中心</h2><p>覆盖分区、分类组成、多样性、相似性、物候、趋势、数据质量与多格式导出。</p></article>
        <article data-reveal><span>工程质量</span><h2>TypeScript 与运行边界</h2><p>主进程、preload、IPC 契约、renderer 领域模型和自动检查逐步形成可维护结构。</p></article>
        <article data-reveal><span>交互体验</span><h2>科研白底与液态玻璃</h2><p>统一控件、模态层级、图表全屏、动效节奏、响应式布局和可访问状态反馈。</p></article>
      </div></section>
      <section class="content-band band-soft"><div class="content-wrap release-note" data-reveal><h2>发布说明</h2><p>Windows 安装程序如未完成个人代码签名，系统可能显示未知发布者提示。请仅从项目官方发布页获取文件，并核对版本与校验信息。</p></div></section>`
  });
}

function privacyPage() {
  return layout({
    activePath: '',
    title: '隐私与网络',
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal><span>PRIVACY & NETWORK</span><h1>本地优先，网络请求由用户触发</h1><p>公开站点不接收桌面项目数据，桌面端也不会自动上传完整项目。</p></div></section>
      <section class="content-band band-plain"><div class="content-wrap policy-grid">
        <article data-reveal><h2>保留在本地</h2><p>项目记录、SQLite、JSON、备份、日志、本地路径、坐标和用户图片。</p></article>
        <article data-reveal><h2>按需发送</h2><p>用户主动查询物种参考时，仅发送必要的中文名或学名；地图服务按用户配置访问。</p></article>
        <article data-reveal><h2>不会发布</h2><p>服务 Token、完整第三方响应、未经选择的项目数据和用户目录信息。</p></article>
      </div></section>`
  });
}

export function renderPages() {
  return Object.freeze({
    '/': homePage(),
    '/docs': docsPage(),
    '/web': webPage(),
    '/release': releasePage(),
    '/privacy': privacyPage()
  });
}
