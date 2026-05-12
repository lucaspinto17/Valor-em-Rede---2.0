import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/Supabase.service';
import { StorageService } from '../services/Storage.service';
import { Transaction } from '../models/Transaction';

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const toLocal = (row: any): Transaction => ({
  ...row,
  createdAt: row.created_at || row.createdAt,
  memberName: row.name,
});

const toRow = (obj: Transaction) => ({
  ...(obj.id && isValidUUID(obj.id) ? { id: obj.id } : {}),
  type: obj.type,
  name: obj.name || obj.memberName || obj.donorName || null,
  description: obj.desc || obj.description || null,
  value: Number(obj.value) || 0,
  category: obj.category || null,
  date: obj.date || new Date().toISOString().slice(0, 10),
  status: obj.status || 'confirmed',
  synced: true,
  nf_url: obj.nfUrl || null,
  receipt_url: obj.receiptUrl || null,
  created_at: obj.createdAt || new Date().toISOString(),
});

@Injectable({ providedIn: 'root' })
export class DbService {
  constructor(private sb: SupabaseService, private storage: StorageService) {}

  async fetchTransactions(): Promise<Transaction[]> {
    if (!this.sb.isEnabled || !this.sb.supabase) return this.storage.getTransactions();

    const { data, error } = await this.sb.supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] fetchTransactions:', error.message);
      return this.storage.getTransactions();
    }

    const mapped = data.map(toLocal);
    this.storage.saveTransactions(mapped);
    return mapped;
  }

  async insertTransaction(tx: Transaction): Promise<Transaction> {
    if (!this.sb.isEnabled || !this.sb.supabase) {
      const current = this.storage.getTransactions();
      this.storage.saveTransactions([tx, ...current]);
      return tx;
    }

    const { data, error } = await this.sb.supabase
      .from('transactions')
      .insert([toRow(tx)])
      .select()
      .single();

    if (error) {
      console.error('[DB] insertTransaction:', error.message);
      const current = this.storage.getTransactions();
      this.storage.saveTransactions([{ ...tx, synced: false }, ...current]);
      return { ...tx, synced: false };
    }

    const saved = toLocal(data);
    this.storage.saveTransactions([saved, ...this.storage.getTransactions()]);
    return saved;
  }

  async fetchMembers(): Promise<any[]> {
    if (!this.sb.isEnabled || !this.sb.supabase) return this.storage.getMembers();

    const { data, error } = await this.sb.supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return this.storage.getMembers();
    this.storage.saveMembers(data);
    return data;
  }

  async insertMember(member: any): Promise<any> {
    if (!this.sb.isEnabled || !this.sb.supabase) {
      const current = this.storage.getMembers();
      this.storage.saveMembers([member, ...current]);
      return member;
    }

    const { data, error } = await this.sb.supabase
      .from('members')
      .insert([member])
      .select()
      .single();

    if (error) return member;
    return data;
  }

  async syncPendingTransactions(pending: Transaction[]): Promise<void> {
    if (!this.sb.isEnabled || !this.sb.supabase) return;

    for (const tx of pending) {
      await this.insertTransaction(tx);
    }
  }

  async signIn(email: string, password: string): Promise<{ user: any; error: string | null }> {
    if (!this.sb.isEnabled || !this.sb.supabase) {
      return { user: { name: email.split('@')[0], email, role: 'member' }, error: null };
    }

    const { data, error } = await this.sb.supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: 'E-mail ou senha incorretos.' };

    const { data: profile } = await this.sb.supabase
      .from('members')
      .select('name, role')
      .eq('email', email)
      .maybeSingle();

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email?.split('@')[0] || 'Usuário',
        role: profile?.role || 'member',
      },
      error: null,
    };
  }

  async signUp(name: string, email: string, password: string): Promise<{ user: any; error: string | null }> {
    if (!this.sb.isEnabled || !this.sb.supabase) {
      return { user: { name, email, role: 'member' }, error: null };
    }

    const { data, error } = await this.sb.supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message.includes('already registered')) return { user: null, error: 'EMAIL_JA_CADASTRADO' };
      return { user: null, error: error.message };
    }

    if (data.user && !data.session) return { user: null, error: 'CONFIRMAR_EMAIL' };

    return {
      user: { id: data.user?.id, email, name, role: 'member' },
      error: null,
    };
  }

  subscribeTransactions(callback: (payload: any) => void): () => void {
    if (!this.sb.isEnabled || !this.sb.supabase) return () => {};

    const channel = this.sb.supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, callback)
      .subscribe();

    return () => { this.sb.supabase!.removeChannel(channel); };
  }
}