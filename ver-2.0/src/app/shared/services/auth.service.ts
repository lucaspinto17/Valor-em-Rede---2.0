import { Injectable, signal } from '@angular/core';
import { User } from '../models/Transaction';
import { DbService } from '../services/Db.service';
import { SupabaseService } from '../services/Supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(this.restoreUser());
  readonly user = this._user.asReadonly();

  constructor(private db: DbService, private sb: SupabaseService) {
    // Valida sessão Supabase em background
    if (this.sb.isEnabled) {
      this.sb.getSession().then(session => {
        if (!session) {
          this.clearSession();
        }
      });
    }
  }

  private restoreUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('ver_user') || 'null');
    } catch {
      return null;
    }
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { user, error } = await this.db.signIn(email, password);
    if (error) return { error };
    this.setUser(user);
    return { error: null };
  }

  async register(name: string, email: string, password: string): Promise<{ error: string | null }> {
    const { user, error } = await this.db.signUp(name, email, password);
    if (error) return { error };
    if (user) this.setUser(user);
    return { error: null };
  }

  setUser(user: User) {
    localStorage.setItem('ver_user', JSON.stringify(user));
    this._user.set(user);
  }

  async logout() {
    this.clearSession();
    if (this.sb.isEnabled) await this.sb.signOut();
  }

  private clearSession() {
    localStorage.removeItem('ver_user');
    localStorage.removeItem('ver_page');
    this._user.set(null);
  }

  get currentPage(): string {
    return localStorage.getItem('ver_page') || '';
  }

  setCurrentPage(page: string) {
    localStorage.setItem('ver_page', page);
  }
}