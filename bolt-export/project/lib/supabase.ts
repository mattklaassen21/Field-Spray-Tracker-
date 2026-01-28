import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type OrderItem = {
  id: string;
  order_id: string;
  variety: string;
  seed_treatment: string | null;
  quantity: number;
  created_at: string;
};

export type Order = {
  id: string;
  operation: string;
  account_description: string;
  seed_type: string;
  variety: string;
  seed_treatment: string | null;
  notes: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_by: string;
  viewed_by: string | null;
  view_notified: boolean;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};
