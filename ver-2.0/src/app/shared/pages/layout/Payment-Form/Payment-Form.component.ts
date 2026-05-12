import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transaction, User } from '../../core/models/transaction.model';
import {
  maskMoney,
  parseMasked,
  todayLocal,
  fmt,
} from '../../core/utils/format';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-form.component.html',
})
export class PaymentFormComponent {
  @Input() user?: User;
  @Input() transactions: Transaction[] = [];
  @Output() add = new EventEmitter<Partial<Transaction>>();
  @Output() showReceipt = new EventEmitter<Transaction>();

  form = { name: '', date: todayLocal(), desc: '', reference: '' };
  maskedValue = '';
  rawValue = 0;
  error = '';
  loading = false;

  get memberPayments() {
    if (!this.form.name.trim()) return [];
    const name = this.form.name.trim().toLowerCase();
    return this.transactions
      .filter(
        (t) =>
          t.type === 'payment' && (t.name || '').toLowerCase().includes(name),
      )
      .slice(0, 5);
  }

  onValueInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.maskedValue = maskMoney(val);
    this.rawValue = parseMasked(this.maskedValue);
  }

  fmtVal(v?: number) {
    return fmt(v ?? 0);
  }

  async submit() {
    this.error = '';
    if (!this.form.name.trim()) {
      this.error = 'Informe o nome do membro.';
      return;
    }
    if (!this.rawValue || this.rawValue <= 0) {
      this.error = 'Informe um valor válido.';
      return;
    }

    this.loading = true;
    try {
      const tx: Partial<Transaction> = {
        type: 'payment',
        name: this.form.name.trim(),
        value: this.rawValue,
        date: this.form.date,
        desc: this.form.desc,
        category: this.form.reference || 'Mensalidade',
        status: 'confirmed',
      };
      this.add.emit(tx);
      this.form = { name: '', date: todayLocal(), desc: '', reference: '' };
      this.maskedValue = '';
      this.rawValue = 0;
    } finally {
      this.loading = false;
    }
  }
}
