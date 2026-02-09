"use client"

import { CourseCard } from "./course-card"
import { GroupFilters } from "@/app/teacher/search/group-filters"

const mockCourses = [
  {
    id: "1",
    discipline: "Mathematics",
    program: "Advanced Calculus",
    modules: "Modules 1-3",
    instructor: "Dr. Smith",
    progress: 65,
  },
  {
    id: "2",
    discipline: "Physics",
    program: "Quantum Mechanics",
    modules: "Modules 1-2",
    instructor: "Prof. Johnson",
    progress: 45,
  },
  {
    id: "3",
    discipline: "Computer Science",
    program: "Data Structures",
    modules: "Modules 1-5",
    instructor: "Dr. Williams",
    progress: 80,
  },
]

export function MyCoursesSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Courses</h1>

      <GroupFilters />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCourses.map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </div>
    </div>
  )
}
