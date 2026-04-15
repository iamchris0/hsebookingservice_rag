"use client"

import { useState, useEffect, useMemo } from "react"
import { Filters } from "../components/filters"
import { CourseCard } from "./course-card"
import { SearchCourseCardProps } from "../types"
import { toDisplayDiscipline } from "@/lib/disciplines"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export default function SearchPage() {
  const [offers, setOffers] = useState<SearchCourseCardProps[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [disciplineFilter, setDisciplineFilter] = useState("")
  const [programFilter, setProgramFilter] = useState("")
  const [moduleFilter, setModuleFilter] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/student/search`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Не удалось загрузить предложения")
        }

        const data = await response.json()

        const mapped: SearchCourseCardProps[] = data.map((row: {
          id: number
          discipline: string
          program: string
          modules: number[]
          available_groups: number
          first_name: string
          last_name: string
          teacher_email: string
        }) => ({
          id: row.id,
          discipline: toDisplayDiscipline(row.discipline),
          program: row.program,
          modules: row.modules ?? [],
          availableGroups: Number(row.available_groups),
          teacherName: `${row.last_name} ${row.first_name}`,
          email: row.teacher_email,
        }))

        setOffers(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOffers()
  }, [])

  // Unique programs derived from loaded offers
  const programs = useMemo(
    () => [...new Set(offers.map((o) => o.program).filter(Boolean))].sort(),
    [offers]
  )

  const filteredOffers = offers.filter((offer) => {
    if (nameFilter && !offer.teacherName.toLowerCase().includes(nameFilter.toLowerCase())) {
      return false
    }
    if (disciplineFilter && offer.discipline !== disciplineFilter) {
      return false
    }
    if (programFilter && offer.program !== programFilter) {
      return false
    }
    if (moduleFilter.length > 0 && !moduleFilter.every((m) => offer.modules.includes(m))) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredOffers.map((offer) => (
          <CourseCard key={offer.id} {...offer} />
        ))}
      </div>
      {filteredOffers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-base font-semibold text-black">Ничего не найдено</p>
          <p className="text-sm text-gray-400 mt-1">Попробуйте изменить параметры фильтра</p>
        </div>
      )}
    </div>
  )
}
