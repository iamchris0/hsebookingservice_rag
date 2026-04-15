// Types for Manager role

export type Discipline = "Анализ данных" | "Программирование" | "Машинное обучение" | "Цифровая грамотность"

export interface LinkRow {
  name: string
  url: string
}

export interface Teacher {
  id: number
  first_name: string
  last_name: string
  email: string
}

export interface CourseData {
  teacherId: number
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
