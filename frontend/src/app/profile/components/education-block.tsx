"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SuggestInput } from "@/components/suggest-input"
import { OWN_VALUE_HINT, normalizeName, programNamesFor, useEducationOptions } from "@/lib/education-options"
import { AccountProfile } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface EducationBlockProps {
  profile: AccountProfile
  onSaved: () => void
}

interface FormState {
  faculty: string
  program: string
  studyYear: string
  hasDebts: string
  rating: string
  digitalLiteracyScore: string
  programmingScore: string
  dataAnalysisScore: string
}

function snapshotOf(p: AccountProfile): FormState {
  return {
    faculty: p.eduFaculty ?? "",
    program: p.eduProgram ?? "",
    studyYear: p.studyYear ? String(p.studyYear) : "",
    hasDebts: p.debts ?? "",
    rating: p.eduRating ?? "",
    digitalLiteracyScore: p.digitalLiteracyScore ?? "",
    programmingScore: p.programmingScore ?? "",
    dataAnalysisScore: p.dataAnalysisScore ?? "",
  }
}

const EXAMS: { key: keyof FormState; label: string }[] = [
  { key: "digitalLiteracyScore", label: "Цифровая грамотность и ИИ" },
  { key: "programmingScore", label: "Программирование" },
  { key: "dataAnalysisScore", label: "Анализ данных" },
]

const SCORE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

export function EducationBlock({ profile, onSaved }: EducationBlockProps) {
  const [saved, setSaved] = useState(snapshotOf(profile))
  const [form, setForm] = useState(saved)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const options = useEducationOptions()

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }

  const handleSave = async () => {
    if (!form.faculty.trim() || !form.program.trim() || !form.studyYear || !form.hasDebts || !form.rating.trim()) {
      setError("Заполните все поля")
      return
    }
    if (!form.digitalLiteracyScore || !form.programmingScore || !form.dataAnalysisScore) {
      setError("Укажите оценки за все независимые экзамены")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/student/education`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          faculty: normalizeName(form.faculty),
          program: normalizeName(form.program),
          studyYear: parseInt(form.studyYear, 10),
          hasDebts: form.hasDebts === "yes",
          rating: form.rating,
          digitalLiteracyScore: form.digitalLiteracyScore === "none" ? "-" : form.digitalLiteracyScore,
          programmingScore: form.programmingScore === "none" ? "-" : form.programmingScore,
          dataAnalysisScore: form.dataAnalysisScore === "none" ? "-" : form.dataAnalysisScore,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Не удалось сохранить изменения")
      }
      setSaved(form)
      onSaved()
      toast.success("Раздел «Образование» обновлён")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к серверу")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ed-faculty">Факультет</Label>
          <p className="text-xs text-muted-foreground">{OWN_VALUE_HINT}</p>
          <SuggestInput id="ed-faculty" value={form.faculty} disabled={saving}
            options={options.faculties}
            onChange={(v) => update("faculty", v)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-program">Образовательная программа</Label>
          <p className="text-xs text-muted-foreground">{OWN_VALUE_HINT}</p>
          <SuggestInput id="ed-program" value={form.program} disabled={saving}
            options={programNamesFor(options, form.faculty)}
            onChange={(v) => update("program", v)} />
        </div>

        <div className="space-y-1.5">
          <Label>Курс</Label>
          <Select value={form.studyYear} onValueChange={(v) => update("studyYear", v)} disabled={saving}>
            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Выберите курс" /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} курс</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Есть ли задолженности?</Label>
          <Select value={form.hasDebts} onValueChange={(v) => update("hasDebts", v)} disabled={saving}>
            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Выберите..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Нет</SelectItem>
              <SelectItem value="yes">Да</SelectItem>
              <SelectItem value="little">Да, но по уважительной причине</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ed-rating">Ваш текущий рейтинг</Label>
          <Input id="ed-rating" value={form.rating} disabled={saving}
            placeholder="1 из 100"
            onChange={(e) => update("rating", e.target.value)} />
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-black mb-3">Оценки за независимые экзамены</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {EXAMS.map((exam) => (
            <div key={exam.key} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 px-4 py-3 border-t border-gray-100 first:border-t-0 items-start">
              <span className="text-sm text-black pt-1">{exam.label}</span>
              <div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {SCORE_OPTIONS.map((n) => (
                    <label key={n} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name={`ed-exam-${exam.key}`}
                        checked={form[exam.key] === n}
                        onChange={() => update(exam.key, n)}
                        disabled={saving}
                        className="accent-black cursor-pointer w-3.5 h-3.5"
                      />
                      {n}
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-500">
                    <input
                      type="radio"
                      name={`ed-exam-${exam.key}`}
                      checked={form[exam.key] === "none" || form[exam.key] === "-"}
                      onChange={() => update(exam.key, "none")}
                      disabled={saving}
                      className="accent-black cursor-pointer w-3.5 h-3.5"
                    />
                    Не сдавал(а)
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
