<template>
  <header class="top">
    <div>
      <h1>Catálogos</h1>
      <p class="muted">Objetivos, subáreas, familias, actividades y personas. El mantenimiento es fijo.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <div class="actions" style="margin-bottom: 0.8rem">
    <button v-for="tab in tabs" :key="tab" class="btn" :class="{ secondary: current !== tab }" type="button" @click="current = tab">{{ tab }}</button>
  </div>
  <form v-if="auth.isAdmin && current !== 'Mantenimiento' && current !== 'Personas'" class="panel actions" @submit.prevent="create">
    <label>Nombre <input v-model="name" required /></label>
    <button class="btn" type="submit">Añadir</button>
  </form>
  <div class="panel">
    <table v-if="current === 'Mantenimiento'">
      <tbody><tr v-for="item in maintenance" :key="item.id"><td>{{ item.name }}</td></tr></tbody>
    </table>
    <table v-else-if="current === 'Personas'">
      <thead><tr><th>Nombre</th><th>Email</th><th>Subárea</th><th>Familia</th></tr></thead>
      <tbody>
        <tr v-for="person in people" :key="person.id">
          <td>{{ person.displayName }}</td>
          <td>{{ person.email || '—' }}</td>
          <td>
            <select :disabled="!auth.isAdmin" :value="person.subareaId || ''" @change="assign(person.id, 'subareaId', ($event.target as HTMLSelectElement).value)">
              <option value="">—</option>
              <option v-for="item in subareas" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </td>
          <td>
            <select :disabled="!auth.isAdmin" :value="person.serviceFamilyId || ''" @change="assign(person.id, 'serviceFamilyId', ($event.target as HTMLSelectElement).value)">
              <option value="">—</option>
              <option v-for="item in families" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
    <table v-else>
      <thead><tr><th>Nombre</th><th>Activo</th><th></th></tr></thead>
      <tbody>
        <tr v-for="item in rows" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.active ? 'sí' : 'no' }}</td>
          <td><button v-if="auth.isAdmin && item.active" class="btn ghost" type="button" @click="disable(item.id)">Desactivar</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref } from 'vue';

interface Row { id: string; name: string; active?: boolean }
interface Person { id: string; displayName: string; email: string | null; subareaId: string | null; serviceFamilyId: string | null }
const tabs = ['Objetivos', 'Subáreas', 'Familias', 'Actividades', 'Mantenimiento', 'Personas'] as const;
type Tab = (typeof tabs)[number];
const paths: Record<Exclude<Tab, 'Mantenimiento' | 'Personas'>, string> = {
  Objetivos: '/v1/objectives',
  Subáreas: '/v1/subareas',
  Familias: '/v1/service-families',
  Actividades: '/v1/activity-types',
};
const auth = useAuthStore();
const current = ref<Tab>('Objetivos');
const error = ref<string | null>(null);
const name = ref('');
const objectives = ref<Row[]>([]);
const subareas = ref<Row[]>([]);
const families = ref<Row[]>([]);
const activities = ref<Row[]>([]);
const maintenance = ref<Row[]>([]);
const people = ref<Person[]>([]);
const rows = computed(() => {
  if (current.value === 'Objetivos') return objectives.value;
  if (current.value === 'Subáreas') return subareas.value;
  if (current.value === 'Familias') return families.value;
  if (current.value === 'Actividades') return activities.value;
  return [];
});

async function load() {
  [objectives.value, subareas.value, families.value, activities.value, maintenance.value, people.value] = await Promise.all([
    apiFetch<Row[]>('/v1/objectives'),
    apiFetch<Row[]>('/v1/subareas'),
    apiFetch<Row[]>('/v1/service-families'),
    apiFetch<Row[]>('/v1/activity-types'),
    apiFetch<Row[]>('/v1/maintenance-types'),
    apiFetch<Person[]>('/v1/people'),
  ]);
}

onMounted(async () => {
  try { await load(); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No se pudo cargar'; }
});

async function create() {
  if (current.value === 'Mantenimiento' || current.value === 'Personas') return;
  await apiFetch(paths[current.value], { method: 'POST', body: JSON.stringify({ name: name.value }) });
  name.value = '';
  await load();
}

async function disable(id: string) {
  if (current.value === 'Mantenimiento' || current.value === 'Personas') return;
  await apiFetch(`${paths[current.value]}/${id}`, { method: 'DELETE' });
  await load();
}

async function assign(id: string, field: 'subareaId' | 'serviceFamilyId', value: string) {
  await apiFetch(`/v1/people/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value || null }) });
  await load();
}
</script>
