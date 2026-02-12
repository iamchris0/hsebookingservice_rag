"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { GroupCard } from "./group-card"
import { Brain, BarChart3, Code, Calculator } from "lucide-react"
import { GroupFilters } from "../components/group-filters"
import { CollapsibleSection } from "./collapsible-section"

const disciplineStats = [
  {
    id: "ml",
    name: "Machine Learning",
    count: 24,
    icon: Brain,
    color: "#8B5CF6",
  },
  {
    id: "da",
    name: "Data Analysis",
    count: 18,
    icon: BarChart3,
    color: "#3B82F6",
  },
  {
    id: "py",
    name: "Python",
    count: 32,
    icon: Code,
    color: "#10B981",
  },
  {
    id: "math",
    name: "Mathematics",
    count: 15,
    icon: Calculator,
    color: "#F59E0B",
  },
]

// Groups without an assistant (no name, payment is "-")
const groupsWithoutAssistant = [
  {
    id: "no-1",
    email: "group101@university.edu",
    program: "Программа двух дипломов НИУ ВШЭ и Университета Кёнхи",
    discipline: "Машинное обучение",
    studyPeriod: "1-2",
  },
  {
    id: "no-2",
    email: "group102@university.edu",
    program: "Управление в креативных индустриях",
    discipline: "Программирование на Python",
    studyPeriod: "2-3",
  },
  {
    id: "no-3",
    email: "group103@university.edu",
    program: "Экономика и статистика",
    discipline: "Анализ данных",
    studyPeriod: "3-4",
  },
]

// Мои группы (with assistant assigned)
const myGroups = [
  {
    id: "my-1",
    lastName: "Smith",
    firstName: "John",
    email: "john.smith@university.edu",
    program: "Программа двух дипломов НИУ ВШЭ и Университета Кёнхи",
    discipline: "Машинное обучение",
    studyPeriod: "1",
    paymentFormat: "money",
  },
  {
    id: "my-2",
    lastName: "Johnson",
    firstName: "Emma",
    email: "emma.johnson@university.edu",
    program: "Управление в креативных индустриях",
    discipline: "Программирование на Python",
    studyPeriod: "2-3",
    paymentFormat: "credits",
  },
  {
    id: "my-3",
    lastName: "Williams",
    firstName: "Michael",
    email: "michael.williams@university.edu",
    program: "Экономика и статистика",
    discipline: "Цифровая грамотность",
    studyPeriod: "3-4",
    paymentFormat: "money",
  },
  {
    id: "my-4",
    lastName: "Brown",
    firstName: "Sophia",
    email: "sophia.brown@university.edu",
    program: "География глобальных изменений и геоинформационные технологии",
    discipline: "Анализ данных",
    studyPeriod: "1-2",
    paymentFormat: "credits",
  },
]

// Archive groups
const archiveGroups = [
  {
    id: "arch-1",
    lastName: "Davis",
    firstName: "Oliver",
    email: "oliver.davis@university.edu",
    program: "Organic Chemistry",
    discipline: "Chemistry",
    studyPeriod: "2-3",
    paymentFormat: "money",
  },
  {
    id: "arch-2",
    lastName: "Miller",
    firstName: "Ava",
    email: "ava.miller@university.edu",
    program: "Physics Advanced",
    discipline: "Quantum Mechanics",
    studyPeriod: "1-2",
    paymentFormat: "credits",
  },
]

export function MyGroupsSection() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">

      {/* Discipline Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {disciplineStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.id}
              className="p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-black">{stat.count}</p>
                  <p className="text-xs text-gray-500 truncate">{stat.name}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <GroupFilters />

      {/* Section 1: Groups without an assistant */}
      <CollapsibleSection
        title="Groups without an assistant"
        count={groupsWithoutAssistant.length}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupsWithoutAssistant.map((group) => (
            <GroupCard key={group.id} {...group} hideAssistantName={true} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Section 2: Мои группы */}
      <CollapsibleSection
        title="Мои группы"
        count={myGroups.length}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {myGroups.map((group) => (
            <GroupCard key={group.id} {...group} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Section 3: Archive groups (collapsed by default) */}
      <CollapsibleSection
        title="Archive groups"
        count={archiveGroups.length}
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {archiveGroups.map((group) => (
            <GroupCard key={group.id} {...group} />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  )
}
