"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, DollarSign, CreditCard } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface SelectCourseDialogProps {
  isOpen: boolean
  onClose: () => void
  offerId: number
  teacherName: string
  discipline: string
  program: string
}

export function SelectCourseDialog({
  isOpen,
  onClose,
  offerId,
  teacherName,
  discipline,
  program,
}: SelectCourseDialogProps) {
  const [paymentType, setPaymentType] = useState<"money" | "credits">("money")
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setTimeout(() => {
        setConfirmed(false)
        setPaymentType("money")
        setSubmitError(null)
      }, 300)
    }
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
        body: JSON.stringify({ offerId, paymentType }),
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

            {/* Payment type selector */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Выберите формат оплаты:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentType("money")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    paymentType === "money"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-black hover:border-gray-400"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Деньги</span>
                </button>
                <button
                  onClick={() => setPaymentType("credits")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    paymentType === "credits"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-black hover:border-gray-400"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Кредиты</span>
                </button>
              </div>
            </div>

            <hr className="border-t-2 border-gray-200" />

            <p className="text-md text-gray-800 leading-relaxed text-justify">
              Вы собираетесь записаться на{" "}
              <span className="font-semibold text-black">{discipline}</span> на
              ОП <span className="font-semibold text-black">{program}</span> под руководством{" "}
              <span className="font-semibold text-black">{teacherName}</span>.<br /><br />
              Формат оплаты: <span className="font-semibold text-black">
                {paymentType === "money" ? "деньги" : "кредиты"}
              </span>.<br /><br />
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
