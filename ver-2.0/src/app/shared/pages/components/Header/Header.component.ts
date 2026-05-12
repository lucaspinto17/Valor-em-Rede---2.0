import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../core/models/transaction.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Input() user?: User | null;
  @Input() isOnline = true;
  @Input() pendingCount = 0;
  @Input() syncing = false;
  @Output() logout = new EventEmitter<void>();
  @Output() syncNow = new EventEmitter<void>();
}