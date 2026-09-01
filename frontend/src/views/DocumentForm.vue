<template>
  <div class="grid grid-3" style="grid-template-columns: 1.6fr 1fr; align-items: start">
    <div class="card">
      <div class="card-header">
        <h2>{{ isEdit ? `Modifier ${typeLabel}` : 'Nouveau document' }}</h2>
        <span v-if="doc.number" class="badge gray">{{ doc.number }}</span>
      </div>
      <div class="card-body">
        <div class="form-grid mb">
          <div class="form-group">
            <label>Type de document</label>
            <select v-model="doc.type" class="select" :disabled="isEdit" @change="onTypeChange">
              <optgroup label="Documents clients">
                <option value="devis">Devis</option>
                <option value="livraison">Bon de livraison</option>
                <option value="facture">Facture</option>
              </optgroup>
              <optgroup label="Documents fournisseurs">
                <option value="commande">Bon de commande</option>
                <option value="reception">Bon de réception</option>
                <option value="facture_fournisseur">Facture fournisseur</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>Partenaire *</label>
            <select v-model="doc.partnerId" class="select" required>
              <option value="" disabled>Choisir…</option>
              <optgroup v-if="isPurchase" label="Fournisseurs">
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </optgroup>
              <optgroup v-else label="Clients">
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input v-model="dateStr" class="input" type="date" />
          </div>
          <div class="form-group">
            <label>Échéance</label>
            <input v-model="dueDateStr" class="input" type="date" />
          </div>
          <div class="form-group">
            <label>Devise</label>
            <select v-model="doc.currency" class="select">
              <option v-for="(c, code) in CURRENCIES" :key="code" :value="code">{{ c.label }} ({{ c.symbol }})</option>
            </select>
          </div>
        </div>

        <div class="flex between mb-1">
          <h3 class="small" style="font-size: 14px">Lignes du document</h3>
          <button class="btn btn-sm btn-ghost" @click="addLine"><Icon name="plus" /> Ajouter une ligne</button>
        </div>

        <div class="table-wrap" style="border: 1px solid var(--border); border-radius: 10px; margin-bottom: 16px">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 32%">Produit / Description</th>
                <th>Qté</th>
                <th>P.U. HT</th>
                <th>Remise %</th>
                <th>Total HT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, i) in doc.items" :key="i">
                <td>
                  <select v-model="line.productId" class="select" @change="onProductSelect(line)">
                    <option value="">— Choisir un produit —</option>
                    <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                  <input v-model="line.description" class="input mt-1" placeholder="Description (auto si produit choisi)" style="font-size: 13px" />
                </td>
                <td><input v-model.number="line.quantity" class="input" type="number" min="0" step="1" style="width: 80px" /></td>
                <td><input v-model.number="line.unitPrice" class="input" type="number" min="0" step="0.01" style="width: 100px" /></td>
                <td><input v-model.number="line.discount" class="input" type="number" min="0" step="0.1" style="width: 80px" /></td>
                <td class="strong">{{ money(lineTotal(line), doc.currency) }}</td>
                <td><button class="btn btn-icon btn-danger" @click="doc.items.splice(i, 1)"><Icon name="trash" /></button></td>
              </tr>
              <tr v-if="doc.items.length === 0">
                <td colspan="6" class="center muted">Aucune ligne — ajoutez des produits</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Notes / conditions</label>
            <textarea v-model="doc.notes" class="textarea" placeholder="Notes libres affichées sur le document…"></textarea>
          </div>
          <div>
            <div class="form-group">
              <label>Taux de TVA (%)</label>
              <input v-model.number="doc.vatRate" class="input" type="number" step="0.01" min="0" max="100" />
            </div>
            <div class="form-group">
              <label>Remise globale (%)</label>
              <input v-model.number="doc.discountPct" class="input" type="number" step="0.1" min="0" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid" style="gap: 16px">
      <div class="card">
        <div class="card-header"><h2>Récapitulatif</h2></div>
        <div class="card-body">
          <div class="totals">
            <div class="total-row"><span>Total HT</span><span>{{ money(totals.base, doc.currency) }}</span></div>
            <div v-if="totals.discount > 0" class="total-row"><span>Remise</span><span>− {{ money(totals.discount, doc.currency) }}</span></div>
            <div class="total-row"><span>Total HT après remise</span><span>{{ money(totals.taxable, doc.currency) }}</span></div>
            <div class="total-row"><span>TVA ({{ doc.vatRate || 0 }}%)</span><span>{{ money(totals.vat, doc.currency) }}</span></div>
            <div class="total-row grand"><span>Total TTC</span><span>{{ money(totals.total, doc.currency) }}</span></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2>Statut</h2></div>
        <div class="card-body">
          <select v-model="doc.status" class="select mb">
            <option v-for="(s, key) in STATUS_OPTIONS" :key="key" :value="key">{{ s }}</option>
          </select>
          <button class="btn btn-primary btn-block" @click="save"><Icon name="save" /> Enregistrer</button>
          <button v-if="savedId" class="btn btn-ghost btn-block mt-1" @click="$router.push(`/documents/${savedId}/imprimer`)"><Icon name="print" /> Voir & imprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.js';
