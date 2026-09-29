"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AccountProfile } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface RecommendationBlockProps {
  profile: AccountProfile
  onSaved: () => void
}

export function RecommendationBlock({ profile, onSaved }: RecommendationBlockProps) {
  const [saved, setSaved] = useState(profile.recommendationEmail ?? "")
  const [teacherEmail, setTeacherEmail] = useState(saved)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isDirty = teacherEmail !== saved

  const handleSave = async () => {
    if (!teacherEmail.trim()) {
      setError("Укажите email преподавателя")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail)) {
      setError("Введите корректный email")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/student/recommendation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherEmail }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Не удалось сохранить изменения")
      }
      setSaved(teacherEmail)
      onSaved()
      toast.success("Раздел «Рекомендации» обновлён")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к серверу")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="space-y-1.5">
        <Label htmlFor="rec-email">Email преподавателя, рекомендовавшего вас</Label>
        <Input
          id="rec-email"
          value={teacherEmail}
          disabled={saving}
          placeholder="teacher@hse.ru"
          onChange={(e) => { setTeacherEmail(e.target.value); setError(null) }}
        />
        {!profile.recommendationAvailable && (
          <p className="text-xs text-muted-foreground">Рекомендация пока не предоставлена</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {isDirty && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-medium border-2 border-black px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Сохранение..." : "Изменить"}
          </button>
        </div>
      )}
    </div>
  )
}
