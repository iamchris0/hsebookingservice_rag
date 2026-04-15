"use client"

import { useState, useEffect } from "react"
import { Plus, Brain, BarChart3, Code, Calculator } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Course, CourseData, Discipline } from "../types"
import { toDisplayDiscipline, toDbDiscipline } from "@/lib/disciplines"
import { CourseCard } from "./course-card"
import { AddCourseDialog } from "./add-course-dialog"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

const categories: Discipline[] = ["Анализ данных", "Программирование", "Машинное обучение", "Цифровая грамотность"]

interface DisciplineStat {
  discipline: Discipline
  total_groups: number
  groups_without_assistant: number
}

const disciplineConfig: Record<Discipline, { icon: React.ElementType; color: string }> = {
  "Машинное обучение": { icon: Brain, color: "#8B5CF6" },
  "Анализ данных":     { icon: BarChart3, color: "#3B82F6" },
  "Программирование":  { icon: Code, color: "#10B981" },
  "Цифровая грамотность":        { icon: Calculator, color: "#F59E0B" },
}

export function CoursesPage() {
  const [selectedCategory, setSelectedCategory] = useState<Discipline>("Анализ данных")
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [disciplineStats, setDisciplineStats] = useState<DisciplineStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/manager/groups-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const raw: Array<{ discipline: string; total_groups: number; groups_without_assistant: number }> = await response.json()
        const data: DisciplineStat[] = raw.map((s) => ({
          ...s,
          discipline: toDisplayDiscipline(s.discipline) as Discipline,
        }))
        setDisciplineStats(data)
      } catch {
        // non-critical, badges will just be empty
      }
    }
    fetchStats()
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
        }) => ({
          id: String(row.id),
          teacherId: row.teacher_id,
          discipline: toDisplayDiscipline(row.discipline) as Discipline,
          teacherName: `${row.last_name} ${row.first_name}`,
          faculty: row.faculty,
          program: row.program,
          numberOfGroups: row.total_groups,
          duration: row.modules ?? [],
          links: [],
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

  const filteredCourses = courses.filter((course) => course.discipline === selectedCategory)

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
          discipline: toDbDiscipline(data.discipline),
          faculty: data.faculty,
          program: data.program,
          totalGroups: data.numberOfGroups,
          modules: data.duration,
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

      {/* Discipline Stats Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((discipline) => {
          const cfg = disciplineConfig[discipline]
          const Icon = cfg.icon
          const stat = disciplineStats.find((s) => s.discipline === discipline)
          const total = stat ? Number(stat.total_groups) : 0
          const noAssistant = stat ? Number(stat.groups_without_assistant) : 0
          return (
            <Card
              key={discipline}
              className="p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCategory(discipline)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cfg.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-black">
                    {total}
                    <span className="text-base font-normal text-gray-400 ml-1">({noAssistant} без ассистента)</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">{discipline}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Category Tabs + Add Button */}
      <div className="flex w-full gap-4">
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

        <button
          onClick={() => setIsAddCourseOpen(true)}
          className="flex-shrink-0 px-8 py-3 text-sm font-medium bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Курс
        </button>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500 p-4">Загрузка...</div>
      )}
      {error && (
        <div className="text-sm text-red-500 p-4">{error}</div>
      )}

      {!isLoading && !error && (
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">No courses found in this category.</p>
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
