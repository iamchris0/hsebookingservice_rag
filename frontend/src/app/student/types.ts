export interface CourseCardProps {
  id: number
  discipline: string
  teacherName: string
  email: string
  program: string
  numberOfGroups: number
  duration: number[]
  links: string[]
}

export interface FiltersProps {
  onNameChange?: (value: string) => void
}
