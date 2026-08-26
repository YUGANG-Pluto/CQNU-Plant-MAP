import type { WebDatabaseClient } from './webDatabaseClient';

let clientPromise: Promise<WebDatabaseClient> | null = null;

export function loadWebDatabaseClient(): Promise<WebDatabaseClient> {
  if (!clientPromise) {
    clientPromise = import('./webDatabaseClient')
      .then(module => module.getWebDatabaseClient())
      .catch(error => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}
