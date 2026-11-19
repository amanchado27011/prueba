<template>
  <div class="shell">
    <aside class="side" :class="{ open: menu }">
      <p class="brand">Gestión de la demanda<span>Dirección General</span></p>
      <RouterLink to="/">Trabajo en curso</RouterLink>
      <RouterLink to="/jerarquia">Jerarquía</RouterLink>
      <RouterLink to="/productividad">Productividad</RouterLink>
      <RouterLink to="/demanda">Demanda impulsiva</RouterLink>
      <RouterLink to="/calidad">Calidad Jira</RouterLink>
      <RouterLink to="/catalogos">Catálogos</RouterLink>
      <RouterLink to="/jira">Jira</RouterLink>
      <RouterLink to="/exportaciones">Exportaciones</RouterLink>
      <div class="user">
        <div>{{ auth.user?.displayName }}</div>
        <div>{{ auth.user?.role === 'ADMIN' ? 'Administración' : 'Consulta' }}</div>
        <button class="btn ghost" type="button" @click="leave">Salir</button>
      </div>
    </aside>
    <main class="main">
      <div class="actions" style="margin-bottom: 0.6rem">
        <button class="btn ghost menu-btn" type="button" @click="menu = !menu">Menú</button>
      </div>
      <p v-if="status?.isStale" class="stale">
        Datos desactualizados.
        <span v-if="status.lastSuccessAt">Última sincronización correcta: {{ status.lastSuccessAt }}.</span>
        <span v-else>Todavía no hay una sincronización correcta.</span>
        <span v-if="status.lastError"> Error: {{ status.lastError }}</span>
      </p>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { onMounted, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';

interface SyncStatus {
  isStale: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
}

const auth = useAuthStore();
const router = useRouter();
const menu = ref(false);
const status = ref<SyncStatus | null>(null);

onMounted(async () => {
  try {
    status.value = await apiFetch<SyncStatus>('/v1/jira/sync/status');
  } catch {
    status.value = null;
  }
});

function leave() {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>
