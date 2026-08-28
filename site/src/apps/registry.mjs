const APP_ID_PATTERN = /^[a-z][a-z0-9-]{2,47}$/u;

function freezeManifest(input) {
  const manifest = {
    id: String(input.id || ''),
    route: String(input.route || ''),
    title: String(input.title || ''),
    summary: String(input.summary || ''),
    version: String(input.version || ''),
    state: input.state === 'available' ? 'available' : 'planned',
    execution: 'browser-local',
    entry: String(input.entry || ''),
    dataPolicy: Object.freeze({
      persistence: 'memory',
      network: 'none',
      upload: false,
      localFileRead: true
    }),
    acceptedFiles: Object.freeze([...(input.acceptedFiles || [])].map(String)),
    capabilities: Object.freeze([...(input.capabilities || [])].map(String))
  };
  if (!APP_ID_PATTERN.test(manifest.id)) throw new Error(`Invalid site application id: ${manifest.id}`);
  if (manifest.route !== `/apps/${manifest.id}`) throw new Error(`Invalid site application route: ${manifest.route}`);
  if (!manifest.title || !manifest.summary || !manifest.version)
    throw new Error(`Incomplete site application: ${manifest.id}`);
  if (!manifest.entry.startsWith('/assets/') || !manifest.entry.endsWith('.js')) {
    throw new Error(`Invalid site application entry: ${manifest.entry}`);
  }
  if (manifest.dataPolicy.network !== 'none' || manifest.dataPolicy.upload !== false) {
    throw new Error(`Local site application cannot declare remote data access: ${manifest.id}`);
  }
  return Object.freeze(manifest);
}

export const siteApplications = Object.freeze([
  freezeManifest({
    id: 'project-inspector',
    route: '/apps/project-inspector',
    title: '本地项目文件预检',
    summary: '在浏览器内检查项目文件组成、JSON 结构和 SQLite 文件头，不上传或修改原文件。',
    version: '1.0.0',
    state: 'available',
    entry: '/assets/project-inspector.js',
    acceptedFiles: ['settings.json', 'zones.json', 'points.json', '*.db', '*.sqlite', 'images/*'],
    capabilities: ['项目结构识别', 'JSON 结构检查', 'SQLite 文件头检查', '本地报告导出']
  })
]);

export function findSiteApplication(pathname) {
  return siteApplications.find(application => application.route === pathname) || null;
}
