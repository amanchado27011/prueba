<template>
  <header class="top">
    <div>
      <h1>Conexión Jira</h1>
      <p class="muted">Solo lectura. El token no sale del servidor ni se muestra aquí.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <section v-if="config" class="panel">
    <p>Sitio: {{ config.baseUrlHost || 'no configurado' }}</p>
    <p>Email configurado: {{ config.emailConfigured ? 'sí' : 'no' }}</p>
    <p>Token configurado: {{ config.tokenConfigured ? 'sí' : 'no' }}</p>
    <p>SMTP: {{ config.smtpConfigured ? 'sí' : 'no' }}</p>
    <p>Destinatario IT.PIME ({{ config.recipientSource }}): {{ config.recipient || 'sin definir' }}</p>
    <form v-if="auth.isAdmin" class="actions" @submit.prevent="saveRecipient">
      <label>Destinatario <input v-model="recipient" type="email" /></label>
      <button class="btn secondary" type="submit">Guardar destinatario</button>
    </form>
  </section>
  <section v-if="status" class="panel">
    <p>Estado: {{ status.running ? 'sincronizando' : status.lastStatus || 'sin ejecuciones' }}</p>
    <p>Último éxito: {{ status.lastSuccessAt || '—' }}</p>
    <p v-if="status.lastError">Último error: {{ status.lastError }}</p>
    <p>{{ status.isStale ? 'Los datos están desactualizados.' : 'Los datos están dentro del umbral de frescura.' }}</p>
    <div v-if="auth.isAdmin" class="actions">
      <button class="btn" type="button" :disabled="busy" @click="sync('cloud')">Sincronizar Jira</button>
      <button v-if="config?.allowFixture" class="btn secondary" type="button" :disabled="busy" @click="sync('fixture')">Sincronización simulada</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { onMounted, ref } from 'vue';

interface Config {
  baseUrlHost: string | null;
  emailConfigured: boolean;
  tokenConfigured: boolean;
  smtpConfigured: boolean;
  recipient: string | null;
  recipientSource: string;
  allowFixture: boolean;
}
interface Status {
  running: boolean;
  lastStatus: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  isStale: boolean;
}
const auth = useAuthStore();
const config = ref<Config | null>(null);
const status = ref<Status | null>(null);
const error = ref<string | null>(null);
const recipient = ref('');
const busy = ref(false);

async function load() {
  config.value = await apiFetch<Config>('/v1/jira/config');
  status.value = await apiFetch<Status>('/v1/jira/sync/status');
  recipient.value = config.value.recipient ?? '';
}

onMounted(async () => {
  try { await load(); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No se pudo cargar'; }
});

async function saveRecipient() {
  await apiFetch('/v1/jira/config/recipient', { method: 'PATCH', body: JSON.stringify({ recipient: recipient.value || null }) });
  await load();
}

async function sync(mode: 'cloud' | 'fixture') {
  busy.value = true;
  error.value = null;
  try {
    await apiFetch('/v1/jira/sync', { method: 'POST', body: JSON.stringify({ mode }) });
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'La sincronización falló';
    await load();
  } finally {
    busy.value = false;
  }
}
</script>
