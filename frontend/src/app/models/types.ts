export interface AnimationConfig {
  behavior:
    | 'gravity'
    | 'harmonic'
    | 'angular'
    | 'friction'
    | 'manual'
    | 'seeds'
    | 'float'
    | 'heartbeat'
    | 'swing'
    | 'bounce-bounds'
    | 'orbit-mouse'
    | 'flee-mouse'
    | 'attract-mouse'
    | 'drift'
    | 'zigzag'
    | 'swirl'
    | 'spring-mouse'
    | 'fade-pulse'
    | 'shake'
    | 'wavy'
    | 'flip'
    | 'slide-in'
    | 'drop-bounce'
    | 'orbit-center'
    | 'pop';
  g?: number;
  restitution?: number;
  frequency?: number;
  damping?: number;
  amplitude?: number;
  speed?: number;
  pivot?: { x: number; y: number };
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'mentor' | 'parent' | 'staff';
  is_active?: boolean;
  is_verified?: boolean;
  date_joined?: string;
  bio?: string;
  avatar?: string;
}

export interface AuditLog {
  id: number;
  user: number;
  user_username: string;
  target_user: number | null;
  target_username: string | null;
  action: 'create' | 'update' | 'delete' | 'deactivate' | 'reactivate';
  details: string;
  ip_address: string;
  timestamp: string;
}

