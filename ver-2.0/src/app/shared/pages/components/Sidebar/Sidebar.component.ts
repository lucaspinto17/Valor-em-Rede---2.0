import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, NavItem } from '../../core/models/transaction.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() user?: User | null;
  @Input() navItems: NavItem[] = [];
  @Input() activePage = '';
  @Output() navigate = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();
}