import { api, DOC_TYPES, DOC_GROUPS, groupOfType, CURRENCIES, money } from '../api';
import { defaultCurrency, appStore } from '../store';
import { toast } from '../toast';

const route = useRoute();
const router = useRouter();
const isEdit = !!route.params.id;
const editingId = route.params.id;

const clients = ref([]);
const suppliers = ref([]);
const products = ref([]);
const savedId = ref(null);

const STATUS_OPTIONS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  recue: 'Reçue',
  valide: 'Validé',
  a_payer: 'À payer',
  a_regulariser: 'À régulariser',
  partiel: 'Partiellement payée',
  payee: 'Payée',
  annule: 'Annulé'
};

const initialType = ['devis', 'livraison', 'facture', 'commande', 'reception', 'facture_fournisseur'].includes(route.query.type)
  ? route.query.type
  : 'devis';

const doc = ref({
  type: initialType,
  typeLabel: DOC_TYPES[initialType].label,
  partnerId: '',
  partnerType: groupOfType(initialType) === 'achats' ? 'fournisseur' : 'client',
  date: new Date().toISOString().slice(0, 10),
  dueDate: '',
  items: [],
  notes: '',
  vatRate: 20,
  discountPct: 0,
  status: 'brouillon',
  currency: defaultCurrency()
});
const dateStr = ref(doc.value.date);
const dueDateStr = ref('');

const isPurchase = computed(() => groupOfType(doc.value.type) === 'achats');
const typeLabel = computed(() => DOC_TYPES[doc.value.type]?.label || doc.value.type);

function newLine() {
  return { productId: '', description: '', quantity: 1, unitPrice: 0, discount: 0 };
}

function addLine() {
  doc.value.items.push(newLine());
}

function onTypeChange() {
  doc.value.partnerId = '';
  doc.value.partnerType = isPurchase.value ? 'fournisseur' : 'client';
}

function onProductSelect(line) {
  const p = products.value.find((x) => x.id === line.productId);
  if (!p) return;
  line.description = p.name;
  line.unitPrice = isPurchase.value ? p.buyPrice : p.sellPrice;
  line.quantity = 1;
}

function lineTotal(line) {
  const base = (line.quantity || 0) * (line.unitPrice || 0);
  return base * (1 - (line.discount || 0) / 100);
}

const totals = computed(() => {
  const base = doc.value.items.reduce((s, l) => s + lineTotal(l), 0);
  const discount = (doc.value.discountPct || 0) / 100 * base;
  const taxable = base - discount;
  const vat = taxable * ((doc.value.vatRate || 0) / 100);
  return { base, discount, taxable, vat, total: taxable + vat };
});

async function save() {
  if (!doc.value.partnerId) {
    toast('Veuillez choisir un partenaire', 'error');
    return;
  }
  if (doc.value.items.length === 0) {
    toast('Ajoutez au moins une ligne', 'error');
    return;
  }
  const payload = {
    ...doc.value,
    date: new Date(dateStr.value).toISOString(),
    dueDate: dueDateStr.value ? new Date(dueDateStr.value).toISOString() : null,
    typeLabel: typeLabel.value
  };
  try {
    if (isEdit) {
      await api.documents.update(editingId, payload);
      savedId.value = editingId;
      toast('Document mis à jour');
    } else {
      const created = await api.documents.create(payload);
      savedId.value = created.id;
      toast('Document créé');
      doc.value.number = created.number;
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

onMounted(async () => {
  if (!appStore.loaded) await appStore.load();
  doc.value.currency = doc.value.currency || defaultCurrency();
  try {
    const [cs, ss, ps] = await Promise.all([api.partners('clients'), api.partners('suppliers'), api.products.list()]);
    clients.value = cs;
    suppliers.value = ss;
    products.value = ps;

    if (isEdit) {
      const d = await api.documents.get(editingId);
      doc.value = {
        type: d.type,
        typeLabel: d.typeLabel,
        partnerId: d.partnerId || '',
        partnerType: d.partnerType,
        items: d.items || [],
        notes: d.notes || '',
        vatRate: d.vatRate ?? 20,
        discountPct: d.discountPct || 0,
        status: d.status || 'brouillon',
        currency: d.currency || defaultCurrency()
      };
      dateStr.value = d.date ? d.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      dueDateStr.value = d.dueDate ? d.dueDate.slice(0, 10) : '';
      savedId.value = editingId;
    } else {
      addLine();
    }
  } catch (e) {
    toast(e.message, 'error');
  }
});
</script>

<style scoped>
.totals { display: flex; flex-direction: column; gap: 10px; }
.total-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-soft); }
.total-row span:last-child { font-weight: 600; color: var(--text); }
.total-row.grand { border-top: 2px solid var(--border); padding-top: 10px; font-size: 17px; }
.total-row.grand span:last-child { font-size: 20px; color: var(--primary); }
@media (max-width: 1024px) {
  .grid.grid-3 { grid-template-columns: 1fr !important; }
}
</style>