export interface ClassGroup {
  id: number;
  mentor: number;
  mentor_username: string;
  name: string;
  description: string;
  students: number[];
  student_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChildProfile {
  id: number;
  username: string;
  avatar?: string;
  total_points: number;
  level_info: {
    level: number;
    current_xp: number;
    xp_for_next_level: number;
    progress_percent: number;
    total_points: number;
  } | null;
  streak_info: {
    current_streak: number;
    longest_streak: number;
  } | null;
  recent_games?: {
    game_type: string;
    score: number;
    completed_at: string;
  }[];
  activity_stats?: {
    diaries_created: number;
    games_played: number;
  };
}

export type BrushPreset =
  | 'round'
  | 'calligraphy'
  | 'square'
  | 'crayon'
  | 'fine-pen'
  | 'spray'
  | 'highlighter'
  | 'watercolor';

export type CanvasTool =
  | 'pen'
  | 'eraser'
  | 'text'
  | 'rect'
  | 'circle'
  | 'star'
  | 'arrow'
  | 'triangle'
  | 'straight-line'
  | 'ellipse'
  | 'hexagon'
  | 'heart'
  | 'diamond'
  | 'pentagon'
  | 'image'
  | 'audio'
  | 'animation'
  | 'ring'
  | 'arc'
  | 'wedge'
  | 'path'
  | 'textpath'
  | 'sprite'
  | 'label'
  | 'hand';

export interface CanvasEvent {
  type: string;
  tool?: CanvasTool;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  innerRadius?: number;
  outerRadius?: number;
  points?: number[];
  pointTimes?: number[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  stroke?: string;
  strokeWidth?: number;
  timestamp: number;
  id?: string;
  assetId?: number;
  assetUrl?: string;
  audioAssetUrl?: string;
  animationType?: string;
  animationConfig?: AnimationConfig;
  scale?: number;
  angle?: number;
  clockwise?: boolean;
  data?: string;
  spriteAnimations?: Record<string, number[]>;

  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  opacity?: number;
  globalCompositeOperation?: string;
  filters?: string[];
  filterConfigs?: Record<string, number>;

  strokeDash?: number[];
  fillType?: 'solid' | 'linear' | 'radial' | 'none';
  fillLinearGradientStartPoint?: [number, number];
  fillLinearGradientEndPoint?: [number, number];
  fillLinearGradientColorStops?: (number | string)[];
  fillRadialGradientStartPoint?: [number, number];
  fillRadialGradientEndPoint?: [number, number];
  fillRadialGradientStartRadius?: number;
  fillRadialGradientEndRadius?: number;
  fillRadialGradientColorStops?: (number | string)[];
  fillGradientDirection?: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right';

  brushPreset?: BrushPreset;
  brushTension?: number;
  brushLineCap?: 'round' | 'square' | 'butt';
  brushLineJoin?: 'round' | 'miter' | 'bevel';

  zIndex?: number;
  isStatic?: boolean;
  cornerRadius?: number;
}

export interface Asset {
  id: number;
  title: string;
  file?: string | null;
  asset_type: 'image' | 'audio' | 'animation';
  animation_config?: AnimationConfig;
  scale?: number;
  created_by?: number;
  created_by_username?: string;
  created_at?: string;
}

export interface StudentDiary {
  id: number;
  student?: number;
  title: string;
  canvas_events: CanvasEvent[];
  created_at?: string;
  updated_at?: string;
}

export type GameType =
  | 'puzzle'
  | 'trivia'
  | 'math'
  | 'physics'
  | 'color'
  | 'chemistry'
  | 'memory'
  | 'maze'
  | 'word_scramble'
  | 'flashcard';

export interface Session {
  id: number;
  title: string;
  mode?: 'freedom' | 'game';
  session_type?: 'recorded' | 'live';
  game_type?: GameType | string;
  game_config?: Record<string, unknown>;
  audio_file?: string | null;
  canvas_events?: CanvasEvent[];
  created_at?: string;
  course_mentor_id?: number;
  course_mentor_username?: string;
  course_mentor_is_verified?: boolean;
}

export interface StudentSessionState {
  id?: number;
  session: number;
  student?: number;
  canvas_events: CanvasEvent[];
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: number;
  title: string;
  description?: string | null;
  sessions?: Session[];
  created_at?: string;
  mentor_id?: number;
  mentor_username?: string;
  mentor_is_verified?: boolean;
  mentor_bio?: string;
  mentor_avatar?: string;
  enrollment_count?: number;
}

export interface Enrollment {
  id: number;
  student: number;
  course: number;
  student_username: string;
  student_avatar?: string;
  course_title: string;
  enrolled_at: string;
}

export interface DiaryComment {
  id: number;
  diary: number;
  author: number;
  author_username: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface RegisterData {
  username: string;
  password?: string;
  role?: string;
}

export interface ApiListResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
  data?: T[];
}

export interface ApiResponse<T> {
  data?: T;
  [key: string]: unknown;
}

export interface SessionTemplate {
  id: number;
  title: string;
  description?: string | null;
  template_type: GameType;
  game_config: Record<string, unknown>;
  is_public: boolean;
  usage_count: number;
  mentor: number;
  mentor_username?: string;
  mentor_is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  role: string;
  is_verified?: boolean;
  total_points: number;
  achievements_count: number;
}

export interface UserStreak {
  id: number;
  username: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at?: string;
  leveled_up?: boolean;
  milestone?: number | null;
}

export type ThemeMode = 'light' | 'high-contrast';

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export type FontSize = 'normal' | 'large' | 'x-large';

export interface UserPreference {
  id?: number;
  theme: ThemeMode;
  colorblind_mode: ColorblindMode;
  reduced_motion: boolean;
  dyslexic_font: boolean;
  font_size: FontSize;
  updated_at?: string;
}

export interface UserLevel {
  level: number;
  current_xp: number;
  xp_for_next_level: number;
  progress_percent: number;
  total_points: number;
}

export type NotificationType = 'achievement' | 'enrollment' | 'diary_comment' | 'system';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  related_object_id: number | null;
  related_object_type: string | null;
  is_read: boolean;
  created_at: string;
  recipient: number;
  recipient_username: string;
}

export interface SystemAnalytics {
  total_students: number;
  total_mentors: number;
  total_parents: number;
  total_courses: number;
  total_sessions: number;
  total_games: number;
  total_diaries: number;
  active_users_30d: number;
  popular_courses: {
    title: string;
    mentor: string;
    students: number;
  }[];
  dau_trend: {
    date: string;
    count: number;
  }[];
}

export interface MentorAnalytics {
  total_courses: number;
  total_students_enrolled: number;
  total_sessions: number;
  student_engagement: number;
  recent_activity: {
    title: string;
    mode: string;
    course: string;
    created_at: string;
  }[];
}

export interface ParentStudentLink {
  id: number;
  parent: number;
  parent_username?: string;
  parent_email?: string;
  parent_avatar?: string | null;
  student: number;
  student_username?: string;
  student_email?: string;
  student_avatar?: string | null;
  created_at?: string;
}

export interface StudentInsights {
  total_points: number;
  level: number;
  activity_history: {
    date: string;
    session: string;
    interactions: number;
  }[];
  recent_achievements: {
    name: string;
    date: string;
  }[];
}

export interface AssetUsageAnalytics {
  id: number;
  title: string;
  type: string;
  usage_count: number;
}
