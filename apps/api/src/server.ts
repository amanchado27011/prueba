import { buildApp } from './app';
import { getEnv } from './config/env';
import { ensureCatalogs } from './services/catalog-bootstrap';

async function main() {
  const env = getEnv();
  await ensureCatalogs();
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`API escuchando en ${env.PORT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
