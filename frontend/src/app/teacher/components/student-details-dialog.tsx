"use client"

import { useState, useEffect } from "react"
import { X, User, GraduationCap, BookOpen, Heart, Mail, Send, Calendar, Globe, Phone } from "lucide-react"
import { StudentDetails } from "../types"
import { getQuestionsForDiscipline } from "@/app/survey/questions"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface StudentDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-bold text-[#2300fa]">{label}</span>
      </div>
      <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2 min-h-[36px]">{value || "—"}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-black mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

const DEBTS_LABELS: Record<string, string> = {
  no: "Нет",
  yes: "Да",
  little: "Да, но по уважительной причине",
}

function scoreLabel(score: string | null): string {
  if (!score) return "—"
  if (score === "-") return "Не сдавал(а)"
  return score
}

export function StudentDetailsDialog({ isOpen, onClose, studentId }: StudentDetailsDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [details, setDetails] = useState<StudentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const t = setTimeout(() => setIsAnimating(true), 50)
      return () => clearTimeout(t)
    } else {
      setIsAnimating(false)
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setDetails(null)
        setError(null)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !studentId) return

    const fetchDetails = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/teacher/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error("Не удалось загрузить анкету")
        setDetails(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetails()
  }, [isOpen, studentId])

  if (!isVisible) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const fullName = details
    ? [details.lastName, details.firstName, details.middleName].filter(Boolean).join(" ")
    : ""

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? "bg-black/50" : "bg-black/0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl w-full max-w-xl mx-4 p-2 overflow-hidden shadow-2xl transition-all duration-300 ${
          isAnimating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#2300fa]">
              {fullName || "Анкета ассистента"}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-[2px] bg-[#2300fa] mt-2" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto space-y-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-7 h-7 rounded-full border-[3px] animate-spin"
                style={{ borderColor: "#2300fa", borderTopColor: "transparent" }}
              />
              <span className="text-sm text-gray-400">Загрузка...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!isLoading && !error && details && (
            <>
              {/* Section 1: О себе */}
              <Section title="О себе">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon={<Mail className="w-3.5 h-3.5 text-[#2300fa]" />} label="Email" value={details.email} />
                  <InfoRow icon={<Send className="w-3.5 h-3.5 text-[#2300fa]" />} label="Telegram" value={details.telegram ?? ""} />
                  <InfoRow icon={<Calendar className="w-3.5 h-3.5 text-[#2300fa]" />} label="Дата рождения" value={details.birthday ?? ""} />
                  <InfoRow icon={<Globe className="w-3.5 h-3.5 text-[#2300fa]" />} label="Гражданство" value={details.citizenship ?? ""} />
                  <InfoRow icon={<Phone className="w-3.5 h-3.5 text-[#2300fa]" />} label="Телефон" value={details.phone ?? ""} />
                </div>
              </Section>

              {/* Section 2: Образование */}
              <Section title="Образование">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5 text-[#2300fa]" />} label="Факультет" value={details.eduFaculty ?? ""} />
                  <InfoRow icon={<BookOpen className="w-3.5 h-3.5 text-[#2300fa]" />} label="Образовательная программа" value={details.eduProgram ?? ""} />
                  <InfoRow icon={<User className="w-3.5 h-3.5 text-[#2300fa]" />} label="Курс" value={details.studyYear ? `${details.studyYear} курс` : ""} />
                  <InfoRow icon={<User className="w-3.5 h-3.5 text-[#2300fa]" />} label="Задолженности" value={details.debts ? (DEBTS_LABELS[details.debts] ?? details.debts) : ""} />
                  <InfoRow icon={<User className="w-3.5 h-3.5 text-[#2300fa]" />} label="Текущий рейтинг" value={details.eduRating ?? ""} />
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 grid grid-cols-2 px-3 py-1.5">
                    <span className="text-xs font-medium text-[#2300fa]">Экзамен</span>
                    <span className="text-xs font-medium text-[#2300fa]">Оценка</span>
                  </div>
                  {[
                    ["Цифровая грамотность и ИИ", details.digitalLiteracyScore],
                    ["Программирование", details.programmingScore],
                    ["Анализ данных", details.dataAnalysisScore],
                  ].map(([label, score]) => (
                    <div key={label} className="grid grid-cols-2 gap-2 px-3 py-2 border-t border-gray-100 items-center">
                      <span className="text-sm text-black">{label}</span>
                      <span className="text-sm text-black">{scoreLabel(score as string | null)}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Sections 3-4: Приоритетные дисциплины */}
              {details.priorities.map((p) => {
                const questions = getQuestionsForDiscipline(p.discipline)
                return (
                  <Section key={p.priority} title={`${p.priority}-й приоритет: ${p.discipline}`}>
                    <InfoRow
                      icon={<User className="w-3.5 h-3.5 text-[#2300fa]" />}
                      label="Готов(а) взять групп"
                      value={p.desiredGroupSize != null ? String(p.desiredGroupSize) : ""}
                    />
                    {questions.map((q) => (
                      <div key={q.id}>
                        <p className="text-xs font-bold text-[#2300fa] mb-1">{q.text}</p>
                        <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
                          {p.answers[q.id] || "—"}
                        </p>
                      </div>
                    ))}
                  </Section>
                )
              })}

              {/* Section 5: Мотивация */}
              <Section title="Мотивация">
                <div>
                  <p className="text-xs font-bold text-[#2300fa] mb-1">Почему хочет стать ассистентом</p>
                  <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {details.motivation || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2300fa] mb-1">Достижения</p>
                  <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {details.achievements || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2300fa] mb-1">Опыт с аналогичными курсами</p>
                  <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {details.priorCourses || "—"}
                  </p>
                </div>
              </Section>

              {/* Section 6: Рекомендации */}
              <Section title="Рекомендации">
                <InfoRow
                  icon={<Heart className="w-3.5 h-3.5 text-[#2300fa]" />}
                  label="Рекомендация от преподавателя"
                  value={
                    details.recommendationAvailable
                      ? details.recommendationEmail || "Есть"
                      : "Не предоставлена"
                  }
                />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
