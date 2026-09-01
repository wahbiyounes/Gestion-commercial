async function request(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  delete: (url) => request('DELETE', url),

  settings: {
    get: () => api.get('/api/settings'),
    save: (data) => api.put('/api/settings', data)
  },

  stats: () => api.get('/api/stats'),

  partners: (kind) => api.get(`/api/${kind}`),

  products: {
    list: () => api.get('/api/products'),
    create: (p) => api.post('/api/products', p),
    update: (id, p) => api.put(`/api/products/${id}`, p),
    remove: (id) => api.delete(`/api/products/${id}`),
    lowStock: () => api.get('/api/products/alerts/low-stock'),
    categories: () => api.get('/api/categories')
  },

  movements: {
    list: () => api.get('/api/movements'),
    create: (m) => api.post('/api/movements', m),
    clear: () => api.delete('/api/movements')
  },

  documents: {
    list: (query = '') => api.get(`/api/documents${query}`),
    get: (id) => api.get(`/api/documents/${id}`),
    create: (d) => api.post('/api/documents', d),
    update: (id, d) => api.put(`/api/documents/${id}`, d),
    remove: (id) => api.delete(`/api/documents/${id}`),
    setStatus: (id, status) => api.post(`/api/documents/${id}/status`, { status })
  }
};

export const DOC_TYPES = {
  devis: { label: 'Devis', color: 'violet' },
  livraison: { label: 'Bon de livraison', short: 'Livraison', color: 'amber' },
  facture: { label: 'Facture', color: 'green' },
  commande: { label: 'Bon de commande', short: 'Commande', color: 'blue' },
  reception: { label: 'Bon de réception', short: 'Réception', color: 'teal' },
  facture_fournisseur: { label: 'Facture fournisseur', short: 'Fact. fourn.', color: 'orange' }
};

export const DOC_GROUPS = {
  ventes: { label: 'Documents clients', short: 'Clients', types: ['devis', 'livraison', 'facture'] },
  achats: { label: 'Documents fournisseurs', short: 'Fournisseurs', types: ['commande', 'reception', 'facture_fournisseur'] }
};

export function groupOfType(type) {
  return type === 'commande' || type === 'reception' || type === 'facture_fournisseur' ? 'achats' : 'ventes';
}

export const STATUS = {
  brouillon: { label: 'Brouillon', color: 'gray' },
  envoye: { label: 'Envoyé', color: 'blue' },
  envoyer: { label: 'Envoyé', color: 'blue' },
  accepte: { label: 'Accepté', color: 'violet' },
  recue: { label: 'Reçue', color: 'green' },
  valide: { label: 'Validé', color: 'green' },
  payee: { label: 'Payée', color: 'green' },
  a_payer: { label: 'À payer', color: 'blue' },
  a_regulariser: { label: 'À régulariser', color: 'amber' },
  partiel: { label: 'Partiellement payée', color: 'amber' },
  annule: { label: 'Annulé', color: 'red' }
};

export const CURRENCIES = {
  EUR: { label: 'Euro', symbol: '€' },
  USD: { label: 'Dollar américain', symbol: '$' },
  MAD: { label: 'Dirham marocain', symbol: 'DH' },
  CHF: { label: 'Franc suisse', symbol: 'CHF' },
  FCFA: { label: 'Franc CFA', symbol: 'FCFA' }
};

export function currencySymbol(code) {
  return CURRENCIES[code] ? CURRENCIES[code].symbol : code || '€';
}

export function money(n, currency = 'EUR') {
  const code = CURRENCIES[currency] ? currency : 'EUR';
  const symbol = currencySymbol(code);
  const value = Number(n) || 0;
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return `${formatted} ${symbol}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function uid() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
