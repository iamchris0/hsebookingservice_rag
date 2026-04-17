// Types for Manager role

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

export interface CourseData {
  teacherId: number
  disciplineId: number
  discipline: string      // display name
  teacherName: string
  program: string         // free-text program name
  faculty: string         // free-text faculty name
  numberOfGroups: number
  duration: number[]      // selected module numbers
  moduleIds: number[]     // selected module IDs
  links: LinkRow[]
  assistantName?: string
}

export interface Course extends CourseData {
  id: string
}
