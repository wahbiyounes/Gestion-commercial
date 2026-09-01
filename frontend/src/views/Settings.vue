<template>
  <div class="grid grid-3" style="grid-template-columns: 1fr 1.6fr; align-items: start">
    <div class="card">
      <div class="card-header"><h2>Personnalisation</h2></div>
      <div class="card-body p-0">
        <div class="side-tabs">
          <div class="side-tab" :class="{ active: tab === 'company' }" @click="tab = 'company'">
            <Icon name="building" /> Informations de l'entreprise
          </div>
          <div class="side-tab" :class="{ active: tab === 'logo' }" @click="tab = 'logo'">
            <Icon name="boxOpen" /> Logo
          </div>
          <div class="side-tab" :class="{ active: tab === 'document' }" @click="tab = 'document'">
            <Icon name="doc" /> En-tête, pied de page & impression
          </div>
        </div>
      </div>
      <div class="card-body" style="border-top: 1px solid var(--border)">
        <div class="alert alert-success" style="font-size: 12.5px">
          <Icon name="check" />
          <div>Ces informations apparaissent sur vos devis, factures, bons de livraison et bons de commande.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>{{ tabTitle }}</h2>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <Icon name="save" /> {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
      <div class="card-body">
        <form @submit.prevent="save">
          <!-- Company -->
          <template v-if="tab === 'company'">
            <div class="form-grid">
              <div class="form-group">
                <label>Nom de l'entreprise *</label>
                <input v-model="form.company.name" class="input" required />
              </div>
              <div class="form-group">
                <label>Raison sociale</label>
                <input v-model="form.company.legalName" class="input" />
              </div>
              <div class="form-group">
                <label>SIRET</label>
                <input v-model="form.company.siret" class="input" />
              </div>
              <div class="form-group">
                <label>N° TVA intracommunautaire</label>
                <input v-model="form.company.vatNumber" class="input" />
              </div>
              <div class="form-group">
                <label>Adresse</label>
                <input v-model="form.company.address" class="input" />
              </div>
              <div class="form-group">
                <label>Code postal & ville</label>
                <input v-model="form.company.postalCity" class="input" />
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input v-model="form.company.phone" class="input" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="form.company.email" class="input" type="email" />
              </div>
              <div class="form-group full">
                <label>Site web</label>
                <input v-model="form.company.website" class="input" />
              </div>
            </div>
          </template>

          <!-- Logo -->
          <template v-else-if="tab === 'logo'">
            <div class="logo-setup">
              <div class="logo-preview">
                <div class="logo-preview-box">
                  <img v-if="form.company.logo" :src="form.company.logo" alt="Logo" />
                  <div v-else class="logo-placeholder"><Icon name="box" :size="34" /> Aucun logo</div>
                </div>
              </div>
              <div class="logo-actions">
                <label class="btn btn-primary" style="cursor: pointer">
                  <Icon name="boxOpen" /> Choisir un logo
                  <input type="file" accept="image/*" style="display: none" @change="onLogoFile" />
                </label>
                <button v-if="form.company.logo" class="btn btn-ghost" @click="form.company.logo = null">
                  <Icon name="trash" /> Retirer le logo
                </button>
                <p class="hint mt-1">Formats : PNG, JPG, SVG. Le logo est affiché en haut de vos documents imprimés et dans le menu latéral.</p>
              </div>
            </div>
          </template>

          <!-- Document / print -->
          <template v-else>
            <div class="form-group mb-1">
              <label class="checkbox" style="font-weight: 600">
                <input v-model="form.document.showHeader" type="checkbox" /> Afficher l'en-tête sur les documents
              </label>
              <textarea v-if="form.document.showHeader" v-model="form.document.headerText" class="textarea mt-1" placeholder="Texte d'en-tête…"></textarea>
            </div>
            <div class="form-group mb-1">
              <label class="checkbox" style="font-weight: 600">
                <input v-model="form.document.showFooter" type="checkbox" /> Afficher le pied de page sur les documents
              </label>
              <textarea v-if="form.document.showFooter" v-model="form.document.footerText" class="textarea mt-1" placeholder="Texte du pied de page…"></textarea>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Couleur d'accent (titres, tableaux)</label>
                <div class="flex">
                  <input v-model="form.document.accentColor" type="color" class="color-input" />
                  <input v-model="form.document.accentColor" class="input" />
                </div>
              </div>
              <div class="form-group">
                <label>Devise par défaut</label>
                <select v-model="form.document.currency" class="select">
                  <option v-for="(c, code) in CURRENCIES" :key="code" :value="code">{{ c.label }} ({{ c.symbol }})</option>
                </select>
              </div>
              <div class="form-group">
                <label>TVA par défaut (%)</label>
                <input v-model.number="form.document.defaultVatRate" class="input" type="number" step="0.1" min="0" max="100" />
              </div>
              <div class="form-group">
                <label>Pied de document — conditions</label>
                <input v-model="form.document.terms" class="input" placeholder="Conditions générales…" />
              </div>
            </div>
          </template>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../components/Icon.js';
import { CURRENCIES } from '../api';
import { appStore } from '../store';
import { toast } from '../toast';

const route = useRoute();
const form = ref({ company: {}, document: {} });
const saving = ref(false);
const tab = ref('company');

  const tabTitle = computed(() => {
    const map = { company: "Informations de l'entreprise", logo: "Logo de l'entreprise", document: "En-tête, pied de page & impression" };
    return map[tab.value];
  });

function onLogoFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    form.value.company.logo = ev.target.result;
    toast('Logo chargé — cliquez sur Enregistrer pour appliquer');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function save() {
  saving.value = true;
  try {
    await appStore.save(form.value);
    toast('Paramètres enregistrés');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const t = route.query.tab;
  if (['company', 'logo', 'document'].includes(t)) tab.value = t;
  if (!appStore.loaded) await appStore.load();
  form.value = { company: { ...appStore.settings.company }, document: { ...appStore.settings.document } };
});
</script>

<style scoped>
.side-tabs { padding: 8px; }
.side-tab {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 12px; border-radius: 9px; cursor: pointer;
  font-size: 14px; font-weight: 500; color: var(--text);
}
.side-tab svg { width: 18px; height: 18px; color: var(--text-soft); }
.side-tab:hover { background: #f3f4f6; }
.side-tab.active { background: var(--primary-soft); color: var(--primary-dark); }
.side-tab.active svg { color: var(--primary); }

.logo-setup { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.logo-preview-box {
  width: 180px; height: 180px; border: 2px dashed var(--border); border-radius: 14px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  background: #fafafa;
}
.logo-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
.logo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-faint); font-size: 13px; }
.logo-actions { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.hint { font-size: 12.5px; color: var(--text-faint); max-width: 320px; margin: 0; }
.color-input { width: 44px; height: 38px; border: 1px solid var(--border); border-radius: 8px; padding: 3px; background: #fff; cursor: pointer; }
@media (max-width: 1024px) {
  .grid.grid-3 { grid-template-columns: 1fr !important; }
}
</style>
