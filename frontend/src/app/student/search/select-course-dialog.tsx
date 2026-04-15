"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Minus, Plus } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface SelectCourseDialogProps {
  isOpen: boolean
  onClose: () => void
  offerId: number
  teacherName: string
  discipline: string
  program: string
  availableGroups: number
}

export function SelectCourseDialog({
  isOpen,
  onClose,
  offerId,
  teacherName,
  discipline,
  program,
  availableGroups,
}: SelectCourseDialogProps) {
  const maxGroups = Math.min(availableGroups, 4)
  const [selectedGroups, setSelectedGroups] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setTimeout(() => {
        setConfirmed(false)
        setSelectedGroups(1)
        setSubmitError(null)
      }, 300)
    }
  }

  function decrement() {
    setSelectedGroups((v) => Math.max(1, v - 1))
  }

  function increment() {
    setSelectedGroups((v) => Math.min(maxGroups, v + 1))
  }

  async function handleConfirm() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/student/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId, groupsCount: selectedGroups }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ошибка при отправке заявки")
      }

      setConfirmed(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка при отправке заявки")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-8 transition-all duration-300">

        {!confirmed ? (
          <div className="flex flex-col gap-6">
            <DialogTitle className="text-lg font-bold text-black">Подтверждение заявки</DialogTitle>

            {/* Group counter */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-800">
                Выберите количество групп (<span className="font-semibold">{maxGroups}</span> доступно):
              </p>
              <div className="flex items-center rounded-full overflow-hidden border-2 border-black">
                <button
                  onClick={decrement}
                  disabled={selectedGroups <= 1}
                  className="w-9 h-9 flex items-center justify-center bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 h-9 flex items-center justify-center text-black font-bold text-sm select-none">
                  {selectedGroups}
                </span>
                <button
                  onClick={increment}
                  disabled={selectedGroups >= maxGroups}
                  className="w-9 h-9 flex items-center justify-center bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <hr className="border-t-2 border-gray-200" />

            <p className="text-md text-gray-800 leading-relaxed text-justify">
              Вы собираетесь записаться на обучение в{" "}
              <span className="font-semibold text-black">{selectedGroups}</span>{" "}
              групп{selectedGroups !== 1 ? "ы" : "у"}{" "}
              <span className="font-semibold text-black">{discipline}</span> на
              ОП <span className="font-semibold text-black">{program}</span> под руководством{" "}
              <span className="font-semibold text-black">{teacherName}</span>.<br /><br />
              Если вы подтверждаете информацию, нажмите кнопку ниже, чтобы
              отправить уведомление преподавателю.
            </p>

            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}

            <Button
              className="w-full rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-semibold h-10"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Отправка..." : "Confirm"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in duration-300">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="text-center text-md font-medium text-gray-800 leading-relaxed">
              Поздравляем, ваша заявка успешно отправлена преподавателю на рассмотрение.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
