import {
  architectureLayers,
  docsSections,
  navigation,
  researchNavigationGroups,
  researchFlow,
  siteMeta
} from './content.mjs';
import { findSiteApplication } from './apps/registry.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function nav(activePath) {
  const links = navigation
    .map(item => {
      const active = item.href === activePath ? ' aria-current="page" class="is-active"' : '';
      return `<a href="${item.href}"${active}>${escapeHtml(item.label)}</a>`;
    })
    .join('');
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

const pagePresentations = {
  '/': { className: 'site-page--home', themeColor: '#f7fbf8' },
  '/docs': { className: 'site-page--docs', themeColor: '#f7f9fc' },
  '/web': { className: 'site-page--architecture', themeColor: '#f6fafb' },
  '/release': { className: 'site-page--release', themeColor: '#fbf8f9' },
  '/privacy': { className: 'site-page--privacy', themeColor: '#f7faf8' },
  '/apps/project-inspector': {
    className: 'site-page--app-inspector',
    themeColor: '#f4faf9'
  }
};

function layout({ activePath, title, description, body, styles = [], scripts = [] }) {
  const presentation = pagePresentations[activePath] ?? pagePresentations['/'];
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description || siteMeta.description)}" />
  <meta name="theme-color" content="${presentation.themeColor}" />
  <title>${escapeHtml(title)} · CQNU Plant MAP</title>
  <link rel="icon" href="/assets/cqnu-logo.svg" />
  <link rel="stylesheet" href="/assets/styles.css" />
  <link rel="stylesheet" href="/assets/page-experience.css" />
  <link rel="stylesheet" href="/assets/responsive.css" />
  ${styles.map(href => `<link rel="stylesheet" href="${escapeHtml(href)}" />`).join('\n  ')}
  <script src="/assets/client.js" defer></script>
  ${scripts.map(src => `<script src="${escapeHtml(src)}" defer></script>`).join('\n  ')}
</head>
<body class="site-page ${presentation.className}">
  <a class="skip-link" href="#mainContent">跳至主要内容</a>
  ${nav(activePath)}
  <main id="mainContent">${body}</main>
  ${footer()}
</body>
</html>`;
}

function projectInspectorPage() {
  const application = findSiteApplication('/apps/project-inspector');
  if (!application) throw new Error('Project inspector manifest is missing.');
  return layout({
    activePath: application.route,
    title: application.title,
    description: application.summary,
    styles: ['/assets/apps.css'],
    scripts: [application.entry],
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal>
        <span>LOCAL RESEARCH UTILITY · ${escapeHtml(application.version)}</span>
        <h1>${escapeHtml(application.title)}</h1>
        <p>${escapeHtml(application.summary)}</p>
        <ul class="app-contract-badges"><li>仅读取用户主动选择的文件</li><li>不上传</li><li>不修改原文件</li><li>内存会话</li></ul>
      </div></section>
      <section class="content-band band-plain"><div class="content-wrap app-workbench" data-project-inspector>
        <aside class="app-contract-panel" data-reveal>
          <span class="eyebrow">应用宿主契约</span><h2>受控浏览器模块</h2>
          <dl>
            <div><dt>执行位置</dt><dd>当前浏览器标签页</dd></div>
            <div><dt>网络能力</dt><dd>无</dd></div>
            <div><dt>持久化</dt><dd>仅导出的检查报告</dd></div>
            <div><dt>支持内容</dt><dd>${application.acceptedFiles.map(escapeHtml).join(' · ')}</dd></div>
          </dl>
          <p>该工具只做格式与文件组成预检，不替代正式工作区的数据读取、修复或迁移。</p>
        </aside>
        <section class="app-inspector-panel" data-reveal>
          <div class="project-dropzone" data-project-dropzone>
            <div><h2>选择项目文件夹或项目文件</h2><p>可检查完整项目目录，也可单独选择 settings、zones、points 或 SQLite 数据库。</p>
              <div class="app-input-actions">
                <label class="button button-primary">选择项目文件夹<input type="file" webkitdirectory multiple data-project-directory-input /></label>
                <label class="button">选择文件<input type="file" accept=".json,.db,.sqlite,.sqlite3,image/*" multiple data-project-file-input /></label>
              </div>
            </div>
          </div>
          <p class="project-status" data-project-status role="status" aria-live="polite"></p>
          <section class="project-results" data-project-results hidden aria-labelledby="projectResultTitle">
            <h2 id="projectResultTitle">预检结果</h2>
            <div class="project-metrics">
              <article><span>文件数</span><strong data-project-metric="files">0</strong></article>
              <article><span>总大小</span><strong data-project-metric="bytes">0 B</strong></article>
              <article><span>分区与点位记录</span><strong data-project-metric="records">0</strong></article>
              <article><span>图片数</span><strong data-project-metric="images">0</strong></article>
            </div>
            <ul class="project-checks" data-project-checks></ul>
            <div class="project-file-scroll"><table class="project-file-table"><thead><tr><th>文件</th><th>类型</th><th>大小</th><th>检查结果</th></tr></thead><tbody data-project-files></tbody></table></div>
            <div class="app-result-actions"><button class="button" type="button" data-project-clear disabled>清除结果</button><button class="button button-primary" type="button" data-project-export disabled>导出本地报告</button></div>
          </section>
        </section>
      </div></section>`
  });
}

