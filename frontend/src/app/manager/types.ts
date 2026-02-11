// Types for Manager role

export type Discipline = "Data Analysis" | "Programming" | "Machine Learning" | "Mathematics"

export interface LinkRow {
  name: string
  url: string
}

export interface CourseData {
  discipline: Discipline
  teacherName: string
  faculty: string
  program: string
  numberOfGroups: number
  duration: number[]
  links: LinkRow[]
  assistantName?: string
}

export interface Course extends CourseData {
  id: string
}
