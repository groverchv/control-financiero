import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabase = createClient(env.supabase.url, env.supabase.anonKey);

export const checkAuth = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};
