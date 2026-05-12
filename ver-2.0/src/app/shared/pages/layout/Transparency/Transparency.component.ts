import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction, Totals } from '../../core/models/transaction.model';
import { fmt, fmtDateShort } from '../../core/utils/format';

@Component({
  selector: 'app-transparency',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transparency.component.html',
})
export class TransparencyComponent {
  @Input() transactions: Transaction[] = [];
  @Input() totals?: Totals;
  @Input() categoryBreakdown: Record<string, number> = {};
  @Input() expensesOnly = false;

  colors = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  get expenses() {
    return this.transactions.filter((t) => t.type === 'expense');
  }

  get categories() {
    return Object.entries(this.categoryBreakdown || {}).sort(
      (a, b) => b[1] - a[1],
    );
  }

  fmtVal(v?: number) {
    return fmt(v ?? 0);
  }
  fmtD(d?: string) {
    return d ? fmtDateShort(d) : '—';
  }
  pct(val: number) {
    return this.totals?.out ? Math.round((val / this.totals.out) * 100) : 0;
  }
}
