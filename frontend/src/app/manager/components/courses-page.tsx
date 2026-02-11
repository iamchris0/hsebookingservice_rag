"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Course, CourseData, Discipline } from "../types"
import { CourseCard } from "./course-card"
import { AddCourseDialog } from "./add-course-dialog"

// Mock data - replace with real API call
const mockCourses: Course[] = [
  {
    id: "1",
    discipline: "Data Analysis",
    teacherName: "Prof. Ivanov A.S.",
    assistantName: "Petrov Dmitry",
    faculty: "Faculty of Computer Science",
    program: "Applied Mathematics and Informatics",
    numberOfGroups: 3,
    duration: [1, 2],
    links: [],
  },
  {
    id: "2",
    discipline: "Programming",
    teacherName: "Prof. Smirnova E.V.",
    faculty: "Faculty of Economics",
    program: "Business Informatics",
    numberOfGroups: 2,
    duration: [1],
    links: [],
  },
]

const categories: Discipline[] = ["Data Analysis", "Programming", "Machine Learning", "Mathematics"]


export function CoursesPage() {
  const [selectedCategory, setSelectedCategory] = useState<Discipline>("Data Analysis")
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>(mockCourses)

  const filteredCourses = courses.filter(course => course.discipline === selectedCategory)

  const handleEdit = (id: string) => {
    console.log("Edit course:", id)
    // TODO: Implement edit functionality
  }

  const handleDelete = (id: string) => {
    console.log("Delete course:", id)
    // TODO: Implement delete functionality
    setCourses(courses.filter(c => c.id !== id))
  }

  const handleAddCourse = (data: CourseData) => {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      ...data,
    }
    setCourses([...courses, newCourse])
  }

  return (
    <div className="space-y-6">

      {/* Category Tabs + Add Button */}
      <div className="flex w-full gap-4">
        {/* Discipline buttons block */}
        <div className="flex flex-1">
          {categories.map((discipline, index) => (
            <button
              key={discipline}
              onClick={() => setSelectedCategory(discipline)}
              className={`flex-1 py-3 text-sm font-medium border border-gray-200 transition-all ${
                index === 0 ? "rounded-l-xl" : ""
              } ${
                index === categories.length - 1 ? "rounded-r-xl" : ""
              } ${
                selectedCategory === discipline
                  ? "bg-black text-[#DCFF05] border-black z-10"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
              style={{ marginLeft: index > 0 ? "-1px" : "0" }}
            >
              {discipline}
            </button>
          ))}
        </div>

        {/* Add Course button block */}
        <button
          onClick={() => setIsAddCourseOpen(true)}
          className="flex-shrink-0 px-8 py-3 text-sm font-medium bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Курс
        </button>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No courses found in this category.</p>
        </div>
      )}

      {/* Add Course Dialog */}
      <AddCourseDialog
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        onSubmit={handleAddCourse}
      />
    </div>
  )
}
