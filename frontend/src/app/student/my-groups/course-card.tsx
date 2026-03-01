"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { Mail, BookOpen, GraduationCap, Users } from "lucide-react"
import { CourseCardProps } from "../types"

function getPricePerMonth(discipline: string): number {
  const lower = discipline.toLowerCase()
  if (lower.includes("машинное обучение") || lower.includes("анализ данных")) return 6000
  if (lower.includes("python") || lower.includes("питон")) return 5000
  if (lower.includes("математик")) return 4000
  return 0
}

function calculateCost(discipline: string, numberOfGroups: number, duration: number[]): number {
  const price = getPricePerMonth(discipline)
  if (price === 0) return 0
  const totalMonths = duration.reduce((sum, mod) => sum + (mod <= 2 ? 2 : 3), 0)
  return price * totalMonths * numberOfGroups
}

export function CourseCard({
  discipline,
  teacherName,
  email,
  program,
  numberOfGroups,
  duration
}: CourseCardProps) {

  const cost = calculateCost(discipline, numberOfGroups, duration)

  return (
    <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
        <h2 className="text-base font-bold text-[#000000] min-h-[32px] leading-tight">
          {teacherName}
        </h2>
        {cost > 0 && (
          <span className="text-xs font-semibold border border-gray-300 rounded-full px-2 py-0.5 text-gray-500 whitespace-nowrap ml-2 flex-shrink-0 self-start">
            ~{cost.toLocaleString("ru-RU")}₽
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-4 flex-1">
        <div className="flex items-start gap-2.5 h-[44px]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#DCFF05" }}
          >
            <GraduationCap className="h-4 w-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
              Discipline
            </p>
            <p className="text-xs text-black leading-tight line-clamp-2">{discipline}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 h-[44px]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#DCFF05" }}
          >
            <Mail className="h-4 w-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
              Contacts
            </p>
            <p className="text-xs text-black leading-tight line-clamp-2">{email}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 h-[44px]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#DCFF05" }}
          >
            <BookOpen className="h-4 w-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
              Program
            </p>
            <p className="text-xs font-medium text-black leading-tight line-clamp-2">{program}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 h-[44px]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#DCFF05" }}
          >
            <Users className="h-4 w-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
              Number of groups
            </p>
            <p className="text-xs font-medium text-black capitalize leading-tight">{numberOfGroups}</p>
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: "#2300fa" }}>
            Duration
          </p>
          <div className="flex">
            {[1, 2, 3, 4].map((moduleNum, index) => (
              <div
                key={moduleNum}
                className={`flex-1 h-9 flex items-center justify-center text-sm font-semibold transition-all ${
                  duration.includes(moduleNum) ? "bg-black shadow-md" : "bg-gray-200 text-gray-400"
                } ${index === 0 ? "rounded-l-full" : ""} ${index === 3 ? "rounded-r-full" : ""}`}
                style={duration.includes(moduleNum) ? { color: "#DCFF05" } : {}}
              >
                {moduleNum}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
