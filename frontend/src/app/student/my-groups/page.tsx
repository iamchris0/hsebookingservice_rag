"use client"

import { useState, useEffect, useMemo } from "react"
import { GraduationCap, Search } from "lucide-react"
import { CourseCard } from "./course-card"
import { Filters } from "../components/filters"
import { MyGroupCardProps } from "../types"
import { toDisplayDiscipline } from "@/lib/disciplines"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "#f0f0ff" }}
        >
          <Search className="w-6 h-6" style={{ color: "#2300fa" }} />
        </div>
        <p className="text-base font-semibold text-black">Ничего не найдено</p>
        <p className="text-sm text-gray-400 mt-1">
          Попробуйте изменить параметры фильтра
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#DCFF05" }}
        >
          <GraduationCap className="w-11 h-11 text-black" />
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center"
          style={{ backgroundColor: "#2300fa" }}
        >
          <span className="text-white font-bold text-xs leading-none">0</span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-black mb-2">
        Пока нет записей
      </h2>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-8">
        Вы ещё не подали заявку ни на одну группу. Перейдите в поиск, чтобы найти подходящего преподавателя.
      </p>
    </div>
  )
}

export default function MyGroupsPage() {
  const [groups, setGroups] = useState<MyGroupCardProps[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [disciplineFilter, setDisciplineFilter] = useState("")
  const [programFilter, setProgramFilter] = useState("")
  const [moduleFilter, setModuleFilter] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/student/my-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Не удалось загрузить группы")
        }

        const data = await response.json()

        const mapped: MyGroupCardProps[] = data.map((row: {
          id: number
          num_groups: number
          discipline: string
          faculty: string
          program: string
          payment_type: "money" | "credits"
          modules: number[]
          links: { name: string; url: string }[]
          first_name: string
          last_name: string
          teacher_email: string
        }) => ({
          id: row.id,
          discipline: toDisplayDiscipline(row.discipline),
          numberOfGroups: row.num_groups,
          faculty: row.faculty ?? "",
          program: row.program,
          modules: row.modules ?? [],
          links: row.links ?? [],
          teacherName: `${row.last_name} ${row.first_name}`,
          email: row.teacher_email,
          paymentType: row.payment_type,
        }))

        setGroups(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [])

  // Unique programs from the student's own bookings
  const programs = useMemo(
    () => [...new Set(groups.map((g) => g.program).filter(Boolean))].sort(),
    [groups]
  )

  const isAnyFilterActive =
    nameFilter.length > 0 ||
    disciplineFilter.length > 0 ||
    programFilter.length > 0 ||
    moduleFilter.length > 0

  const filteredGroups = groups.filter((group) => {
    if (nameFilter && !group.teacherName.toLowerCase().includes(nameFilter.toLowerCase())) {
      return false
    }
    if (disciplineFilter && group.discipline !== disciplineFilter) {
      return false
    }
    if (programFilter && group.program !== programFilter) {
      return false
    }
    if (moduleFilter.length > 0 && !moduleFilter.every((m) => group.modules.includes(m))) {
      return false
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-[3px] animate-spin"
            style={{ borderColor: "#2300fa", borderTopColor: "transparent" }}
          />
          <span className="text-sm text-gray-400">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Filters
        programs={programs}
        selectedDiscipline={disciplineFilter}
        selectedProgram={programFilter}
        selectedModules={moduleFilter}
        onNameChange={setNameFilter}
        onDisciplineChange={setDisciplineFilter}
        onProgramChange={setProgramFilter}
        onModulesChange={setModuleFilter}
      />
      {filteredGroups.length === 0 ? (
        <EmptyState isFiltered={isAnyFilterActive} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGroups.map((group) => (
            <CourseCard key={group.id} {...group} />
          ))}
        </div>
      )}
    </div>
  )
}
