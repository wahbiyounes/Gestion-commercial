import { reactive } from 'vue';

export const toasts = reactive({ items: [] });

let counter = 0;

export function toast(message, type = 'success') {
  const id = ++counter;
  toasts.items.push({ id, message, type });
  setTimeout(() => {
    const idx = toasts.items.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.items.splice(idx, 1);
  }, 3200);
}
