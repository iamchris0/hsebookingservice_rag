"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FiltersProps } from "../types"

const ALL = "__all__"

const DISCIPLINES = [
  "Анализ данных",
  "Программирование",
  "Машинное обучение",
  "Цифровая грамотность и ИИ",
]

const MODULES = [1, 2, 3, 4]

export function Filters({
  programs = [],
  selectedDiscipline = "",
  selectedProgram = "",
  selectedModules = [],
  onNameChange,
  onDisciplineChange,
  onProgramChange,
  onModulesChange,
}: FiltersProps) {
  const [modulesOpen, setModulesOpen] = useState(false)

  const toggleModule = (module: number) => {
    if (!onModulesChange) return
    if (selectedModules.includes(module)) {
      onModulesChange(selectedModules.filter((m) => m !== module))
    } else {
      onModulesChange([...selectedModules, module])
    }
  }

  const modulesLabel =
    selectedModules.length === 0
      ? "Модули"
      : selectedModules
          .sort((a, b) => a - b)
          .map((m) => `М${m}`)
          .join(", ")

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Name search */}
      <Input
        placeholder="Поиск по ФИО..."
        className="w-[220px] bg-white rounded-full border-border"
        onChange={(e) => onNameChange?.(e.target.value)}
      />

      {/* Discipline — static constant values */}
      <Select
        value={selectedDiscipline || ALL}
        onValueChange={(val) => onDisciplineChange?.(val === ALL ? "" : val)}
      >
        <SelectTrigger className="w-[220px] bg-white rounded-full border-border">
          <SelectValue placeholder="Дисциплина" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Все дисциплины</SelectItem>
          {DISCIPLINES.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Program — dynamic values from cards */}
      <Select
        value={selectedProgram || ALL}
        onValueChange={(val) => onProgramChange?.(val === ALL ? "" : val)}
      >
        <SelectTrigger className="w-[220px] bg-white rounded-full border-border">
          <SelectValue placeholder="Программа" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Все программы</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Modules — dropdown with checkboxes */}
      <div className="relative">
        <button
          onClick={() => setModulesOpen((o) => !o)}
          className="flex items-center justify-between gap-2 h-9 px-3 w-[180px] rounded-full border border-border bg-white text-sm text-left"
        >
          <span className="truncate">{modulesLabel}</span>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform"
            style={{ transform: modulesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {modulesOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setModulesOpen(false)}
            />
            <div className="absolute left-0 top-full mt-1 z-20 w-[180px] bg-white border border-border rounded-xl shadow-lg py-1 overflow-hidden">
              {MODULES.map((module) => (
                <label
                  key={module}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                >
                  <Checkbox
                    checked={selectedModules.includes(module)}
                    onCheckedChange={() => toggleModule(module)}
                    className="rounded-sm"
                  />
                  <span className="text-sm text-black">Модуль {module}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
