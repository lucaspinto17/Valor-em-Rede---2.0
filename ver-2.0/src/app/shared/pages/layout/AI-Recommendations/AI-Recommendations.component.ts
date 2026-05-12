import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './AI-Recommendations.component.html',
})
export class AiRecommendationsComponent implements OnInit {
  recommendations = '';
  loading = false;
  error = '';

  constructor(private store: StoreService) {}

  ngOnInit() {}

  async fetchRec() {
    this.loading = true;
    this.error = '';
    this.recommendations = '';
    try {
      const totals = this.store.totals();
      const txCount = this.store.transactions().length;
      const cats = this.store.categoryBreakdown();
      const memberStats = this.store.memberStats();

      // Simula análise se não há Ollama disponível
      const prompt = `Analise estes dados financeiros de uma associação comunitária e dê recomendações práticas:
- Total recebido: R$ ${totals.in.toFixed(2)}
- Total gasto: R$ ${totals.out.toFixed(2)}
- Saldo atual: R$ ${totals.balance.toFixed(2)}
- Doações: R$ ${totals.donations.toFixed(2)}
- Total de transações: ${txCount}
- Membros ativos: ${memberStats.total}
- Membros em dia este mês: ${memberStats.paid}
- Categorias de gastos: ${JSON.stringify(cats)}

Dê 3-5 recomendações objetivas e práticas em português.`;

      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error('Ollama indisponível');
      const data = await res.json();
      this.recommendations = data.response || 'Sem resposta.';
    } catch {
      // Fallback: recomendações heurísticas
      this.recommendations = this.generateHeuristicRec();
    } finally {
      this.loading = false;
    }
  }

  private generateHeuristicRec(): string {
    const totals = this.store.totals();
    const memberStats = this.store.memberStats();
    const recs: string[] = [];

    if (totals.balance < 0)
      recs.push(
        'O saldo está negativo. Revise os gastos e considere campanhas de arrecadação.',
      );
    else if (totals.balance < totals.in * 0.1)
      recs.push(
        'A reserva financeira está baixa (menos de 10% das entradas). Crie um fundo de emergência.',
      );
    else
      recs.push(
        'O saldo está positivo. Considere investir o excedente ou criar uma reserva estratégica.',
      );

    if (memberStats.total > 0 && memberStats.paid < memberStats.total * 0.7)
      recs.push(
        `Apenas ${memberStats.paid} de ${memberStats.total} membros pagaram este mês. Envie lembretes de cobrança.`,
      );
    else if (memberStats.paid > 0)
      recs.push(
        `Boa adesão: ${memberStats.paid}/${memberStats.total} membros pagaram este mês.`,
      );

    if (totals.out > totals.in * 0.8)
      recs.push(
        'Os gastos representam mais de 80% das entradas. Analise onde é possível reduzir.',
      );

    if (totals.donations > 0)
      recs.push(
        `Doações correspondem a ${Math.round((totals.donations / totals.in) * 100)}% das entradas. Considere campanhas periódicas.`,
      );

    recs.push(
      'Mantenha registros atualizados e realize reuniões mensais de prestação de contas.',
    );

    return recs.join('\n\n');
  }
}
