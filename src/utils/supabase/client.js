import { createBrowserClient } from "@supabase/ssr";

// En Vite se usa import.meta.env, en Next.js se usa process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
