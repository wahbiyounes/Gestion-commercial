<template>
  <div>
    <div v-if="lowStock.length > 0" class="alert alert-warning mb">
      <Icon name="warning" />
      <div>
        <strong>{{ lowStock.length }} produit(s) en stock faible ou en rupture.</strong>
        <span class="muted"> Pensez à réapprovisionner.</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Produits & stock</h2>
        <div class="toolbar">
          <select v-model="categoryFilter" class="select" style="width: auto">
            <option value="">Toutes les catégories</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <div class="search-box">
            <Icon name="search" />
            <input v-model="q" class="input" type="search" placeholder="Rechercher un produit…" />
          </div>
          <button class="btn btn-primary" @click="openProduct()"><Icon name="plus" /> Produit</button>
          <button class="btn btn-ghost" @click="openMovement()"><Icon name="boxOpen" /> Entrée / Sortie</button>
        </div>
      </div>
      <div class="tabs">
        <div class="tab" :class="{ active: tab === 'products' }" @click="tab = 'products'">Produits</div>
        <div class="tab" :class="{ active: tab === 'movements' }" @click="tab = 'movements'">Historique des mouvements</div>
      </div>

      <div v-if="tab === 'products'" class="card-body p-0">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Stock</th>
                <th>Prix achat</th>
                <th>Prix vente</th>
                <th>Valeur stock</th>
                <th>Statut</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in filtered" :key="p.id">
                <td class="strong">{{ p.reference || '—' }}</td>
                <td>{{ p.name }}</td>
                <td><span class="badge gray">{{ p.category || '—' }}</span></td>
                <td><span class="badge" :class="stockBadge(p)">{{ p.quantity }} {{ p.unit }}</span></td>
                <td>{{ money(p.buyPrice || 0, currency) }}</td>
                <td>{{ money(p.sellPrice || 0, currency) }}</td>
                <td>{{ money((p.quantity || 0) * (p.buyPrice || 0), currency) }}</td>
                <td><span class="badge" :class="stockBadge(p)">{{ stockStatus(p) }}</span></td>
                <td>
                  <div class="actions">
                    <button class="btn btn-icon" title="Entrée/sortie" @click="openMovement(p)"><Icon name="boxOpen" /></button>
                    <button class="btn btn-icon" title="Modifier" @click="openProduct(p)"><Icon name="edit" /></button>
                    <button class="btn btn-icon" title="Supprimer" @click="removeProduct(p)"><Icon name="trash" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="filtered.length === 0">
                <td colspan="9" class="center muted">Aucun produit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="card-body p-0">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Référence / motif</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movements" :key="m.id">
                <td>{{ formatDate(m.date) }}</td>
                <td>
                  <span class="badge" :class="m.type === 'in' ? 'green' : 'red'">
                    <Icon v-if="m.type === 'in'" name="arrowDown" :size="12" />
                    <Icon v-else name="arrowUp" :size="12" />
                    {{ m.type === 'in' ? 'Entrée' : 'Sortie' }}
                  </span>
                </td>
                <td>{{ m.product?.name || '—' }}</td>
                <td class="strong">{{ m.type === 'in' ? '+' : '−' }}{{ m.quantity }}</td>
                <td class="muted small">{{ m.reason || '—' }}</td>
              </tr>
              <tr v-if="movements.length === 0">
                <td colspan="5" class="center muted">Aucun mouvement enregistré</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Product modal -->
    <AppModal :model-value="showProduct" :title="editingProduct ? 'Modifier le produit' : 'Nouveau produit'" @update:model-value="showProduct = $event">
      <form @submit.prevent="saveProduct">
        <div class="form-grid">
          <div class="form-group">
            <label>Nom du produit *</label>
            <input v-model="pform.name" class="input" required placeholder="Ex. Café Arabica 1kg" />
          </div>
          <div class="form-group">
            <label>Référence</label>
            <input v-model="pform.reference" class="input" placeholder="Ex. CAF-001" />
          </div>
          <div class="form-group">
            <label>Catégorie</label>
            <input v-model="pform.category" class="input" list="categories-list" placeholder="Ex. Épicerie" />
            <datalist id="categories-list">
              <option v-for="c in categories" :key="c" :value="c" />
            </datalist>
          </div>
          <div class="form-group">
            <label>Unité</label>
            <select v-model="pform.unit" class="select">
              <option value="pièce">pièce</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="boîte">boîte</option>
              <option value="m">m</option>
            </select>
          </div>
          <div class="form-group">
            <label>Prix d'achat (HT)</label>
            <div class="input-group">
              <input v-model.number="pform.buyPrice" class="input" type="number" step="0.01" min="0" />
              <span class="input-suffix">€</span>
            </div>
          </div>
          <div class="form-group">
            <label>Prix de vente (HT)</label>
            <div class="input-group">
              <input v-model.number="pform.sellPrice" class="input" type="number" step="0.01" min="0" />
              <span class="input-suffix">€</span>
            </div>
          </div>
          <div class="form-group">
            <label>Quantité initiale</label>
            <input v-model.number="pform.quantity" class="input" type="number" step="1" min="0" :disabled="!!editingProduct" />
          </div>
          <div class="form-group">
            <label>Seuil d'alerte</label>
            <input v-model.number="pform.alertThreshold" class="input" type="number" step="1" min="0" />
          </div>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="showProduct = false">Annuler</button>
        <button class="btn btn-primary" @click="saveProduct"><Icon name="save" /> Enregistrer</button>
      </template>
    </AppModal>

    <!-- Movement modal -->
    <AppModal :model-value="showMove" title="Mouvement de stock" @update:model-value="showMove = $event">
      <div class="form-grid">
        <div class="form-group full">
          <label>Produit *</label>
          <select v-model="mform.productId" class="select" required>
            <option value="" disabled>Choisir un produit…</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (stock: {{ p.quantity }} {{ p.unit }})</option>
          </select>
        </div>
        <div class="form-group">
          <label>Type de mouvement</label>
          <select v-model="mform.type" class="select">
            <option value="in">Entrée (réception / achat)</option>
            <option value="out">Sortie (vente / consommation)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Quantité *</label>
          <input v-model.number="mform.quantity" class="input" type="number" step="1" min="1" required />
        </div>
        <div class="form-group full">
          <label>Motif / référence</label>
          <input v-model="mform.reason" class="input" placeholder="Ex. Réception BC-0001" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="showMove = false">Annuler</button>
        <button class="btn btn-primary" @click="saveMovement"><Icon name="save" /> Valider</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Icon from '../components/Icon.js';
