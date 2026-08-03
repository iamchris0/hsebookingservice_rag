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
  num_groups: number
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
  available_groups: number
  links: { name: string; url: string }[]
  bookings: TeacherBooking[]
}

// Course creation (POST /api/teacher/offers)

export interface LinkRow {
  name: string
  url: string
}

export interface DisciplineOption {
  id: number
  name: string
}

export interface FacultyOption {
  id: number
  name: string
}

export interface ProgramOption {
  id: number
  name: string
  faculty_name: string
}

export interface ModuleOption {
  id: number
  number: number
}

export interface CreateCourseData {
  disciplineId: number
  discipline: string      // display name
  program: string         // free-text program name
  faculty: string         // free-text faculty name
  numberOfGroups: number
  duration: number[]      // selected module numbers
  moduleIds: number[]     // selected module IDs
  links: LinkRow[]
}

// Full student profile (GET /api/teacher/students/:id)

export interface StudentPriorityDetail {
  priority: number
  discipline: string
  desiredGroupSize: number | null
  answers: Record<string, string>
}

export interface StudentDetails {
  id: number
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  telegram: string | null
  birthday: string | null
  citizenship: string | null
  phone: string | null
  eduFaculty: string | null
  eduProgram: string | null
  studyYear: number | null
  debts: string | null
  eduRating: string | null
  digitalLiteracyScore: string | null
  programmingScore: string | null
  dataAnalysisScore: string | null
  motivation: string | null
  achievements: string | null
  priorCourses: string | null
  recommendationAvailable: boolean
  recommendationEmail: string | null
  priorities: StudentPriorityDetail[]
}
