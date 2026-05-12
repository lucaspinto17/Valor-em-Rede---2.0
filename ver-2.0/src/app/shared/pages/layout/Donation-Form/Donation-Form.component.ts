import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transaction, User } from '../../core/models/transaction.model';
import { maskMoney, parseMasked, todayLocal } from '../../core/utils/format';

@Component({
  selector: 'app-donation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-form.component.html',
})
export class DonationFormComponent {
  @Input() user?: User;
  @Output() add = new EventEmitter<Partial<Transaction>>();

  form = { name: '', date: todayLocal(), desc: '' };
  maskedValue = '';
  rawValue = 0;
  anon = false;
  error = '';
  loading = false;

  onValueInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.maskedValue = maskMoney(val);
    this.rawValue = parseMasked(this.maskedValue);
  }

  async submit() {
    this.error = '';
    if (!this.anon && !this.form.name.trim()) { this.error = 'Informe o nome do doador.'; return; }
    if (!this.rawValue || this.rawValue <= 0) { this.error = 'Informe um valor válido.'; return; }

    this.loading = true;
    try {
      this.add.emit({
        type: 'donation',
        name: this.anon ? 'Anônimo' : this.form.name.trim(),
        value: this.rawValue,
        date: this.form.date,
        desc: this.form.desc,
        anon: this.anon,
      });
      this.form = { name: '', date: todayLocal(), desc: '' };
      this.maskedValue = '';
      this.rawValue = 0;
      this.anon = false;
    } finally {
      this.loading = false;
    }
  }
}