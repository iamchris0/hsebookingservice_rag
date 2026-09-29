"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getQuestionsForDiscipline } from "@/app/survey/questions"
import { Discipline, PriorityDetail } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

const SKIP = "skip"

interface PriorityBlockProps {
  priorityNumber: 1 | 2
  detail: PriorityDetail | undefined
  disciplines: Discipline[]
  /** The discipline already taken by the other priority slot — hidden from this block's list. */
  excludeDisciplineId?: number
  onSaved: () => void
}

interface FormState {
  disciplineId: string
  groups: string
  answers: Record<string, string>
}

function snapshotOf(detail: PriorityDetail | undefined, allowSkip: boolean): FormState {
  return {
    disciplineId: detail ? String(detail.disciplineId) : allowSkip ? SKIP : "",
    groups: detail ? String(detail.desiredGroupSize) : "1",
    answers: detail ? { ...detail.answers } : {},
  }
}

export function PriorityBlock({ priorityNumber, detail, disciplines, excludeDisciplineId, onSaved }: PriorityBlockProps) {
  const allowSkip = priorityNumber === 2

  const [saved, setSaved] = useState(snapshotOf(detail, allowSkip))
  const [form, setForm] = useState(saved)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const availableDisciplines = disciplines.filter((d) => d.id !== excludeDisciplineId)

  const selectedDiscipline = availableDisciplines.find((d) => String(d.id) === form.disciplineId)
  const questions = useMemo(
    () => (selectedDiscipline ? getQuestionsForDiscipline(selectedDiscipline.name) : []),
    [selectedDiscipline]
  )

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  const updateField = (field: "disciplineId" | "groups", value: string) => {
    setForm((f) => ({ ...f, [field]: value, answers: field === "disciplineId" ? {} : f.answers }))
    setError(null)
  }

  const updateAnswer = (questionId: string, value: string) => {
    setForm((f) => ({ ...f, answers: { ...f.answers, [questionId]: value } }))
    setError(null)
  }

  const handleSave = async () => {
    if (!form.disciplineId) {
      setError("Выберите дисциплину")
      return
    }

    const token = localStorage.getItem("token")

    if (form.disciplineId === SKIP) {
      setSaving(true)
      setError(null)
      try {
        const response = await fetch(`${BACKEND_URL}/api/student/priorities/${priorityNumber}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error ?? "Не удалось сохранить изменения")
        }
        setSaved(form)
        onSaved()
        toast.success(`Раздел «${priorityNumber}-й приоритет» обновлён`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка подключения к серверу")
      } finally {
        setSaving(false)
      }
      return
    }

    for (const q of questions) {
      if (!(form.answers[q.id] ?? "").trim()) {
        setError("Ответьте на все вопросы")
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/api/student/priorities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          disciplineId: parseInt(form.disciplineId, 10),
          desiredGroupSize: parseInt(form.groups, 10),
          answers: form.answers,
          priority: priorityNumber,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Не удалось сохранить изменения")
      }
      setSaved(form)
      onSaved()
      toast.success(`Раздел «${priorityNumber}-й приоритет» обновлён`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к серверу")
    } finally {
      setSaving(false)
    }
  }

  const isSkipped = form.disciplineId === SKIP

  return (
    <div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Дисциплина</label>
        <Select value={form.disciplineId} onValueChange={(v) => updateField("disciplineId", v)} disabled={saving}>
          <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Выберите дисциплину" /></SelectTrigger>
          <SelectContent>
            {allowSkip && <SelectItem value={SKIP}>Не рассматриваю 2-й приоритет</SelectItem>}
            {availableDisciplines.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isSkipped && form.disciplineId && (
        <>
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Какое количество групп по курсу вы готовы взять?</p>
            <div className="grid grid-cols-2 gap-2">
              {["1", "2"].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={saving}
                  onClick={() => updateField("groups", n)}
                  className={`w-full px-5 py-2 rounded-full text-sm font-medium border-2 transition-colors disabled:opacity-50 ${
                    form.groups === n
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-200 hover:border-black"
                  }`}
                >
                  {n} {n === "1" ? "группа" : "группы"}
                </button>
              ))}
            </div>
          </div>

          {questions.length > 0 && (
            <div className="mt-5 space-y-4">
              {questions.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-black mb-1.5">{q.text}</p>
                  {q.imageSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.imageSrc} alt="Иллюстрация к вопросу" className="max-w-full rounded-lg mb-3 border border-gray-200" />
                  )}
                  <Textarea
                    value={form.answers[q.id] ?? ""}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    placeholder="Введите ваш ответ..."
                    disabled={saving}
                    rows={3}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      {isDirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-medium border-2 border-black px-6 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Сохранение..." : "Изменить"}
        </button>
      )}
    </div>
  )
}
