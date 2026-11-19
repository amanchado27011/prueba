<template>
  <header class="top">
    <div>
      <h1>Productividad</h1>
      <p class="muted">Capacidad, carga y distribución. Las personas se listan por nombre, no por rendimiento.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <FilterBar />
  <div v-if="report" class="kpis">
    <div class="kpi"><b>{{ report.hours }}</b><span>Horas imputadas</span></div>
    <div class="kpi"><b>{{ report.storiesDone }}</b><span>Terminadas</span></div>
    <div class="kpi"><b>{{ report.storiesInProgress }}</b><span>En curso</span></div>
    <div class="kpi"><b>{{ report.estimateDoneHours }}</b><span>Estimación terminada</span></div>
    <div class="kpi"><b>{{ report.estimatePendingHours }}</b><span>Estimación pendiente</span></div>
  </div>
  <section v-if="report" class="panel">
    <h2>Worklogs por persona</h2>
    <table>
      <thead><tr><th>Persona</th><th>Horas</th><th>Historias en las que participa</th><th>Subárea</th><th>Familia</th></tr></thead>
      <tbody>
        <tr v-for="person in report.byPerson" :key="person.accountId">
          <td>{{ person.name }}</td>
          <td>{{ person.hours }}</td>
          <td>{{ person.stories }}</td>
          <td>{{ person.subareaName || '—' }}</td>
          <td>{{ person.familyName || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
  <section v-if="report" class="panel">
    <h2>Distribución</h2>
    <p>Actividad: {{ line(report.hourDistribution) }}</p>
    <p>Subárea: {{ line(report.loadBySubarea) }}</p>
    <p>Familia: {{ line(report.loadByFamily) }}</p>
  </section>
  <section v-if="report" class="panel">
    <h2>Tendencia por sprint</h2>
    <table>
      <thead><tr><th>Sprint</th><th>Estado</th><th>Horas</th><th>Terminadas</th></tr></thead>
      <tbody>
        <tr v-for="sprint in report.sprintTrend" :key="sprint.sprintId">
          <td>{{ sprint.sprintName }}</td>
          <td>{{ sprint.state }}</td>
          <td>{{ sprint.hours }}</td>
          <td>{{ sprint.done }}</td>
        </tr>
      </tbody>
    </table>
  </section>
  <section v-if="report" class="panel">
    <h2>Trabajo no planificado</h2>
    <p>{{ report.unplanned.demandCount }} demandas impulsivas ({{ report.unplanned.demandHours }} h estimadas).</p>
    <p>{{ report.unplanned.issuesWithoutEpic }} historias o tareas sin épica, con {{ report.unplanned.hoursWithoutEpic }} h imputadas.</p>
  </section>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import FilterBar from '@/components/FilterBar.vue';
import { useFilters } from '@/composables/useFilters';
import { ref, watch } from 'vue';

interface Slice { label: string; hours: number }
interface Report {
  hours: number;
  storiesDone: number;
  storiesInProgress: number;
  estimateDoneHours: number;
  estimatePendingHours: number;
  byPerson: Array<{ accountId: string; name: string; hours: number; stories: number; subareaName: string | null; familyName: string | null }>;
  hourDistribution: Slice[];
  loadBySubarea: Slice[];
  loadByFamily: Slice[];
  sprintTrend: Array<{ sprintId: string; sprintName: string; state: string; hours: number; done: number }>;
  unplanned: { demandCount: number; demandHours: number; issuesWithoutEpic: number; hoursWithoutEpic: number };
}

const { queryString } = useFilters();
const report = ref<Report | null>(null);
const error = ref<string | null>(null);

function line(items: Slice[]) {
  return items.map((item) => `${item.label}: ${item.hours} h`).join(' · ') || '—';
}

watch(queryString, async () => {
  error.value = null;
  try {
    report.value = await apiFetch<Report>(`/v1/productivity${queryString.value}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar';
  }
}, { immediate: true });
</script>
