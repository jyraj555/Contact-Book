const { MongoClient } = require('mongodb');
const { createApp } = require('./app');
const path = require('path');
const fs = require('fs');

const production = process.env.NODE_ENV === 'production';
if (production && !process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in production. Set it in Render Environment settings.');
}
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB || 'name_register_learning';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const host = production ? '0.0.0.0' : '127.0.0.1';
const frontendDir = production ? path.resolve(__dirname, '../../frontend/dist/name-register') : undefined;
if (production && !fs.existsSync(path.join(frontendDir, 'index.html'))) {
  throw new Error('Angular build missing. Run npm run build from the repository root first.');
}
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
let server;

async function start() {
  // Start accepting HTTP requests only after MongoDB responds.
  await client.connect();
  const db = client.db(databaseName);
  await db.command({ ping: 1 });
  server = createApp(db, { frontendDir }).listen(port, host, () => {
    console.log(`MongoDB connected: ${databaseName}`);
    console.log(`Server ready at http://${host}:${port}`);
  });
  server.on('error', async (error) => {
    console.error(`API failed: ${error.message}`);
    await client.close();
    process.exitCode = 1;
  });
}

async function stop() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  if (server) await new Promise(resolve => server.close(resolve));
  await client.close();
  clearTimeout(timeout);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
start().catch(async error => {
  console.error(`Startup failed: ${error.message}`);
  await client.close();
  process.exitCode = 1;
});
