const express = require('express');
const cors = require('cors');
const path = require('path');
const { load, save } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '12mb' }));

const DEFAULT_SETTINGS = {
  company: {
    name: 'Ma Société',
    legalName: 'Ma Société SARL',
    logo: null,
    siret: '',
    vatNumber: '',
    address: '12 rue de l’Exemple',
    postalCity: '75000 Paris',
    phone: '01 23 45 67 89',
    email: 'contact@masociete.fr',
    website: 'www.masociete.fr'
  },
  document: {
    showHeader: true,
    headerText: 'Ma Société SARL — 12 rue de l’Exemple, 75000 Paris',
    showFooter: true,
    footerText: 'Merci de votre confiance. Règlement à réception de facture.',
    accentColor: '#2563eb',
    currency: 'EUR',
    defaultVatRate: 20,
    terms: 'Les marchandises restent la propriété du vendeur jusqu’au paiement intégral du prix.'
  }
};

function coll(name) {
  return load(name, []);
}

function saveColl(name, data) {
  save(name, data);
  return data;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nextDocumentNumber(type) {
  const seq = load('sequence', {});
  const map = { devis: 'DEV', commande: 'BC', livraison: 'BL', facture: 'FAC', reception: 'BR', facture_fournisseur: 'FF' };
  const prefix = map[type] || 'DOC';
  const next = (seq[type] || 0) + 1;
  seq[type] = next;
  save('sequence', seq);
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

function netAmount(items, vatRate) {
  return items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
}

function money(n) {
  return Math.round(n * 100) / 100;
}

/* ------------------------- Settings ------------------------- */

app.get('/api/settings', (req, res) => {
  const settings = load('settings', DEFAULT_SETTINGS);
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const current = load('settings', DEFAULT_SETTINGS);
  const next = req.body;
  const merged = {
    company: { ...DEFAULT_SETTINGS.company, ...(current.company || {}), ...(next.company || {}) },
    document: { ...DEFAULT_SETTINGS.document, ...(current.document || {}), ...(next.document || {}) }
  };
  save('settings', merged);
  res.json(merged);
});

/* ------------------------- Generic CRUD ------------------------- */

function crud(collectionName) {
  const router = express.Router();

  router.get('/', (req, res) => {
    let items = coll(collectionName);
    if (req.query.q) {
      const q = req.query.q.toLowerCase();
      items = items.filter((it) =>
        Object.values(it).some((v) => v && String(v).toLowerCase().includes(q))
      );
    }
    res.json(items);
  });

  router.get('/:id', (req, res) => {
    const item = coll(collectionName).find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  router.post('/', (req, res) => {
    const items = coll(collectionName);
    const item = { id: uid(), createdAt: new Date().toISOString(), ...req.body };
    items.push(item);
    saveColl(collectionName, items);
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const items = coll(collectionName);
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
    saveColl(collectionName, items);
    res.json(items[idx]);
  });

  router.delete('/:id', (req, res) => {
    const items = coll(collectionName).filter((i) => i.id !== req.params.id);
    saveColl(collectionName, items);
    res.json({ ok: true });
  });

  return router;
}

app.use('/api/clients', crud('clients'));
app.use('/api/suppliers', crud('suppliers'));

/* ------------------------- Products & Stock ------------------------- */

app.use('/api/products', crud('products'));

app.get('/api/categories', (req, res) => {
  const categories = [...new Set(coll('products').map((p) => (p.category || '').trim()).filter(Boolean))];
  res.json(categories);
});

app.get('/api/products/alerts/low-stock', (req, res) => {
  const low = coll('products').filter(
    (p) => (p.quantity || 0) <= (p.alertThreshold || 0)
  );
  res.json(low);
});

app.get('/api/movements', (req, res) => {
  let movements = coll('movements');
  const products = coll('products');
  const map = Object.fromEntries(products.map((p) => [p.id, p]));
  movements = movements
    .map((m) => ({ ...m, product: map[m.productId] || null }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(movements);
});

app.post('/api/movements', (req, res) => {
  const { productId, type, quantity, reason, date } = req.body;
  if (!productId || !type || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }
  const products = coll('products');
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  const delta = type === 'in' ? quantity : -quantity;
  const newQty = (product.quantity || 0) + delta;
  if (newQty < 0) {
    return res.status(400).json({ error: 'Stock insuffisant' });
  }
  product.quantity = newQty;
  saveColl('products', products);

  const movements = coll('movements');
  const movement = {
    id: uid(),
    productId,
    type,
    quantity,
    reason: reason || '',
    date: date || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  movements.push(movement);
  saveColl('movements', movements);
  res.status(201).json(movement);
});

/* ------------------------- Documents ------------------------- */

app.get('/api/documents', (req, res) => {
  let documents = coll('documents');
  const clients = coll('clients');
  const suppliers = coll('suppliers');
  const map = { client: Object.fromEntries(clients.map((c) => [c.id, c])), fournisseur: Object.fromEntries(suppliers.map((s) => [s.id, s])) };
  documents = documents.map((d) => ({
    ...d,
    partner: map[d.partnerType] ? map[d.partnerType][d.partnerId] || null : null
  }));
  if (req.query.type) documents = documents.filter((d) => d.type === req.query.type);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    documents = documents.filter((d) =>
      [d.number, d.partner && d.partner.name].some((v) => v && String(v).toLowerCase().includes(q))
    );
  }
  documents.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(documents);
});

app.get('/api/documents/:id', (req, res) => {
  const doc = coll('documents').find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const clients = coll('clients');
  const suppliers = coll('suppliers');
  const map = { client: Object.fromEntries(clients.map((c) => [c.id, c])), fournisseur: Object.fromEntries(suppliers.map((s) => [s.id, s])) };
  res.json({ ...doc, partner: map[doc.partnerType] ? map[doc.partnerType][doc.partnerId] || null : null });
});

function computeTotals(doc) {
  const vatRate = typeof doc.vatRate === 'number' ? doc.vatRate : 0;
  const base = money(netAmount(doc.items || [], vatRate));
  const discount = money((doc.discountPct || 0) / 100 * base);
  const taxable = money(base - discount);
  const vat = money(taxable * (vatRate / 100));
  return { base, discount, taxable, vat, total: money(taxable + vat) };
}

function applyStock(doc, direction) {
  const products = coll('products');
  const movements = coll('movements');
  let changed = false;
  for (const item of doc.items || []) {
    if (!item.productId) continue;
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const delta = direction === 'out' ? -item.quantity : item.quantity;
    product.quantity = Math.max(0, (product.quantity || 0) + delta);
    changed = true;
    movements.push({
      id: uid(),
      productId: item.productId,
      type: direction === 'out' ? 'out' : 'in',
      quantity: item.quantity,
      reason: `${doc.typeLabel || doc.type} ${doc.number}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }
  if (changed) {
    saveColl('products', products);
    saveColl('movements', movements);
  }
}

app.post('/api/documents', (req, res) => {
  const body = req.body;
  const number = body.number || nextDocumentNumber(body.type);
  const doc = {
    id: uid(),
    type: body.type,
    typeLabel: body.typeLabel || body.type,
    number,
    date: body.date || new Date().toISOString(),
    dueDate: body.dueDate || null,
    partnerId: body.partnerId || null,
    partnerType: body.partnerType || 'client',
    items: body.items || [],
    notes: body.notes || '',
    discountPct: Number(body.discountPct) || 0,
    vatRate: typeof body.vatRate === 'number' ? body.vatRate : 20,
    status: body.status || 'brouillon',
    currency: body.currency || 'EUR',
    createdAt: new Date().toISOString()
  };
  const totals = computeTotals(doc);
  doc.totals = totals;
  const documents = coll('documents');
  documents.push(doc);
  saveColl('documents', documents);
  res.status(201).json(doc);
});

app.put('/api/documents/:id', (req, res) => {
  const documents = coll('documents');
  const idx = documents.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const body = req.body;
  const doc = {
    ...documents[idx],
    ...body,
    id: documents[idx].id
  };
  if (typeof body.vatRate === 'number' || body.vatRate === undefined) {
    doc.vatRate = typeof body.vatRate === 'number' ? body.vatRate : documents[idx].vatRate;
  }
  doc.totals = computeTotals(doc);
  documents[idx] = doc;
  saveColl('documents', documents);
  res.json(doc);
});

app.post('/api/documents/:id/status', (req, res) => {
  const documents = coll('documents');
  const idx = documents.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const newStatus = req.body.status;
  const prev = documents[idx].status;
  documents[idx].status = newStatus;
  documents[idx].totals = computeTotals(documents[idx]);

  if (documents[idx].type === 'livraison' && newStatus === 'valide' && prev !== 'valide') {
    applyStock(documents[idx], 'out');
  }
  if ((documents[idx].type === 'commande' && newStatus === 'recue' && prev !== 'recue') ||
      (documents[idx].type === 'reception' && newStatus === 'valide' && prev !== 'valide')) {
    applyStock(documents[idx], 'in');
  }

  saveColl('documents', documents);
  res.json(documents[idx]);
});

app.delete('/api/documents/:id', (req, res) => {
  const documents = coll('documents').filter((d) => d.id !== req.params.id);
  saveColl('documents', documents);
  res.json({ ok: true });
});

app.delete('/api/movements', (req, res) => {
  saveColl('movements', []);
  res.json({ ok: true });
});

/* ------------------------- Dashboard stats ------------------------- */

app.get('/api/stats', (req, res) => {
  const clients = coll('clients');
  const suppliers = coll('suppliers');
  const products = coll('products');
  const documents = coll('documents');

  const stockValue = products.reduce((s, p) => s + (p.quantity || 0) * (p.buyPrice || 0), 0);
  const stockWorth = products.reduce((s, p) => s + (p.quantity || 0) * (p.sellPrice || 0), 0);
  const lowStock = products.filter((p) => (p.quantity || 0) <= (p.alertThreshold || 0)).length;

  const invoices = documents.filter((d) => d.type === 'facture');
  const revenue = invoices.reduce((s, d) => s + (d.totals ? d.totals.total : 0), 0);

  const byType = {};
  for (const d of documents) {
    byType[d.type] = (byType[d.type] || 0) + 1;
  }

  res.json({
    clients: clients.length,
    suppliers: suppliers.length,
    products: products.length,
    stockValue: money(stockValue),
    stockWorth: money(stockWorth),
    lowStock,
    revenue: money(revenue),
    documents: byType,
    totalDocuments: documents.length,
    pendingInvoices: invoices.filter((d) => d.status !== 'payee' && d.status !== 'annule').length
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`ERP API listening on http://localhost:${PORT}`);
});