import AppModal from '../components/AppModal.vue';
import { api, money, formatDate } from '../api';
import { defaultCurrency } from '../store';
import { toast } from '../toast';

const currency = computed(() => defaultCurrency());

const products = ref([]);
const categories = ref([]);
const movements = ref([]);
const lowStock = ref([]);
const q = ref('');
const categoryFilter = ref('');
const tab = ref('products');

const showProduct = ref(false);
const editingProduct = ref(null);
const pform = ref(emptyProduct());
const showMove = ref(false);
const mform = ref({ productId: '', type: 'in', quantity: 1, reason: '' });

function emptyProduct() {
  return { name: '', reference: '', category: '', unit: 'pièce', buyPrice: 0, sellPrice: 0, quantity: 0, alertThreshold: 0 };
}

const filtered = computed(() => {
  const query = q.value.toLowerCase();
  return products.value.filter((p) => {
    const matchesQ = !query || [p.name, p.reference, p.category].some((v) => v && String(v).toLowerCase().includes(query));
    const matchesC = !categoryFilter.value || p.category === categoryFilter.value;
    return matchesQ && matchesC;
  });
});

function stockStatus(p) {
  if ((p.quantity || 0) <= 0) return 'Rupture';
  if ((p.quantity || 0) <= (p.alertThreshold || 0)) return 'Stock faible';
  return 'En stock';
}
function stockBadge(p) {
  if ((p.quantity || 0) <= 0) return 'red';
  if ((p.quantity || 0) <= (p.alertThreshold || 0)) return 'amber';
  return 'green';
}

function openProduct(p = null) {
  editingProduct.value = p;
  pform.value = p ? { ...p } : emptyProduct();
  showProduct.value = true;
}

async function saveProduct() {
  try {
    if (editingProduct.value) {
      const { quantity, ...rest } = pform.value;
      await api.products.update(editingProduct.value.id, rest);
      toast('Produit modifié');
    } else {
      await api.products.create(pform.value);
      toast('Produit créé');
    }
    showProduct.value = false;
    await load();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeProduct(p) {
  if (!confirm(`Supprimer « ${p.name} » ?`)) return;
  try {
    await api.products.remove(p.id);
    toast('Produit supprimé');
    await load();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openMovement(p = null) {
  mform.value = { productId: p ? p.id : '', type: 'in', quantity: 1, reason: '' };
  showMove.value = true;
}

async function saveMovement() {
  try {
    await api.movements.create(mform.value);
    toast('Mouvement enregistré');
    showMove.value = false;
    await load();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function load() {
  const [ps, cats, movs, low] = await Promise.all([
    api.products.list(),
    api.products.categories(),
    api.movements.list(),
    api.products.lowStock()
  ]);
  products.value = ps;
  categories.value = cats;
  movements.value = movs;
  lowStock.value = low;
}

onMounted(load);
</script>
