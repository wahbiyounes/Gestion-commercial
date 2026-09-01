import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: 'Tableau de bord' } },
  { path: '/clients', name: 'clients', component: () => import('../views/Clients.vue'), meta: { title: 'Clients' } },
  { path: '/fournisseurs', name: 'suppliers', component: () => import('../views/Suppliers.vue'), meta: { title: 'Fournisseurs' } },
  { path: '/stock', name: 'stock', component: () => import('../views/Stock.vue'), meta: { title: 'Stock & Produits' } },
  { path: '/documents', name: 'documents', component: () => import('../views/Documents.vue'), meta: { title: 'Documents' } },
  { path: '/documents/nouveau', name: 'document-new', component: () => import('../views/DocumentForm.vue'), meta: { title: 'Nouveau document' } },
  { path: '/documents/:id/editer', name: 'document-edit', component: () => import('../views/DocumentForm.vue'), meta: { title: 'Modifier le document' } },
  { path: '/documents/:id/imprimer', name: 'document-print', component: () => import('../views/PrintView.vue'), meta: { title: 'Aperçu & impression' } },
  { path: '/parametres', name: 'settings', component: () => import('../views/Settings.vue'), meta: { title: 'Paramètres' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.afterEach((to) => {
  document.title = `${to.meta.title || 'MonERP'} — MonERP`;
});

export default router;
