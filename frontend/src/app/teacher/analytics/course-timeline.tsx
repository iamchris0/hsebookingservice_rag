"use client"

import { toDisplayDiscipline } from "@/lib/disciplines"
import { CourseFill } from "../types"
import { BLUE, BLUE_TINT, ChartCard, LegendItem, hatch, useMounted } from "./chart-utils"

const MODULES = [1, 2, 3, 4]

/** Groups consecutive module numbers into runs: [1,2,4] → [[1,2],[4]] */
function moduleRuns(modules: number[]): number[][] {
  const runs: number[][] = []
  for (const m of [...modules].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1]
    if (last && last[last.length - 1] === m - 1) last.push(m)
    else runs.push([m])
  }
  return runs
}

export function CourseTimeline({ courses }: { courses: CourseFill[] }) {
  const mounted = useMounted()

  return (
    <ChartCard title="Мои курсы в учебном году" subtitle="В каких модулях идёт каждый курс и насколько он укомплектован">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendItem swatch={{ backgroundColor: BLUE }} label="С ассистентом" />
        <LegendItem swatch={{ background: hatch(BLUE, BLUE_TINT) }} label="Ожидает решения" />
        <LegendItem swatch={{ backgroundColor: BLUE_TINT }} label="Без ассистента" />
      </div>

      <div className="flex flex-col">
        {/* Module header */}
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4">
          <span className="hidden sm:block" />
          <div className="grid grid-cols-4 gap-2 pb-2 border-b border-gray-100">
            {MODULES.map((m) => (
              <span key={m} className="text-center text-[11px] text-gray-500">
                Модуль {m}
              </span>
            ))}
          </div>
        </div>

        {courses.map((c, i) => {
          const total = Math.max(c.total_groups, 1)
          const activePct = (c.active_groups / total) * 100
          const pendingPct = (c.pending_groups / total) * 100
          const booked = c.active_groups + c.pending_groups
          return (
            <div
              key={c.id}
              className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-1.5 py-2.5 border-b border-gray-100 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black leading-tight truncate">
                  {toDisplayDiscipline(c.discipline)}
                </p>
                <p className="text-[11px] text-gray-500 truncate">{c.program}</p>
              </div>

              {/* Background module lanes + one bar per consecutive run of modules */}
              <div className="relative grid grid-cols-4 gap-2 items-center" style={{ minHeight: 28 }}>
                {MODULES.map((m) => (
                  <div key={m} className="h-7 rounded-lg bg-gray-50" style={{ gridColumn: m, gridRow: 1 }} />
                ))}
                {c.modules.length === 0 && (
                  <span className="text-[11px] text-gray-400 italic" style={{ gridColumn: "1 / 5", gridRow: 1 }}>
                    Модули не указаны
                  </span>
                )}
                {moduleRuns(c.modules).map((run) => (
                  <div
                    key={run[0]}
                    title={`${booked} из ${c.total_groups} групп с ассистентом или на рассмотрении`}
                    className="relative h-4 mx-1 rounded-[4px] overflow-hidden flex gap-[2px] transition-[clip-path] duration-700 ease-out"
                    style={{
                      gridColumn: `${run[0]} / ${run[run.length - 1] + 1}`,
                      gridRow: 1,
                      backgroundColor: BLUE_TINT,
                      clipPath: mounted ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    {activePct > 0 && <div className="h-full" style={{ width: `${activePct}%`, backgroundColor: BLUE }} />}
                    {pendingPct > 0 && (
                      <div className="h-full" style={{ width: `${pendingPct}%`, background: hatch(BLUE, BLUE_TINT) }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
