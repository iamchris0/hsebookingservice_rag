"use client"

import { useEffect, useState } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

type Registry = {
  assignments: {
    id: number; academicYear: string; course: string; role: string | null; groups: number; program: string | null
    schedule: { value: string } | null; archived: boolean
  }[]
  contracts: { id: number; number: string | null; startsOn: string | null; endsOn: string | null; statusLabel: string; daysLeft: number | null }[]
}

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—")

/** «Реестр DC»: курсы и договоры преподавателя из реестра Data Culture (только просмотр; меняет команда DC). */
export default function RegistryPage() {
  const [data, setData] = useState<Registry | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/dc/registry`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (res.status === 404) return setData({ assignments: [], contracts: [] })
        if (!res.ok) throw new Error(body?.error || "Не удалось загрузить данные реестра")
        setData(body)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить данные реестра"))
  }, [])

  const current = data?.assignments.filter((a) => !a.archived) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Реестр DC</h1>
        <p className="text-sm text-muted-foreground mt-1">Ваши курсы и договоры в реестре Data Culture. Если что-то неверно — напишите команде DC.</p>
      </div>
      {error && <p className="text-sm font-medium text-red-500 py-10 text-center">{error}</p>}
      {!error && !data && <p className="text-sm text-muted-foreground py-10 text-center">Загружаем…</p>}
      {data && (
        <>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-3">Мои курсы</h2>
            {current.length === 0 ? (
              <p className="text-sm text-muted-foreground">В реестре пока нет курсов, где вы преподаватель.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-[#2300fa]">
                      <th className="py-2 pr-4">Курс</th><th className="py-2 pr-4">Год</th><th className="py-2 pr-4">Программа</th>
                      <th className="py-2 pr-4">Роль</th><th className="py-2 pr-4 text-center">Групп</th><th className="py-2">Расписание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.map((a) => (
                      <tr key={a.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4 font-medium">{a.course}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{a.academicYear}</td>
                        <td className="py-2 pr-4">{a.program ?? "—"}</td>
                        <td className="py-2 pr-4">{a.role ?? "—"}</td>
                        <td className="py-2 pr-4 text-center tabular-nums">{a.groups}</td>
                        <td className="py-2">{a.schedule?.value ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-3">Договоры</h2>
            {data.contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Договоров в реестре нет.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {data.contracts.map((c) => (
                  <li key={c.id} className="py-2 flex flex-wrap gap-x-4 gap-y-1 justify-between">
                    <span className="font-medium">{c.number ? `№ ${c.number}` : "Договор"}</span>
                    <span>{date(c.startsOn)} — {date(c.endsOn)}</span>
                    <span className="text-muted-foreground">
                      {c.statusLabel}{c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= 30 ? ` · осталось ${c.daysLeft} дн.` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
