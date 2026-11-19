<template>
  <ErrorBanner :message="error" />
  <article v-if="detail" class="panel">
    <h1>{{ detail.name }}</h1>
    <p class="muted">{{ detail.objective?.name || 'Sin objetivo' }} · {{ detail.status }} · {{ detail.priority }}</p>
    <div class="kpis">
      <div class="kpi"><b>{{ detail.metrics.issueCount }}</b><span>Historias</span></div>
      <div class="kpi"><b>{{ detail.epics.length }}</b><span>Épicas</span></div>
      <div class="kpi"><b>{{ detail.metrics.loggedHours }}</b><span>Horas</span></div>
      <div class="kpi"><b>{{ detail.metrics.originalHours }}</b><span>Estimación</span></div>
      <div class="kpi"><b>{{ detail.metrics.remainingHours }}</b><span>Restantes</span></div>
      <div class="kpi"><b>{{ detail.metrics.executedPct ?? '—' }}%</b><span>Progreso</span></div>
    </div>
    <p>Actividad: {{ detail.metrics.byActivity.map((item) => `${item.label} ${item.hours} h`).join(' · ') || '—' }}</p>
    <p>Familia: {{ detail.metrics.byFamily.map((item) => `${item.label} ${item.hours} h`).join(' · ') || '—' }}</p>
    <p>Personas: {{ detail.metrics.people.map((person) => person.name).join(', ') || '—' }}</p>
  </article>
  <form v-if="detail && auth.isAdmin" class="panel filters" @submit.prevent="save">
    <label>Nombre <input v-model="form.name" required /></label>
    <label>Estado
      <select v-model="form.status">
        <option value="DRAFT">Borrador</option>
        <option value="ACTIVE">Activa</option>
        <option value="PAUSED">Pausada</option>
        <option value="DONE">Hecha</option>
        <option value="CANCELLED">Cancelada</option>
      </select>
    </label>
    <label>Prioridad
      <select v-model="form.priority">
        <option value="LOW">Baja</option>
        <option value="MEDIUM">Media</option>
        <option value="HIGH">Alta</option>
        <option value="CRITICAL">Crítica</option>
      </select>
    </label>
    <label>Objetivo
      <select v-model="form.objectiveId">
        <option value="">Sin objetivo</option>
        <option v-for="item in objectives" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Notas <textarea v-model="form.notes"></textarea></label>
    <button class="btn" type="submit">Guardar</button>
  </form>
  <div v-if="detail" class="panel">
    <h2>Épicas</h2>
    <table>
      <thead><tr><th>Clave</th><th>Resumen</th><th>Horas</th><th>Historias</th></tr></thead>
      <tbody>
        <tr v-for="epic in detail.epics" :key="epic.id">
          <td><RouterLink :to="`/epicas/${epic.id}`">{{ epic.key }}</RouterLink></td>
          <td>{{ epic.summary }}</td>
          <td>{{ epic.metrics.loggedHours }}</td>
          <td>{{ epic.metrics.issueCount }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

interface Slice { label: string; hours: number }
interface Detail {
  name: string;
  status: string;
  priority: string;
  notes: string | null;
  objectiveId: string | null;
  objective: { name: string } | null;
  metrics: { issueCount: number; loggedHours: number; originalHours: number; remainingHours: number; executedPct: number | null; byActivity: Slice[]; byFamily: Slice[]; people: Array<{ name: string }> };
  epics: Array<{ id: string; key: string; summary: string; metrics: { loggedHours: number; issueCount: number } }>;
}

const route = useRoute();
const auth = useAuthStore();
const detail = ref<Detail | null>(null);
const error = ref<string | null>(null);
const objectives = ref<Array<{ id: string; name: string }>>([]);
const form = reactive({ name: '', status: 'ACTIVE', priority: 'MEDIUM', objectiveId: '', notes: '' });

async function load() {
  detail.value = await apiFetch<Detail>(`/v1/initiatives/${route.params.id}`);
  form.name = detail.value.name;
  form.status = detail.value.status;
  form.priority = detail.value.priority;
  form.objectiveId = detail.value.objectiveId ?? '';
  form.notes = detail.value.notes ?? '';
}

onMounted(async () => {
  try {
    objectives.value = await apiFetch('/v1/objectives');
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar';
  }
});

async function save() {
  error.value = null;
  try {
    await apiFetch(`/v1/initiatives/${route.params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: form.name,
        status: form.status,
        priority: form.priority,
        objectiveId: form.objectiveId || null,
        notes: form.notes || null,
      }),
    });
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar';
  }
}
</script>
