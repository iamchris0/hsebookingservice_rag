"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AccountProfile } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface MotivationBlockProps {
  profile: AccountProfile
  onSaved: () => void
}

interface FormState {
  motivation: string
  achievements: string
  priorCourses: string
}

function snapshotOf(p: AccountProfile): FormState {
  return {
    motivation: p.motivation ?? "",
    achievements: p.achievements ?? "",
    priorCourses: p.priorCourses ?? "",
  }
}

export function MotivationBlock({ profile, onSaved }: MotivationBlockProps) {
  const [saved, setSaved] = useState(snapshotOf(profile))
  const [form, setForm] = useState(saved)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }

  const handleSave = async () => {
    if (!form.motivation.trim() || !form.achievements.trim() || !form.priorCourses.trim()) {
      setError("Заполните все поля")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/student/motivation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Не удалось сохранить изменения")
      }
      setSaved(form)
      onSaved()
      toast.success("Раздел «Мотивация» обновлён")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к серверу")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mo-motivation">Расскажите, почему вы хотите быть ассистентом</Label>
        <Textarea id="mo-motivation" value={form.motivation} disabled={saving} rows={3}
          onChange={(e) => update("motivation", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mo-achievements">Расскажите о ваших достижениях</Label>
        <Textarea id="mo-achievements" value={form.achievements} disabled={saving} rows={3}
          onChange={(e) => update("achievements", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mo-priorCourses">Изучали ли вы аналогичные курсы раньше?</Label>
        <Textarea id="mo-priorCourses" value={form.priorCourses} disabled={saving} rows={3}
          onChange={(e) => update("priorCourses", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isDirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-medium border-2 border-black px-6 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Сохранение..." : "Изменить"}
        </button>
      )}
    </div>
  )
}
