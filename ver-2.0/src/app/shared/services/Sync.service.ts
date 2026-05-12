import { Injectable, signal } from '@angular/core';
import { DbService } from '../services/Db.service';
import { StoreService } from '../services/Store.service';
import { Toast } from '../models/Transaction';

export function requestNotificationPermission(): Promise<NotificationPermission | string> {
  if (!('Notification' in window)) return Promise.resolve('unsupported');
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function sendLocalNotification(title: string, body: string, icon = '/favicon.ico') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon, tag: 'valor-em-rede', silent: false }); } catch {}
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  private _isOnline = signal(navigator.onLine);
  private _syncing = signal(false);
  private _toast = signal<Toast | null>(null);

  readonly isOnline = this._isOnline.asReadonly();
  readonly syncing = this._syncing.asReadonly();
  readonly toast = this._toast.asReadonly();

  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private db: DbService, private store: StoreService) {
    window.addEventListener('online', () => {
      this._isOnline.set(true);
      if (this.store.pending().length > 0) this.syncPending();
    });
    window.addEventListener('offline', () => this._isOnline.set(false));
  }

  showToast(msg: string, type: Toast['type'] = 'success') {
    clearTimeout(this.toastTimer);
    this._toast.set({ msg, type });
    this.toastTimer = setTimeout(() => this._toast.set(null), 4000);
  }

  async syncPending() {
    const pending = this.store.pending();
    if (this._syncing() || pending.length === 0) return;
    this._syncing.set(true);
    try {
      await this.db.syncPendingTransactions(pending);
      this.store.setTransactions(prev =>
        prev.map(t => pending.some(p => p.id === t.id) ? { ...t, synced: true } : t)
      );
      this.store.setPending([]);
      localStorage.setItem('ver_last_sync', new Date().toISOString());
      this.showToast(`${pending.length} registro(s) sincronizado(s) com sucesso`, 'success');
      sendLocalNotification('Valor em Rede — Sincronizado ✓', `${pending.length} registro(s) enviado(s).`);
    } catch {
      this.showToast('Erro na sincronização. Tentando novamente...', 'error');
    } finally {
      this._syncing.set(false);
    }
  }
}