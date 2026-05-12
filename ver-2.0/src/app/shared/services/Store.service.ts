import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { DbService } from '../services/Db.service';
import { StorageService } from '../services/Storage.service';
import { SupabaseService } from '../services/Supabase.service';
import { Transaction, Totals, MemberStats, MemberStat } from '../models/Transaction';
import { genId, todayLocal } from '../Utility/Format';

@Injectable({ providedIn: 'root' })
export class StoreService implements OnDestroy {
  private _transactions = signal<Transaction[]>(
    this.sb.isEnabled ? [] : this.migrateStorage()
  );
  private _pending = signal<Transaction[]>(this.storage.getPending());

  readonly transactions = this._transactions.asReadonly();
  readonly pending = this._pending.asReadonly();

  readonly totals = computed<Totals>(() => {
    const txs = this._transactions();
    const inVal = txs.filter(t => ['payment','donation','income'].includes(t.type))
      .reduce((a, b) => a + Number(b.value), 0);
    const outVal = txs.filter(t => t.type === 'expense')
      .reduce((a, b) => a + Number(b.value), 0);
    const donVal = txs.filter(t => t.type === 'donation')
      .reduce((a, b) => a + Number(b.value), 0);
    return { in: inVal, out: outVal, balance: inVal - outVal, donations: donVal };
  });

  readonly categoryBreakdown = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    this._transactions()
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Outros';
        map[cat] = (map[cat] || 0) + Number(t.value);
      });
    return map;
  });

  readonly memberStats = computed<MemberStats>(() => {
    const map: Record<string, MemberStat> = {};
    const incomeTxs = this._transactions().filter(t => t.type === 'income' || t.type === 'payment');
    incomeTxs.forEach(t => {
      const name = t.name || t.memberName || 'Desconhecido';
      if (!map[name]) map[name] = { name, total: 0, count: 0, lastDate: t.date };
      map[name].total += Number(t.value);
      map[name].count += 1;
      if (t.date > map[name].lastDate) map[name].lastDate = t.date;
    });
    const list = Object.values(map).sort((a, b) => b.total - a.total);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidThisMonth = new Set(
      incomeTxs
        .filter(t => (t.date || t.createdAt || '').slice(0, 7) === thisMonth)
        .map(t => t.name || t.memberName || 'Desconhecido')
    );

    return { list, total: list.length, paid: paidThisMonth.size };
  });

  private pollInterval?: ReturnType<typeof setInterval>;
  private unsubscribeRealtime?: () => void;

  constructor(
    private db: DbService,
    private storage: StorageService,
    private sb: SupabaseService,
  ) {
    if (this.sb.isEnabled) {
      this.loadFromDb();
      this.pollInterval = setInterval(() => this.loadFromDb(), 30000);
      window.addEventListener('focus', () => this.loadFromDb());
      window.addEventListener('online', () => this.loadFromDb());

      this.unsubscribeRealtime = this.db.subscribeTransactions((payload) => {
        if (payload.eventType === 'INSERT') {
          const novo = { ...payload.new, createdAt: payload.new.created_at };
          this._transactions.update(prev => {
            if (prev.some(t => t.id === novo.id)) return prev;
            const updated = [novo, ...prev];
            this.storage.saveTransactions(updated);
            return updated;
          });
        }
        if (payload.eventType === 'UPDATE') {
          this._transactions.update(prev => {
            const updated = prev.map(t =>
              t.id === payload.new.id ? { ...payload.new, createdAt: payload.new.created_at } : t
            );
            this.storage.saveTransactions(updated);
            return updated;
          });
        }
        if (payload.eventType === 'DELETE') {
          this._transactions.update(prev => {
            const updated = prev.filter(t => t.id !== payload.old.id);
            this.storage.saveTransactions(updated);
            return updated;
          });
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.unsubscribeRealtime?.();
  }

  private async loadFromDb() {
    const data = await this.db.fetchTransactions();
    if (data) this._transactions.set(data);
  }

  private migrateStorage(): Transaction[] {
    const txs = this.storage.getTransactions();
    const txIds = new Set(txs.map(t => t.id));
    const extras: Transaction[] = [];

    this.storage.getPayments().forEach(p => {
      if (!txIds.has(p.id)) extras.push({ ...p, type: 'payment', name: p.name || p.memberName || 'Membro' });
    });
    this.storage.getDonations().forEach(d => {
      if (!txIds.has(d.id)) extras.push({ ...d, type: 'donation', name: d.name || d.donorName || (d.anon ? 'Anônimo' : 'Doador') });
    });

    if (extras.length > 0) {
      const merged = [...extras, ...txs];
      this.storage.saveTransactions(merged);
      return merged;
    }
    return txs;
  }

  setTransactions(fn: Transaction[] | ((prev: Transaction[]) => Transaction[])) {
    this._transactions.update(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      this.storage.saveTransactions(next);
      return next;
    });
  }

  setPending(fn: Transaction[] | ((prev: Transaction[]) => Transaction[])) {
    this._pending.update(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      this.storage.savePending(next);
      return next;
    });
  }

  async addTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    const localId = genId();
    const full: Transaction = {
      ...tx as Transaction,
      id: localId,
      synced: false,
      createdAt: new Date().toISOString(),
    };
    this.setTransactions(prev => [full, ...prev]);
    if (!navigator.onLine) {
      this.setPending(prev => [...prev, full]);
      return full;
    }
    try {
      const saved = await this.db.insertTransaction(full);
      if (saved?.id && saved.id !== localId) {
        this.setTransactions(prev => prev.map(t => t.id === localId ? { ...saved, synced: true } : t));
      }
      return saved;
    } catch {
      this.setPending(prev => [...prev, { ...full, synced: false }]);
      return full;
    }
  }

  async addDonation(don: Partial<Transaction>): Promise<Transaction> {
    return this.addTransaction({
      ...don,
      type: 'donation',
      name: (don as any).name || (don as any).donorName || ((don as any).anon ? 'Anônimo' : 'Doador'),
    });
  }

  async addPayment(pay: Partial<Transaction>): Promise<Transaction> {
    return this.addTransaction({
      ...pay,
      type: 'payment',
      status: 'confirmed',
      name: (pay as any).name || (pay as any).memberName || 'Membro',
    });
  }

  async addExpense(exp: Partial<Transaction>): Promise<Transaction> {
    return this.addTransaction({ ...exp, type: 'expense' });
  }

  clearAll() {
    this._transactions.set([]);
    this._pending.set([]);
    this.storage.clearAll();
  }
}