<template>
  <div class="layout">
    <div class="overlay" :class="{ show: menuOpen }" @click="menuOpen = false"></div>

    <aside class="sidebar" :class="{ open: menuOpen }">
      <div class="sidebar-brand">
        <div class="logo-badge">
          <img v-if="logo" :src="logo" alt="logo" />
          <template v-else>M</template>
        </div>
        <span>{{ companyName }}</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">Pilotage</div>
        <router-link v-for="item in mainNav" :key="item.to" :to="item.to" class="nav-item" :class="{ active: isActive(item.to) }" @click="menuOpen = false">
          <Icon :name="item.icon" /> {{ item.label }}
        </router-link>

        <div class="nav-section">Documents clients</div>
        <router-link to="/documents?groupe=ventes" class="nav-item" :class="{ active: isGroupActive('ventes') }" @click="menuOpen = false">
          <Icon name="users" /> Documents clients
        </router-link>
        <router-link to="/documents?groupe=ventes&type=devis" class="nav-item sub" @click="menuOpen = false">
          <Icon name="docPlus" /> Devis
        </router-link>
        <router-link to="/documents?groupe=ventes&type=livraison" class="nav-item sub" @click="menuOpen = false">
          <Icon name="docPlus" /> Bons de livraison
        </router-link>
        <router-link to="/documents?groupe=ventes&type=facture" class="nav-item sub" @click="menuOpen = false">
          <Icon name="docPlus" /> Factures
        </router-link>

        <div class="nav-section">Documents fournisseurs</div>
        <router-link to="/documents?groupe=achats" class="nav-item" :class="{ active: isGroupActive('achats') }" @click="menuOpen = false">
          <Icon name="building" /> Documents fournisseurs
        </router-link>
        <router-link to="/documents?groupe=achats&type=commande" class="nav-item sub" @click="menuOpen = false">
          <Icon name="docPlus" /> Bons de commande
        </router-link>
        <router-link to="/documents?groupe=achats&type=reception" class="nav-item sub" @click="menuOpen = false">
          <Icon name="docPlus" /> Bons de réception
        </router-link>
        <router-link to="/documents?groupe=achats&type=facture_fournisseur" class="nav-item sub" @click="menuOpen = false">
          <Icon name="docPlus" /> Factures fournisseurs
        </router-link>

        <div class="nav-section">Paramètres</div>
        <router-link to="/parametres" class="nav-item" :class="{ active: isActive('/parametres') }" @click="menuOpen = false">
          <Icon name="settings" /> Personnalisation
        </router-link>
      </nav>

      <div class="sidebar-footer">
        MonERP — Gestion d'entreprise v1.0
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="menu-toggle" @click="menuOpen = !menuOpen" aria-label="Menu">
          <Icon name="menu" />
        </button>
        <div>
          <h1>{{ $route.meta.title }}</h1>
        </div>
        <div class="grow"></div>
        <router-link v-if="!isDocSub" :to="newDocLink" class="btn btn-primary btn-sm">
          <Icon name="plus" /> Nouveau document
        </router-link>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>

    <teleport to="body">
      <div class="toast-wrap">
        <div v-for="t in toasts.items" :key="t.id" class="toast" :class="t.type">
          <Icon v-if="t.type === 'success'" name="check" :size="16" />
          <Icon v-else name="warning" :size="16" />
          {{ t.message }}
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from './components/Icon.js';
import { groupOfType } from './api';
import { appStore } from './store';
import { toasts } from './toast';

const route = useRoute();
const menuOpen = ref(false);

const companyName = computed(() => appStore.settings.company?.name || 'MonERP');
const logo = computed(() => appStore.settings.company?.logo || null);

const mainNav = [
  { to: '/', label: 'Tableau de bord', icon: 'dashboard' },
  { to: '/clients', label: 'Clients', icon: 'users' },
  { to: '/fournisseurs', label: 'Fournisseurs', icon: 'building' },
  { to: '/stock', label: 'Stock & Produits', icon: 'box' }
];

const isDocSub = computed(() => ['document-new', 'document-edit', 'document-print'].includes(route.name));

const newDocLink = computed(() => {
  const type = route.query.type;
  const group = route.query.groupe;
  const params = [];
  if (type) params.push(`type=${type}`);
  if (group) params.push(`groupe=${group}`);
  return params.length ? `/documents/nouveau?${params.join('&')}` : '/documents/nouveau';
});

function isActive(to) {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
}

function isGroupActive(group) {
  const current = route.query.groupe || (route.query.type ? groupOfType(route.query.type) : 'ventes');
  return current === group;
}

onMounted(async () => {
  await appStore.load();
});
</script>

<style scoped>
.nav-item.sub { padding-left: 34px; font-size: 13px; }
</style>
