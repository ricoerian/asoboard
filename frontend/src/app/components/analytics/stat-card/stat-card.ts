import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 hover:shadow-md"
    >
      <div
        class="w-12 h-12 rounded-full mb-4 flex items-center justify-center"
        [ngClass]="iconBgColor"
      >
        <i class="fa-solid" [ngClass]="iconClass" [class]="iconColor"></i>
      </div>
      <h3 class="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">{{ title }}</h3>
      <p class="text-4xl font-black text-slate-800">{{ value }}</p>
      @if (subtitle) {
        <p class="text-sm text-slate-400 mt-2">{{ subtitle }}</p>
      }
    </div>
  `,
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() subtitle?: string = '';
  @Input() iconClass: string = 'fa-chart-simple';
  @Input() iconBgColor: string = 'bg-blue-50';
  @Input() iconColor: string = 'text-blue-500';
}
