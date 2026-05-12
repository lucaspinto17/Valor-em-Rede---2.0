import { Injectable } from '@angular/core';
import { Transaction } from '../models/Transaction';

const KEYS = {
  transactions: 'ver_transactions',
  members: 'ver_members',
  donations: 'ver_donations',
  payments: 'ver_payments',
  pending: 'ver_pending',
};

const parse = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, val: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

@Injectable({ providedIn: 'root' })
export class StorageService {
  getTransactions(): Transaction[] { return parse(KEYS.transactions, []); }
  saveTransactions(d: Transaction[]) { save(KEYS.transactions, d); }

  getMembers(): any[] { return parse(KEYS.members, []); }
  saveMembers(d: any[]) { save(KEYS.members, d); }

  getDonations(): Transaction[] { return parse(KEYS.donations, []); }
  saveDonations(d: Transaction[]) { save(KEYS.donations, d); }

  getPayments(): Transaction[] { return parse(KEYS.payments, []); }
  savePayments(d: Transaction[]) { save(KEYS.payments, d); }

  getPending(): Transaction[] { return parse(KEYS.pending, []); }
  savePending(d: Transaction[]) { save(KEYS.pending, d); }

  clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
}