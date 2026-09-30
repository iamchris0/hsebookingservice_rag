"use client"

import Link from "next/link"
import { BookOpen, Clock } from "lucide-react"
import { toDisplayDiscipline } from "@/lib/disciplines"
import { CourseFill } from "../types"
import { BLUE, BLUE_TINT, ChartCard, LegendItem, hatch, plural, useMounted } from "./chart-utils"

export function CoursesProgress({ courses }: { courses: CourseFill[] }) {
  const mounted = useMounted()

  return (
    <ChartCard title="Мои курсы" subtitle="Сколько групп уже закрыто ассистентами">
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">Открытых курсов пока нет</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Создайте курс на странице{" "}
              <Link href="/teacher/groups" className="text-[#2300fa] hover:underline">
                «Мои группы»
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <LegendItem swatch={{ backgroundColor: BLUE }} label="Подтверждено" />
            <LegendItem swatch={{ background: hatch(BLUE, BLUE_TINT) }} label="Ожидает решения" />
            <LegendItem swatch={{ backgroundColor: "#f3f4f6" }} label="Свободно" />
          </div>

          <div className="flex flex-col gap-4">
            {courses.map((c, i) => {
              const booked = c.active_groups + c.pending_groups
              const total = Math.max(c.total_groups, 1)
              const pct = Math.round((booked / total) * 100)
              return (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black leading-tight truncate">
                        {toDisplayDiscipline(c.discipline)}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {c.faculty} · {c.program}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 flex-shrink-0 tabular-nums">
                      <span className="font-semibold text-black">{booked}</span> из {c.total_groups}{" "}
                      {plural(c.total_groups, ["группы", "групп", "групп"])}
                    </p>
                  </div>

                  {/* Track with 2px gaps between segments */}
                  <div className="flex gap-[2px] h-3.5 rounded-[4px] overflow-hidden" title={`${pct}% заполнено`}>
                    {[
                      { value: c.active_groups, filled: true, style: { backgroundColor: BLUE } },
                      { value: c.pending_groups, filled: true, style: { background: hatch(BLUE, BLUE_TINT) } },
                      { value: Math.max(c.total_groups - booked, 0), filled: false, style: { backgroundColor: "#f3f4f6" } },
                    ]
                      .filter((s) => s.value > 0)
                      .map((s, j) => (
                        <div
                          key={j}
                          className="h-full transition-[flex-grow] duration-700 ease-out"
                          style={{
                            flexBasis: 0,
                            // Filled segments grow in; the free track starts full
                            flexGrow: mounted || !s.filled ? s.value : 0.0001,
                            transitionDelay: `${i * 80}ms`,
                            ...s.style,
                          }}
                        />
                      ))}
                  </div>

                  {c.pending_count > 0 && (
                    <Link
                      href="/teacher/groups"
                      className="self-start inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-[#c800c2] hover:bg-pink-100 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      {c.pending_count} {plural(c.pending_count, ["заявка ждёт", "заявки ждут", "заявок ждут"])} решения
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </ChartCard>
  )
}
