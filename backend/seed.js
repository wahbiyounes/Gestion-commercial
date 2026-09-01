const { load, save } = require('./lib/store');

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
}

function seed() {
  const settings = load('settings', {});
  if (!settings.company || !settings.company.name) {
    save('settings', {
      company: {
        name: 'Ma Société',
        legalName: 'Ma Société SARL',
        logo: null,
        siret: '123 456 789 00012',
        vatNumber: 'FR 12 345678901',
        address: '12 rue de l’Exemple',
        postalCity: '75000 Paris',
        phone: '01 23 45 67 89',
        email: 'contact@masociete.fr',
        website: 'www.masociete.fr'
      },
      document: {
        showHeader: true,
        headerText: 'Ma Société SARL — 12 rue de l’Exemple, 75000 Paris — RCS Paris 123 456 789',
        showFooter: true,
        footerText: 'Merci de votre confiance. Règlement à réception de facture.',
        accentColor: '#2563eb',
        currency: 'EUR',
        defaultVatRate: 20,
        terms: 'Les marchandises restent la propriété du vendeur jusqu’au paiement intégral du prix.'
      }
    });
  }

  if (load('clients', []).length === 0) {
    const clients = [
      { name: 'Boulangerie Dupont', contact: 'M. Dupont', email: 'contact@boulangerie-dupont.fr', phone: '06 12 34 56 78', address: '3 rue des Artisans', postalCity: '75011 Paris', vatNumber: '', notes: 'Client fidèle, livraison le matin' },
      { name: 'Hôtel Le Rivage', contact: 'Mme Martin', email: 'reservation@rivage-hotel.fr', phone: '01 45 67 89 01', address: '8 quai de la Plage', postalCity: '64200 Biarritz', vatNumber: 'FR 99 876543210', notes: '' },
      { name: 'Café de la Gare', contact: 'M. Petit', email: 'cafe.gare@gmail.com', phone: '07 98 76 54 32', address: '14 avenue de la Gare', postalCity: '44000 Nantes', vatNumber: '', notes: 'Demande régulière en gros' },
      { name: 'Supermarché Centre', contact: 'Mme Robert', email: 'achat@supercentre.fr', phone: '02 40 12 34 56', address: '1 place du Marché', postalCity: '49000 Angers', vatNumber: 'FR 45 123456789', notes: 'Paiement à 30 jours' }
    ].map((c) => ({ id: uid('c'), createdAt: new Date().toISOString(), ...c }));
    save('clients', clients);
  }

  if (load('suppliers', []).length === 0) {
    const suppliers = [
      { name: 'Grossiste Alimentaire SARL', contact: 'M. Laurent', email: 'ventes@grossiste-alim.fr', phone: '01 44 55 66 77', address: '25 rue des Entrepôts', postalCity: '93200 Saint-Denis', vatNumber: 'FR 88 112233445', notes: '' },
      { name: 'Transports Express', contact: 'Mme Ndiaye', email: 'logistique@transports-express.fr', phone: '03 20 30 40 50', address: 'Zone industrielle Nord', postalCity: '59300 Valenciennes', vatNumber: '', notes: 'Livraison sous 48h' },
      { name: 'Emballages Pro', contact: 'M. Bernard', email: 'contact@emballages-pro.fr', phone: '04 72 10 20 30', address: '7 rue des Cartonniers', postalCity: '69008 Lyon', vatNumber: 'FR 33 556677889', notes: '' }
    ].map((s) => ({ id: uid('f'), createdAt: new Date().toISOString(), ...s }));
    save('suppliers', suppliers);
  }

  if (load('products', []).length === 0) {
    const products = [
      { reference: 'CAF-001', name: 'Café Arabica 1kg', category: 'Épicerie', buyPrice: 8.5, sellPrice: 14.9, quantity: 120, alertThreshold: 20, unit: 'kg' },
      { reference: 'SUC-001', name: 'Sucre de canne 500g', category: 'Épicerie', buyPrice: 1.2, sellPrice: 2.8, quantity: 240, alertThreshold: 50, unit: 'pièce' },
      { reference: 'FAR-001', name: 'Farine T55 1kg', category: 'Boulangerie', buyPrice: 0.9, sellPrice: 2.2, quantity: 15, alertThreshold: 40, unit: 'kg' },
      { reference: 'HUI-001', name: 'Huile d’olive 75cl', category: 'Épicerie', buyPrice: 4.2, sellPrice: 8.9, quantity: 80, alertThreshold: 20, unit: 'pièce' },
      { reference: 'CAR-001', name: 'Carton d’emballage 40x30', category: 'Emballage', buyPrice: 0.6, sellPrice: 1.5, quantity: 500, alertThreshold: 100, unit: 'pièce' },
      { reference: 'PLA-001', name: 'Boîte plastique 1L', category: 'Emballage', buyPrice: 0.35, sellPrice: 0.95, quantity: 300, alertThreshold: 80, unit: 'pièce' },
      { reference: 'LAI-001', name: 'Lait demi-écrémé 1L', category: 'Boulangerie', buyPrice: 0.8, sellPrice: 1.6, quantity: 8, alertThreshold: 30, unit: 'pièce' }
    ].map((p) => ({ id: uid('p'), createdAt: new Date().toISOString(), ...p }));
    save('products', products);
  }

  if (load('documents', []).length === 0) {
    const clients = load('clients', []);
    const suppliers = load('suppliers', []);
    const products = load('products', []);
    const today = new Date().toISOString();
    const seq = { devis: 2, commande: 1, livraison: 1, facture: 1, reception: 1, facture_fournisseur: 1 };
    save('sequence', seq);

    const mkDoc = (id, type, typeLabel, number, partnerType, partnerId, items, status, daysAgo, vatRate) => {
      const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const base = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const vat = base * (vatRate / 100);
      return {
        id,
        type,
        typeLabel,
        number,
        date,
        dueDate: null,
        partnerId,
        partnerType,
        items,
        notes: '',
        discountPct: 0,
        vatRate,
        status,
        currency: 'EUR',
        createdAt: date,
        totals: { base, discount: 0, taxable: base, vat, total: base + vat }
      };
    };

    const documents = [
      mkDoc('doc-d1', 'devis', 'Devis', 'DEV-0002', 'client', clients[0].id, [
        { productId: products[0].id, description: 'Café Arabica 1kg', quantity: 20, unitPrice: 13.9 },
        { productId: products[1].id, description: 'Sucre de canne 500g', quantity: 40, unitPrice: 2.5 }
      ], 'envoye', 3, 20),
      mkDoc('doc-d2', 'devis', 'Devis', 'DEV-0001', 'client', clients[2].id, [
        { productId: products[3].id, description: 'Huile d’olive 75cl', quantity: 12, unitPrice: 8.5 }
      ], 'accepte', 8, 20),
      mkDoc('doc-f1', 'facture', 'Facture', 'FAC-0001', 'client', clients[1].id, [
        { productId: products[0].id, description: 'Café Arabica 1kg', quantity: 30, unitPrice: 14.9 },
        { productId: products[2].id, description: 'Farine T55 1kg', quantity: 60, unitPrice: 2.2 }
      ], 'payee', 12, 20),
      mkDoc('doc-bc1', 'commande', 'Bon de commande', 'BC-0001', 'fournisseur', suppliers[0].id, [
        { productId: products[4].id, description: 'Carton d’emballage 40x30', quantity: 200, unitPrice: 0.55 }
      ], 'envoye', 5, 20),
      mkDoc('doc-br1', 'reception', 'Bon de réception', 'BR-0001', 'fournisseur', suppliers[0].id, [
        { productId: products[4].id, description: 'Carton d’emballage 40x30', quantity: 200, unitPrice: 0.55 }
      ], 'valide', 4, 20),
      mkDoc('doc-ff1', 'facture_fournisseur', 'Facture fournisseur', 'FF-0001', 'fournisseur', suppliers[0].id, [
        { productId: products[4].id, description: 'Carton d’emballage 40x30', quantity: 200, unitPrice: 0.55 }
      ], 'a_regulariser', 1, 20),
      mkDoc('doc-bl1', 'livraison', 'Bon de livraison', 'BL-0001', 'client', clients[0].id, [
        { productId: products[2].id, description: 'Farine T55 1kg', quantity: 40, unitPrice: 2.2 }
      ], 'valide', 2, 20)
    ];
    save('documents', documents);
  }

  console.log('Seed data initialized.');
}

seed();
