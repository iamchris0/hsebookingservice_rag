// Shape returned by GET /api/student/my-groups
export interface MyGroupCardProps {
  id: number
  discipline: string
  teacherName: string
  email: string
  faculty: string
  program: string
  numberOfGroups: number
  modules: number[]    // converted from single int on backend
  paymentType: "money" | "credits"
  links: { name: string; url: string }[]
}

// Shape returned by GET /api/student/search
export interface SearchCourseCardProps {
  id: number           // offer id
  discipline: string
  teacherName: string
  email: string
  program: string
  availableGroups: number
  modules: number[]    // e.g. [1, 2, 3]
}

// Legacy alias kept for components that still import CourseCardProps
export type CourseCardProps = MyGroupCardProps

export interface FiltersProps {
  programs?: string[]
  selectedDiscipline?: string
  selectedProgram?: string
  selectedModules?: number[]
  onNameChange?: (value: string) => void
  onDisciplineChange?: (value: string) => void
  onProgramChange?: (value: string) => void
  onModulesChange?: (modules: number[]) => void
}
