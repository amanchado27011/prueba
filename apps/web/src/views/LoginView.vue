<template>
  <div class="login">
    <form class="panel" @submit.prevent="submit">
      <h1>Gestión de la demanda</h1>
      <p class="muted">Consulta de solo lectura sobre la demanda de Jira.</p>
      <label>Email <input v-model="email" type="email" autocomplete="username" required /></label>
      <label>Contraseña <input v-model="password" type="password" autocomplete="current-password" required /></label>
      <ErrorBanner :message="auth.error" />
      <button class="btn" type="submit" :disabled="loading">Entrar</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    await router.push('/');
  } catch {
    loading.value = false;
  }
}
</script>
