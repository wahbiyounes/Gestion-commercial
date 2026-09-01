<template>
  <div>
    <div class="print-toolbar">
      <button class="btn btn-ghost" @click="goBack"><Icon name="close" /> Retour</button>
      <div class="grow"></div>
      <div class="toolbar">
        <label class="checkbox"><input v-model="settings.document.showHeader" type="checkbox" @change="saveOptions" /> En-tête</label>
        <label class="checkbox"><input v-model="settings.document.showFooter" type="checkbox" @change="saveOptions" /> Pied de page</label>
        <label class="color-label">
          Couleur
          <input type="color" v-model="settings.document.accentColor" @change="saveOptions" />
        </label>
        <router-link :to="`/parametres?tab=document`" class="btn btn-sm btn-ghost"><Icon name="settings" /> Personnaliser</router-link>
        <button class="btn btn-primary" @click="doPrint"><Icon name="print" /> Imprimer</button>
      </div>
    </div>

    <div class="print-area" :style="areaStyle">
      <!-- Header -->
      <header class="doc-header">
        <div class="doc-brand">
          <div v-if="logo" class="doc-logo"><img :src="logo" alt="logo" /></div>
          <div>
            <div class="doc-company" :style="{ color: accent }">{{ company.name }}</div>
            <div v-if="company.legalName && company.legalName !== company.name" class="doc-legal">{{ company.legalName }}</div>
          </div>
        </div>
        <div class="doc-company-block">
          <div v-if="company.address">{{ company.address }}</div>
          <div v-if="company.postalCity">{{ company.postalCity }}</div>
          <div v-if="company.phone">Tél : {{ company.phone }}</div>
          <div v-if="company.email">{{ company.email }}</div>
          <div v-if="company.website">{{ company.website }}</div>
          <div v-if="company.siret" class="faint small">SIRET : {{ company.siret }}</div>
          <div v-if="company.vatNumber" class="faint small">TVA : {{ company.vatNumber }}</div>
        </div>
      </header>

      <div v-if="settings.document.showHeader && headerText" class="doc-header-text" :style="{ background: accentSoft }">{{ headerText }}</div>

      <!-- Title -->
      <div class="doc-title-block">
        <h1 class="doc-title" :style="{ color: accent }">{{ typeLabel }}</h1>
        <div class="doc-meta">
          <div class="doc-meta-row"><span>N°</span><strong>{{ doc.number }}</strong></div>
          <div class="doc-meta-row"><span>Date</span>{{ formatDate(doc.date) }}</div>
          <div v-if="doc.dueDate" class="doc-meta-row"><span>Échéance</span>{{ formatDate(doc.dueDate) }}</div>
          <div class="doc-meta-row"><span>Statut</span><span class="badge" :class="statusBadge(doc.status)">{{ statusLabel(doc.status) }}</span></div>
        </div>
      </div>

      <!-- Bill to -->
      <div class="doc-partner">
        <div class="doc-partner-label">Adressé à</div>
        <div class="doc-partner-name">{{ partnerName }}</div>
        <div v-if="partner?.address">{{ partner.address }}</div>
        <div v-if="partner?.postalCity">{{ partner.postalCity }}</div>
        <div v-if="partner?.contact" class="muted small">À l'attention de {{ partner.contact }}</div>
        <div v-if="partner?.vatNumber" class="muted small">TVA : {{ partner.vatNumber }}</div>
      </div>

      <!-- Items -->
      <table class="doc-table">
        <thead>
          <tr :style="{ background: accent, color: '#fff' }">
            <th>Désignation</th>
            <th class="right">Qté</th>
            <th class="right">P.U. HT</th>
            <th v-if="hasDiscounts" class="right">Remise</th>
            <th class="right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(l, i) in doc.items" :key="i">
            <td>
              <div class="line-desc">{{ l.description || '—' }}</div>
              <div v-if="l.reference" class="faint small">{{ l.reference }}</div>
            </td>
            <td class="right">{{ l.quantity }}</td>
            <td class="right">{{ money(l.unitPrice, currency) }}</td>
            <td v-if="hasDiscounts" class="right">{{ l.discount ? l.discount + ' %' : '—' }}</td>
            <td class="right strong">{{ money(lineTotal(l), currency) }}</td>
          </tr>
          <tr v-if="doc.items.length === 0">
            <td colspan="5" class="center muted">Aucun article</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="doc-totals">
        <div class="totals-block">
          <div class="t-row"><span>Total HT</span><span>{{ money(totals.base, currency) }}</span></div>
          <div v-if="totals.discount > 0" class="t-row"><span>Remise ({{ doc.discountPct }}%)</span><span>− {{ money(totals.discount, currency) }}</span></div>
          <div class="t-row"><span>Total HT net</span><span>{{ money(totals.taxable, currency) }}</span></div>
          <div class="t-row"><span>TVA ({{ doc.vatRate }}%)</span><span>{{ money(totals.vat, currency) }}</span></div>
          <div class="t-row grand"><span>Total TTC</span><span>{{ money(totals.total, currency) }}</span></div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="doc.notes" class="doc-notes">
        <div class="doc-notes-label">Notes</div>
        {{ doc.notes }}
      </div>
      <div v-if="terms" class="doc-notes">
        <div class="doc-notes-label">Conditions</div>
        {{ terms }}
      </div>

      <!-- Footer -->
      <footer class="doc-footer">
        <div v-if="settings.document.showFooter && footerText">{{ footerText }}</div>
        <div v-else-if="settings.document.showFooter" class="faint">—</div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.js';
