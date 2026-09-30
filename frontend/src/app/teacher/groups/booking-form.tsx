"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentSearchResult } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export interface BookingOffer {
  id: number
  discipline: string
  faculty: string
  program: string
  totalGroups: number
  availableGroups: number
}

interface BookingFormProps {
  student: StudentSearchResult
  offer: BookingOffer
  onBooked: () => void
  /** Left footer button; "Назад" returns to the previous step, "Отмена" closes. */
  secondaryLabel: "Назад" | "Отмена"
  onSecondary: () => void
  /** Rendered above the group count / payment questions. */
  children?: React.ReactNode
}

export function BookingForm({
  student,
  offer,
  onBooked,
  secondaryLabel,
  onSecondary,
  children,
}: BookingFormProps) {
  const [numGroups, setNumGroups] = useState(1)
  const [paymentType, setPaymentType] = useState<"money" | "credits">("money")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const maxGroups = Math.min(4, offer.availableGroups)

  const handleConfirm = async () => {
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
        body: JSON.stringify({ offerId: offer.id, studentId: student.id, numGroups, paymentType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Не удалось сохранить бронирование")
      }

      onBooked()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
        {children}

        {/* Confirmation text */}
        <p className="text-sm text-black leading-relaxed">
          Вы подтверждаете бронирование ассистента{" "}
          <span className="font-semibold">{student.last_name}</span>{" "}
          для дисциплины{" "}
          <span className="font-semibold">{offer.discipline}</span>{" "}
          для факультета{" "}
          <span className="font-semibold">{offer.faculty}</span>{" "}
          (обр. программа{" "}
          <span className="font-semibold">{offer.program}</span>
          ), количество групп —{" "}
          <span className="font-semibold">{numGroups}</span>, формат оплаты —{" "}
          <span className="font-semibold">{paymentType === "money" ? "оплата" : "кредиты"}</span>.
        </p>

        {/* Group count selector */}
        <div>
          <p className="text-xs font-medium text-[#2300fa] mb-2">
            Количество групп
            <span className="text-gray-400 font-normal ml-1">
              (макс. {maxGroups} из {offer.totalGroups})
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

      <div className="px-5 pb-4 pt-2 flex gap-2 flex-shrink-0">
        <Button
          variant="outline"
          disabled={isSaving}
          className="flex-1 h-9 rounded-full border-gray-300 text-black text-sm font-medium hover:bg-gray-50"
          onClick={onSecondary}
        >
          {secondaryLabel === "Назад" && <ArrowLeft className="w-4 h-4 mr-1.5" />}
          {secondaryLabel}
        </Button>
        <Button
          disabled={isSaving || maxGroups < 1}
          className="flex-1 h-9 rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black text-sm font-medium disabled:opacity-60"
          onClick={handleConfirm}
        >
          {isSaving ? "Сохранение..." : "Подтвердить"}
        </Button>
      </div>
    </div>
  )
}
