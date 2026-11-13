"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

/**
 * Приглашение или «забыл пароль» от команды Data Culture: /set-password?t=<ссылка на 7 дней>.
 * Преподаватель задаёт пароль (тот же для TA-DC и реестра DC) и сразу входит.
 */
export default function SetPassword() {
  const router = useRouter()
  const token = useRef("")
  const [who, setWho] = useState<{ email: string; firstName: string } | null>(null)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    token.current = new URLSearchParams(window.location.search).get("t") ?? ""
    window.history.replaceState(null, "", "/set-password")
    fetch(`${BACKEND_URL}/api/set-password?t=${encodeURIComponent(token.current)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || "Ссылка не подошла")
        setWho(body)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ссылка не подошла"))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError("Пароль — не короче 8 символов")
    if (password !== repeat) return setError("Пароли не совпадают")
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/api/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token.current, password }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.token) throw new Error(body?.error || "Не удалось сохранить пароль")
      localStorage.setItem("token", body.token)
      localStorage.setItem("user", JSON.stringify(body.user))
      router.replace("/teacher")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить пароль")
      setBusy(false)
    }
  }

  const input = "w-full rounded-lg border border-gray-200 bg-[#f8f8f8] px-3 py-2 outline-none focus:border-[#2300fa]"
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Пароль для TA-DC</h1>
        {!who && !error && <p className="text-muted-foreground">Проверяем ссылку…</p>}
        {!who && error && (
          <>
            <p className="font-medium text-red-500">{error}</p>
            <a href="/" className="inline-block rounded-lg bg-black px-4 py-2 text-white">На главную TA-DC</a>
          </>
        )}
        {who && (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {who.firstName}, задайте пароль. Логин — <b className="text-foreground">{who.email}</b>. С этими данными вы входите в TA-DC.
            </p>
            <input className={input} type="password" autoComplete="new-password" placeholder="Новый пароль (от 8 символов)"
              value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
            <input className={input} type="password" autoComplete="new-password" placeholder="Повторите пароль"
              value={repeat} onChange={(e) => setRepeat(e.target.value)} disabled={busy} />
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50">
              {busy ? "Сохраняем…" : "Сохранить и войти"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
