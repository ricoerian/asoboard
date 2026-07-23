/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { StudentDiary } from '../../models/types';

interface DiaryGroup {
  label: string;
  diaries: StudentDiary[];
  thumbnailUrls: Map<number, string>;
}

@Component({
  selector: 'app-student-diary',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './student-diary.html',
})
export class StudentDiaryComponent implements OnInit {
  private apiService = inject(Api);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  allDiaries: StudentDiary[] = [];
  isLoading = true;

  viewMode: 'grid' | 'timeline' = 'grid';
  isFilterOpen = false;

  searchTerm = '';
  sortOption: 'newest' | 'oldest' | 'title-asc' | 'title-desc' = 'newest';
  dateFrom: string = '';
  dateTo: string = '';

  thumbnailCache = new Map<number, string>();

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const studentId = params['student_id'] ? Number(params['student_id']) : undefined;
      this.loadDiaries(studentId);
    });
  }

  loadDiaries(studentId?: number) {
    this.isLoading = true;
    this.apiService.getStudentDiaries(studentId).subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        if (Array.isArray(parsedData)) {
          this.allDiaries = parsedData;
        } else if (parsedData && typeof parsedData === 'object') {
          this.allDiaries = parsedData.results || parsedData.data || [parsedData];
        }
        this.generateThumbnails();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load diaries', err);
        this.isLoading = false;
        this.notificationService.error('Failed to load diaries');
        this.cdr.detectChanges();
      },
    });
  }

  toggleView() {
    this.viewMode = this.viewMode === 'grid' ? 'timeline' : 'grid';
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  get filteredDiaries(): StudentDiary[] {
    let result = [...this.allDiaries];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(term));
    }

    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      result = result.filter((d) => new Date(d.created_at || '') >= fromDate);
    }
    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((d) => new Date(d.created_at || '') <= toDate);
    }

    switch (this.sortOption) {
      case 'newest':
        result.sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime(),
        );
        break;
      case 'oldest':
        result.sort(
          (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime(),
        );
        break;
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return result;
  }

  get groupedDiaries(): DiaryGroup[] {
    const groups = new Map<string, StudentDiary[]>();

    this.filteredDiaries.forEach((diary) => {
      if (!diary.created_at) return;
      const date = new Date(diary.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(diary);
    });

    return Array.from(groups.entries())
      .map(([key, diaries]) => {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month, 1);
        return {
          label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
          diaries,
          thumbnailUrls: this.thumbnailCache,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.label);
        const dateB = new Date(b.label);
        return dateB.getTime() - dateA.getTime();
      });
  }

  generateThumbnails() {
    this.allDiaries.forEach((diary) => {
      if (this.thumbnailCache.has(diary.id)) return;

      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 150);

      if (diary.canvas_events && diary.canvas_events.length > 0) {
        const firstDrawingEvent = diary.canvas_events.find(
          (e) => e.type !== 'clear' && (e.type === 'line' || e.type === 'path' || e.stroke),
        );

        if (firstDrawingEvent) {
          this.drawThumbnailEvent(ctx, firstDrawingEvent);
        } else {
          this.drawTitleInitial(ctx, diary.title);
        }
      } else {
        this.drawTitleInitial(ctx, diary.title);
      }

      const dataUrl = canvas.toDataURL('image/png');
      this.thumbnailCache.set(diary.id, dataUrl);
    });
  }

  private drawThumbnailEvent(ctx: CanvasRenderingContext2D, event: any) {
    ctx.strokeStyle = event.stroke || '#000000';
    ctx.lineWidth = Math.min(event.strokeWidth || 2, 8);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (event.points && event.points.length >= 4) {
      const scaleX = 200 / event.points[2];
      const scaleY = 150 / event.points[3];

      ctx.beginPath();
      ctx.moveTo(event.points[0] * scaleX, event.points[1] * scaleY);
      for (let i = 2; i < event.points.length; i += 2) {
        ctx.lineTo(event.points[i] * scaleX, event.points[i + 1] * scaleY);
      }
      ctx.stroke();
    } else if (event.pathData) {
      const path = new Path2D(event.pathData);
      ctx.scale(200 / 800, 150 / 600);
      ctx.stroke(path);
    } else {
      ctx.fillStyle = event.stroke || '#000000';
      ctx.fillRect(60, 40, 80, 70);
    }
  }

  private drawTitleInitial(ctx: CanvasRenderingContext2D, title: string) {
    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = title.charAt(0).toUpperCase();
    ctx.fillText(initial, 100, 75);
  }

  trackByDiaryId(index: number, diary: StudentDiary) {
    return diary.id;
  }

  trackByGroupLabel(index: number, group: DiaryGroup) {
    return group.label;
  }

  goToDiary(diaryId: number) {
    this.route.queryParams
      .subscribe((params) => {
        const queryParams: Record<string, string> = {};
        if (params['student_id']) {
          queryParams['student_id'] = params['student_id'];
        }
        this.router.navigate(['/diary', diaryId], { queryParams });
      })
      .unsubscribe();
  }

  createNewDiary() {
    const title = prompt('Enter title for new diary:');
    if (!title) return;

    this.apiService.createStudentDiary({ title, canvas_events: [] }).subscribe({
      next: (diary: StudentDiary) => {
        this.allDiaries.unshift(diary);
        this.generateThumbnails();
        this.notificationService.success('Diary created!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to create diary', err);
        this.notificationService.error('Failed to create diary');
      },
    });
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getEventCount(diary: StudentDiary): number {
    return diary.canvas_events?.length || 0;
  }

  getRelativeTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  clearFilters() {
    this.searchTerm = '';
    this.sortOption = 'newest';
    this.dateFrom = '';
    this.dateTo = '';
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.sortOption !== 'newest' ||
      this.dateFrom !== '' ||
      this.dateTo !== ''
    );
  }
}
