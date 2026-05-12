import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast } from '../../core/models/transaction.model';

@Component({
  selector: 'app-sync-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-toast.component.html',
})
export class SyncToastComponent {
  @Input() toast?: Toast | null;

  get bgColor() {
    const colors: Record<string, string> = {
      success: '#059669',
      error: '#ef4444',
      info: '#3b82f6',
      syncing: '#6366f1',
    };
    return colors[this.toast?.type || ''] || '#059669';
  }
}