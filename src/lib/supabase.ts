import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function checkSupabaseStatus() {
  try {
    // Verifica la conexión usando getSession (no requiere tablas)
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { online: false, message: error.message };
    }
    return { online: true, message: 'Supabase conectado' };
  } catch (err: any) {
    return { online: false, message: err.message || 'Error de conexión' };
  }
}
