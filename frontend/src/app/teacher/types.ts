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
  skills: Array<{ number: number; name: string }>;
  faculty: string;
  trainingProgram: string;
  email: string;
  isFavorite: boolean;
  currentAssignments: Array<{
    discipline: string;
    program: string;
    groups: number;
    modules: number[];
  }>;
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
  groups_count: number
  student_first_name: string
  student_last_name: string
  student_email: string
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
