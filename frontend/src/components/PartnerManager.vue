<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h2>{{ plural }}</h2>
        <div class="toolbar">
          <div class="search-box">
            <Icon name="search" />
            <input v-model="q" class="input" type="search" :placeholder="`Rechercher un ${singular}…`" />
          </div>
          <button class="btn btn-primary" @click="openCreate"><Icon name="plus" /> Nouveau</button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ singularLabel }}</th>
                <th>Contact</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Adresse</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in filtered" :key="p.id">
                <td>
                  <div class="flex">
                    <div class="avatar" :style="{ background: avatarColor(p.name) }">{{ initials(p.name) }}</div>
                    <div>
                      <div class="strong">{{ p.name }}</div>
                      <div v-if="p.vatNumber" class="faint small">{{ p.vatNumber }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ p.contact || '—' }}</td>
                <td>{{ p.phone || '—' }}</td>
                <td>{{ p.email || '—' }}</td>
                <td class="muted small">{{ p.address || '' }}{{ p.postalCity ? ' — ' + p.postalCity : '' }}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-icon" title="Modifier" @click="openEdit(p)"><Icon name="edit" /></button>
                    <button class="btn btn-icon" title="Supprimer" @click="remove(p)"><Icon name="trash" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="filtered.length === 0">
                <td colspan="6" class="center muted">Aucun résultat</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <AppModal :model-value="showModal" :title="editing ? `Modifier le ${singular}` : `Nouveau ${singular}`" @update:model-value="showModal = $event">
      <form @submit.prevent="save">
        <div class="form-grid">
          <div class="form-group full">
            <label>Nom de l'entreprise *</label>
            <input v-model="form.name" class="input" required placeholder="Ex. Boulangerie Dupont" />
          </div>
          <div class="form-group">
            <label>Personne de contact</label>
            <input v-model="form.contact" class="input" placeholder="Ex. Mme Martin" />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input v-model="form.phone" class="input" placeholder="06 12 34 56 78" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="form.email" class="input" type="email" placeholder="contact@entreprise.fr" />
          </div>
          <div class="form-group">
            <label>N° TVA</label>
            <input v-model="form.vatNumber" class="input" placeholder="FR XX 000000000" />
          </div>
          <div class="form-group">
            <label>Adresse</label>
            <input v-model="form.address" class="input" placeholder="12 rue de l'Exemple" />
          </div>
          <div class="form-group">
            <label>Code postal & ville</label>
            <input v-model="form.postalCity" class="input" placeholder="75000 Paris" />
          </div>
          <div class="form-group full">
            <label>Notes</label>
            <textarea v-model="form.notes" class="textarea" placeholder="Remarques…"></textarea>
          </div>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="showModal = false">Annuler</button>
        <button class="btn btn-primary" @click="save"><Icon name="save" /> Enregistrer</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Icon from './Icon.js';
import AppModal from './AppModal.vue';
import { api, uid } from '../api';
import { toast } from '../toast';

const props = defineProps({
  kind: { type: String, default: 'clients' },
  title: { type: String, default: '' }
});

const singular = props.kind === 'clients' ? 'client' : 'fournisseur';
const plural = props.title || (props.kind === 'clients' ? 'Clients' : 'Fournisseurs');
const singularLabel = props.kind === 'clients' ? 'Client' : 'Fournisseur';

const items = ref([]);
const q = ref('');
const showModal = ref(false);
const editing = ref(null);
const form = ref(emptyForm());

function emptyForm() {
  return { name: '', contact: '', email: '', phone: '', address: '', postalCity: '', vatNumber: '', notes: '' };
}

const filtered = computed(() => {
  const query = q.value.toLowerCase();
  if (!query) return items.value;
  return items.value.filter((p) =>
    [p.name, p.contact, p.email, p.phone, p.postalCity].some((v) => v && String(v).toLowerCase().includes(query))
  );
});

function avatarColor(name) {
  const palette = ['#2563eb', '#7c3aed', '#0ea5e9', '#16a34a', '#d97706', '#dc2626'];
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return palette[h % palette.length];
}

function initials(name) {
  return String(name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function openCreate() {
  editing.value = null;
  form.value = emptyForm();
  showModal.value = true;
}

function openEdit(p) {
  editing.value = p;
  form.value = { ...p };
  showModal.value = true;
}

async function save() {
  try {
    if (editing.value) {
      const updated = await api.put(`/api/${props.kind}/${editing.value.id}`, form.value);
      const idx = items.value.findIndex((i) => i.id === editing.value.id);
      items.value[idx] = { ...items.value[idx], ...updated };
      toast(`${singularLabel} modifié`);
    } else {
      const created = await api.post(`/api/${props.kind}`, form.value);
      items.value.unshift(created);
      toast(`${singularLabel} créé`);
    }
    showModal.value = false;
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function remove(p) {
  if (!confirm(`Supprimer « ${p.name} » ?`)) return;
  try {
    await api.delete(`/api/${props.kind}/${p.id}`);
    items.value = items.value.filter((i) => i.id !== p.id);
    toast(`${singularLabel} supprimé`);
  } catch (e) {
    toast(e.message, 'error');
  }
}

onMounted(async () => {
  try {
    items.value = await api.partners(props.kind);
  } catch (e) {
    toast('Chargement impossible', 'error');
  }
});
</script>
