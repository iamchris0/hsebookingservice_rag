"use client"

import { useState } from "react"
import { CourseFill } from "../types"
import { BLUE, BLUE_TINT, ChartCard, LegendItem, hatch, plural, useMounted } from "./chart-utils"

const MODULES = [1, 2, 3, 4]
const PLOT_HEIGHT = 170
const COLUMN_WIDTH = 24
const UNCOVERED = "#e5e7eb"

interface ModuleStat {
  module: number
  active: number
  pending: number
  uncovered: number
  total: number
}

function moduleStats(courses: CourseFill[]): ModuleStat[] {
  return MODULES.map((m) => {
    const running = courses.filter((c) => c.modules.includes(m))
    const active = running.reduce((s, c) => s + c.active_groups, 0)
    const pending = running.reduce((s, c) => s + c.pending_groups, 0)
    const total = running.reduce((s, c) => s + c.total_groups, 0)
    return { module: m, active, pending, uncovered: Math.max(total - active - pending, 0), total }
  })
}

export function ModuleWorkload({ courses }: { courses: CourseFill[] }) {
  const mounted = useMounted()
  const [hovered, setHovered] = useState<number | null>(null)

  const stats = moduleStats(courses)
  const max = Math.max(1, ...stats.map((s) => s.total))
  const peak = stats.reduce((a, b) => (b.total > a.total ? b : a))

  return (
    <ChartCard title="Нагрузка по модулям" subtitle="Сколько ваших групп идёт в каждом модуле и сколько из них с ассистентом">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendItem swatch={{ backgroundColor: BLUE }} label="С ассистентом" />
        <LegendItem swatch={{ background: hatch(BLUE, BLUE_TINT) }} label="Ожидает решения" />
        <LegendItem swatch={{ backgroundColor: UNCOVERED }} label="Без ассистента" />
      </div>

      <div className="relative">
        <div className="grid grid-cols-4 items-end border-b border-gray-200" style={{ height: PLOT_HEIGHT + 24 }}>
          {stats.map((s, i) => {
            const segments = [
              { value: s.uncovered, style: { backgroundColor: UNCOVERED } },
              { value: s.pending, style: { background: hatch(BLUE, BLUE_TINT) } },
              { value: s.active, style: { backgroundColor: BLUE } },
            ].filter((x) => x.value > 0)
            const height = (s.total / max) * PLOT_HEIGHT
            return (
              <div
                key={s.module}
                className={`relative h-full flex flex-col items-center justify-end rounded-t-xl transition-colors ${
                  hovered === i ? "bg-gray-50" : ""
                }`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className="text-xs font-semibold text-black tabular-nums mb-1 transition-opacity duration-300"
                  style={{ opacity: mounted ? 1 : 0, transitionDelay: `${i * 120 + 500}ms` }}
                >
                  {s.total}
                </span>
                {/* Stacked column: top segment gets the rounded data-end, 2px surface gaps between */}
                <div
                  className="flex flex-col gap-[2px] overflow-hidden rounded-t-[4px] transition-[height] duration-700 ease-out"
                  style={{
                    width: COLUMN_WIDTH,
                    height: mounted ? height : 0,
                    transitionDelay: `${i * 120}ms`,
                  }}
                >
                  {segments.map((seg, j) => (
                    <div key={j} style={{ flexGrow: seg.value, flexBasis: 0, ...seg.style }} />
                  ))}
                </div>

                {hovered === i && (
                  <div
                    // Beside the column at mid-height; right-hand modules flip to the left side
                    style={{
                      bottom: Math.max(height / 2, 20),
                      ...(i < 2 ? { left: "calc(50% + 20px)" } : { right: "calc(50% + 20px)" }),
                    }}
                    className="absolute translate-y-1/2 z-10 w-max bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <p className="font-semibold text-black mb-1">Модуль {s.module}</p>
                    <p className="text-gray-600">
                      Всего: <span className="font-semibold text-black">{s.total}</span>{" "}
                      {plural(s.total, ["группа", "группы", "групп"])}
                    </p>
                    <p className="text-gray-600">
                      С ассистентом: <span className="font-semibold text-black">{s.active}</span>
                    </p>
                    <p className="text-gray-600">
                      Ожидает: <span className="font-semibold text-black">{s.pending}</span>
                    </p>
                    <p className="text-gray-600">
                      Без ассистента: <span className="font-semibold text-black">{s.uncovered}</span>
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-4 mt-2">
          {stats.map((s) => (
            <span key={s.module} className="text-center text-xs text-gray-500">
              Модуль {s.module}
            </span>
          ))}
        </div>
      </div>

      {peak.total > 0 && (
        <p className="text-xs text-gray-500">
          Пик нагрузки — <span className="font-semibold text-black">модуль {peak.module}</span>:{" "}
          {peak.total} {plural(peak.total, ["группа", "группы", "групп"])}
          {peak.uncovered > 0 && (
            <>
              , из них без ассистента —{" "}
              <span className="font-semibold text-black">{peak.uncovered}</span>
            </>
          )}
        </p>
      )}
    </ChartCard>
  )
}
