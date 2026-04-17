"use client"

import { useState, useEffect } from "react"
import { Plus, Search } from "lucide-react"
import { Course, CourseData, DisciplineOption } from "../types"
import { CourseCard } from "./course-card"
import { AddCourseDialog } from "./add-course-dialog"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface DisciplineStat {
  discipline: string
  total_groups: number
  groups_without_assistant: number
}

export function CoursesPage() {
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [disciplineStats, setDisciplineStats] = useState<DisciplineStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load disciplines first, then use them as permanent categories
  useEffect(() => {
    const token = localStorage.getItem("token")
    const headers = { Authorization: `Bearer ${token}` }

    fetch(`${BACKEND_URL}/api/disciplines`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((data: DisciplineOption[]) => {
        setDisciplines(data)
        if (data.length > 0) setSelectedCategory(data[0].name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const headers = { Authorization: `Bearer ${token}` }

    fetch(`${BACKEND_URL}/api/manager/groups-stats`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((data: DisciplineStat[]) => setDisciplineStats(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/manager/offers`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) throw new Error("Не удалось загрузить предложения")

        const data = await response.json()

        const mapped: Course[] = data.map((row: {
          id: number
          discipline: string
          faculty: string
          program: string
          total_groups: number
          modules: number[]
          teacher_id: number
          first_name: string
          last_name: string
          links: { name: string; url: string }[]
        }) => ({
          id: String(row.id),
          teacherId: row.teacher_id,
          disciplineId: 0,
          discipline: row.discipline,
          teacherName: `${row.last_name} ${row.first_name}`,
          program: row.program,
          faculty: row.faculty,
          numberOfGroups: row.total_groups,
          duration: row.modules ?? [],
          moduleIds: [],
          links: row.links ?? [],
        }))

        setCourses(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOffers()
  }, [])

  const statFor = (disciplineName: string): DisciplineStat | undefined =>
    disciplineStats.find((s) => s.discipline === disciplineName)

  const filteredCourses = courses.filter((c) => c.discipline === selectedCategory)

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/manager/offers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Не удалось удалить предложение")
      setCourses((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCourse = async (data: CourseData) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/manager/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherId: data.teacherId,
          disciplineId: data.disciplineId,
          facultyName: data.faculty,
          programName: data.program,
          totalGroups: data.numberOfGroups,
          moduleIds: data.moduleIds,
          links: data.links,
        }),
      })

      if (!response.ok) throw new Error("Не удалось создать предложение")

      const { id } = await response.json()
      const newCourse: Course = { id: String(id), ...data }
      setCourses((prev) => [newCourse, ...prev])
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">

      {/* Stat cards — always 4, one per discipline */}
      <p className="text-md font-medium text-black">Статистика по количеству групп по дисциплинам</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {disciplines.map((d) => {
          const stat = statFor(d.name)
          const total = stat ? Number(stat.total_groups) : 0
          const noAssistant = stat ? Number(stat.groups_without_assistant) : 0
          const isActive = selectedCategory === d.name
          return (
            <div
              key={d.id}
              onClick={() => setSelectedCategory(d.name)}
              className={`p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all bg-white`}
            >
              <p className={`text-xs truncate mb-1 ${isActive ? "text-black font-semibold" : "text-gray-500"}`}>
                {d.name}
              </p>
              <p className="text-2xl font-bold text-black">
                {total} {noAssistant > 0 && <span className="text-xs mt-0.5 text-gray-400">({noAssistant} без ассистента)</span>}
              </p>
            </div>
          )
        })}
      </div>

      {/* Filter tabs + Add button */}
      <div className="flex w-full gap-4">
        <div className="flex flex-1">
          {disciplines.map((d, index) => (
            <button
              key={d.id}
              onClick={() => setSelectedCategory(d.name)}
              className={`flex-1 py-3 text-sm font-medium border border-gray-200 transition-all ${
                index === 0 ? "rounded-l-xl" : ""
              } ${
                index === disciplines.length - 1 ? "rounded-r-xl" : ""
              } ${
                selectedCategory === d.name
                  ? "bg-black text-[#DCFF05] border-black z-10"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
              style={{ marginLeft: index > 0 ? "-1px" : "0" }}
            >
              {d.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAddCourseOpen(true)}
          className="flex-shrink-0 px-8 py-3 text-sm font-medium bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Курс
        </button>
      </div>

      {isLoading && <div className="text-sm text-gray-500 p-4">Загрузка...</div>}
      {error && <div className="text-sm text-red-500 p-4">{error}</div>}

      {!isLoading && !error && filteredCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={() => {}}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && filteredCourses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "#f0f0ff" }}
          >
            <Search className="w-6 h-6" style={{ color: "#2300fa" }} />
          </div>
          <p className="text-base font-semibold text-black">Нет предложений</p>
          <p className="text-sm text-gray-400 mt-1">
            Для выбранной дисциплины пока не создано ни одного курса
          </p>
        </div>
      )}

      <AddCourseDialog
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        onSubmit={handleAddCourse}
      />
    </div>
  )
}
