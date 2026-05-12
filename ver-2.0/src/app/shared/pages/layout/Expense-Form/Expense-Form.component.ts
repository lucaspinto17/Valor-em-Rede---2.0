import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transaction } from '../../core/models/transaction.model';
import { maskMoney, parseMasked, todayLocal } from '../../core/utils/format';

const CATEGORIES = ['Alimentação','Transporte','Aluguel','Materiais','Serviços','Eventos','Comunicação','Outros'];

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-form.component.html',
})
export class ExpenseFormComponent {
  @Output() add = new EventEmitter<Partial<Transaction>>();

  form = { desc: '', category: 'Outros', date: todayLocal(), name: '', nfUrl: '' };
  maskedValue = '';
  rawValue = 0;
  error = '';
  loading = false;
  categories = CATEGORIES;

  onValueInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.maskedValue = maskMoney(val);
    this.rawValue = parseMasked(this.maskedValue);
  }

  async submit() {
    this.error = '';
    if (!this.form.desc.trim()) { this.error = 'Informe a descrição.'; return; }
    if (!this.rawValue || this.rawValue <= 0) { this.error = 'Informe um valor válido.'; return; }

    this.loading = true;
    try {
      this.add.emit({
        type: 'expense',
        desc: this.form.desc.trim(),
        name: this.form.name.trim() || undefined,
        category: this.form.category,
        value: this.rawValue,
        date: this.form.date,
        nfUrl: this.form.nfUrl || undefined,
      });
      this.form = { desc: '', category: 'Outros', date: todayLocal(), name: '', nfUrl: '' };
      this.maskedValue = '';
      this.rawValue = 0;
    } finally {
      this.loading = false;
    }
  }
}