"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Mail, BookOpen, GraduationCap, UsersRound, Send, DollarSign, CreditCard, UserCircle2, Tag } from "lucide-react"

function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const t = setTimeout(() => setIsAnimating(true), 50)
      return () => clearTimeout(t)
    } else {
      setIsAnimating(false)
      const t = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? "bg-black/50" : "bg-black/0"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl transition-all duration-300 ${
          isAnimating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        <p className="text-base font-bold text-black m-4 text-center">
          Вы уверены, что хотите удалить эту запись?
        </p>
        <p className="text-sm text-gray-500 mb-6 text-center">Это действие необратимо.</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-full border-2 border-gray-300 text-black hover:bg-gray-50"
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            className="flex-1 rounded-full bg-[#ff1ef7] hover:bg-[#e000dc] text-white border-0"
            onClick={onConfirm}
          >
            Удалить
          </Button>
        </div>
      </div>
    </div>
  )
}

interface GroupCardProps {
  offerId: string
  bookingId?: number
  discipline: string
  faculty: string
  program: string
  modules: number[]
  groupsCount: number
  managerFirstName?: string | null
  managerLastName?: string | null
  studentFirstName?: string
  studentLastName?: string
  studentEmail?: string
  studentTelegram?: string
  paymentType?: "money" | "credits" | null
  bookingStatus?: "pending" | "active"
  hideAssistantName?: boolean
  onMoreDetails?: () => void
  onSelectAssistant?: () => void
  onAccept?: () => void
  onDelete?: () => void
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
        <div className="flex items-center gap-1 mb-1">
          <UsersRound className="h-3 w-3 flex-shrink-0" style={{ color: "#2300fa" }} />
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

// ─── Card: Groups without an assistant ───────────────────────────────────────
function NoAssistantCard({ discipline, faculty, program, modules, groupsCount, managerFirstName, managerLastName, onSelectAssistant }: GroupCardProps) {
  const managerName = managerFirstName && managerLastName
    ? `${managerLastName} ${managerFirstName}`
    : "—"

  return (
    <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
      <CardContent className="px-4 pb-1 flex-1 space-y-2.5">

        {/* Each field on its own row, 2px gap */}
        <div className="flex flex-col gap-2">
          <InfoRow icon={<Tag className="h-3.5 w-3.5 text-black" />} label="Дисциплина" value={discipline} />
          <InfoRow icon={<UserCircle2 className="h-3.5 w-3.5 text-black" />} label="Создано" value={managerName} />
          <InfoRow icon={<GraduationCap className="h-3.5 w-3.5 text-black" />} label="Факультет" value={faculty} />
          <InfoRow icon={<BookOpen className="h-3.5 w-3.5 text-black" />} label="Образовательная программа" value={program} />
        </div>

        {/* Groups count + Modules */}
        <ModulesRow groupsCount={groupsCount} modules={modules} />
      </CardContent>

      <div className="mx-4 h-px bg-gray-100" />
      <CardFooter className="px-4">
        <Button
          className="w-full h-9 text-sm font-medium bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black rounded-full transition-colors"
          onClick={onSelectAssistant}
        >
          Выбрать ассистента
        </Button>
      </CardFooter>
    </Card>
  )
}

// ─── Card: My groups (assistant assigned) ────────────────────────────────────
function MyGroupCard({
  discipline, faculty, program, modules, groupsCount,
  studentFirstName, studentLastName, studentEmail, studentTelegram,
  paymentType, bookingStatus, onMoreDetails, onAccept, onDelete,
}: GroupCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isMoney = paymentType === "money"
  const isCredits = paymentType === "credits"
  const isPending = bookingStatus === "pending"

  return (
    <>
      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete?.(); setConfirmOpen(false) }}
      />
      <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
        <CardContent className="px-4 pb-2 flex-1 space-y-2.5">

          {/* Student name + delete + payment badge */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-black leading-tight">
              {studentLastName} {studentFirstName}
            </h2>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {(isMoney || isCredits) && (
                <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                  isMoney ? "bg-green-50 border border-green-200" : "bg-purple-50 border border-purple-200"
                }`}>
                  {isMoney
                    ? <DollarSign className="h-3 w-3 text-green-600" />
                    : <CreditCard className="h-3 w-3 text-purple-600" />
                  }
                  <span className={`text-[10px] font-semibold ${isMoney ? "text-green-700" : "text-purple-700"}`}>
                    {isMoney ? "Оплата" : "Кредиты"}
                  </span>
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ff1ef7] hover:text-[#ff1ef7] hover:bg-red-50" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Email + Telegram side by side */}
          <div className="grid grid-cols-2 gap-2">
            <InfoRow icon={<Mail className="h-3.5 w-3.5 text-black" />} label="Email" value={studentEmail || "—"} />
            <InfoRow icon={<Send className="h-3.5 w-3.5 text-black" />} label="Telegram" value={studentTelegram || "—"} />
          </div>

          {/* Discipline */}
          <InfoRow icon={<Tag className="h-3.5 w-3.5 text-black" />} label="Дисциплина" value={discipline} />

          {/* Faculty */}
          <InfoRow icon={<GraduationCap className="h-3.5 w-3.5 text-black" />} label="Факультет" value={faculty} />

          {/* Program */}
          <InfoRow icon={<BookOpen className="h-3.5 w-3.5 text-black" />} label="Образовательная программа" value={program} />

          {/* Groups count + Modules */}
          <ModulesRow groupsCount={groupsCount} modules={modules} />
        </CardContent>

        <div className="mx-4 h-px bg-gray-100 mb-1" />
        <CardFooter className="px-4">
          {isPending ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-sm font-medium bg-transparent border-2 border-red-400 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  onClick={() => setConfirmOpen(true)}
                >
                  Отказаться
                </Button>
                <Button
                  className="flex-1 h-9 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                  onClick={onAccept}
                >
                  Добавить
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full h-9 text-sm font-medium bg-transparent border-2 border-gray-400 text-black hover:bg-gray-100 rounded-full transition-colors"
                onClick={onMoreDetails}
              >
                Об ассистенте
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-9 text-sm font-medium bg-transparent border-2 border-blue-600 text-black hover:bg-blue-600 hover:text-white rounded-full transition-colors"
              onClick={onMoreDetails}
            >
              Подробнее
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────
export function GroupCard(props: GroupCardProps) {
  if (props.hideAssistantName) {
    return <NoAssistantCard {...props} />
  }
  return <MyGroupCard {...props} />
}
