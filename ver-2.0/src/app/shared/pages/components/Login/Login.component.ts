import { Component, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DbService } from '../../service/Db.service';
import { SupabaseService } from '../../service/Supabase.service';
import { User } from '../models/Transaction';

type Mode = 'login' | 'register';
type EmailStatus = null | 'checking' | 'ok' | 'invalid' | 'taken';

interface PwdStrength { score: number; label: string; color: string; }

const DEMO_USERS = [
  { email: 'membro@valorem.rede', password: '123456', role: 'member' as const, name: 'Maria Silva' },
  { email: 'gestor@valorem.rede', password: '123456', role: 'manager' as const, name: 'Carlos Gestor' },
];

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function getPasswordStrength(pwd: string): PwdStrength {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Muito fraca', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fraca', color: '#f59e0b' };
  if (score === 3) return { score, label: 'Média', color: '#eab308' };
  if (score === 4) return { score, label: 'Forte', color: '#22c55e' };
  return { score, label: 'Muito forte', color: '#10b981' };
}

const ATTEMPTS_KEY = 'ver_login_attempts';
const getAttempts = () => {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{"count":0,"until":0}'); }
  catch { return { count: 0, until: 0 }; }
};
const recordFailedAttempt = () => {
  const a = getAttempts();
  const count = a.count + 1;
  const until = count >= 5 ? Date.now() + 2 * 60 * 1000 : a.until;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count, until }));
  return { count, until };
};
const clearAttempts = () => localStorage.removeItem(ATTEMPTS_KEY);

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  @Output() loginSuccess = new EventEmitter<User>();

  mode: Mode = 'login';
  email = '';
  password = '';
  name = '';
  showPwd = false;
  error = '';
  loading = false;
  emailStatus: EmailStatus = null;
  pwdStrength: PwdStrength | null = null;
  blocked = getAttempts().until > Date.now();
  countdown = 0;

  private emailTimer?: ReturnType<typeof setTimeout>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private db: DbService,
    public sb: SupabaseService,
  ) {
    if (this.blocked) this.startCountdown();
  }

  get isSupabaseEnabled() { return this.sb.isEnabled; }

  setMode(m: Mode) {
    this.mode = m;
    this.error = '';
    this.emailStatus = null;
  }

  onEmailChange() {
    clearTimeout(this.emailTimer);
    if (!this.email) { this.emailStatus = null; return; }
    if (!isValidEmail(this.email)) { this.emailStatus = 'invalid'; return; }

    if (this.mode === 'register' && this.sb.isEnabled) {
      this.emailStatus = 'checking';
      this.emailTimer = setTimeout(async () => {
        if (!this.sb.supabase) return;
        const { data } = await this.sb.supabase
          .from('members')
          .select('email')
          .eq('email', this.email.trim())
          .maybeSingle();
        this.emailStatus = data ? 'taken' : 'ok';
      }, 500);
    } else {
      this.emailStatus = 'ok';
    }
  }

  onPasswordChange() {
    this.pwdStrength = this.mode === 'register' ? getPasswordStrength(this.password) : null;
  }

  get emailBorderStyle() {
    const borders: Record<string, string> = {
      ok: '2px solid #22c55e',
      taken: '2px solid #ef4444',
      invalid: '2px solid #f59e0b',
      checking: '2px solid #94a3b8',
    };
    return borders[this.emailStatus || ''] || '1px solid var(--border)';
  }

  strengthBars(i: number): string {
    return this.pwdStrength && i <= this.pwdStrength.score ? this.pwdStrength.color : '#e2e8f0';
  }

  fillDemo(type: 'member' | 'manager') {
    const u = DEMO_USERS.find(u => u.role === type);
    if (u) { this.email = u.email; this.password = u.password; this.name = u.name; }
  }

  async submit() {
    this.error = '';
    if (this.blocked) return;
    if (!this.email.trim() || !this.password) { this.error = 'Preencha e-mail e senha.'; return; }
    if (!isValidEmail(this.email)) { this.error = 'E-mail inválido.'; return; }

    if (this.mode === 'register') {
      if (!this.name.trim()) { this.error = 'Informe seu nome.'; return; }
      if (this.password.length < 6) { this.error = 'A senha deve ter no mínimo 6 caracteres.'; return; }
      if (this.emailStatus === 'taken') { this.error = 'Este e-mail já está cadastrado.'; return; }
    }

    this.loading = true;
    try {
      if (this.mode === 'login') {
        const { error } = await this.auth.login(this.email.trim(), this.password);
        if (error) {
          const { until } = recordFailedAttempt();
          if (until > Date.now()) { this.blocked = true; this.startCountdown(); }
          this.error = error;
          return;
        }
        clearAttempts();
        this.loginSuccess.emit(this.auth.user()!);
      } else {
        const { error } = await this.auth.register(this.name.trim(), this.email.trim(), this.password);
        if (error === 'EMAIL_JA_CADASTRADO') { this.emailStatus = 'taken'; this.error = 'E-mail já cadastrado.'; return; }
        if (error === 'CONFIRMAR_EMAIL') { this.error = '✉️ Confirme seu e-mail antes de entrar.'; this.mode = 'login'; return; }
        if (error) { this.error = error; return; }
        this.loginSuccess.emit(this.auth.user()!);
      }
    } finally {
      this.loading = false;
    }
  }

  private startCountdown() {
    clearInterval(this.countdownTimer);
    const tick = () => {
      const a = getAttempts();
      const secs = Math.ceil((a.until - Date.now()) / 1000);
      if (secs <= 0) { this.blocked = false; clearAttempts(); clearInterval(this.countdownTimer); }
      else this.countdown = secs;
    };
    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }
}