import { useEffect, useState } from 'preact/hooks';
import type { SiteCloudProjectClient } from '../../../shared/types/cloud-projects';

declare global {
  interface Window {
    siteCloudProjects?: SiteCloudProjectClient;
  }
}

const CLOUD_PROJECTS_READY_EVENT = 'cqnu:cloud-projects-ready';

export function useSiteCloudProjectClient(): SiteCloudProjectClient | undefined {
  const [client, setClient] = useState<SiteCloudProjectClient | undefined>(window.siteCloudProjects);

  useEffect(() => {
    const syncClient = () => setClient(window.siteCloudProjects);
    window.addEventListener(CLOUD_PROJECTS_READY_EVENT, syncClient);
    syncClient();
    return () => window.removeEventListener(CLOUD_PROJECTS_READY_EVENT, syncClient);
  }, []);

  return client;
}
