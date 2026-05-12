import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient | null = null;
  readonly isEnabled: boolean;

  constructor() {
    const url = environment.supabaseUrl;
    const key = environment.supabaseAnonKey;
    this.isEnabled = Boolean(url && key);

    if (this.isEnabled) {
      this.client = createClient(url, key, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        realtime: { params: { eventsPerSecond: 10 } },
      });

      // Ping a cada 4 dias
      const LAST_PING_KEY = 'ver_last_keepalive';
      const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
      const lastPing = parseInt(localStorage.getItem(LAST_PING_KEY) || '0', 10);
      if (Date.now() - lastPing > FOUR_DAYS_MS) {
        this.client.from('members').select('id').limit(1).then(() => {
          localStorage.setItem(LAST_PING_KEY, String(Date.now()));
        });
      }
    } else {
      console.warn('[Supabase] Variáveis não configuradas. Usando localStorage offline.');
    }
  }

  get supabase(): SupabaseClient | null {
    return this.client;
  }

  async getSession() {
    if (!this.client) return null;
    const { data: { session } } = await this.client.auth.getSession();
    return session;
  }

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
  }
}