<template>
  <header class="top">
    <div>
      <h1>Calidad Jira</h1>
      <p class="muted">Historias y tareas con datos incompletos. El correo se previsualiza antes de enviarlo a IT.PIME.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <FilterBar />
  <div v-if="report" class="kpis">
    <button v-for="kind in kinds" :key="kind" class="kpi" type="button" @click="selected = kind">
      <b>{{ report.counts[kind] }}</b>
      <span>{{ report.labels[kind] }}</span>
    </button>
  </div>
  <p v-if="report">Total del motivo seleccionado: {{ visible.length }}</p>
  <div class="panel" style="overflow: auto">
    <table>
      <thead><tr><th>Clave</th><th>Resumen</th><th>Responsable</th><th>Sprint</th><th>Motivo</th></tr></thead>
      <tbody>
        <tr v-for="(item, index) in visible" :key="`${item.key}-${item.reason}-${index}`">
          <td><a :href="item.url" target="_blank" rel="noreferrer">{{ item.key }}</a></td>
          <td>{{ item.summary }}</td>
          <td>{{ item.assignee || '—' }}</td>
          <td>{{ item.sprint || '—' }}</td>
          <td>{{ report?.labels[item.reason] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-if="auth.isAdmin" class="actions">
    <button class="btn secondary" type="button" @click="preview">Previsualizar correo</button>
  </div>
  <div v-if="mail" class="modal-back" @click.self="mail = null">
    <div class="panel modal">
      <h2>Previsualización</h2>
      <p>{{ mail.total }} historias o tareas afectadas. Destinatario: {{ mail.recipient || 'sin configurar' }}.</p>
      <table>
        <thead><tr><th>Clave</th><th>Resumen</th><th>Responsable</th><th>Sprint</th><th>Motivo</th></tr></thead>
        <tbody>
          <tr v-for="(row, index) in mail.rows" :key="`${row.key}-${index}`">
            <td>{{ row.key }}</td>
            <td>{{ row.summary }}</td>
            <td>{{ row.assignee || '—' }}</td>
            <td>{{ row.sprint || '—' }}</td>
            <td>{{ row.reason }}</td>
          </tr>
        </tbody>
      </table>
      <pre>{{ mail.text }}</pre>
      <label><input v-model="dryRun" type="checkbox" /> Modo de prueba: registrar sin enviar</label>
      <div class="actions">
        <button class="btn" type="button" @click="send">Confirmar</button>
        <button class="btn ghost" type="button" @click="mail = null">Cerrar</button>
      </div>
      <p v-if="sent" class="muted">Resultado: {{ sent.result }} {{ sent.error || '' }}</p>
    </div>
  </div>
  <section class="panel">
    <h2>Envíos</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Destinatario</th><th>Issues</th><th>Resultado</th><th>Error</th></tr></thead>
      <tbody>
        <tr v-for="item in history" :key="item.id">
          <td>{{ item.sentAt }}</td>
          <td>{{ item.recipient }}</td>
          <td>{{ item.issueCount }}</td>
          <td>{{ item.result }}</td>
          <td>{{ item.error || '' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import FilterBar from '@/components/FilterBar.vue';
import { useFilters } from '@/composables/useFilters';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref, watch } from 'vue';

type Kind = 'no_epic' | 'no_estimate' | 'sprint_no_hours' | 'hours_open' | 'closed_no_hours' | 'incomplete' | 'no_assignee';
interface Row { key: string; summary: string; sprint: string; assignee: string; url: string; reason: Kind }
interface Report { counts: Record<Kind, number>; labels: Record<Kind, string>; total: number; items: Row[] }
interface Mail { total: number; recipient: string | null; text: string; rows: Row[] }

const kinds: Kind[] = ['no_epic', 'no_estimate', 'sprint_no_hours', 'hours_open', 'closed_no_hours', 'incomplete', 'no_assignee'];
const auth = useAuthStore();
const { queryString } = useFilters();
const report = ref<Report | null>(null);
const error = ref<string | null>(null);
const selected = ref<Kind>('no_epic');
const mail = ref<Mail | null>(null);
const dryRun = ref(true);
const sent = ref<{ result: string; error: string | null } | null>(null);
const history = ref<Array<{ id: string; sentAt: string; recipient: string; issueCount: number; result: string; error: string | null }>>([]);
const visible = computed(() => report.value?.items.filter((item) => item.reason === selected.value) ?? []);

async function load() {
  report.value = await apiFetch<Report>(`/v1/quality${queryString.value}`);
  history.value = await apiFetch('/v1/quality/emails');
}

watch(queryString, async () => {
  error.value = null;
  try { await load(); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No se pudo cargar'; }
}, { immediate: true });

onMounted(() => undefined);

async function preview() {
  sent.value = null;
  mail.value = await apiFetch<Mail>(`/v1/quality/email/preview${queryString.value}`, {
    method: 'POST',
    body: JSON.stringify({ kinds: [selected.value], dryRun: true }),
  });
}

async function send() {
  sent.value = await apiFetch(`/v1/quality/email/send${queryString.value}`, {
    method: 'POST',
    body: JSON.stringify({ kinds: [selected.value], dryRun: dryRun.value }),
  });
  await load();
}
</script>
