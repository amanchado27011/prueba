import { apiFetch, getToken, setToken } from '@/api/http';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'VIEWER';
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken());
  const user = ref<PublicUser | null>(null);
  const error = ref<string | null>(null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isAuthenticated = computed(() => Boolean(token.value));

  function logout() {
    token.value = null;
    user.value = null;
    setToken(null);
  }

  async function refresh() {
    if (!token.value) return;
    const result = await apiFetch<{ user: PublicUser }>('/v1/auth/me');
    user.value = result.user;
  }

  async function login(email: string, password: string) {
    error.value = null;
    try {
      const result = await apiFetch<{ accessToken: string; user: PublicUser }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      token.value = result.accessToken;
      setToken(result.accessToken);
      user.value = result.user;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No se pudo entrar';
      throw cause;
    }
  }

  return { token, user, error, isAdmin, isAuthenticated, login, logout, refresh };
});
