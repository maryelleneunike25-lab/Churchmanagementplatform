import { supabase } from './supabaseClient';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export const EdgeKV = {
  from(tableName: string) {
    if (tableName !== 'kv_store_561004a0') throw new Error('Unsupported table');
    return {
      select(columns: string) {
        return {
          like: async (col: string, prefix: string) => {
            const h = await getAuthHeader();
            const res = await fetch(`${API_URL}/kv/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...h },
              body: JSON.stringify({ prefix: prefix.replace('%', '') })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            return { data: json.data, error: null };
          },
          eq: async (col: string, key: string) => {
            const h = await getAuthHeader();
            const res = await fetch(`${API_URL}/kv/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...h },
              body: JSON.stringify({ key })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            return {
              maybeSingle: async () => ({ data: json.data, error: null }),
              single: async () => ({ data: json.data, error: null })
            };
          }
        };
      },
      update: (payload: { value: any }) => {
        return {
          eq: async (col: string, key: string) => {
            const h = await getAuthHeader();
            const res = await fetch(`${API_URL}/kv/write`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...h },
              body: JSON.stringify({ key, value: payload.value })
            });
            const json = await res.json();
            if (!res.ok) return { error: { message: json.error } };
            return { error: null };
          }
        };
      },
      insert: async (payload: { key: string, value: any }) => {
        const h = await getAuthHeader();
        const res = await fetch(`${API_URL}/kv/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...h },
          body: JSON.stringify({ key: payload.key, value: payload.value })
        });
        const json = await res.json();
        if (!res.ok) return { error: { message: json.error } };
        return { error: null };
      },
      delete: () => {
        return {
          eq: async (col: string, key: string) => {
            const h = await getAuthHeader();
            const res = await fetch(`${API_URL}/kv/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...h },
              body: JSON.stringify({ key })
            });
            const json = await res.json();
            if (!res.ok) return { error: { message: json.error } };
            return { error: null };
          }
        };
      }
    };
  }
};