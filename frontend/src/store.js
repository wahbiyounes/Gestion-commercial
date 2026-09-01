import { reactive } from 'vue';
import { api } from './api';

export const appStore = reactive({
  settings: { company: {}, document: {} },
  loaded: false,
  async load() {
    try {
      this.settings = await api.settings.get();
      this.loaded = true;
    } catch (e) {
      this.settings = { company: {}, document: {} };
    }
  },
  async save(next) {
    const saved = await api.settings.save(next);
    this.settings = saved;
    return saved;
  }
});

export function defaultCurrency() {
  return appStore.settings.document?.currency || 'EUR';
}
