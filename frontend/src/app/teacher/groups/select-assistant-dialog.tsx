"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, Users, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StudentSearchResult } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface SelectAssistantDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (student: StudentSearchResult) => void
  offerId: number
  offerDiscipline: string
  offerFaculty: string
  offerProgram: string
  offerGroups: number
  offerAvailableGroups: number
}

function PrefLine({ priority, discipline }: { priority: number; discipline: string }) {
  return (
    <span className="text-[11px] text-gray-500">
      {"• "}
      <span className="font-semibold text-gray-700">{priority}й приоритет:</span>
      {` ${discipline}`}
    </span>
  )
}

function AssistantRow({
  student,
  onSelect,
}: {
  student: StudentSearchResult
  onSelect: () => void
}) {
  const top2 = student.preferences.slice(0, 2)

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black">
          {student.last_name} {student.first_name}
        </p>

        <div className="mt-1 pl-3 flex flex-col gap-0.5">
          {top2.length > 0 ? (
            top2.map((p) => (
              <PrefLine key={p.priority} priority={p.priority} discipline={p.discipline} />
            ))
          ) : (
            <span className="text-[11px] text-gray-400 italic">Нет предпочтений</span>
          )}

          {(() => {
            const parts: string[] = []
            if (student.edu_program) parts.push(student.edu_program)
            if (student.study_year != null) parts.push(`${student.study_year} курс`)
            const suffix = parts.length > 0 ? ` (${parts.join(", ")})` : ""
            const value = student.edu_faculty ? `${student.edu_faculty}${suffix}` : null
            return value ? (
              <span className="text-[11px] text-gray-500">{"• "}{value}</span>
            ) : null
          })()}
        </div>
      </div>
      <Button
        size="sm"
        className="flex-shrink-0 h-8 rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black text-xs font-medium"
        onClick={onSelect}
      >
        Выбрать
      </Button>
    </div>
  )
}

export function SelectAssistantDialog({
  isOpen,
  onClose,
  onSelect,
  offerId,
  offerDiscipline,
  offerFaculty,
  offerProgram,
  offerGroups,
  offerAvailableGroups,
}: SelectAssistantDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [step, setStep] = useState<"list" | "confirm">("list")
  const [pendingStudent, setPendingStudent] = useState<StudentSearchResult | null>(null)
  const [numGroups, setNumGroups] = useState(1)
  const [paymentType, setPaymentType] = useState<"money" | "credits">("money")
  const [students, setStudents] = useState<StudentSearchResult[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxGroups = Math.min(4, offerAvailableGroups)

  // Fetch students once when first opened
  useEffect(() => {
    if (!isOpen || students.length > 0) return

    const fetchStudents = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/teacher/search`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error("Не удалось загрузить список ассистентов")
        const data: StudentSearchResult[] = await response.json()
        setStudents(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [isOpen, students.length])

  // Animation lifecycle
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setIsAnimating(true)
          inputRef.current?.focus()
        })
      )
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setNameFilter("")
        setStep("list")
        setPendingStudent(null)
        setNumGroups(1)
        setPaymentType("money")
        setSaveError(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const filtered = students.filter((s) => {
    if (!nameFilter.trim()) return true
    return `${s.last_name} ${s.first_name}`.toLowerCase().includes(nameFilter.toLowerCase())
  })

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleRowSelect = (student: StudentSearchResult) => {
    setPendingStudent(student)
    setNumGroups(1)
    setPaymentType("money")
    setSaveError(null)
    setStep("confirm")
  }

  const handleConfirm = async () => {
    if (!pendingStudent) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/teacher/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId, studentId: pendingStudent.id, numGroups, paymentType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Не удалось сохранить бронирование")
      }

      onSelect(pendingStudent)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: isAnimating ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        transition: "background-color 300ms ease",
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 flex flex-col shadow-2xl overflow-hidden"
        style={{
          maxHeight: "85vh",
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
          transition: "opacity 300ms ease, transform 300ms ease",
        }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#2300fa]">
              {step === "list" ? "Выбрать ассистента" : "Подтверждение"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>

          {step === "list" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                ref={inputRef}
                placeholder="Поиск по ФИО..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-9 rounded-full bg-gray-50 border-gray-200 text-sm h-9"
              />
            </div>
          )}

          <div className="h-px bg-gray-100 mt-3" />
        </div>

        {/* ── Step: list ── */}
        {step === "list" && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div
                  className="w-7 h-7 rounded-full border-[3px] animate-spin"
                  style={{ borderColor: "#2300fa", borderTopColor: "transparent" }}
                />
                <span className="text-sm text-gray-400">Загрузка...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">
                    {nameFilter.trim() ? "Никого не найдено" : "Нет доступных ассистентов"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {nameFilter.trim()
                      ? "Попробуйте изменить запрос"
                      : "Студенты ещё не зарегистрировались"}
                  </p>
                </div>
              </div>
            ) : (
              filtered.map((student) => (
                <AssistantRow
                  key={student.id}
                  student={student}
                  onSelect={() => handleRowSelect(student)}
                />
              ))
            )}
          </div>
        )}

        {/* ── Step: confirm ── */}
        {step === "confirm" && pendingStudent && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 px-5 py-4 space-y-4">
              {/* Confirmation text */}
              <p className="text-sm text-black leading-relaxed">
                Вы подтверждаете бронирование ассистента{" "}
                <span className="font-semibold">{pendingStudent.last_name}</span>{" "}
                для дисциплины{" "}
                <span className="font-semibold">{offerDiscipline}</span>{" "}
                для факультета{" "}
                <span className="font-semibold">{offerFaculty}</span>{" "}
                (обр. программа{" "}
                <span className="font-semibold">{offerProgram}</span>
                ), количество групп —{" "}
                <span className="font-semibold">{numGroups}</span>, формат оплаты —{" "}
                <span className="font-semibold">{paymentType === "money" ? "оплата" : "кредиты"}</span>.
              </p>

              {/* Group count selector */}
              <div>
                <p className="text-xs font-medium text-[#2300fa] mb-2">
                  Количество групп
                  <span className="text-gray-400 font-normal ml-1">
                    (макс. {maxGroups} из {offerGroups})
                  </span>
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => {
                    const disabled = n > maxGroups
                    const active = numGroups === n
                    return (
                      <button
                        key={n}
                        disabled={disabled}
                        onClick={() => setNumGroups(n)}
                        className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                          disabled
                            ? "bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed"
                            : active
                            ? "bg-[#2300fa] text-white border-[#2300fa]"
                            : "bg-white text-black border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Payment format selector */}
              <div>
                <p className="text-xs font-medium text-[#2300fa] mb-2">Формат оплаты</p>
                <div className="flex gap-2">
                  {([
                    { value: "money", label: "Оплата" },
                    { value: "credits", label: "Кредиты" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPaymentType(option.value)}
                      className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                        paymentType === option.value
                          ? "bg-[#2300fa] text-white border-[#2300fa]"
                          : "bg-white text-black border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-red-500">{saveError}</p>
              )}
            </div>

            <div className="px-5 pb-4 flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                disabled={isSaving}
                className="flex-1 h-9 rounded-full border-gray-300 text-black text-sm font-medium hover:bg-gray-50"
                onClick={() => setStep("list")}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Назад
              </Button>
              <Button
                disabled={isSaving}
                className="flex-1 h-9 rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black text-sm font-medium disabled:opacity-60"
                onClick={handleConfirm}
              >
                {isSaving ? "Сохранение..." : "Подтвердить"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
