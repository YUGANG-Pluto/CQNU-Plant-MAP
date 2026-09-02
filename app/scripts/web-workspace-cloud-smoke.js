const { createHash } = require('node:crypto');

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
  const snapshot = {
    formatVersion: 1,
    settings: { projectName: 'Cloud smoke project' },
    zones: [{ id: 'cloud-zone', name: 'Cloud Zone' }],
    points: [{ id: 'cloud-point', zoneId: 'cloud-zone', plantNameSci: 'Planta cloudensis' }]
  };
  const serialized = JSON.stringify(snapshot);
  const metadata = {
    id: 'cloud-project-smoke',
    name: 'Cloud smoke project',
    revision: 1,
    formatVersion: 1,
    byteSize: Buffer.byteLength(serialized),
    contentSha256: createHash('sha256').update(serialized, 'utf8').digest('hex'),
    createdAt: '2026-08-28T08:00:00.000Z',
    updatedAt: '2026-08-28T08:00:00.000Z'
  };
  return new Map([['cloud-project-smoke', {
    metadata,
    snapshot,
    revisions: new Map([[1, { metadata: revisionMetadata(metadata), snapshot }]])
  }]]);
}

function revisionMetadata(metadata) {
  return {
    projectId: metadata.id,
    revision: metadata.revision,
    formatVersion: metadata.formatVersion,
    byteSize: metadata.byteSize,
    contentSha256: metadata.contentSha256,
    createdAt: metadata.updatedAt
  };
}

function usage(projects) {
  const entries = [...projects.values()];
  return {
    projectCount: entries.length,
    maxProjects: 25,
    currentBytes: entries.reduce((sum, item) => sum + item.metadata.byteSize, 0),
    versionBytes: entries.reduce(
      (sum, item) => sum + [...item.revisions.values()]
        .reduce((revisionSum, revision) => revisionSum + revision.metadata.byteSize, 0),
      0
    ),
    maxSnapshotBytes: 8 * 1024 * 1024,
    updatedAt: entries.map(item => item.metadata.updatedAt).sort().at(-1) || null
  };
}

function saveRevision(project, snapshot, forceRevision = false) {
  const serialized = JSON.stringify(snapshot);
  const byteSize = Buffer.byteLength(serialized);
  const contentSha256 = createHash('sha256').update(serialized, 'utf8').digest('hex');
  if (!forceRevision
    && project.metadata.revision > 0
    && project.metadata.byteSize === byteSize
    && project.metadata.contentSha256 === contentSha256) {
    return project.metadata;
  }
  const revision = project.metadata.revision + 1;
  const now = new Date().toISOString();
  project.snapshot = snapshot;
  project.metadata = {
    ...project.metadata,
    revision,
    byteSize,
    contentSha256,
    updatedAt: now
  };
  project.revisions.set(revision, {
    metadata: revisionMetadata(project.metadata),
    snapshot
  });
  return project.metadata;
}

