import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from './core/services/auth.service';
import { StoreService } from './core/services/store.service';
import { SyncService, requestNotificationPermission, sendLocalNotification } from './core/services/sync.service';
import { User, NavItem } from './core/models/transaction.model';

import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PaymentFormComponent } from './features/payment/payment-form.component';
import { DonationFormComponent } from './features/donation/donation-form.component';
import { ExpenseFormComponent } from './features/expense/expense-form.component';
import { HistoryComponent } from './features/history/history.component';
import { TransparencyComponent } from './features/transparency/transparency.component';
import { AiRecommendationsComponent } from './features/ai-recommendations/ai-recommendations.component';
import { ExportComponent } from './features/export/export.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { SyncToastComponent } from './shared/components/sync-toast.component';

const MEMBER_NAV: NavItem[] = [
  { id: 'payment',      label: 'Pagar',        icon: '💳' },
  { id: 'donation',     label: 'Doação',        icon: '❤️' },
  { id: 'history',      label: 'Histórico',     icon: '📋' },
  { id: 'transparency', label: 'Transparência', icon: '👁️' },
  { id: 'expenses',     label: 'Gastos',        icon: '🧾' },
];

const MANAGER_NAV: NavItem[] = [
  { id: 'dashboard',    label: 'Painel',        icon: '📊' },
  { id: 'expense',      label: 'Despesas',      icon: '🧾' },
  { id: 'ai',           label: 'IA',            icon: '🤖' },
  { id: 'export',       label: 'Exportar',      icon: '📤' },
  { id: 'transparency', label: 'Transparência', icon: '👁️' },
  { id: 'history',      label: 'Histórico',     icon: '📋' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LoginComponent,
    DashboardComponent,
    PaymentFormComponent,
    DonationFormComponent,
    ExpenseFormComponent,
    HistoryComponent,
    TransparencyComponent,
    AiRecommendationsComponent,
    ExportComponent,
    SidebarComponent,
    HeaderComponent,
    SyncToastComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private _page = signal<string>('');

  get user() { return this.auth.user(); }
  get transactions() { return this.store.transactions(); }
  get totals() { return this.store.totals(); }
  get categoryBreakdown() { return this.store.categoryBreakdown(); }
  get memberStats() { return this.store.memberStats(); }
  get pending() { return this.store.pending(); }
  get isOnline() { return this.sync.isOnline(); }
  get syncing() { return this.sync.syncing(); }
  get toast() { return this.sync.toast(); }

  get navItems(): NavItem[] {
    return this.user?.role === 'manager' ? MANAGER_NAV : MEMBER_NAV;
  }

  get activePage(): string {
    return this._page() || this.navItems[0]?.id || '';
  }

  constructor(
    public auth: AuthService,
    public store: StoreService,
    public sync: SyncService,
  ) {}

  ngOnInit() {
    const saved = this.auth.currentPage;
    if (saved) this._page.set(saved);
  }

  navigateTo(id: string) {
    this._page.set(id);
    this.auth.setCurrentPage(id);
  }

  onLoginSuccess(user: User) {
    const defaultPage = user.role === 'manager' ? 'dashboard' : 'payment';
    this._page.set(defaultPage);
    this.auth.setCurrentPage(defaultPage);
    requestNotificationPermission();
    setTimeout(() => {
      sendLocalNotification(`Olá, ${user.name}! 👋`, user.role === 'manager'
        ? 'Painel do gestor carregado.' : 'Acesso liberado.');
    }, 1500);
  }

  async onLogout() {
    await this.auth.logout();
    this._page.set('');
  }

  async onAdd(rec: any) {
    if (rec.type === 'payment') await this.store.addPayment(rec);
    else if (rec.type === 'donation') await this.store.addDonation(rec);
    else await this.store.addExpense(rec);

    if (!this.isOnline) {
      this.sync.showToast('Salvo localmente. Será sincronizado quando a internet voltar.', 'info');
    }
  }

  onSyncNow() { this.sync.syncPending(); }
}