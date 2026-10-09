import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig(process.env);
const app = await buildApp({ config });
await app.listen({ port: config.port, host: config.host });
