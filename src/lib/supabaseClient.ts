import { api } from './api';
import { uploadImage } from './upload';

const uploadedUrls = new Map<string, string>();

// Mock Supabase client that translates legacy Supabase queries into our new API calls
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { access_token: 'dummy' } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: (table: string) => {
    return {
      select: (cols?: string) => {
        return {
          like: async (col: string, val: string) => {
             try {
                const res = await api.get(`/api/kv?pattern=${encodeURIComponent(val)}`);
                return { data: res.data, error: null };
             } catch (e: any) {
                return { data: null, error: e };
             }
          },
          // Sync + lazy: supports .eq().single() / .eq().maybeSingle() chaining, and awaiting the result.
          eq: (col: string, val: string) => {
             const run = async () => {
                try {
                   const res = await api.get(`/api/kv/${encodeURIComponent(val)}`);
                   return { data: res === null || res === undefined ? null : { key: val, value: res }, error: null };
                } catch (e: any) {
                   return { data: null, error: e };
                }
             };
             return {
                single: async () => { const r = await run(); return r.error ? { data: null, error: r.error } : { data: r.data, error: null }; },
                maybeSingle: async () => { const r = await run(); return { data: r.data, error: null }; },
             };
          }
        };
      },
      insert: async (payload: {key: string, value: any}) => {
         try {
            await api.post(`/api/kv/${payload.key}`, payload.value);
            return { error: null };
         } catch(e: any) { return { error: e }; }
      },
      update: (payload: {value: any}) => {
         return {
            eq: async (col: string, val: string) => {
               try {
                  await api.post(`/api/kv/${val}`, payload.value);
                  return { error: null };
               } catch(e: any) { return { error: e }; }
            }
         };
      },
      delete: () => {
         return {
            eq: async (col: string, val: string) => {
               try {
                  await api.del(`/api/kv/${val}`);
                  return { error: null };
               } catch(e: any) { return { error: e }; }
            }
         };
      }
    };
  },
  storage: {
    from: (_bucket: string) => ({
      // Callers upload with a logical path and then ask for a URL by that path, so remember the mapping.
      createSignedUrl: async (path: string, _expiresIn?: number) => ({ data: { signedUrl: uploadedUrls.get(path) ?? path }, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: uploadedUrls.get(path) ?? path } }),
      upload: async (path: string, file: File, _options?: any) => {
        try {
          const url = await uploadImage(file);
          uploadedUrls.set(path, url);
          return { data: { path }, error: null };
        } catch (e: any) {
          return { data: null, error: e };
        }
      },
      list: async (_prefix?: string) => ({ data: [], error: null }),
      remove: async (_paths: string[]) => ({ error: null }),
    })
  }
};
