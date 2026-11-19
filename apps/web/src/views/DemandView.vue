<template>
  <header class="top">
    <div>
      <h1>Demanda impulsiva</h1>
      <p class="muted">Alta local, sin crear nada en Jira. Primero lo imprescindible y después la clasificación.</p>
    </div>
    <button class="btn secondary" type="button" @click="template">Plantilla CSV</button>
  </header>
  <ErrorBanner :message="error" />
  <form v-if="auth.isAdmin" class="panel filters" @submit.prevent="create">
    <label>Título <input v-model="form.title" required /></label>
    <label>Solicitante <input v-model="form.requester" required /></label>
    <label>Fecha <input v-model="form.occurredAt" type="date" required /></label>
    <label>Prioridad
      <select v-model="form.priority">
        <option value="LOW">Baja</option>
        <option value="MEDIUM">Media</option>
        <option value="HIGH">Alta</option>
        <option value="CRITICAL">Crítica</option>
      </select>
    </label>
    <label>Esfuerzo (h) <input v-model.number="form.estimatedHours" type="number" min="0" step="0.5" /></label>
    <label>Descripción <textarea v-model="form.description"></textarea></label>
    <label>Iniciativa
      <select v-model="form.initiativeId"><option value="">—</option><option v-for="item in options?.initiatives ?? []" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    </label>
    <label>Objetivo
      <select v-model="form.objectiveId"><option value="">—</option><option v-for="item in options?.objectives ?? []" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    </label>
    <label>Subárea
      <select v-model="form.subareaId"><option value="">—</option><option v-for="item in options?.subareas ?? []" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    </label>
    <label>Familia
      <select v-model="form.serviceFamilyId"><option value="">—</option><option v-for="item in options?.families ?? []" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    </label>
    <label>Estado
      <select v-model="form.status">
        <option value="NEW">Nueva</option>
        <option value="TRIAGED">Clasificada</option>
        <option value="IN_PROGRESS">En curso</option>
        <option value="DONE">Hecha</option>
        <option value="DISCARDED">Descartada</option>
      </select>
    </label>
    <label>Clave Jira opcional <input v-model="form.jiraKey" /></label>
    <label>Observaciones <textarea v-model="form.notes"></textarea></label>
    <button class="btn" type="submit">Guardar demanda</button>
  </form>
  <form v-if="auth.isAdmin" class="panel actions" @submit.prevent="upload">
    <label>Importar CSV o Excel <input ref="file" type="file" accept=".csv,.xlsx,text/csv" /></label>
    <button class="btn secondary" type="submit">Importar</button>
    <p v-if="importResult" class="muted">Creadas: {{ importResult.created }}. Errores: {{ importResult.errors.map((item) => `fila ${item.row}: ${item.message}`).join(' · ') || 'ninguno' }}</p>
  </form>
  <div class="panel" style="overflow: auto">
    <table>
      <thead><tr><th>Fecha</th><th>Título</th><th>Solicitante</th><th>Prioridad</th><th>Horas</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        <tr v-for="item in rows" :key="item.id">
          <td>{{ item.occurredAt.slice(0, 10) }}</td>
          <td>{{ item.title }}</td>
          <td>{{ item.requester }}</td>
          <td>{{ item.priority }}</td>
          <td>{{ item.estimatedHours }}</td>
          <td>{{ item.status }}</td>
          <td><button v-if="auth.isAdmin" class="btn ghost" type="button" @click="remove(item.id)">Quitar</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { apiFetch, downloadFile } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { onMounted, reactive, ref } from 'vue';

interface Demand { id: string; title: string; requester: string; occurredAt: string; priority: string; estimatedHours: number; status: string }
interface Named { id: string; name: string }
const auth = useAuthStore();
const rows = ref<Demand[]>([]);
const error = ref<string | null>(null);
const file = ref<HTMLInputElement | null>(null);
const importResult = ref<{ created: number; errors: Array<{ row: number; message: string }> } | null>(null);
const options = ref<{ initiatives: Named[]; objectives: Named[]; subareas: Named[]; families: Named[] } | null>(null);
const form = reactive({
  title: '', requester: '', occurredAt: new Date().toISOString().slice(0, 10), priority: 'MEDIUM', estimatedHours: 0,
  description: '', initiativeId: '', objectiveId: '', subareaId: '', serviceFamilyId: '', status: 'NEW', jiraKey: '', notes: '',
});

async function load() {
  rows.value = await apiFetch<Demand[]>('/v1/demand');
}

onMounted(async () => {
  try {
    options.value = await apiFetch('/v1/filters/options');
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar';
  }
});

async function create() {
  error.value = null;
  try {
    await apiFetch('/v1/demand', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        initiativeId: form.initiativeId || null,
        objectiveId: form.objectiveId || null,
        subareaId: form.subareaId || null,
        serviceFamilyId: form.serviceFamilyId || null,
        jiraKey: form.jiraKey || null,
        description: form.description || null,
        notes: form.notes || null,
      }),
    });
    form.title = '';
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar';
  }
}

async function remove(id: string) {
  await apiFetch(`/v1/demand/${id}`, { method: 'DELETE' });
  await load();
}

async function template() {
  await downloadFile('/v1/demand/template.csv', 'plantilla-demanda.csv');
}

async function upload() {
  const selected = file.value?.files?.[0];
  if (!selected) return;
  const body = new FormData();
  body.append('file', selected);
  importResult.value = await apiFetch('/v1/demand/import', { method: 'POST', body });
  await load();
}
</script>
