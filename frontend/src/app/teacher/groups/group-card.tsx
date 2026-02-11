"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Mail, BookOpen, GraduationCap, CreditCard, DollarSign } from "lucide-react"

interface GroupCardProps {
  id: string
  lastName?: string
  firstName?: string
  email: string
  program: string
  discipline: string
  studyPeriod: string
  paymentFormat?: string
  hideAssistantName?: boolean
}

export function GroupCard({
  lastName,
  firstName,
  email,
  program,
  discipline,
  studyPeriod,
  paymentFormat,
  hideAssistantName = false,
}: GroupCardProps) {
  const parseModules = (period: string): number[] => {
    if (period.includes("-")) {
      const [start, end] = period.split("-").map((n) => Number.parseInt(n.trim()))
      const modules: number[] = []
      for (let i = start; i <= end; i++) {
        modules.push(i)
      }
      return modules
    }
    return period.split(",").map((m) => Number.parseInt(m.trim()))
  }

  const modules = parseModules(studyPeriod)
  const isMoneyPayment = paymentFormat === "money"

  return (
    <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
        {!hideAssistantName && (
          <h2 className="text-base font-bold text-[#000000] min-h-[32px] leading-tight">
            {lastName} {firstName}
          </h2>
        )}
        {hideAssistantName && <div className="flex-1" />}
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ff1ef7] hover:text-[#ff1ef7] hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-4 flex-1">
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
            <GraduationCap className="h-4 w-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
              Discipline
            </p>
            <p className="text-xs font-medium text-black leading-tight line-clamp-2">{discipline}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 h-[44px]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#DCFF05" }}
          >
            {isMoneyPayment ? (
              <DollarSign className="h-4 w-4 text-black" />
            ) : (
              <CreditCard className="h-4 w-4 text-black" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
              Payment
            </p>
            <p className="text-xs font-medium text-black capitalize leading-tight">{paymentFormat || "-"}</p>
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: "#2300fa" }}>
            Study Modules
          </p>
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
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium bg-transparent border-2 border-blue-600 text-black hover:bg-blue-600 hover:text-white rounded-full transition-colors"
        >
          More Details
        </Button>
      </CardFooter>
    </Card>
  )
}
