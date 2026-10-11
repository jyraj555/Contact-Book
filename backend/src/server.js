const { MongoClient } = require('mongodb');
const { createApp } = require('./app');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB || 'name_register_learning';
const port = Number(process.env.PORT || 3000);
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
let server;

async function start() {
  // Start accepting HTTP requests only after MongoDB responds.
  await client.connect();
  const db = client.db(databaseName);
  await db.command({ ping: 1 });
  server = createApp(db).listen(port, '127.0.0.1', () => {
    console.log(`MongoDB connected: ${databaseName}`);
    console.log(`API ready at http://127.0.0.1:${port}`);
  });
  server.on('error', async (error) => {
    console.error(`API failed: ${error.message}`);
    await client.close();
    process.exitCode = 1;
  });
}

async function stop() {
  if (server) await new Promise(resolve => server.close(resolve));
  await client.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
start().catch(async error => {
  console.error(`Startup failed: ${error.message}`);
  await client.close();
  process.exitCode = 1;
});
