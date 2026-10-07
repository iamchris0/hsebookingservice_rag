"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SuggestInput } from "@/components/suggest-input"
import { OWN_VALUE_HINT, normalizeName, useEducationOptions } from "@/lib/education-options"
import { AccountProfile } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface AboutBlockProps {
  profile: AccountProfile
  onSaved: () => void
}

interface FormState {
  telegram: string
  birthday: string
  citizenship: string
  phone: string
}

function snapshotOf(p: AccountProfile): FormState {
  return {
    telegram: p.telegram ?? "",
    birthday: p.birthday ?? "",
    citizenship: p.citizenship ?? "",
    phone: p.phone ?? "",
  }
}

export function AboutBlock({ profile, onSaved }: AboutBlockProps) {
  const [saved, setSaved] = useState(snapshotOf(profile))
  const [form, setForm] = useState(saved)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const options = useEducationOptions()

  // The name fields live and save separately in the Личная информация block;
  // keep this block sending whatever was most recently persisted for them.
  useEffect(() => {
    setSaved(snapshotOf(profile))
    setForm(snapshotOf(profile))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.telegram, profile.birthday, profile.citizenship, profile.phone])

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }

  const handleSave = async () => {
    if (!form.telegram.trim() || !form.birthday || !form.citizenship.trim() || !form.phone.trim()) {
      setError("Заполните все поля")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/student/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          middleName: profile.middleName,
          ...form,
          citizenship: normalizeName(form.citizenship),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Не удалось сохранить изменения")
      }
      setSaved(form)
      onSaved()
      toast.success("Раздел «О себе» обновлён")
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
          <Label htmlFor="ab-telegram">Telegram</Label>
          <Input id="ab-telegram" value={form.telegram} disabled={saving}
            onChange={(e) => update("telegram", e.target.value.startsWith("@") || e.target.value === "" ? e.target.value : `@${e.target.value}`)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ab-birthday">Дата рождения</Label>
          <Input id="ab-birthday" type="date" value={form.birthday} disabled={saving}
            onChange={(e) => update("birthday", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ab-citizenship">Гражданство</Label>
          <p className="text-xs text-muted-foreground">{OWN_VALUE_HINT}</p>
          <SuggestInput id="ab-citizenship" value={form.citizenship} disabled={saving}
            options={options.citizenships}
            onChange={(v) => update("citizenship", v)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ab-phone">Телефон</Label>
          <Input id="ab-phone" value={form.phone} disabled={saving}
            onChange={(e) => update("phone", e.target.value)} />
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
