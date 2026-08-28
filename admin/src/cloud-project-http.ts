import type { CloudProjectService } from './cloud-project-service.js';
import { routeParameter, type AdminRouteContract } from './http-contract.js';
import { readJson } from './http-json.js';

const MAX_CLOUD_PROJECT_REQUEST_BYTES = (8 * 1024 * 1024) + (64 * 1024);

export interface CloudProjectHttpInput {
  route: AdminRouteContract;
  path: string;
  request: Request;
  ownerId: string;
  service: CloudProjectService;
  headers: Record<string, string>;
  respond(body: unknown, status?: number, headers?: Record<string, string>): Response;
  audit(projectId: string, statusCode: number): Promise<void>;
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 0) throw new Error('REQUEST_BODY_INVALID');
  return Number(value);
}

export async function handleCloudProjectHttp(input: CloudProjectHttpInput): Promise<Response> {
  const { route, request, path, ownerId, service, headers, respond } = input;
  if (route.id === 'cloud-projects.list') {
    return respond({ ok: true, data: { projects: await service.list(ownerId) } }, 200, headers);
  }

  if (route.id === 'cloud-projects.create') {
    const body = await readJson(request);
    const project = await service.create(ownerId, body.name);
    await input.audit(project.id, 201);
    return respond({ ok: true, data: { project } }, 201, headers);
  }

  const projectId = routeParameter(route, path, 'projectId');
  if (!projectId) throw new Error('REQUEST_BODY_INVALID');
  if (route.id === 'cloud-projects.read') {
    return respond({ ok: true, data: await service.read(ownerId, projectId) }, 200, headers);
  }

  if (route.id === 'cloud-projects.save') {
    const body = await readJson(request, MAX_CLOUD_PROJECT_REQUEST_BYTES);
    const project = await service.save({
      ownerId,
      actorId: ownerId,
      projectId,
      expectedRevision: nonNegativeInteger(body.expectedRevision),
      snapshot: body.snapshot
    });
    await input.audit(project.id, 200);
    return respond({ ok: true, data: { project } }, 200, headers);
  }

  throw new Error('ROUTE_DENIED');
}
