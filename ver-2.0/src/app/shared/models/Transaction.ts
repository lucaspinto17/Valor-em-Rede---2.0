export type TransactionType = 'payment' | 'donation' | 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TransactionType;
  name?: string;
  memberName?: string;
  donorName?: string;
  desc?: string;
  description?: string;
  value: number;
  category?: string;
  date: string;
  status?: string;
  synced?: boolean;
  createdAt?: string;
  nfUrl?: string;
  receiptUrl?: string;
  anon?: boolean;
}

export interface Totals {
  in: number;
  out: number;
  balance: number;
  donations: number;
}

export interface MemberStat {
  name: string;
  total: number;
  count: number;
  lastDate: string;
}

export interface MemberStats {
  list: MemberStat[];
  total: number;
  paid: number;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'member' | 'manager';
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface Toast {
  msg: string;
  type: 'success' | 'info' | 'error' | 'syncing';
}