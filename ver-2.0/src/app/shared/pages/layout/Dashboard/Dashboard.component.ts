import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Totals, MemberStats } from '../../models/Transaction';
import { fmt } from '../../Utility/Format';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  @Input() totals?: Totals;
  @Input() categoryBreakdown: Record<string, number> = {};
  @Input() memberStats?: MemberStats;

  catColors = [
    '#059669',
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#ec4899',
    '#14b8a6',
  ];

  get categories() {
    return Object.entries(this.categoryBreakdown || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }

  fmtVal(v?: number) {
    return fmt(v ?? 0);
  }

  pct(val: number) {
    return this.totals?.out ? Math.round((val / this.totals.out) * 100) : 0;
  }
}
