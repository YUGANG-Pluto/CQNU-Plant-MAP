import {
  architectureLayers,
  docsSections,
  navigation,
  researchNavigationGroups,
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

function homePage() {
  const groupNavigation = researchNavigationGroups.map(group => `
    <a href="#${escapeHtml(group.id)}">${escapeHtml(group.title)}</a>`).join('');
  const groups = researchNavigationGroups.map(group => {
    const items = group.items.map(item => {
      const content = `
        <span class="hub-card-meta"><b>${escapeHtml(item.label)}</b><i>${item.state === 'available' ? '可用' : '待接入'}</i></span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.description)}</p>
        <span class="hub-card-action">${item.state === 'available' ? '打开模块' : '保留位置'}</span>`;
      const attributes = `class="hub-card${item.state === 'planned' ? ' is-planned' : ''}" data-hub-item data-search="${escapeHtml(`${item.title} ${item.description} ${item.keywords}`)}"`;
      return item.href
        ? `<a ${attributes} href="${escapeHtml(item.href)}">${content}</a>`
        : `<article ${attributes} aria-disabled="true">${content}</article>`;
    }).join('');
    return `
      <section id="${escapeHtml(group.id)}" class="hub-group" data-hub-group data-reveal>
        <div class="hub-group-heading"><div><span>${escapeHtml(group.title)}</span><h2>${escapeHtml(group.title)}</h2></div><p>${escapeHtml(group.description)}</p></div>
        <div class="hub-grid">${items}</div>
      </section>`;
  }).join('');
  const flow = researchFlow.map((item, index) => `
    <li data-reveal>
      <span>${String(index + 1).padStart(2, '0')}</span>
      <div><strong>${escapeHtml(item.step)}</strong><p>${escapeHtml(item.detail)}</p></div>
    </li>`).join('');

  return layout({
    activePath: '/',
    title: '科研导航',
    body: `
      <section class="hub-intro">
        <div class="hub-intro-inner" data-reveal>
          <div><span class="eyebrow">RESEARCH NAVIGATION · ${siteMeta.version}</span><h1>CQNU Research Hub</h1><p>从一个入口进入校园植物研究工具、项目服务、文档与后续科研模块。项目数据继续保存在本机。</p></div>
          <a class="button button-primary" href="/workspace">进入植物地图工作区</a>
        </div>
      </section>
      <section class="hub-workbench content-wrap">
        <aside class="hub-sidebar" data-reveal>
          <div><strong>模块目录</strong>${groupNavigation}</div>
          <div class="hub-version"><span>当前通道</span><strong>${escapeHtml(siteMeta.releaseChannelLabel)}</strong><small>Version ${escapeHtml(siteMeta.version)}</small></div>
        </aside>
        <div class="hub-content">
          <div class="hub-toolbar" data-reveal>
            <label><span>查找科研模块 <kbd>Ctrl K</kbd></span><input type="search" data-hub-search placeholder="输入植物、统计、权限、备份或文档" autocomplete="off" aria-describedby="hubSearchStatus" /></label>
            <div id="hubSearchStatus" role="status" aria-live="polite"><span data-hub-count>0</span><small> 个模块</small></div>
          </div>
          <p class="hub-empty" data-hub-empty role="status" hidden>没有匹配的模块。未来模块会在完成验收后加入此导航。</p>
          ${groups}
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
      <section class="content-band band-plain">
        <div class="content-wrap final-cta" data-reveal>
          <span>Version ${siteMeta.version}</span>
          <h2>桌面端与浏览器端保持同一研究流程</h2>
          <div><a class="button button-primary" href="/workspace">打开本地工作区</a><a class="text-link" href="/web">查看平台能力边界</a></div>
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
        <div><span>按平台实现</span><h2>存储、系统与网络边界</h2><p>桌面端使用白名单 IPC；浏览器端使用用户授权目录、OPFS、SQLite WASM 与受控下载，不访问任意本地路径。</p></div>
      </div></section>
      <section class="content-band band-plain"><div class="content-wrap roadmap" data-reveal>
        <span>实施顺序</span><h2>共享应用界面，按平台收束系统能力</h2>
        <ol><li>发布文档与版本站</li><li>浏览器授权目录与 OPFS 主库</li><li>本地编辑、备份和研究导出</li><li>跨平台一致性和数据回归验证</li></ol>
      </div></section>`
  });
}

function releasePage() {
  return layout({
    activePath: '/release',
    title: `版本 ${siteMeta.version}`,
    body: `
      <section class="page-hero release-hero"><div class="content-wrap" data-reveal><span>BETA RELEASE</span><h1>Version ${siteMeta.version}</h1><p>当前测试版用于验证桌面端、发布站和模块化存储能力的一致性，稳定基线仍为 ${siteMeta.stableVersion}。</p><a class="button button-primary" href="${siteMeta.releasesUrl}" target="_blank" rel="noreferrer">打开发布页</a></div></section>
      <section class="content-band band-plain"><div class="content-wrap release-grid">
        <article data-reveal><span>数据工作流</span><h2>受控 JSON / SQLite 互换</h2><p>转换前备份、转换日志、数据源选择、数据库清理确认和兼容字段保留形成完整闭环。</p></article>
        <article data-reveal><span>研究能力</span><h2>模块化统计中心</h2><p>覆盖分区、分类组成、多样性、相似性、物候、趋势、数据质量与多格式导出。</p></article>
        <article data-reveal><span>工程质量</span><h2>TypeScript 与运行边界</h2><p>主进程、preload、IPC 契约、renderer 领域模型和自动检查逐步形成可维护结构。</p></article>
        <article data-reveal><span>交互体验</span><h2>科研白底与液态玻璃</h2><p>统一控件、模态层级、图表全屏、动效节奏、响应式布局和可访问状态反馈。</p></article>
      </div></section>
      <section class="content-band band-soft"><div class="content-wrap release-note" data-reveal><h2>发布说明</h2><p>${siteMeta.releaseTag} 为 Beta 测试标签，不替代 ${siteMeta.stableVersion} 稳定版。Windows 安装程序如未完成个人代码签名，系统可能显示未知发布者提示；请仅从项目官方发布页获取文件，并核对版本与校验信息。</p></div></section>`
  });
}

function privacyPage() {
  return layout({
    activePath: '',
    title: '隐私与网络',
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal><span>PRIVACY & NETWORK</span><h1>本地优先，网络请求由用户触发</h1><p>发布站点不接收桌面项目数据，桌面端也不会自动上传完整项目。</p></div></section>
      <section class="content-band band-plain"><div class="content-wrap policy-grid">
        <article data-reveal><h2>保留在本地</h2><p>项目记录、SQLite、JSON、备份、日志、本地路径、坐标和用户图片。</p></article>
        <article data-reveal><h2>按需发送</h2><p>用户主动查询物种参考时，仅发送必要的中文名或学名；地图服务按用户配置访问。</p></article>
        <article data-reveal><h2>不会发布</h2><p>服务 Token、完整第三方响应、未经选择的项目数据和用户目录信息。</p></article>
      </div></section>`
  });
}

export function renderPages({ workspaceHtml = '' } = {}) {
  if (!workspaceHtml) throw new Error('A complete browser workspace document is required.');
  return Object.freeze({
    '/': homePage(),
    '/workspace': workspaceHtml,
    '/docs': docsPage(),
    '/web': webPage(),
    '/release': releasePage(),
    '/privacy': privacyPage()
  });
}
