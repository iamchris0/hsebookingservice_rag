"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { StudentSearchResult, TeacherOffer } from "../types"
import { BookingForm } from "../groups/booking-form"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface BookAssistantDialogProps {
  isOpen: boolean
  onClose: () => void
  student: StudentSearchResult
  onBooked: () => void
}

function formatModules(modules: number[]) {
  return modules.length > 0 ? modules.join(", ") : "—"
}

function CurrentAssignmentsTable({ student }: { student: StudentSearchResult }) {
  const assignments = student.assignments ?? []

  return (
    <div>
      <p className="text-xs font-medium text-[#2300fa] mb-2">Текущие группы ассистента</p>
      {assignments.length === 0 ? (
        <div className="bg-gray-100 rounded-xl px-3 py-3 text-xs text-gray-500 text-center">
          Ассистент пока не закреплён ни за одной группой
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 text-center text-[10px] text-[#2300fa]">
                <th className="px-3 py-2 font-medium">Преподаватель</th>
                <th className="px-3 py-2 font-medium">Факультет</th>
                <th className="px-3 py-2 font-medium">Дисциплина</th>
                <th className="px-3 py-2 font-medium">Групп</th>
                <th className="px-3 py-2 font-medium">Модули</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.booking_id} className="border-t border-gray-100 align-middle">
                  <td className="px-3 py-2 text-black text-center">{a.teacher || "—"}</td>
                  <td className="px-3 py-2 text-black text-center">{a.faculty}</td>
                  <td className="px-3 py-2 text-black text-center">
                    <span className="font-medium">{a.discipline}</span>
                    {a.status === "pending" && (
                      <span className="block text-[10px] text-[#ff1ef7] mt-0.5">(ожидает подтверждения)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-black text-center font-medium">{a.num_groups}</td>
                  <td className="px-3 py-2 text-black text-center whitespace-nowrap">
                    {formatModules(a.modules)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OfferPicker({
  offers,
  selectedId,
  onSelect,
}: {
  offers: TeacherOffer[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#2300fa] mb-2">Курс</p>
      <div className="flex flex-col gap-2">
        {offers.map((o) => {
          const active = o.id === selectedId
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                active
                  ? "bg-[#2300fa] text-white border-[#2300fa]"
                  : "bg-white text-black border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-medium leading-tight">{o.discipline}</p>
              <p className={`text-[11px] mt-0.5 ${active ? "text-white/80" : "text-gray-500"}`}>
                {o.faculty} · {o.program} · свободно {o.available_groups} из {o.total_groups} гр.
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function BookAssistantDialog({ isOpen, onClose, student, onBooked }: BookAssistantDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [offers, setOffers] = useState<TeacherOffer[]>([])
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the teacher's offers with free slots every time the dialog opens
  useEffect(() => {
    if (!isOpen) return

    const fetchOffers = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/teacher/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error("Не удалось загрузить ваши курсы")
        const data: TeacherOffer[] = await response.json()
        const open = data.filter((o) => o.available_groups > 0)
        setOffers(open)

        // Prefer the offer matching the assistant's highest priority
        const preferred = student.preferences
          .map((p) => open.find((o) => o.discipline === p.discipline))
          .find(Boolean)
        setSelectedOfferId((preferred ?? open[0])?.id ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOffers()
  }, [isOpen, student])

  // Animation lifecycle
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(true)))
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setSelectedOfferId(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null

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
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#2300fa]">Бронирование ассистента</h2>
              <p className="text-xs text-gray-500 truncate">
                {student.last_name} {student.first_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-px bg-gray-100 mt-3" />
        </div>

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
        ) : !selectedOffer ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Нет курсов со свободными группами</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Создайте курс на странице{" "}
                <Link href="/teacher/groups" className="text-[#2300fa] hover:underline">
                  «Мои группы»
                </Link>
                , чтобы забронировать ассистента
              </p>
            </div>
          </div>
        ) : (
          <BookingForm
            key={selectedOffer.id}
            student={student}
            offer={{
              id: selectedOffer.id,
              discipline: selectedOffer.discipline,
              faculty: selectedOffer.faculty,
              program: selectedOffer.program,
              totalGroups: selectedOffer.total_groups,
              availableGroups: selectedOffer.available_groups,
            }}
            onBooked={() => {
              toast.success("Ассистент забронирован.")
              onBooked()
              onClose()
            }}
            secondaryLabel="Отмена"
            onSecondary={onClose}
          >
            <CurrentAssignmentsTable student={student} />
            {offers.length > 1 && (
              <OfferPicker
                offers={offers}
                selectedId={selectedOfferId}
                onSelect={setSelectedOfferId}
              />
            )}
          </BookingForm>
        )}
      </div>
    </div>
  )
}
