import { Component, Input, OnInit, inject } from '@angular/core';

import { Api } from '../../../services/api';
import { StudentInsights } from '../../../models/types';
import { BasicBarChartComponent, ChartData } from '../basic-bar-chart/basic-bar-chart';
import { StatCardComponent } from '../stat-card/stat-card';

@Component({
  selector: 'app-student-insights',
  standalone: true,
  imports: [BasicBarChartComponent, StatCardComponent],
  template: `
    @if (loading) {
      <div class="flex justify-center p-8">
        <div class="animate-spin text-blue-500 text-3xl">
          <i class="fa-solid fa-circle-notch"></i>
        </div>
      </div>
    }

    @if (error) {
      <div
        class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold text-center"
      >
        <i class="fa-solid fa-triangle-exclamation mr-2"></i> {{ error }}
      </div>
    }

    @if (insights && !loading) {
      <div class="flex flex-col gap-6">
        <!-- Stats Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <app-stat-card
            title="Current Level"
            [value]="insights.level"
            subtitle="Based on total XP"
            iconClass="fa-star"
            iconBgColor="bg-yellow-50"
            iconColor="text-yellow-500"
          >
          </app-stat-card>
          <app-stat-card
            title="Total Points"
            [value]="insights.total_points"
            subtitle="XP earned so far"
            iconClass="fa-bolt"
            iconBgColor="bg-purple-50"
            iconColor="text-purple-500"
          >
          </app-stat-card>
        </div>
        <!-- Activity Heatmap / Trend -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 class="text-lg font-black text-slate-800 mb-4 flex items-center">
            <i class="fa-solid fa-chart-line text-blue-500 mr-2"></i> Recent Activity Trend
          </h3>
          <app-basic-bar-chart [data]="activityChartData" colorClass="bg-blue-400">
          </app-basic-bar-chart>
        </div>
        <!-- Recent Achievements -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 class="text-lg font-black text-slate-800 mb-4 flex items-center">
            <i class="fa-solid fa-trophy text-yellow-500 mr-2"></i> Recent Achievements
          </h3>
          @if (insights.recent_achievements.length === 0) {
            <div class="text-slate-400 font-bold text-sm text-center py-4">
              No achievements unlocked yet.
            </div>
          }
          @if (insights.recent_achievements.length > 0) {
            <div class="flex flex-col gap-3">
              @for (ach of insights.recent_achievements; track ach) {
                <div class="flex items-center bg-slate-50 p-3 rounded-xl">
                  <div
                    class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-3"
                  >
                    <i class="fa-solid fa-medal text-yellow-600"></i>
                  </div>
                  <div>
                    <div class="font-bold text-slate-800">{{ ach.name }}</div>
                    <div class="text-xs text-slate-500 font-bold">{{ ach.date }}</div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class StudentInsightsComponent implements OnInit {
  @Input() studentId!: number;

  private api = inject(Api);
  insights: StudentInsights | null = null;
  loading = true;
  error = '';

  activityChartData: ChartData[] = [];

  ngOnInit() {
    this.api.getStudentInsights(this.studentId).subscribe({
      next: (data) => {
        this.insights = data;
        // Transform activity history for chart
        this.activityChartData = data.activity_history.map(
          (item: { date: string; session: string; interactions: number }) => ({
            label: `${item.date} - ${item.session}`,
            value: item.interactions,
          }),
        );
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load student insights. Ensure you have permission.';
        this.loading = false;
      },
    });
  }
}
