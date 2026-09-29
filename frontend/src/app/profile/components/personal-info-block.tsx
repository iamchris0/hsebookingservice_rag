"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AccountProfile } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface PersonalInfoBlockProps {
  profile: AccountProfile
  onSaved: () => void
}

interface FormState {
  firstName: string
  lastName: string
  middleName: string
  email: string
  newPassword: string
  confirmPassword: string
}

function snapshotOf(p: AccountProfile): Omit<FormState, "newPassword" | "confirmPassword"> {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName ?? "",
    email: p.email,
  }
}

export function PersonalInfoBlock({ profile, onSaved }: PersonalInfoBlockProps) {
  const [saved, setSaved] = useState(snapshotOf(profile))
  const [form, setForm] = useState<FormState>({ ...saved, newPassword: "", confirmPassword: "" })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isDirty =
    form.firstName !== saved.firstName ||
    form.lastName !== saved.lastName ||
    form.middleName !== saved.middleName ||
    form.email !== saved.email ||
    form.newPassword !== ""

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.middleName.trim()) {
      setError("Заполните фамилию, имя и отчество")
      return
    }
    if (!form.email.trim()) {
      setError("Логин не может быть пустым")
      return
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов")
      return
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/account/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          middleName: form.middleName,
          email: form.email,
          newPassword: form.newPassword || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось сохранить изменения")
      }

      if (data.token) localStorage.setItem("token", data.token)
      const storedUser = localStorage.getItem("user")
      if (storedUser && data.user) {
        localStorage.setItem("user", JSON.stringify({ ...JSON.parse(storedUser), ...data.user }))
      }

      const nextSaved = {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName,
        email: form.email,
      }
      setSaved(nextSaved)
      setForm({ ...nextSaved, newPassword: "", confirmPassword: "" })
      onSaved()
      toast.success("Личные данные обновлены")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к серверу")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pi-lastName">Фамилия</Label>
          <Input id="pi-lastName" value={form.lastName} disabled={saving}
            onChange={(e) => update("lastName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pi-firstName">Имя</Label>
          <Input id="pi-firstName" value={form.firstName} disabled={saving}
            onChange={(e) => update("firstName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pi-middleName">Отчество</Label>
          <Input id="pi-middleName" value={form.middleName} disabled={saving}
            onChange={(e) => update("middleName", e.target.value)} />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="pi-email">Логин</Label>
        <Input id="pi-email" type="text" value={form.email} disabled={saving}
          onChange={(e) => update("email", e.target.value)} />
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pi-newPassword">Новый пароль</Label>
          <Input id="pi-newPassword" type="password" value={form.newPassword} disabled={saving}
            placeholder="Оставьте пустым, если не меняете"
            onChange={(e) => update("newPassword", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pi-confirmPassword">Повторите новый пароль</Label>
          <Input id="pi-confirmPassword" type="password" value={form.confirmPassword} disabled={saving}
            onChange={(e) => update("confirmPassword", e.target.value)} />
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
