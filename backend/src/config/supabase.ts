import { createClient } from '@supabase/supabase-js';
import { config } from './index';

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
