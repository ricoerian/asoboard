import { TranslatePipe } from '@ngx-translate/core';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Course, User, Session, Enrollment } from '../../models/types';
import { ModalComponent } from '../shared/modal/modal';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ModalComponent, TranslatePipe],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class CourseDetail implements OnInit {
  private apiService = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  course: Course | null = null;
  currentUser: User | null = null;
  isLoading = true;
  error = '';

  enrolledStudents: Enrollment[] = [];
  studentEnrollment: Enrollment | null = null;
  isEnrolling = false;

  showCreateSessionModal = false;
  sessionForm: FormGroup;
  selectedAudioFile: File | null = null;

  showDeleteCourseConfirm = false;
  showDeleteSessionConfirm = false;
  sessionToDeleteId: number | null = null;

  constructor() {
    this.sessionForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      mode: ['freedom', [Validators.required]],
      sessionType: ['recorded', [Validators.required]],
      gameType: ['puzzle'],
    });
  }

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        const parsedUser = typeof user === 'string' ? JSON.parse(user as string) : user;
        this.currentUser = parsedUser;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUser = null;
        this.cdr.detectChanges();
      },
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getCourse(id).subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        this.course = parsedData.data || parsedData;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.loadEnrollments();
        if (this.currentUser?.role === 'mentor' || this.currentUser?.role === 'staff') {
          this.loadStudentProgress();
        }
      },
      error: () => {
        this.error = 'Course not found.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  activeTab: 'sessions' | 'progress' = 'sessions';
  studentProgressList: {
    student_id: number;
    username: string;
    first_name: string;
    last_name: string;
    sessions_completed: number;
    total_sessions: number;
    completion_rate: number;
    games_played: number;
    total_games: number;
    accuracy_rate: number;
    last_active: string | null;
  }[] = [];

  loadStudentProgress() {
    if (!this.course) return;
    this.apiService.getCourseStudentProgress(this.course.id).subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        this.studentProgressList = parsedData.data || parsedData;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  deleteCourse() {
    this.showDeleteCourseConfirm = true;
  }

  closeDeleteCourseConfirm() {
    this.showDeleteCourseConfirm = false;
  }

  confirmDeleteCourse() {
    if (!this.course) return;
    this.apiService.deleteCourse(this.course.id).subscribe({
      next: () => {
        this.notificationService.success('Course deleted. Poof! 🪄');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.notificationService.error('Failed to delete course.'),
    });
  }

  openCreateSession() {
    this.sessionForm.reset();
    this.selectedAudioFile = null;
    this.showCreateSessionModal = true;
  }

  closeCreateSession() {
    this.showCreateSessionModal = false;
  }

  onAudioFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedAudioFile = input.files[0];
    }
  }

  submitCreateSession() {
    if (this.sessionForm.invalid || !this.course) return;

    const payload: {
      title: string;
      course: number;
      mode: string;
      session_type: 'recorded' | 'live';
      game_type?: string;
      audio_file?: File;
    } = {
      title: this.sessionForm.value.title,
      course: this.course.id,
      mode: this.sessionForm.value.mode,
      session_type: this.sessionForm.value.sessionType,
    };
    if (this.sessionForm.value.mode === 'game') {
      payload.game_type = this.sessionForm.value.gameType;
    }
    if (this.selectedAudioFile) {
      payload.audio_file = this.selectedAudioFile;
    }

    this.apiService.createSession(payload).subscribe({
      next: (session: Session) => {
        if (this.course) {
          this.course.sessions = [...(this.course.sessions || []), session];
        }
        this.closeCreateSession();
        this.notificationService.success('Session created successfully!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Failed to create session.');
        this.cdr.detectChanges();
      },
    });
  }

  deleteSession(sessionId: number) {
    this.sessionToDeleteId = sessionId;
    this.showDeleteSessionConfirm = true;
  }

  closeDeleteSessionConfirm() {
    this.showDeleteSessionConfirm = false;
    this.sessionToDeleteId = null;
  }

  confirmDeleteSession() {
    if (this.sessionToDeleteId === null) return;

    this.apiService.deleteSession(this.sessionToDeleteId).subscribe({
      next: () => {
        if (this.course) {
          this.course.sessions = (this.course.sessions || []).filter(
            (s) => s.id !== this.sessionToDeleteId,
          );
        }
        this.notificationService.success('Session deleted. Bye bye! 👋');
        this.closeDeleteSessionConfirm();
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Failed to delete session.');
        this.closeDeleteSessionConfirm();
        this.cdr.detectChanges();
      },
    });
  }

  loadEnrollments() {
    if (!this.course) return;
    if (this.currentUser?.role === 'mentor' && this.currentUser?.id === this.course.mentor_id) {
      this.apiService.getEnrollments({ course_id: this.course.id }).subscribe({
        next: (data) => {
          const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
          this.enrolledStudents = Array.isArray(parsedData)
            ? parsedData
            : (parsedData as { results?: Enrollment[] }).results || [];
          this.cdr.detectChanges();
        },
      });
    }
    if (this.currentUser?.role === 'student') {
      this.apiService.getEnrollments({ course_id: this.course.id }).subscribe({
        next: (data) => {
          const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
          const items = Array.isArray(parsedData)
            ? parsedData
            : (parsedData as { results?: Enrollment[] }).results || [];
          this.studentEnrollment = items.length > 0 ? items[0] : null;
          this.cdr.detectChanges();
        },
      });
    }
  }

  enrollStudent() {
    if (!this.course) return;
    this.isEnrolling = true;
    this.apiService.enrollInCourse(this.course.id).subscribe({
      next: (enrollment) => {
        this.studentEnrollment = enrollment;
        this.isEnrolling = false;
        this.notificationService.success('You enrolled in this course!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isEnrolling = false;
        this.notificationService.error('Could not enroll. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  unenrollStudent() {
    if (!this.studentEnrollment) return;
    this.apiService.unenrollFromCourse(this.studentEnrollment.id).subscribe({
      next: () => {
        this.studentEnrollment = null;
        this.notificationService.success('You unenrolled from this course.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Could not unenroll. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }
}
