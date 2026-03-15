import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://omcmnbtkvitrgjqstrrl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY21uYnRrdml0cmdqcXN0cnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjcwOTAsImV4cCI6MjA4OTEwMzA5MH0.ELTdqnfpwCEymHhC20stpyA3258-Umk87DP9j_vPW7M";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Supabase credentials missing!");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});