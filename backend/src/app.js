const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');

// Receive the database connection from server.js, so tests can use their own database.
function createApp(db, { frontendDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', async (_req, res, next) => {
    try {
      await db.command({ ping: 1 });
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) { next(error); }
  });

  app.get('/api/names', async (_req, res, next) => {
    try {
      const names = await db.collection('names').find().sort({ createdAt: -1, _id: -1 }).toArray();
      res.json(names);
    } catch (error) { next(error); }
  });

  app.post('/api/names', async (req, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 100) {
      return res.status(400).json({ message: 'Name must be between 1 and 100 characters.' });
    }
    try {
      const document = { name, createdAt: new Date() };
      const result = await db.collection('names').insertOne(document);
      res.status(201).json({ ...document, _id: result.insertedId });
    } catch (error) { next(error); }
  });

  app.get('/api/contacts', async (_req, res, next) => {
    try {
      const records = await db.collection('names').find().sort({ createdAt: -1, _id: -1 }).toArray();
      res.json(records.map(r => ({ ...r, firstName: r.firstName ?? r.name ?? '', lastName: r.lastName ?? '', company: r.company ?? '', mobile1: r.mobile1 ?? '', mobile2: r.mobile2 ?? '', email: r.email ?? '' })));
    } catch (error) { next(error); }
  });
  async function saveContact(req, res, next) {
    if (req.params.id && !/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid contact ID.' });
    const contact = {};
    for (const [field, limit] of Object.entries({ firstName: 100, lastName: 100, company: 150, mobile1: 30, mobile2: 30, email: 254 })) {
      const value = req.body?.[field] ?? '';
      if (typeof value !== 'string' || value.trim().length > limit) return res.status(400).json({ message: `${field} must be text with at most ${limit} characters.` });
      contact[field] = value.trim();
    }
    if (!contact.firstName || !contact.mobile1) return res.status(400).json({ message: 'First name and mobile number 1 are required.' });
    for (const field of ['mobile1', 'mobile2']) {
      const value = contact[field];
      const digits = value.replace(/\D/g, '');
      if (value && (!/^\+?[0-9 ()-]+$/.test(value) || digits.length < 7 || digits.length > 15)) return res.status(400).json({ message: 'Mobile numbers need 7–15 digits, with optional +, spaces, parentheses or hyphens.' });
    }
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    try {
      if (req.params.id) {
        const result = await db.collection('names').findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: { ...contact, updatedAt: new Date() }, $unset: { name: '' } },
          { returnDocument: 'after' }
        );
        if (!result.value) return res.status(404).json({ message: 'Contact not found.' });
        return res.json(result.value);
      }
      const document = { ...contact, createdAt: new Date() };
      const result = await db.collection('names').insertOne(document);
      res.status(201).json({ ...document, _id: result.insertedId });
    } catch (error) { next(error); }
  }
  app.post('/api/contacts', saveContact);
  app.put('/api/contacts/:id', saveContact);
  app.delete('/api/contacts/:id', async (req, res, next) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid contact ID.' });
    try {
      const result = await db.collection('names').deleteOne({ _id: new ObjectId(req.params.id) });
      if (!result.deletedCount) return res.status(404).json({ message: 'Contact not found.' });
      res.json({ message: 'Contact deleted.' });
    } catch (error) { next(error); }
  });
  // Unknown API paths must never return Angular's HTML.
  app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));
  if (frontendDir) {
    app.use(express.static(frontendDir, {
      index: false,
      setHeaders(res, file) {
        res.set('Cache-Control', /\.[a-f0-9]{8,}\.(js|css)$/.test(file)
          ? 'public, max-age=31536000, immutable' : 'no-cache');
      }
    }));
    // Only page URLs fall back to Angular; missing assets remain real 404s.
    app.get(['/', '/add', '/contacts'], (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(frontendDir, 'index.html'));
    });
  }
  app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Request must contain valid JSON.' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Request is too large.' });
    }
    console.error(error.message);
    res.status(503).json({ message: 'Database unavailable. Please try again.' });
  });
  return app;
}

module.exports = { createApp };