function createCloudProjectSmokeApi() {
  const projects = seedCloudProjects();
  return {
    async handle(request, response, target, context) {
      const isProjectRoute = target.pathname === '/api/projects'
        || target.pathname.startsWith('/api/projects/');
      const isAdminUsageRoute = target.pathname === '/api/manage/cloud-projects/usage';
      if (!isProjectRoute && !isAdminUsageRoute) {
        return false;
      }
      if (context.loggedOut) {
        sendJson(response, 401, { ok: false, error: { code: 'SESSION_REQUIRED', message: 'Session required' } });
        return true;
      }

      const segments = target.pathname.split('/').filter(Boolean);
      const projectId = segments[2] || '';
      if (request.method === 'GET' && isAdminUsageRoute) {
        const currentUsage = usage(projects);
        sendJson(response, 200, {
          ok: true,
          data: {
            summary: {
              accountCount: 1,
              projectCount: currentUsage.projectCount,
              currentBytes: currentUsage.currentBytes,
              versionBytes: currentUsage.versionBytes,
              maxProjectsPerAccount: currentUsage.maxProjects,
              maxSnapshotBytes: currentUsage.maxSnapshotBytes
            },
            accounts: [{
              accountId: 'acct_web_smoke_save',
              username: 'web.smoke',
              displayName: 'Web smoke',
              accountKind: 'admin',
              accessLevel: 'save',
              projectCount: currentUsage.projectCount,
              currentBytes: currentUsage.currentBytes,
              versionBytes: currentUsage.versionBytes,
              updatedAt: currentUsage.updatedAt
            }]
          }
        });
        return true;
      }
      if (request.method === 'GET' && target.pathname === '/api/projects') {
        sendJson(response, 200, {
          ok: true,
          data: { projects: [...projects.values()].map(item => item.metadata) }
        });
        return true;
      }
      if (request.method === 'GET' && target.pathname === '/api/projects/usage') {
        sendJson(response, 200, { ok: true, data: { usage: usage(projects) } });
        return true;
      }
      if (request.method === 'GET' && projectId && segments[3] === 'revisions') {
        const project = projects.get(projectId);
        sendJson(response, project ? 200 : 404, project
          ? {
            ok: true,
            data: {
              revisions: [...project.revisions.values()]
                .map(item => item.metadata)
                .sort((left, right) => right.revision - left.revision)
            }
          }
          : { ok: false, error: { code: 'CLOUD_PROJECT_NOT_FOUND', message: 'Not found' } });
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
          snapshot: null,
          revisions: new Map()
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
        sendJson(response, 200, { ok: true, data: { project: saveRevision(project, body.snapshot) } });
        return true;
      }
      if (request.method === 'PATCH' && projectId && segments.length === 3) {
        const project = projects.get(projectId);
        const body = await requestJson(request);
        if (!project || Number(body.expectedRevision) !== project.metadata.revision) {
          sendJson(response, project ? 409 : 404, {
            ok: false,
            error: { code: project ? 'CLOUD_PROJECT_CONFLICT' : 'CLOUD_PROJECT_NOT_FOUND', message: 'Rename conflict' }
          });
          return true;
        }
        project.metadata = {
          ...project.metadata,
          name: String(body.name || project.metadata.name),
          updatedAt: new Date().toISOString()
        };
        sendJson(response, 200, { ok: true, data: { project: project.metadata } });
        return true;
      }
      if (request.method === 'POST' && projectId && segments[3] === 'revisions' && segments[5] === 'restore') {
        const project = projects.get(projectId);
        const revision = Number(segments[4]);
        const body = await requestJson(request);
        const historical = project?.revisions.get(revision);
        if (!project || !historical || Number(body.expectedRevision) !== project.metadata.revision) {
          sendJson(response, project ? 409 : 404, {
            ok: false,
            error: { code: project ? 'CLOUD_PROJECT_CONFLICT' : 'CLOUD_PROJECT_NOT_FOUND', message: 'Restore conflict' }
          });
          return true;
        }
        sendJson(response, 200, {
          ok: true,
          data: { project: saveRevision(project, structuredClone(historical.snapshot), true) }
        });
        return true;
      }
      if (request.method === 'DELETE' && projectId && segments.length === 3) {
        const project = projects.get(projectId);
        const body = await requestJson(request);
        if (!project || Number(body.expectedRevision) !== project.metadata.revision) {
          sendJson(response, project ? 409 : 404, {
            ok: false,
            error: { code: project ? 'CLOUD_PROJECT_CONFLICT' : 'CLOUD_PROJECT_NOT_FOUND', message: 'Delete conflict' }
          });
          return true;
        }
        projects.delete(projectId);
        sendJson(response, 200, { ok: true, data: { deleted: true, projectId } });
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
      const initialUsage = await client.usage();
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
      const duplicate = await client.save(remote.metadata.id, saved.revision, snapshot);
      const history = await client.revisions(remote.metadata.id);
      const restored = await client.restore(remote.metadata.id, 1, saved.revision);
      const renamed = await client.rename(remote.metadata.id, restored.revision, 'Renamed cloud smoke');
      const temporary = await client.create('Temporary cloud smoke');
      await client.remove(temporary.id, temporary.revision);
      const finalUsage = await client.usage();
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
        initialUsageProjects: initialUsage.projectCount,
        savedRevision: saved.revision,
        duplicateRevision: duplicate.revision,
        historyRevisions: history.map(item => item.revision),
        restoredRevision: restored.revision,
        renamedName: renamed.name,
        finalUsageProjects: finalUsage.projectCount,
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
