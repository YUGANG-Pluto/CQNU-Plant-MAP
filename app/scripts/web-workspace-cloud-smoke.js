async function requestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(body));
}

function seedCloudProjects() {
  return new Map([[
    'cloud-project-smoke',
    {
      metadata: {
        id: 'cloud-project-smoke',
        name: 'Cloud smoke project',
        revision: 1,
        formatVersion: 1,
        byteSize: 128,
        contentSha256: 'a'.repeat(64),
        createdAt: '2026-08-28T08:00:00.000Z',
        updatedAt: '2026-08-28T08:00:00.000Z'
      },
      snapshot: {
        formatVersion: 1,
        settings: { projectName: 'Cloud smoke project' },
        zones: [{ id: 'cloud-zone', name: 'Cloud Zone' }],
        points: [{ id: 'cloud-point', zoneId: 'cloud-zone', plantNameSci: 'Planta cloudensis' }]
      }
    }
  ]]);
}

function createCloudProjectSmokeApi() {
  const projects = seedCloudProjects();
  return {
    async handle(request, response, target, context) {
      if (target.pathname !== '/api/projects' && !target.pathname.startsWith('/api/projects/')) {
        return false;
      }
      if (context.loggedOut) {
        sendJson(response, 401, { ok: false, error: { code: 'SESSION_REQUIRED', message: 'Session required' } });
        return true;
      }

      const segments = target.pathname.split('/').filter(Boolean);
      const projectId = segments[2] || '';
      if (request.method === 'GET' && target.pathname === '/api/projects') {
        sendJson(response, 200, {
          ok: true,
          data: { projects: [...projects.values()].map(item => item.metadata) }
        });
        return true;
      }
      if (request.method === 'GET' && projectId && segments.length === 3) {
        const project = projects.get(projectId);
        sendJson(response, project ? 200 : 404, project
          ? { ok: true, data: project }
          : { ok: false, error: { code: 'CLOUD_PROJECT_NOT_FOUND', message: 'Not found' } });
        return true;
      }
      if (context.accessLevel !== 'save' || request.headers['x-cqnu-csrf'] !== 'web-smoke-csrf') {
        sendJson(response, 403, { ok: false, error: { code: 'CAPABILITY_DENIED', message: 'Save denied' } });
        return true;
      }
      if (request.method === 'POST' && target.pathname === '/api/projects') {
        const body = await requestJson(request);
        const id = `cloud-project-${projects.size + 1}`;
        const now = new Date().toISOString();
        const project = {
          metadata: {
            id,
            name: String(body.name || 'Cloud project'),
            revision: 0,
            formatVersion: 1,
            byteSize: 0,
            contentSha256: '',
            createdAt: now,
            updatedAt: now
          },
          snapshot: null
        };
        projects.set(id, project);
        sendJson(response, 201, { ok: true, data: { project: project.metadata } });
        return true;
      }
      if (request.method === 'PUT' && projectId && segments[3] === 'snapshot') {
        const project = projects.get(projectId);
        const body = await requestJson(request);
        if (!project || Number(body.expectedRevision) !== project.metadata.revision) {
          sendJson(response, project ? 409 : 404, {
            ok: false,
            error: {
              code: project ? 'CLOUD_PROJECT_CONFLICT' : 'CLOUD_PROJECT_NOT_FOUND',
              message: 'Cloud project conflict'
            }
          });
          return true;
        }
        project.snapshot = body.snapshot;
        project.metadata = {
          ...project.metadata,
          revision: project.metadata.revision + 1,
          byteSize: Buffer.byteLength(JSON.stringify(body.snapshot)),
          contentSha256: 'b'.repeat(64),
          updatedAt: new Date().toISOString()
        };
        sendJson(response, 200, { ok: true, data: { project: project.metadata } });
        return true;
      }

      sendJson(response, 405, { ok: false, error: { code: 'ROUTE_DENIED', message: 'Method not allowed' } });
      return true;
    }
  };
}

async function runCloudProjectRoundtrip(window) {
  return window.webContents.executeJavaScript(
    `(async () => {
      const client = window.siteCloudProjects;
      const listed = await client.list();
      const remote = await client.read(listed[0].id);
      await window.projectRendererBridge.importCloudProject(remote);
      window.__CQNU_STATE__.settings.baseMaps = [{
        id: 'cloud-smoke-map',
        key: 'smoke-secret',
        url: 'https://tiles.example.test/{z}/{x}/{y}?key=smoke-secret'
      }];
      window.__CQNU_STATE__.settings.exportPath = ['D:', 'Research', 'cloud-smoke.csv']
        .join(String.fromCharCode(92));
      window.__CQNU_STATE__.points[0].images = ['images/cloud-point.jpg'];
      const snapshot = window.projectRendererBridge.snapshot();
      const saved = await client.save(remote.metadata.id, remote.metadata.revision, snapshot);
      window.cqnuLayerManager.open(document.getElementById('projectImportModal'));
      document.getElementById('btnOpenCloudProjectLibrary')?.click();
      await new Promise(resolve => setTimeout(resolve, 80));
      const libraryModal = document.getElementById('cloudProjectLibraryModal');
      const importModal = document.getElementById('projectImportModal');
      const libraryOpen = libraryModal?.classList.contains('is-open') || false;
      const libraryCards = document.querySelectorAll('.cloud-project-card').length;
      window.cqnuLayerManager.close(libraryModal, { instant: true, restoreFocus: false });
      window.cqnuLayerManager.close(importModal, { instant: true, restoreFocus: false });
      return {
        clientReady: client?.version === 'site-cloud-projects-v1',
        listed: listed.length,
        savedRevision: saved.revision,
        sourceKind: window.projectSessionStore?.getSnapshot().sourceKind,
        pointCount: window.__CQNU_STATE__?.points?.length || 0,
        sensitiveDataRemoved: snapshot.settings.baseMaps[0].key === ''
          && snapshot.settings.baseMaps[0].url.endsWith('?key={key}')
          && snapshot.settings.exportPath === '',
        relativeImageReferencePreserved: snapshot.points[0].images[0] === 'images/cloud-point.jpg',
        libraryOpen,
        libraryCards
      };
    })()`,
    true
  );
}

module.exports = {
  createCloudProjectSmokeApi,
  runCloudProjectRoundtrip
};
