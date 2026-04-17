"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, BookOpen, GraduationCap, UsersRound, Tag } from "lucide-react"
import { MyGroupCardProps } from "../types"
import { LearnMoreDialog } from "./learnmore-dialog.tsx"

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#DCFF05" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: "#2300fa" }}>{label}</p>
        <p className="text-xs font-medium text-black leading-tight line-clamp-2">{value || "—"}</p>
      </div>
    </div>
  )
}

function ModulesRow({ groupsCount, modules }: { groupsCount: number; modules: number[] }) {
  return (
    <div className="flex gap-2 items-end">
      <div style={{ flex: "0 0 20%" }}>
        <div className="flex items-center gap-1 m-">
          <p className="text-[10px]" style={{ color: "#2300fa" }}>Группы</p>
        </div>
        <div className="h-8 flex items-center justify-center text-sm font-bold bg-gray-100 rounded-lg">
          {groupsCount}
        </div>
      </div>
      <div style={{ flex: "0 0 calc(80% - 0.5rem)" }}>
        <p className="text-[10px] mb-1" style={{ color: "#2300fa" }}>Учебные модули</p>
        <div className="flex">
          {[1, 2, 3, 4].map((moduleNum, index) => (
            <div
              key={moduleNum}
              className={`flex-1 h-8 flex items-center justify-center text-sm font-semibold transition-all ${
                modules.includes(moduleNum) ? "bg-black shadow-md" : "bg-gray-200 text-gray-400"
              } ${index === 0 ? "rounded-l-full" : ""} ${index === 3 ? "rounded-r-full" : ""}`}
              style={modules.includes(moduleNum) ? { color: "#DCFF05" } : {}}
            >
              {moduleNum}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function calculateCost(discipline: string, numberOfGroups: number, modules: number[]): number {
  const lower = discipline.toLowerCase()
  let pricePerMonth = 0
  if (lower.includes("анализ данных") || lower.includes("машинное обучение")) pricePerMonth = 6000
  else if (lower.includes("программирование")) pricePerMonth = 5000
  else if (lower.includes("цифровая грамотность")) pricePerMonth = 4000
  if (pricePerMonth === 0) return 0
  const totalMonths = modules.length
  return pricePerMonth * totalMonths * numberOfGroups
}

export function CourseCard(props: MyGroupCardProps) {
  const { discipline, teacherName, email, faculty, program, numberOfGroups, modules, paymentType } = props
  const [dialogOpen, setDialogOpen] = useState(false)
  const cost = paymentType === "money" ? calculateCost(discipline, numberOfGroups, modules) : 0

  return (
    <>
      <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
        <CardContent className="px-4 flex-1 space-y-2.5">

          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-black leading-tight">
              {teacherName}
            </h2>
            {cost > 0 && (
              <span className="text-xs font-semibold bg-gray-100 rounded-full px-2 py-0.5 text-gray-500 whitespace-nowrap flex-shrink-0">
                ~{cost.toLocaleString("ru-RU")}₽
              </span>
            )}
          </div>

          <InfoRow icon={<Tag className="h-3.5 w-3.5 text-black" />} label="Дисциплина" value={discipline} />
          <InfoRow icon={<Mail className="h-3.5 w-3.5 text-black" />} label="Контакты преподавателя" value={email} />
          <InfoRow icon={<GraduationCap className="h-3.5 w-3.5 text-black" />} label="Факультет" value={faculty} />
          <InfoRow icon={<BookOpen className="h-3.5 w-3.5 text-black" />} label="Программа" value={program} />

          <ModulesRow groupsCount={numberOfGroups} modules={modules} />
        </CardContent>

        <div className="mx-4 h-px bg-gray-100" />
        <CardFooter className="px-4">
          <Button
            variant="outline"
            className="w-full h-9 text-sm font-medium bg-transparent border-2 border-blue-600 text-black hover:bg-blue-600 hover:text-white rounded-full transition-colors"
            onClick={() => setDialogOpen(true)}
          >
            Подробнее
          </Button>
        </CardFooter>
      </Card>

      <LearnMoreDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        group={props}
      />
    </>
  )
}
