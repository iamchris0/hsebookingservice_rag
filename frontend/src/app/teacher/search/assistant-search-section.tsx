"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toDisplayDiscipline } from "@/lib/disciplines"
import { AssistantCard } from "./assistant-card"
import { MultiSelectFilter } from "../components/multi-select-filter"
import { Assistant, DisciplineOption, StudentSearchResult } from "../types"

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

/**
 * Rank of a student for the selected disciplines (lower comes first), or null
 * if the student should be hidden:
 *   0 — 1st priority is one of the selected disciplines
 *   1 — 2nd priority is one of the selected disciplines
 *   2 — no match, but the 2nd priority was skipped (still open to other disciplines)
 */
function disciplineRank(student: StudentSearchResult, selected: string[]): number | null {
  const p1 = student.preferences.find((p) => p.priority === 1)
  const p2 = student.preferences.find((p) => p.priority === 2)
  if (p1 && selected.includes(p1.discipline)) return 0
  if (p2 && selected.includes(p2.discipline)) return 1
  if (!p2) return 2
  return null
}

export function AssistantSearchSection() {
  const [students, setStudents] = useState<StudentSearchResult[]>([])
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/teacher/search`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Не удалось загрузить список ассистентов")
      }

      const data: StudentSearchResult[] = await response.json()
      setStudents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`${BACKEND_URL}/api/disciplines`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DisciplineOption[]) => setDisciplines(data))
      .catch(() => setDisciplines([]))
  }, [])

  const disciplineOptions = disciplines.map((d) => ({ value: d.name, label: toDisplayDiscipline(d.name) }))

  const programOptions = useMemo(
    () =>
      [...new Set(students.map((s) => s.edu_program).filter((p): p is string => Boolean(p)))]
        .sort((a, b) => a.localeCompare(b, "ru"))
        .map((p) => ({ value: p, label: p })),
    [students]
  )

  const filtered = students
    .filter((s) =>
      nameFilter
        ? `${s.last_name} ${s.first_name}`.toLowerCase().includes(nameFilter.toLowerCase())
        : true
    )
    .filter((s) =>
      selectedPrograms.length > 0 ? s.edu_program != null && selectedPrograms.includes(s.edu_program) : true
    )
    .map((s) => ({
      student: s,
      rank: selectedDisciplines.length > 0 ? disciplineRank(s, selectedDisciplines) : 0,
    }))
    .filter((r): r is { student: StudentSearchResult; rank: number } => r.rank !== null)
    // Stable sort keeps the backend's alphabetical order within each rank
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.student)

  const filtersActive =
    nameFilter.trim().length > 0 || selectedDisciplines.length > 0 || selectedPrograms.length > 0

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
        <MultiSelectFilter
          placeholder="Дисциплина"
          options={disciplineOptions}
          selected={selectedDisciplines}
          onChange={setSelectedDisciplines}
        />
        <MultiSelectFilter
          placeholder="Обр. программа"
          options={programOptions}
          selected={selectedPrograms}
          onChange={setSelectedPrograms}
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
                ? "Попробуйте изменить поисковый запрос или фильтры"
                : "Как только студенты зарегистрируются, они появятся здесь"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((student) => (
            <AssistantCard
              key={student.id}
              {...mapStudent(student)}
              student={student}
              onBooked={fetchStudents}
            />
          ))}
        </div>
      )}
    </div>
  )
}