function homePage() {
  const groupNavigation = researchNavigationGroups
    .map(
      group => `
    <a href="#${escapeHtml(group.id)}">${escapeHtml(group.title)}</a>`
    )
    .join('');
  const groups = researchNavigationGroups
    .map(group => {
      const items = group.items
        .map(item => {
          const content = `
        <span class="hub-card-meta"><b>${escapeHtml(item.label)}</b><i>${item.state === 'available' ? '可用' : '待接入'}</i></span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.description)}</p>
        <span class="hub-card-action">${item.state === 'available' ? '打开模块' : '保留位置'}</span>`;
          const attributes = `class="hub-card${item.state === 'planned' ? ' is-planned' : ''}" data-hub-item data-search="${escapeHtml(`${item.title} ${item.description} ${item.keywords}`)}"`;
          return item.href
            ? `<a ${attributes} href="${escapeHtml(item.href)}">${content}</a>`
            : `<article ${attributes} aria-disabled="true">${content}</article>`;
        })
        .join('');
      return `
      <section id="${escapeHtml(group.id)}" class="hub-group" data-hub-group data-reveal>
        <div class="hub-group-heading"><div><span>${escapeHtml(group.title)}</span><h2>${escapeHtml(group.title)}</h2></div><p>${escapeHtml(group.description)}</p></div>
        <div class="hub-grid">${items}</div>
      </section>`;
    })
    .join('');
  const flow = researchFlow
    .map(
      (item, index) => `
    <li data-reveal>
      <span>${String(index + 1).padStart(2, '0')}</span>
      <div><strong>${escapeHtml(item.step)}</strong><p>${escapeHtml(item.detail)}</p></div>
    </li>`
    )
    .join('');

  return layout({
    activePath: '/',
    title: '科研导航',
    body: `
      <section class="hub-intro">
        <div class="hub-intro-inner" data-reveal>
          <div><span class="eyebrow">RESEARCH NAVIGATION · ${siteMeta.version}</span><h1>CQNU Research Hub</h1><p>从一个入口进入校园植物研究工具、项目服务、文档与后续科研模块。数据默认保存在本机，也可由用户显式保存到本人云项目。</p></div>
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
  const toc = docsSections.map(section => `<a href="#${section.id}" data-doc-link>${section.title}</a>`).join('');
  const sections = docsSections
    .map(
      section => `
    <section id="${section.id}" class="doc-section" data-doc-section data-reveal>
      <h2>${escapeHtml(section.title)}</h2>
      <ol>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    </section>`
    )
    .join('');
  return layout({
    activePath: '/docs',
    title: '使用文档',
    description: 'CQNU Plant MAP 安装、项目数据、备份和网络服务使用说明。',
    body: `
      <div class="doc-reading-progress" aria-hidden="true"><i data-doc-progress></i></div>
      <section class="page-hero"><div class="content-wrap" data-reveal><span>DOCUMENTATION</span><h1>使用文档</h1><p>从安装启动到项目维护，按真实工作流组织的快速参考。</p></div></section>
      <section class="content-band band-plain"><div class="content-wrap docs-layout">
        <aside class="doc-toc" aria-label="文档目录"><strong>目录</strong>${toc}</aside>
        <div class="doc-content">${sections}
          <section class="doc-section notice-block" data-reveal><h2>需要进一步核对时</h2><p>先保留项目备份和相关日志，再通过维护中心读取诊断结果。不要直接修改数据库文件或删除唯一数据源。</p><a class="text-link" href="${siteMeta.repositoryUrl}/issues" target="_blank" rel="noreferrer">前往问题反馈</a></section>
        </div>
      </div></section>
      <nav class="doc-float-actions" aria-label="文档快捷操作">
        <a href="#mainContent" title="返回文档顶部">顶部</a>
        <a href="/workspace" title="打开本地工作区">工作区</a>
      </nav>`
  });
}

function webPage() {
  const layers = architectureLayers
    .map(
      (item, index) => `
    <article class="architecture-layer" data-reveal>
      <div><span>${String(index + 1).padStart(2, '0')}</span><em>${escapeHtml(item.state)}</em></div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.detail)}</p>
    </article>`
    )
    .join('');
  return layout({
    activePath: '/web',
    title: 'Web 架构',
    description: 'CQNU Plant MAP 桌面端与浏览器端的共享界面和权限适配边界。',
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal><span>PLATFORM ARCHITECTURE</span><h1>Web 化不是重写界面，而是替换平台能力</h1><p>renderer 可以复用；本地文件和数据库能力必须使用浏览器认可的授权机制。</p></div></section>
      <section class="content-band band-soft"><div class="content-wrap architecture-grid">${layers}</div></section>
      <section class="content-band band-white"><div class="content-wrap comparison" data-reveal>
        <div><span>可直接共用</span><h2>界面、统计与领域模型</h2><p>组件、主题、动画、统计计算、图表数据、表格和导出内容生成保持同源。</p></div>
        <div><span>按平台实现</span><h2>存储、系统与网络边界</h2><p>桌面端使用白名单 IPC；浏览器端默认使用授权目录、OPFS 与 SQLite WASM，并可由用户显式使用按账户隔离的 D1 云项目快照。</p></div>
      </div></section>
      <section class="content-band band-plain"><div class="content-wrap roadmap" data-reveal>
        <span>实施顺序</span><h2>共享应用界面，按平台收束系统能力</h2>
        <ol><li>发布文档与版本站</li><li>浏览器授权目录与 OPFS 主库</li><li>账户隔离的版本化云项目</li><li>跨平台一致性和数据回归验证</li></ol>
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
        <article data-reveal><span>交互体验</span><h2>按场景编排的界面主题</h2><p>地图工作区使用科研白底与植物绿，管理端使用冰蓝与石墨色，文档和发布页面按内容语义独立配色；三者共享动效与可访问规范。</p></article>
      </div></section>
      <section class="content-band band-soft"><div class="content-wrap release-note" data-reveal><h2>发布说明</h2><p>${siteMeta.releaseTag} 为 Beta 测试标签，不替代 ${siteMeta.stableVersion} 稳定版。Windows 安装程序如未完成个人代码签名，系统可能显示未知发布者提示；请仅从项目官方发布页获取文件，并核对版本与校验信息。</p></div></section>`
  });
}

function privacyPage() {
  return layout({
    activePath: '/privacy',
    title: '隐私与网络',
    body: `
      <section class="page-hero"><div class="content-wrap" data-reveal><span>PRIVACY & NETWORK</span><h1>本地优先，云端保存由用户触发</h1><p>桌面端不包含云项目功能；浏览器端只有在用户选择云项目操作时才发送记录快照。</p></div></section>
      <section class="content-band band-plain"><div class="content-wrap policy-grid">
        <article data-reveal><h2>始终留在本地</h2><p>SQLite 原文件、JSON 文件、备份、日志、本地路径、目录句柄和用户图片字节。</p></article>
        <article data-reveal><h2>按需发送</h2><p>云项目上传已清除服务凭据与设备路径的 settings、zones、points 记录快照；物种参考仅发送用户选择的名称；地图服务按配置访问。</p></article>
        <article data-reveal><h2>不会自动发送</h2><p>未经选择的项目、桌面数据、服务 Token、完整第三方响应、用户目录信息和图片文件。</p></article>
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
    '/privacy': privacyPage(),
    '/apps/project-inspector': projectInspectorPage()
  });
}
