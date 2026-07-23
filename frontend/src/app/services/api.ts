import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { SKIP_ERROR_NOTIFICATION } from '../interceptors/error-interceptor';
import {
  User,
  Course,
  Session,
  LoginCredentials,
  RegisterData,
  StudentSessionState,
  CanvasEvent,
  Asset,
  StudentDiary,
  ApiListResponse,
  SessionTemplate,
  Enrollment,
  DiaryComment,
  LeaderboardEntry,
  UserStreak,
  UserPreference,
  UserLevel,
  AppNotification,
  SystemAnalytics,
  MentorAnalytics,
  StudentInsights,
  AssetUsageAnalytics,
  ClassGroup,
  ChildProfile,
  ParentStudentLink,
} from '../models/types';

export interface LoginResponse {
  username: string;
  role: 'mentor' | 'student' | 'staff' | 'parent';
  access?: string;
  refresh?: string;
  id?: number;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private baseUrl = 'http://localhost:8000/api';
  private serverUrl = 'http://localhost:8000';
  private http = inject(HttpClient);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/token/`, credentials).pipe(
      tap((response) => {
        this.currentUserSubject.next({
          id: response.id ?? 0,
          username: response.username,
          email: response.email ?? '',
          role: response.role,
        });

        this.checkAuthStatus().subscribe();
      }),
    );
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.baseUrl}/logout/`, {})
      .pipe(tap(() => this.currentUserSubject.next(null)));
  }

  register(userData: RegisterData): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/register/`, userData);
  }

  checkAuthStatus(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me/`, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      })
      .pipe(
        tap({
          next: (user) => this.currentUserSubject.next(user),
          error: () => this.currentUserSubject.next(null),
        }),
      );
  }

  updateProfile(data: {
    username?: string;
    email?: string;
    bio?: string;
    avatar?: File;
  }): Observable<User> {
    if (data.avatar) {
      const formData = new FormData();
      if (data.username) formData.append('username', data.username);
      if (data.email) formData.append('email', data.email);
      if (data.bio !== undefined) formData.append('bio', data.bio);
      formData.append('avatar', data.avatar);
      return this.http
        .patch<User>(`${this.baseUrl}/me/`, formData)
        .pipe(tap((user) => this.currentUserSubject.next(user)));
    }
    return this.http
      .patch<User>(`${this.baseUrl}/me/`, data)
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  changePassword(data: {
    current_password: string;
    new_password: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/change-password/`, data);
  }

  getCourses(params?: {
    search?: string;
    ordering?: string;
    mentor_id?: number;
    enrolled?: boolean;
  }): Observable<Course[] | ApiListResponse<Course>> {
    let url = `${this.baseUrl}/courses/`;
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    if (params?.mentor_id) searchParams.set('mentor_id', params.mentor_id.toString());
    if (params?.enrolled) searchParams.set('enrolled', 'true');
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    return this.http.get<Course[] | ApiListResponse<Course>>(url);
  }

  getCourse(id: number): Observable<Course | { data: Course }> {
    return this.http.get<Course | { data: Course }>(`${this.baseUrl}/courses/${id}/`);
  }

  createCourse(data: { title: string; description: string }): Observable<Course> {
    return this.http.post<Course>(`${this.baseUrl}/courses/`, data);
  }

  getCourseStudentProgress(courseId: number): Observable<
    {
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
    }[]
  > {
    return this.http.get<
      {
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
      }[]
    >(`${this.baseUrl}/courses/${courseId}/student_progress/`);
  }

  getSession(id: number): Observable<Session | { data?: Session }> {
    return this.http.get<Session | { data?: Session }>(`${this.baseUrl}/sessions/${id}/`);
  }

  updateCourse(id: number, data: { title: string; description: string }): Observable<Course> {
    return this.http.patch<Course>(`${this.baseUrl}/courses/${id}/`, data);
  }

  deleteCourse(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/courses/${id}/`);
  }

  createSession(data: {
    title: string;
    course: number;
    mode?: string;
    game_type?: string;
    audio_file?: File;
    canvas_events?: CanvasEvent[];
  }): Observable<Session> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('course', data.course.toString());
    if (data.audio_file) {
      formData.append('audio_file', data.audio_file);
    }
    if (data.mode) {
      formData.append('mode', data.mode);
    }
    if (data.game_type) {
      formData.append('game_type', data.game_type);
    }
    if (data.canvas_events) {
      formData.append('canvas_events', JSON.stringify(data.canvas_events));
    }
    return this.http.post<Session>(`${this.baseUrl}/sessions/`, formData);
  }

  updateSession(id: number, data: Partial<Session>): Observable<Session> {
    return this.http.patch<Session>(`${this.baseUrl}/sessions/${id}/`, data);
  }

  deleteSession(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/sessions/${id}/`);
  }

  getStudentSessionState(sessionId: number): Observable<StudentSessionState> {
    return this.http.get<StudentSessionState>(`${this.baseUrl}/sessions/${sessionId}/state/`);
  }

  saveStudentSessionState(
    sessionId: number,
    canvasEvents: CanvasEvent[],
  ): Observable<StudentSessionState> {
    return this.http.post<StudentSessionState>(`${this.baseUrl}/sessions/${sessionId}/state/`, {
      canvas_events: canvasEvents,
    });
  }

  uploadSessionRecording(
    sessionId: number,
    audioBlob: Blob | null,
    canvasEvents: CanvasEvent[],
  ): Observable<Session> {
    const formData = new FormData();
    if (audioBlob) {
      formData.append('audio_file', audioBlob, 'recording.webm');
    }
    formData.append('canvas_events', JSON.stringify(canvasEvents));
    return this.http.patch<Session>(`${this.baseUrl}/sessions/${sessionId}/`, formData);
  }

  checkGameAnswer(sessionId: number, answer: unknown): Observable<{ is_correct: boolean }> {
    return this.http.post<{ is_correct: boolean }>(
      `${this.baseUrl}/sessions/${sessionId}/check_answer/`,
      { answer },
    );
  }

  getAssets(params?: {
    search?: string;
    asset_type?: string;
    ordering?: string;
  }): Observable<Asset[] | ApiListResponse<Asset>> {
    let url = `${this.baseUrl}/assets/`;
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.asset_type) searchParams.set('asset_type', params.asset_type);
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    return this.http.get<Asset[] | ApiListResponse<Asset>>(url);
  }

  createAsset(data: {
    title: string;
    file?: File | null;
    asset_type: 'image' | 'audio' | 'animation';
  }): Observable<Asset> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.file) {
      formData.append('file', data.file);
    }
    formData.append('asset_type', data.asset_type);
    return this.http.post<Asset>(`${this.baseUrl}/assets/`, formData);
  }

  deleteAsset(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/assets/${id}/`);
  }

  getStudentDiaries(
    studentId?: number,
  ): Observable<StudentDiary[] | ApiListResponse<StudentDiary>> {
    let url = `${this.baseUrl}/student-diaries/`;
    if (studentId) url += `?student_id=${studentId}`;
    return this.http.get<StudentDiary[] | ApiListResponse<StudentDiary>>(url);
  }

  getStudentDiary(id: number, studentId?: number): Observable<StudentDiary> {
    let url = `${this.baseUrl}/student-diaries/${id}/`;
    if (studentId) url += `?student_id=${studentId}`;
    return this.http.get<StudentDiary>(url);
  }

  createStudentDiary(data: {
    title: string;
    canvas_events?: CanvasEvent[];
  }): Observable<StudentDiary> {
    return this.http.post<StudentDiary>(`${this.baseUrl}/student-diaries/`, data);
  }

  updateStudentDiary(
    id: number,
    data: { title?: string; canvas_events?: CanvasEvent[] },
  ): Observable<StudentDiary> {
    return this.http.patch<StudentDiary>(`${this.baseUrl}/student-diaries/${id}/`, data);
  }

  deleteStudentDiary(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/student-diaries/${id}/`);
  }

  getStudentProgress(studentId?: number): Observable<{
    total_sessions: number;
    total_canvas_time: number;
    total_games: number;
    accuracy_rate: number;
    max_activity: number;
    weekly_activity: { label: string; value: number }[];
    recent_sessions: {
      id: number;
      title: string;
      mode: string;
      created_at: string;
      is_correct?: boolean;
    }[];
  }> {
    let url = `${this.baseUrl}/student-progress/`;
    if (studentId) url += `?student_id=${studentId}`;
    return this.http.get<{
      total_sessions: number;
      total_canvas_time: number;
      total_games: number;
      accuracy_rate: number;
      max_activity: number;
      weekly_activity: { label: string; value: number }[];
      recent_sessions: {
        id: number;
        title: string;
        mode: string;
        created_at: string;
        is_correct?: boolean;
      }[];
    }>(url);
  }

  getSessionTemplates(): Observable<SessionTemplate[] | ApiListResponse<SessionTemplate>> {
    return this.http.get<SessionTemplate[] | ApiListResponse<SessionTemplate>>(
      `${this.baseUrl}/session-templates/`,
    );
  }

  getSessionTemplate(id: number): Observable<SessionTemplate> {
    return this.http.get<SessionTemplate>(`${this.baseUrl}/session-templates/${id}/`);
  }

  createSessionTemplate(data: {
    title: string;
    description?: string;
    template_type: string;
    game_config: Record<string, unknown>;
    is_public?: boolean;
  }): Observable<SessionTemplate> {
    return this.http.post<SessionTemplate>(`${this.baseUrl}/session-templates/`, data);
  }

  updateSessionTemplate(id: number, data: Partial<SessionTemplate>): Observable<SessionTemplate> {
    return this.http.patch<SessionTemplate>(`${this.baseUrl}/session-templates/${id}/`, data);
  }

  deleteSessionTemplate(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/session-templates/${id}/`);
  }

  getEnrollments(params?: {
    course_id?: number;
    student_id?: number;
  }): Observable<Enrollment[] | ApiListResponse<Enrollment>> {
    let url = `${this.baseUrl}/enrollments/`;
    const searchParams = new URLSearchParams();
    if (params?.course_id) searchParams.set('course_id', params.course_id.toString());
    if (params?.student_id) searchParams.set('student_id', params.student_id.toString());
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    return this.http.get<Enrollment[] | ApiListResponse<Enrollment>>(url);
  }

  enrollInCourse(courseId: number): Observable<Enrollment> {
    return this.http.post<Enrollment>(`${this.baseUrl}/enrollments/`, { course: courseId });
  }

  unenrollFromCourse(enrollmentId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/enrollments/${enrollmentId}/`);
  }

  getDiaryComments(diaryId: number): Observable<DiaryComment[] | ApiListResponse<DiaryComment>> {
    return this.http.get<DiaryComment[] | ApiListResponse<DiaryComment>>(
      `${this.baseUrl}/diary-comments/?diary_id=${diaryId}`,
    );
  }

  addDiaryComment(diaryId: number, content: string): Observable<DiaryComment> {
    return this.http.post<DiaryComment>(`${this.baseUrl}/diary-comments/`, {
      diary: diaryId,
      content,
    });
  }

  deleteDiaryComment(commentId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/diary-comments/${commentId}/`);
  }

  getLeaderboard(period?: string): Observable<LeaderboardEntry[]> {
    const params = period ? `?period=${period}` : '';
    return this.http.get<LeaderboardEntry[]>(`${this.baseUrl}/leaderboard/${params}`);
  }

  getStreak(): Observable<UserStreak> {
    return this.http.get<UserStreak>(`${this.baseUrl}/streak/`);
  }

  updateStreak(): Observable<UserStreak> {
    return this.http.post<UserStreak>(`${this.baseUrl}/streak/`, {});
  }

  getUserPreferences(): Observable<UserPreference> {
    return this.http.get<UserPreference>(`${this.baseUrl}/user-preferences/`);
  }

  updateUserPreferences(data: Partial<UserPreference>): Observable<UserPreference> {
    return this.http.patch<UserPreference>(`${this.baseUrl}/user-preferences/`, data);
  }

  getLevel(): Observable<UserLevel> {
    return this.http.get<UserLevel>(`${this.baseUrl}/level/`);
  }

  getNotifications(params?: {
    is_read?: boolean;
    type?: string;
    ordering?: string;
  }): Observable<AppNotification[] | ApiListResponse<AppNotification>> {
    let url = `${this.baseUrl}/notifications/`;
    const searchParams = new URLSearchParams();
    if (params?.is_read !== undefined) searchParams.set('is_read', String(params.is_read));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    return this.http.get<AppNotification[] | ApiListResponse<AppNotification>>(url);
  }

  getMediaUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.serverUrl}${cleanPath}`;
  }

  getUnreadNotificationCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.baseUrl}/notifications/unread_count/`);
  }

  markNotificationRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.baseUrl}/notifications/${id}/`, {
      is_read: true,
    });
  }

  markAllNotificationsRead(): Observable<{ marked_read: number }> {
    return this.http.post<{ marked_read: number }>(
      `${this.baseUrl}/notifications/mark_all_read/`,
      {},
    );
  }

  deleteNotification(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/notifications/${id}/`);
  }

  // --- Parent-Student Links ---
  getParentStudentLinks(): Observable<ParentStudentLink[] | ApiListResponse<ParentStudentLink>> {
    return this.http.get<ParentStudentLink[] | ApiListResponse<ParentStudentLink>>(
      `${this.baseUrl}/parent-student-links/`,
    );
  }

  createParentStudentLink(parent_id: number, student_id: number): Observable<ParentStudentLink> {
    return this.http.post<ParentStudentLink>(`${this.baseUrl}/parent-student-links/`, {
      parent: parent_id,
      student: student_id,
    });
  }

  deleteParentStudentLink(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/parent-student-links/${id}/`);
  }

  getChildren(): Observable<ChildProfile[]> {
    return this.http.get<ChildProfile[]>(`${this.baseUrl}/parent/children/`);
  }

  // --- Class Groups (Mentor) ---
  getClassGroups(): Observable<ClassGroup[]> {
    return this.http.get<ClassGroup[]>(`${this.baseUrl}/class-groups/`);
  }

  createClassGroup(data: {
    name: string;
    description?: string;
    students?: number[];
  }): Observable<ClassGroup> {
    return this.http.post<ClassGroup>(`${this.baseUrl}/class-groups/`, data);
  }

  updateClassGroup(id: number, data: Partial<ClassGroup>): Observable<ClassGroup> {
    return this.http.patch<ClassGroup>(`${this.baseUrl}/class-groups/${id}/`, data);
  }

  deleteClassGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/class-groups/${id}/`);
  }

  importStudentsCSV(id: number, file: File): Observable<{ message: string; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string; error?: string }>(
      `${this.baseUrl}/class-groups/${id}/import_students_csv/`,
      formData,
    );
  }

  // --- Admin/Staff User Management ---
  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users/?role=${role}`);
  }

  getManageUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/manage-users/`);
  }

  updateManageUser(id: number, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/manage-users/${id}/`, data);
  }

  getAuditLogs(targetUserId?: number): Observable<unknown> {
    let url = `${this.baseUrl}/audit-logs/`;
    if (targetUserId) {
      url += `?target_user=${targetUserId}`;
    }
    return this.http.get<unknown>(url);
  }

  // --- Analytics & Reports ---
  getSystemAnalytics(): Observable<SystemAnalytics> {
    return this.http.get<SystemAnalytics>(`${this.baseUrl}/analytics/system/`);
  }

  getMentorAnalytics(): Observable<MentorAnalytics> {
    return this.http.get<MentorAnalytics>(`${this.baseUrl}/analytics/mentor/`);
  }

  getStudentInsights(studentId: number): Observable<StudentInsights> {
    return this.http.get<StudentInsights>(`${this.baseUrl}/analytics/student/${studentId}/`);
  }

  getAssetUsageAnalytics(): Observable<AssetUsageAnalytics[]> {
    return this.http.get<AssetUsageAnalytics[]>(`${this.baseUrl}/analytics/assets/`);
  }

  trackAssetUsage(assetId: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/assets/${assetId}/track_usage/`, {});
  }

  exportCsvReport(reportType: 'users' | 'courses' | 'students'): void {
    const url = `${this.baseUrl}/reports/export/?type=${reportType}`;
    window.location.href = url;
  }
}
