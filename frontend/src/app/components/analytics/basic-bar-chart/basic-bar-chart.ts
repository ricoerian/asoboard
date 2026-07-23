import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartData {
  label: string;
  value: number;
}

@Component({
  selector: 'app-basic-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full flex flex-col gap-4">
      @for (item of data; track item) {
        <div class="flex flex-col gap-1">
          <div class="flex justify-between items-end text-sm font-bold text-slate-600">
            <span class="truncate max-w-[70%]">{{ item.label }}</span>
            <span>{{ item.value | number }}</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-out"
              [ngClass]="colorClass"
              [style.width.%]="getPercentage(item.value)"
            ></div>
          </div>
        </div>
      }
      @if (data.length === 0) {
        <div class="text-center text-slate-400 py-4 font-bold text-sm">No data available</div>
      }
    </div>
  `,
})
export class BasicBarChartComponent implements OnChanges {
  @Input() data: ChartData[] = [];
  @Input() colorClass: string = 'bg-blue-500';

  maxVal: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.maxVal = Math.max(...this.data.map((d) => d.value), 1); // prevent div by zero
    }
  }

  getPercentage(value: number): number {
    return (value / this.maxVal) * 100;
  }
}
