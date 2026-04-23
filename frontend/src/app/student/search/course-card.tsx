"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Mail, BookOpen, GraduationCap, Users } from "lucide-react"
import { SearchCourseCardProps } from "../types"
import { SelectCourseDialog } from "./select-course-dialog"
import { Button } from "@/components/ui/button"

export function CourseCard({
  id,
  discipline,
  teacherName,
  email,
  program,
  availableGroups,
  modules,
}: SearchCourseCardProps) {
  const [isSelected, setIsSelected] = useState(false)

  return (
    <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
        <h2 className="text-base font-bold text-[#000000] min-h-[32px] leading-tight">
          {teacherName}
        </h2>
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
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>Дисциплина</p>
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
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>Контакты преподавателя</p>
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
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>Образовательная программа</p>
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
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>Кол-во свободных групп</p>
            <p className="text-xs font-medium text-black capitalize leading-tight">{availableGroups}</p>
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: "#2300fa" }}>Учебные модули</p>
          <div className="flex">
            {[1, 2, 3, 4].map((moduleNum, index) => (
              <div
                key={moduleNum}
                className={`flex-1 h-9 flex items-center justify-center text-sm font-semibold transition-all ${
                  modules.includes(moduleNum) ? "bg-black shadow-md" : "bg-gray-200 text-gray-400"
                } ${index === 0 ? "rounded-l-full" : ""} ${index === 3 ? "rounded-r-full" : ""}`}
                style={modules.includes(moduleNum) ? { color: "#DCFF05" } : {}}
              >
                {moduleNum}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1 rounded-full border-[#000000] bg-[#DCFF05] hover:bg-[#c9eb00] text-black text-sm h-9"
            onClick={() => setIsSelected(true)}
          >
            Выбрать курс
          </Button>
        </div>

        <SelectCourseDialog
          isOpen={isSelected}
          onClose={() => setIsSelected(false)}
          offerId={id}
          teacherName={teacherName}
          discipline={discipline}
          program={program}
          availableGroups={availableGroups}
        />
      </CardContent>
    </Card>
  )
}
