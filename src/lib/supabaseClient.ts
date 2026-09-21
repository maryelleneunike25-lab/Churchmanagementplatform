import { api } from './api';

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
             const prefix = val.replace('%', '');
             try {
                const res = await api.get(`/api/kv?prefix=${encodeURIComponent(prefix)}`);
                return { data: res.data, error: null };
             } catch (e: any) {
                return { data: null, error: e };
             }
          },
          eq: async (col: string, val: string) => {
             try {
                const res = await api.get(`/api/kv/${val}`);
                // Mock Supabase's format
                const row = { key: val, value: res };
                return { 
                   single: async () => ({ data: row, error: null }),
                   maybeSingle: async () => ({ data: res ? row : null, error: null })
                };
             } catch(e: any) {
                return {
                   single: async () => ({ data: null, error: e }),
                   maybeSingle: async () => ({ data: null, error: null })
                };
             }
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
    from: (bucket: string) => ({
      createSignedUrl: async (path: string, expiresIn?: number) => {
         // Vercel Blob URLs are public, but we don't know the exact domain prefix here.
         // However, the upload endpoint returns the full URL. If we only have the path (e.g. from DB),
         // we should just return the path assuming it IS the full URL now.
         // In the new system, we save the full Vercel Blob URL to the database!
         return { data: { signedUrl: path }, error: null };
      },
      upload: async (path: string, file: File, options?: any) => {
         try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/api/upload', formData);
            // Return the full URL so the frontend saves it directly to DB
            return { data: { path: res.url }, error: null };
         } catch(e: any) {
            return { error: e };
         }
      },
      remove: async (paths: string[]) => {
         // Not fully implemented on backend, but mocked to prevent crashes
         return { error: null };
      }
    })
  }
};
