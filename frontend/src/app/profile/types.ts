// Shape returned by GET /api/account/profile

export interface PriorityDetail {
  priority: number
  disciplineId: number
  discipline: string
  desiredGroupSize: number
  answers: Record<string, string>
}

export interface AccountProfile {
  id: number
  email: string
  firstName: string
  lastName: string
  middleName: string | null
  role: "student" | "teacher"

  // Student-only fields (present when role === "student")
  questionnaireCompleted?: boolean
  telegram?: string | null
  birthday?: string | null
  citizenship?: string | null
  phone?: string | null
  eduFaculty?: string | null
  eduProgram?: string | null
  studyYear?: number | null
  debts?: string | null
  eduRating?: string | null
  digitalLiteracyScore?: string | null
  programmingScore?: string | null
  dataAnalysisScore?: string | null
  motivation?: string | null
  achievements?: string | null
  priorCourses?: string | null
  recommendationAvailable?: boolean
  recommendationEmail?: string | null
  priorities?: PriorityDetail[]
}

export interface Discipline {
  id: number
  name: string
}
