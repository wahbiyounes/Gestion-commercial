<template>
  <div>
    <div class="grid grid-4 mb">
      <div class="card stat-card">
        <div class="stat-icon" style="background: var(--primary-soft); color: var(--primary)"><Icon name="users" /></div>
        <div class="stat-value">{{ stats.clients ?? 0 }}</div>
        <div class="stat-label">Clients</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="background: var(--info-soft); color: var(--info)"><Icon name="building" /></div>
        <div class="stat-value">{{ stats.suppliers ?? 0 }}</div>
        <div class="stat-label">Fournisseurs</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="background: var(--warning-soft); color: var(--warning)"><Icon name="box" /></div>
        <div class="stat-value">{{ stats.products ?? 0 }}</div>
        <div class="stat-label">Produits en stock</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="background: var(--success-soft); color: var(--success)"><Icon name="euro" /></div>
        <div class="stat-value">{{ money(stats.revenue ?? 0, currency) }}</div>
        <div class="stat-label">Chiffre d'affaires facturé</div>
      </div>
    </div>

    <div class="grid grid-2 mb">
      <div class="card">
        <div class="card-header">
          <h2><Icon name="doc" /> Documents par type</h2>
        </div>
        <div class="card-body">
          <div class="doc-bars">
            <div v-for="t in docTypes" :key="t.key" class="doc-bar-row">
              <div class="doc-bar-label">
                <router-link :to="`/documents?groupe=${groupOfType(t.key)}&type=${t.key}`">{{ t.label }}</router-link>
                <span class="badge" :class="t.color">{{ count(t.key) }}</span>
              </div>
              <div class="doc-bar-track">
                <div class="doc-bar-fill" :style="{ width: barWidth(t.key), background: t.fill }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2><Icon name="trendUp" /> Indicateurs de stock</h2>
        </div>
        <div class="card-body">
          <div class="grid grid-3">
            <div class="kpi">
              <div class="kpi-value">{{ money(stats.stockValue ?? 0, currency) }}</div>
              <div class="kpi-label">Valeur (prix d'achat)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value">{{ money(stats.stockWorth ?? 0, currency) }}</div>
              <div class="kpi-label">Valeur (prix de vente)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" :style="{ color: (stats.lowStock ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }">{{ stats.lowStock ?? 0 }}</div>
              <div class="kpi-label">Produits en alerte</div>
            </div>
          </div>
          <div class="alert mt" :class="(stats.lowStock ?? 0) > 0 ? 'alert-warning' : 'alert-success'">
            <Icon name="alert" />
            <div v-if="(stats.lowStock ?? 0) > 0">
              <strong>{{ stats.lowStock }} produit(s)</strong> sous le seuil d'alerte. <router-link to="/stock">Voir le stock →</router-link>
            </div>
            <div v-else>Aucun produit sous le seuil d'alerte. Stock sain.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <h2><Icon name="docPlus" /> Factures en attente</h2>
          <router-link to="/documents?type=facture" class="btn btn-sm btn-ghost">Tout voir</router-link>
        </div>
        <div class="card-body p-0">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>N°</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr>
              </thead>
              <tbody>
                <tr v-for="d in pendingInvoices" :key="d.id">
                  <td class="strong"><router-link :to="`/documents/${d.id}/imprimer`">{{ d.number }}</router-link></td>
                  <td>{{ d.partner?.name || '—' }}</td>
                  <td>{{ formatDate(d.date) }}</td>
                  <td>{{ money(d.totals?.total ?? 0, d.currency) }}</td>
                  <td><span class="badge" :class="statusBadge(d.status)">{{ statusLabel(d.status) }}</span></td>
                </tr>
                <tr v-if="pendingInvoices.length === 0">
                  <td colspan="5" class="center muted">Aucune facture en attente</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2><Icon name="alert" /> Alertes de stock</h2>
          <router-link to="/stock" class="btn btn-sm btn-ghost">Gérer</router-link>
        </div>
        <div class="card-body p-0">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Réf</th><th>Produit</th><th>Stock</th><th>Seuil</th><th>Statut</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in lowStock" :key="p.id">
                  <td class="strong">{{ p.reference }}</td>
                  <td>{{ p.name }}</td>
                  <td><span class="badge" :class="p.quantity <= 0 ? 'red' : 'amber'">{{ p.quantity }} {{ p.unit }}</span></td>
                  <td>{{ p.alertThreshold }} {{ p.unit }}</td>
                  <td><span class="badge" :class="p.quantity <= 0 ? 'red' : 'amber'">{{ p.quantity <= 0 ? 'Rupture' : 'Stock faible' }}</span></td>
                </tr>
                <tr v-if="lowStock.length === 0">
                  <td colspan="5" class="center muted">Aucune alerte</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Icon from '../components/Icon.js';
import { api, STATUS, groupOfType, money, formatDate } from '../api';
import { defaultCurrency } from '../store';
import { toast } from '../toast';

const stats = ref({});
const documents = ref([]);
const lowStock = ref([]);
const currency = computed(() => defaultCurrency());

const docTypes = [
  { key: 'devis', label: 'Devis', color: 'violet', fill: '#7c3aed' },
  { key: 'facture', label: 'Factures', color: 'green', fill: '#16a34a' },
  { key: 'livraison', label: 'Bons de livraison', color: 'amber', fill: '#d97706' },
  { key: 'commande', label: 'Bons de commande', color: 'blue', fill: '#2563eb' },
  { key: 'reception', label: 'Bons de réception', color: 'teal', fill: '#0d9488' },
  { key: 'facture_fournisseur', label: 'Factures fournisseurs', color: 'orange', fill: '#ea580c' }
];

const count = (k) => (stats.value.documents ? stats.value.documents[k] : 0) || 0;
const maxCount = computed(() => Math.max(1, ...docTypes.map((t) => count(t.key))));
const barWidth = (k) => `${Math.round((count(k) / maxCount.value) * 100)}%`;

const pendingInvoices = computed(() =>
  documents.value.filter((d) => d.type === 'facture' && !['payee', 'annule'].includes(d.status))
);

const statusLabel = (s) => (STATUS[s] ? STATUS[s].label : s);
const statusBadge = (s) => (STATUS[s] ? STATUS[s].color : 'gray');

onMounted(async () => {
  try {
    const [s, docs, low] = await Promise.all([api.stats(), api.documents.list(), api.products.lowStock()]);
    stats.value = s;
    documents.value = docs;
    lowStock.value = low;
  } catch (e) {
    toast('Impossible de charger le tableau de bord', 'error');
  }
});
</script>

<style scoped>
.doc-bars { display: flex; flex-direction: column; gap: 16px; }
.doc-bar-row { display: flex; flex-direction: column; gap: 6px; }
.doc-bar-label { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; }
.doc-bar-track { height: 10px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.doc-bar-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
.kpi { text-align: center; padding: 8px; border: 1px solid var(--border); border-radius: 10px; background: #fafafa; }
.kpi-value { font-size: 18px; font-weight: 800; }
.kpi-label { font-size: 12px; color: var(--text-soft); }
</style>
