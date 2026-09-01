<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h2>{{ DOC_GROUPS[activeGroup].label }}</h2>
        <div class="toolbar">
          <div class="search-box">
            <Icon name="search" />
            <input v-model="q" class="input" type="search" placeholder="N° document ou partenaire…" />
          </div>
          <router-link :to="newDocLink" class="btn btn-primary"><Icon name="plus" /> Nouveau</router-link>
        </div>
      </div>

      <div class="segmented">
        <div v-for="(g, key) in DOC_GROUPS" :key="key" class="segment" :class="{ active: activeGroup === key }" @click="setGroup(key)">
          <Icon :name="key === 'ventes' ? 'users' : 'building'" />
          <div>
            <div class="segment-label">{{ g.short }}</div>
            <div class="segment-sub">{{ g.types.reduce((s, t) => s + (counts[t] || 0), 0) }} documents</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div class="tab" :class="{ active: activeType === '' }" @click="setType('')">Tous <span class="badge gray">{{ groupCount }}</span></div>
        <div v-for="t in DOC_GROUPS[activeGroup].types" :key="t" class="tab" :class="{ active: activeType === t }" @click="setType(t)">
          {{ DOC_TYPES[t].label }} <span class="badge" :class="DOC_TYPES[t].color">{{ counts[t] || 0 }}</span>
        </div>
      </div>

      <div class="card-body p-0">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Type</th>
                <th>{{ activeGroup === 'ventes' ? 'Client' : 'Fournisseur' }}</th>
                <th>Date</th>
                <th>Échéance</th>
                <th>Montant TTC</th>
                <th>Statut</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in filtered" :key="d.id">
                <td class="strong">{{ d.number }}</td>
                <td><span class="badge" :class="DOC_TYPES[d.type]?.color || 'gray'">{{ DOC_TYPES[d.type]?.label || d.type }}</span></td>
                <td>{{ d.partner?.name || '—' }}</td>
                <td>{{ formatDate(d.date) }}</td>
                <td>{{ formatDate(d.dueDate) }}</td>
                <td class="strong">{{ money(d.totals?.total ?? 0, d.currency) }}</td>
                <td><span class="badge" :class="statusBadge(d.status)">{{ statusLabel(d.status) }}</span></td>
                <td>
                  <div class="actions">
                    <button class="btn btn-icon" title="Imprimer" @click="$router.push(`/documents/${d.id}/imprimer`)"><Icon name="print" /></button>
                    <button class="btn btn-icon" title="Modifier" @click="$router.push(`/documents/${d.id}/editer`)"><Icon name="edit" /></button>
                    <button class="btn btn-icon" title="Supprimer" @click="remove(d)"><Icon name="trash" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="filtered.length === 0">
                <td colspan="8" class="center muted">Aucun document dans cette catégorie</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.js';
import { api, DOC_TYPES, DOC_GROUPS, STATUS, money, formatDate } from '../api';
import { toast } from '../toast';

const route = useRoute();
const router = useRouter();
const documents = ref([]);
const q = ref('');
const activeGroup = ref('ventes');
const activeType = ref('');

const counts = computed(() => {
  const c = {};
  for (const k in DOC_TYPES) c[k] = 0;
  for (const d of documents.value) if (c[d.type] !== undefined) c[d.type]++;
  return c;
});

const groupCount = computed(() =>
  DOC_GROUPS[activeGroup.value].types.reduce((s, t) => s + (counts.value[t] || 0), 0)
);

const filtered = computed(() => {
  const query = q.value.toLowerCase();
  return documents.value.filter((d) => {
    const inGroup = DOC_GROUPS[activeGroup.value].types.includes(d.type);
    const inType = activeType.value === '' || d.type === activeType.value;
    const matchesQ = !query || [d.number, d.partner?.name].some((v) => v && String(v).toLowerCase().includes(query));
    return inGroup && inType && matchesQ;
  });
});

const newDocLink = computed(() => {
  const group = activeGroup.value;
  const type = activeType.value || DOC_GROUPS[group].types[0];
  return `/documents/nouveau?groupe=${group}&type=${type}`;
});

function setGroup(group) {
  activeGroup.value = group;
  activeType.value = '';
  router.push({ path: '/documents', query: { groupe: group } });
}

function setType(type) {
  activeType.value = type;
  const query = { groupe: activeGroup.value };
  if (type) query.type = type;
  router.push({ path: '/documents', query });
}

const statusLabel = (s) => (STATUS[s] ? STATUS[s].label : s);
const statusBadge = (s) => (STATUS[s] ? STATUS[s].color : 'gray');

async function remove(d) {
  if (!confirm(`Supprimer le document ${d.number} ?`)) return;
  try {
    await api.documents.remove(d.id);
    documents.value = documents.value.filter((x) => x.id !== d.id);
    toast('Document supprimé');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function load() {
  try {
    documents.value = await api.documents.list();
  } catch (e) {
    toast('Chargement impossible', 'error');
  }
}

watch(
  () => route.query,
  (query) => {
    const group = query.groupe === 'achats' ? 'achats' : 'ventes';
    activeGroup.value = group;
    const type = query.type && DOC_GROUPS[group].types.includes(query.type) ? query.type : '';
    activeType.value = type;
  },
  { immediate: true }
);

onMounted(load);
</script>

<style scoped>
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: #fafafa;
}
.segment {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.segment svg { width: 22px; height: 22px; color: var(--text-soft); }
.segment:hover { border-color: var(--primary); }
.segment.active { border-color: var(--primary); background: var(--primary-soft); }
.segment.active svg { color: var(--primary); }
.segment-label { font-weight: 700; font-size: 14.5px; }
.segment-sub { font-size: 12px; color: var(--text-soft); }
.segment.active .segment-sub { color: var(--primary-dark); }
@media (max-width: 640px) {
  .segmented { grid-template-columns: 1fr; }
}
</style>
