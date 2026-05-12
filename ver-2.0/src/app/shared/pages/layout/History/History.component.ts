import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transaction } from '../../core/models/transaction.model';
import { fmt, fmtDate } from '../../core/utils/format';

const TYPE_LABELS: Record<string, string> = {
  payment: '💳 Pagamento',
  donation: '❤️ Doação',
  expense: '🧾 Despesa',
  income: '💰 Entrada',
};

const TYPE_COLORS: Record<string, string> = {
  payment: '#059669',
  donation: '#ec4899',
  expense: '#ef4444',
  income: '#3b82f6',
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent {
  @Input() transactions: Transaction[] = [];
  @Output() showReceipt = new EventEmitter<Transaction>();

  search = '';
  typeFilter = '';

  get filtered() {
    return this.transactions.filter((tx) => {
      const matchType = !this.typeFilter || tx.type === this.typeFilter;
      const q = this.search.toLowerCase();
      const matchSearch =
        !q ||
        [tx.name, tx.desc, tx.category, tx.date].some((f) =>
          (f || '').toLowerCase().includes(q),
        );
      return matchType && matchSearch;
    });
  }

  fmtVal(v?: number) {
    return fmt(v ?? 0);
  }
  fmtD(d?: string) {
    return d ? fmtDate(d) : '—';
  }
  typeLabel(t: string) {
    return TYPE_LABELS[t] || t;
  }
  typeColor(t: string) {
    return TYPE_COLORS[t] || '#64748b';
  }
  typeEmoji(t: string) {
    return TYPE_LABELS[t]?.split(' ')[0] || '📋';
  }
}
