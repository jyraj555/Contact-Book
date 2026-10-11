const assert = require('assert/strict');
const http = require('http');
const { randomUUID } = require('crypto');
const { MongoClient } = require('mongodb');
const { createApp } = require('../src/app');

const databaseName = `name_register_test_${randomUUID().replace(/-/g, '')}`;
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
let client;
let server;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port,
      path, method, headers: { 'Content-Type': 'application/json' } }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
async function open() {
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  server = await new Promise(resolve => {
    const listener = createApp(client.db(databaseName)).listen(0, '127.0.0.1', () => resolve(listener));
  });
}
async function close() {
  if (server) await new Promise(resolve => server.close(resolve));
  if (client) await client.close();
}
async function run() {
  await open();
  assert.equal((await request('GET', '/api/health')).body.database, 'connected');
  assert.deepEqual((await request('GET', '/api/names')).body, []);
  for (const name of [undefined, '', '   ', 42, {}, 'a'.repeat(101)]) {
    assert.equal((await request('POST', '/api/names', JSON.stringify({ name }))).status, 400);
  }
  assert.equal((await request('POST', '/api/names', '{')).status, 400);
  const saved = await request('POST', '/api/names', JSON.stringify({ name: '  Ada Lovelace  ' }));
  assert.equal(saved.status, 201);
  assert.equal(saved.body.name, 'Ada Lovelace');
  assert.ok(saved.body._id);
  const stored = await client.db(databaseName).collection('names').findOne({ name: 'Ada Lovelace' });
  assert.equal(stored._id.toString(), saved.body._id);
  await close();
  await open();
  const restored = await request('GET', '/api/names');
  assert.equal(restored.status, 200);
  assert.equal(restored.body[0]._id, saved.body._id);
  const legacy = await request('GET', '/api/contacts');
  assert.equal(legacy.body[0].firstName, 'Ada Lovelace');
  const input = { firstName: '  Test  ', lastName: 'Contact', company: 'Example', mobile1: '+91 98765 43210', mobile2: '0123456789', email: 'test@example.com' };
  for (const change of [{ firstName: ' ' }, { mobile1: '' }, { mobile1: 123456789 }, { mobile2: 'abc1234567' }, { email: 'invalid' }, { company: 'a'.repeat(151) }]) {
    assert.equal((await request('POST', '/api/contacts', JSON.stringify({ ...input, ...change }))).status, 400);
  }
  const contact = await request('POST', '/api/contacts', JSON.stringify(input));
  assert.equal(contact.status, 201);
  const expected = { ...input, firstName: 'Test' };
  const document = await client.db(databaseName).collection('names').findOne({ firstName: 'Test' });
  for (const key of Object.keys(expected)) assert.equal(document[key], expected[key]);
  await close();
  await open();
  const contacts = (await request('GET', '/api/contacts')).body;
  assert.equal(contacts.length, 2);
  assert.equal(contacts.find(c => c._id === contact.body._id).mobile2, '0123456789');
  assert.equal((await request('PUT', '/api/contacts/bad-id', JSON.stringify(input))).status, 400);
  assert.equal((await request('DELETE', '/api/contacts/bad-id')).status, 400);
  assert.equal((await request('PUT', '/api/contacts/' + contact.body._id, JSON.stringify({ ...input, email: 'bad' }))).status, 400);
  const updated = await request('PUT', '/api/contacts/' + contact.body._id, JSON.stringify({ ...input, firstName: 'Updated' }));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.firstName, 'Updated');
  assert.equal(updated.body.createdAt, contact.body.createdAt);
  await close(); await open();
  assert.equal((await request('GET', '/api/contacts')).body.find(c => c._id === contact.body._id).firstName, 'Updated');
  assert.equal((await request('DELETE', '/api/contacts/' + contact.body._id)).status, 200);
  assert.equal((await request('DELETE', '/api/contacts/' + contact.body._id)).status, 404);
  assert.equal((await request('PUT', '/api/contacts/' + contact.body._id, JSON.stringify(input))).status, 404);
  assert.equal((await request('GET', '/api/contacts')).body.some(c => c._id === contact.body._id), false);
  assert.equal((await request('GET', '/api/contacts')).body.some(c => c._id === saved.body._id), true);
  console.log('PASS: update persistence, delete, invalid IDs, missing records, validation and preservation of other contacts.');
  assert.equal((await request('POST', '/api/contacts', JSON.stringify({ firstName: 'Minimal', mobile1: '1234567890' }))).status, 201);
  console.log('PASS: six contact fields persisted, validation, optional fields, legacy names, and contact retrieval after restart.');
  console.log('PASS: MongoDB ping, empty GET, invalid input, malformed JSON, POST, direct database read, GET after API/connection restart.');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  // Delete only the unique temporary database created by this test run.
  if (client && databaseName.startsWith('name_register_test_')) {
    await client.db(databaseName).dropDatabase().catch(() => {});
  }
  await close();
});
