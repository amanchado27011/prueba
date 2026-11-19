<template>
  <ErrorBanner :message="error" />
  <article v-if="detail" class="panel">
    <header class="top">
      <div>
        <h1>{{ detail.epic.key }} · {{ detail.epic.summary }}</h1>
        <p class="muted">{{ detail.epic.statusName }} · {{ detail.epic.initiativeName || 'Sin iniciativa' }} · {{ detail.epic.objectiveName || 'Sin objetivo' }}</p>
      </div>
      <a class="btn secondary" :href="detail.epic.jiraUrl" target="_blank" rel="noreferrer">Abrir en Jira</a>
    </header>
    <div class="kpis">
      <div class="kpi"><b>{{ detail.metrics.issueCount }}</b><span>Historias</span></div>
      <div class="kpi"><b>{{ detail.metrics.done }}</b><span>Terminadas</span></div>
      <div class="kpi"><b>{{ detail.metrics.inProgress }}</b><span>En curso</span></div>
      <div class="kpi"><b>{{ detail.metrics.pending }}</b><span>Pendientes</span></div>
      <div class="kpi"><b>{{ detail.metrics.loggedHours }}</b><span>Horas</span></div>
      <div class="kpi"><b>{{ detail.metrics.originalHours }}</b><span>Estimación</span></div>
      <div class="kpi"><b>{{ detail.metrics.remainingHours }}</b><span>Restantes</span></div>
      <div class="kpi"><b>{{ detail.metrics.storyPoints }}</b><span>Story points</span></div>
    </div>
    <p>Personas: {{ detail.metrics.people.map((person) => `${person.name} (${person.hours} h)`).join(', ') || '—' }}</p>
    <p>Subáreas: {{ detail.metrics.bySubarea.map((item) => `${item.label} ${item.hours} h`).join(' · ') || '—' }}</p>
    <p>Familias: {{ detail.metrics.byFamily.map((item) => `${item.label} ${item.hours} h`).join(' · ') || '—' }}</p>
  </article>
  <form v-if="detail && auth.isAdmin" class="panel filters" @submit.prevent="save">
    <label>Iniciativa
      <select v-model="form.initiativeId">
        <option value="">Sin iniciativa</option>
        <option v-for="item in options?.initiatives ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Objetivo explícito
      <select v-model="form.objectiveExplicit">
        <option value="false">Heredar de la iniciativa</option>
        <option value="true">Elegir objetivo</option>
      </select>
    </label>
    <label>Objetivo
      <select v-model="form.objectiveId" :disabled="form.objectiveExplicit !== 'true'">
        <option value="">Sin objetivo</option>
        <option v-for="item in options?.objectives ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Mantenimiento
      <select v-model="form.maintenanceType">
        <option value="">Sin tipo</option>
        <option v-for="item in options?.maintenanceTypes ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Actividad
      <select v-model="form.activityTypeId">
        <option value="">Sin actividad</option>
        <option v-for="item in options?.activities ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <button class="btn" type="submit">Guardar clasificación</button>
  </form>
  <div v-if="detail" class="panel" style="overflow: auto">
    <table>
      <thead><tr><th>Clave</th><th>Resumen</th><th>Estado</th><th>Asignada</th><th>Horas</th><th>Estimación</th><th>%</th></tr></thead>
      <tbody>
        <tr v-for="issue in detail.issues" :key="issue.id">
          <td><a :href="issue.jiraUrl" target="_blank" rel="noreferrer">{{ issue.key }}</a></td>
          <td>{{ issue.summary }}</td>
          <td>{{ issue.statusName }}</td>
          <td>{{ issue.assigneeName || '—' }}</td>
          <td>{{ issue.metrics.loggedHours }}</td>
          <td>{{ issue.metrics.originalHours }}</td>
          <td>{{ issue.metrics.consumedPct ?? '—' }}</td>
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
import { useRoute } from 'vue-router';

interface PersonHour { name: string; hours: number }
interface Slice { label: string; hours: number }
interface Detail {
  epic: { key: string; summary: string; statusName: string; initiativeName: string | null; objectiveName: string | null; jiraUrl: string; initiativeId: string | null; objectiveId: string | null; objectiveExplicit?: boolean; maintenanceType: string | null; activityTypeId: string | null };
  metrics: { issueCount: number; done: number; inProgress: number; pending: number; loggedHours: number; originalHours: number; remainingHours: number; storyPoints: number; people: PersonHour[]; bySubarea: Slice[]; byFamily: Slice[] };
  issues: Array<{ id: string; key: string; summary: string; statusName: string; assigneeName: string | null; jiraUrl: string; metrics: { loggedHours: number; originalHours: number; consumedPct: number | null } }>;
}

const route = useRoute();
const auth = useAuthStore();
const detail = ref<Detail | null>(null);
const error = ref<string | null>(null);
const options = ref<{ initiatives: Array<{ id: string; name: string }>; objectives: Array<{ id: string; name: string }>; activities: Array<{ id: string; name: string }>; maintenanceTypes: Array<{ id: string; name: string }> } | null>(null);
const form = reactive({ initiativeId: '', objectiveId: '', objectiveExplicit: 'false', maintenanceType: '', activityTypeId: '' });

async function load() {
  error.value = null;
  try {
    detail.value = await apiFetch<Detail>(`/v1/epics/${route.params.id}`);
    const epic = detail.value.epic;
    form.initiativeId = epic.initiativeId ?? '';
    form.objectiveId = epic.objectiveId ?? '';
    form.objectiveExplicit = epic.objectiveExplicit ? 'true' : 'false';
    form.maintenanceType = epic.maintenanceType ?? '';
    form.activityTypeId = epic.activityTypeId ?? '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar la épica';
  }
}

onMounted(async () => {
  options.value = await apiFetch('/v1/filters/options');
  await load();
});

async function save() {
  error.value = null;
  try {
    await apiFetch(`/v1/epics/${route.params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        initiativeId: form.initiativeId || null,
        objectiveExplicit: form.objectiveExplicit === 'true',
        objectiveId: form.objectiveExplicit === 'true' ? form.objectiveId || null : null,
        maintenanceType: form.maintenanceType || null,
        activityTypeId: form.activityTypeId || null,
      }),
    });
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar';
  }
}
</script>
