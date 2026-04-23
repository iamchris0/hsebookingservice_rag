"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AssistantCard } from "./assistant-card"
import { Assistant, StudentSearchResult } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

function mapStudent(student: StudentSearchResult): Assistant {
  const filledPrefs = [...student.preferences.slice(0, 2)]
  while (filledPrefs.length < 2) {
    filledPrefs.push({ priority: filledPrefs.length + 1, discipline: "—", desired_group_size: null })
  }

  return {
    id: String(student.id),
    name: `${student.last_name} ${student.first_name}`,
    skills: filledPrefs.map((p) => ({
      number: p.priority,
      name: p.discipline,
      groups: p.desired_group_size,
    })),
    faculty: student.edu_faculty ?? "—",
    trainingProgram: student.edu_program ?? "—",
    email: student.email,
    telegram: student.telegram,
    isFavorite: false,
    currentAssignments: [],
  }
}

export function AssistantSearchSection() {
  const [students, setStudents] = useState<Assistant[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/teacher/search`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Не удалось загрузить список ассистентов")
        }

        const data: StudentSearchResult[] = await response.json()
        setStudents(data.map(mapStudent))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [])

  const filtered = students.filter((s) =>
    nameFilter ? s.name.toLowerCase().includes(nameFilter.toLowerCase()) : true
  )

  const filtersActive = nameFilter.trim().length > 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Поиск ассистента</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Поиск по ФИО..."
          className="w-[220px] bg-white rounded-full border-border"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-[3px] animate-spin"
              style={{ borderColor: "#2300fa", borderTopColor: "transparent" }}
            />
            <span className="text-sm text-gray-400">Загрузка...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-medium text-red-500">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-black">
              {filtersActive ? "Никого не найдено" : "Пока нет зарегистрированных ассистентов"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filtersActive
                ? "Попробуйте изменить поисковый запрос"
                : "Как только студенты зарегистрируются, они появятся здесь"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((assistant) => (
            <AssistantCard key={assistant.id} {...assistant} />
          ))}
        </div>
      )}
    </div>
  )
}