import { api, STATUS, money, formatDate } from '../api';
import { defaultCurrency } from '../store';
import { toast } from '../toast';

const route = useRoute();
const router = useRouter();
const doc = ref({ items: [], type: 'devis' });
const partner = ref(null);
const settings = ref({ company: {}, document: {} });
const docTypeLabel = ref('Document');

const company = computed(() => settings.value.company || {});
const logo = computed(() => company.value.logo || null);
const accent = computed(() => settings.value.document.accentColor || '#2563eb');
const accentSoft = computed(() => accent.value + '1a');
const headerText = computed(() => settings.value.document.headerText || '');
const footerText = computed(() => settings.value.document.footerText || '');
const terms = computed(() => settings.value.document.terms || '');
const areaStyle = computed(() => ({
  '--accent': accent.value
}));

const typeLabel = computed(() => {
  const map = {
    devis: 'Devis',
    commande: 'Bon de commande',
    livraison: 'Bon de livraison',
    facture: 'Facture',
    reception: 'Bon de réception',
    facture_fournisseur: 'Facture fournisseur'
  };
  return doc.value.typeLabel || map[doc.value.type] || docTypeLabel.value;
});
const partnerName = computed(() => (doc.value.partnerType === 'fournisseur' ? 'Fournisseur' : 'Client') + (partner.value ? ' : ' + partner.value.name : ''));
const currency = computed(() => doc.value.currency || defaultCurrency());
const hasDiscounts = computed(() => (doc.value.items || []).some((l) => l.discount));
const totals = computed(() => doc.value.totals || {
  base: 0, discount: 0, taxable: 0, vat: 0, total: 0
});

function lineTotal(l) {
  return (l.quantity || 0) * (l.unitPrice || 0) * (1 - (l.discount || 0) / 100);
}

const statusLabel = (s) => (STATUS[s] ? STATUS[s].label : s);
const statusBadge = (s) => (STATUS[s] ? STATUS[s].color : 'gray');

function goBack() {
  router.back();
}

function doPrint() {
  window.print();
}

async function saveOptions() {
  try {
    await api.settings.save(settings.value);
  } catch (e) {
    toast(e.message, 'error');
  }
}

onMounted(async () => {
  try {
    const [d, s] = await Promise.all([api.documents.get(route.params.id), api.settings.get()]);
    doc.value = d;
    partner.value = d.partner;
    settings.value = {
      company: { ...s.company },
      document: { ...s.document }
    };
    document.title = `${d.number} — Aperçu`;
  } catch (e) {
    toast('Document introuvable', 'error');
  }
});
</script>

<style scoped>
.print-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.color-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-soft); }
.color-label input[type='color'] { width: 34px; height: 28px; border: 1px solid var(--border); border-radius: 6px; padding: 2px; background: #fff; cursor: pointer; }

.print-area {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: var(--shadow-lg);
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 44px;
  color: #111827;
  font-family: var(--font);
}

.doc-header { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.doc-brand { display: flex; gap: 14px; align-items: center; }
.doc-logo { width: 64px; height: 64px; border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.doc-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.doc-company { font-size: 22px; font-weight: 800; }
.doc-legal { font-size: 13px; color: var(--text-soft); }
.doc-company-block { text-align: right; font-size: 12.5px; color: var(--text-soft); line-height: 1.6; }

.doc-header-text {
  font-size: 12.5px;
  color: #374151;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 26px;
}

.doc-title-block { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--accent, #2563eb); padding-bottom: 12px; margin-bottom: 22px; }
.doc-title { font-size: 26px; font-weight: 800; margin: 0; }
.doc-meta { font-size: 13px; text-align: right; }
.doc-meta-row { display: flex; gap: 10px; justify-content: flex-end; padding: 2px 0; }
.doc-meta-row span { color: var(--text-soft); }

.doc-partner { margin-bottom: 22px; font-size: 13.5px; line-height: 1.6; }
.doc-partner-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin-bottom: 4px; }
.doc-partner-name { font-size: 16px; font-weight: 700; }

.doc-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
.doc-table th { padding: 9px 12px; text-align: left; font-size: 12px; letter-spacing: 0.03em; }
.doc-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); }
.doc-table tbody tr:nth-child(even) { background: #fafafa; }
.doc-table .line-desc { font-weight: 600; }

.doc-totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
.totals-block { width: 300px; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; }
.t-row { display: flex; justify-content: space-between; }
.t-row.grand { border-top: 2px solid var(--accent, #2563eb); margin-top: 4px; padding-top: 10px; font-size: 16px; font-weight: 800; }

.doc-notes { font-size: 12.5px; color: var(--text-soft); border-top: 1px solid var(--border); padding-top: 14px; margin-bottom: 10px; white-space: pre-wrap; }
.doc-notes-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); font-weight: 700; margin-bottom: 4px; }

.doc-footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--border); text-align: center; font-size: 12px; color: var(--text-soft); }

@media (max-width: 640px) {
  .doc-header { flex-direction: column; }
  .doc-company-block { text-align: left; }
  .print-area { padding: 24px 18px; }
}
</style>
