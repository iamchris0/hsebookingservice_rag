"use client"

import { useEffect, useState } from "react"
import { Layers, Users, CheckCircle2, Clock } from "lucide-react"
import { TeacherAnalytics } from "../types"
import { SupplyDemandChart } from "./supply-demand-chart"
import { CoursesProgress } from "./courses-progress"
import { LoadDonut } from "./load-donut"
import { useCountUp } from "./chart-utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

function StatTile({
  icon,
  label,
  value,
  suffix,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  accent?: boolean
}) {
  const animated = useCountUp(value)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#DCFF05]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#2300fa] leading-tight">{label}</p>
        <p className="text-2xl font-bold text-black tabular-nums leading-tight">
          {animated}
          {suffix && <span className="text-sm font-medium text-gray-400">{suffix}</span>}
          {accent && value > 0 && (
            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#ff1ef7] align-middle animate-pulse" />
          )}
        </p>
      </div>
    </div>
  )
}

export function AnalyticsSection() {
  const [data, setData] = useState<TeacherAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${BACKEND_URL}/api/teacher/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error("Не удалось загрузить аналитику")
        setData(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Аналитика</h1>
        <p className="text-sm font-medium text-red-500 py-20 text-center">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Аналитика</h1>
        <div className="flex flex-col items-center gap-3 py-20">
          <div
            className="w-8 h-8 rounded-full border-[3px] animate-spin"
            style={{ borderColor: "#2300fa", borderTopColor: "transparent" }}
          />
          <span className="text-sm text-gray-400">Загрузка...</span>
        </div>
      </div>
    )
  }

  const freeGroups = data.disciplines.reduce((s, d) => s + d.free_groups, 0)
  const assistants = data.load.free + data.load.partial + data.load.full
  const myTotal = data.courses.reduce((s, c) => s + c.total_groups, 0)
  const myBooked = data.courses.reduce((s, c) => s + c.active_groups + c.pending_groups, 0)
  const pending = data.courses.reduce((s, c) => s + c.pending_count, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Аналитика</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile icon={<Layers className="w-5 h-5 text-black" />} label="Свободных групп на платформе" value={freeGroups} />
        <StatTile icon={<Users className="w-5 h-5 text-black" />} label="Ассистентов в базе" value={assistants} />
        <StatTile
          icon={<CheckCircle2 className="w-5 h-5 text-black" />}
          label="Мои группы закрыты"
          value={myBooked}
          suffix={` / ${myTotal}`}
        />
        <StatTile icon={<Clock className="w-5 h-5 text-black" />} label="Заявок ждут решения" value={pending} accent />
      </div>

      <SupplyDemandChart data={data.disciplines} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CoursesProgress courses={data.courses} />
        <LoadDonut load={data.load} />
      </div>
    </div>
  )
}
