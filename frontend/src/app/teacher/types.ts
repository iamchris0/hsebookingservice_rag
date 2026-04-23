// Типы для роли преподавателя (Teacher)

export interface Group {
  id: string;
  lastName?: string;
  firstName?: string;
  email: string;
  program: string;
  discipline: string;
  studyPeriod: string;
  paymentFormat?: string;
}

export interface Assistant {
  id: string;
  name: string;
  skills: Array<{ number: number; name: string; groups: number | null }>;
  faculty: string;
  trainingProgram: string;
  email: string;
  telegram: string | null;
  isFavorite: boolean;
  currentAssignments: Array<{
    discipline: string;
    program: string;
    groups: number;
    modules: number[];
  }>;
}

// Student search (GET /api/teacher/search)

export interface StudentPreference {
  priority: number
  discipline: string
  desired_group_size: number | null
}

export interface StudentSearchResult {
  id: number
  first_name: string
  last_name: string
  email: string
  telegram: string | null
  study_year: number | null
  edu_faculty: string | null
  edu_program: string | null
  preferences: StudentPreference[]
  active_assignments: number
}

export interface DisciplineStat {
  id: string;
  name: string;
  count: number;
  icon: any;
  color: string;
}

export interface TeacherBooking {
  booking_id: number
  status: "pending" | "active"
  payment_type: "money" | "credits"
  student_first_name: string
  student_last_name: string
  student_email: string
  student_telegram?: string | null
}

export interface TeacherOffer {
  id: number
  discipline: string
  faculty: string
  program: string
  total_groups: number
  modules: number[]
  manager_first_name: string | null
  manager_last_name: string | null
  available_groups: number
  links: { name: string; url: string }[]
  bookings: TeacherBooking[]
}
