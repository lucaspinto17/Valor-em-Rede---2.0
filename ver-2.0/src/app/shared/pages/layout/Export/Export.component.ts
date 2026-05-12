import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { fmt, fmtDateShort } from '../../core/utils/format';
import { Transaction } from '../../core/models/transaction.model';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './export.component.html',
})
export class ExportComponent {
  copySuccess = false;

  constructor(private store: StoreService) {}

  exportCSV() {
    const txs = this.store.transactions();
    const header = 'ID,Tipo,Nome,Descrição,Valor,Categoria,Data,Status\n';
    const rows = txs.map(t => [
      t.id, t.type, t.name || '', t.desc || t.description || '',
      t.value, t.category || '', t.date || '', t.status || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valor-em-rede-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportSummary() {
    const totals = this.store.totals();
    const ms = this.store.memberStats();
    const cats = this.store.categoryBreakdown();

    const text = [
      '=== VALOR EM REDE — RESUMO FINANCEIRO ===',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      '',
      `Total recebido:  ${fmt(totals.in)}`,
      `Total gasto:     ${fmt(totals.out)}`,
      `Saldo atual:     ${fmt(totals.balance)}`,
      `Doações:         ${fmt(totals.donations)}`,
      '',
      `Membros ativos:  ${ms.total}`,
      `Em dia este mês: ${ms.paid}`,
      '',
      '--- Gastos por categoria ---',
      ...Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c}: ${fmt(v)}`),
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess = true;
      setTimeout(() => this.copySuccess = false, 3000);
    });
  }
}