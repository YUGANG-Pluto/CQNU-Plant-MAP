const smokePortBase = 42_000;
const smokePortAttempts = 32;

function listenOnce(server, host, port) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.removeListener('error', handleError);
      server.removeListener('listening', handleListening);
    };
    const handleError = error => {
      cleanup();
      reject(error);
    };
    const handleListening = () => {
      cleanup();
      resolve();
    };
    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(port, host);
  });
}

async function listenOnSafePort(server, host) {
  const firstPort = smokePortBase + (process.pid % 512);
  for (let offset = 0; offset < smokePortAttempts; offset += 1) {
    try {
      await listenOnce(server, host, firstPort + offset);
      return;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`No local smoke-test port was available after ${smokePortAttempts} attempts.`);
}

module.exports = { listenOnSafePort };
