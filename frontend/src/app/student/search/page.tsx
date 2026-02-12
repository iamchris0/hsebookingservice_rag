"use client"

import { useState } from "react"
import { Filters } from "../components/filters"
import { mock } from "node:test"
import { CourseCard } from "../search/course-card"

const mockGroups = [
  {
    id: 1,
    discipline: "Машинное обучение",
    teacherName: "Иванов Иван Иванович",
    email: "ivanov@university.edu",
    program: "Программа двух дипломов НИУ ВШЭ и Университета Кёнхи",
    numberOfGroups: 3,
    duration: [1, 2],
    links: [],
  },
  {
    id: 2,
    discipline: "Программирование на Python",
    teacherName: "Петрова Мария Сергеевна",
    email: "petrova@university.edu",
    program: "Управление в креативных индустриях",
    numberOfGroups: 2,
    duration: [2, 3],
    links: [],
  },
  {
    id: 3,
    discipline: "Анализ данных",
    teacherName: "Сидоров Алексей Петрович",
    email: "sidorov@university.edu",
    program: "Экономика и статистика",
    numberOfGroups: 4,
    duration: [1, 2, 3],
    links: [],
  },
]

export default function SearchPage() {
  const [nameFilter, setNameFilter] = useState("")

  const filteredGroups = mockGroups.filter((group) => {
    if (!nameFilter) return true
    return group.teacherName.toLowerCase().includes(nameFilter.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <Filters onNameChange={setNameFilter} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGroups.map((group) => (
          <CourseCard key={group.id} {...group} />
        ))}
      </div>
    </div>
  )
}
