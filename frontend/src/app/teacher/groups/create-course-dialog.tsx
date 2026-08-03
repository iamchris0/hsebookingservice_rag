"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateCourseData, DisciplineOption, FacultyOption, LinkRow, ModuleOption, ProgramOption } from "../types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface CreateCourseDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCourseData) => void
}

export function CreateCourseDialog({ isOpen, onClose, onSubmit }: CreateCourseDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Form state
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null)
  const [facultyValue, setFacultyValue] = useState("")
  const [programValue, setProgramValue] = useState("")
  const [numberOfGroups, setNumberOfGroups] = useState("")
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])

  // Dropdown open state
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState(false)
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false)

  // Refs for click-outside
  const facultyRef = useRef<HTMLDivElement>(null)
  const programRef = useRef<HTMLDivElement>(null)

  // Data from API
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([])
  const [faculties, setFaculties] = useState<FacultyOption[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [modules, setModules] = useState<ModuleOption[]>([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${BACKEND_URL}/api/disciplines`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${BACKEND_URL}/api/faculties`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${BACKEND_URL}/api/programs`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${BACKEND_URL}/api/modules`, { headers }).then((r) => r.ok ? r.json() : []),
    ]).then(([d, f, p, m]) => {
      setDisciplines(d)
      setFaculties(f)
      setPrograms(p)
      setModules(m)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const t = setTimeout(() => setIsAnimating(true), 50)
      return () => clearTimeout(t)
    } else {
      setIsAnimating(false)
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setSelectedDisciplineId(null)
        setFacultyValue("")
        setProgramValue("")
        setNumberOfGroups("")
        setSelectedModuleIds([])
        setLinks([])
        setIsFacultyDropdownOpen(false)
        setIsProgramDropdownOpen(false)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (facultyRef.current && !facultyRef.current.contains(e.target as Node))
        setIsFacultyDropdownOpen(false)
      if (programRef.current && !programRef.current.contains(e.target as Node))
        setIsProgramDropdownOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const toggleModule = (moduleId: number) =>
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    )

  const addLinkRow = () => setLinks((prev) => [...prev, { name: "", url: "" }])
  const removeLinkRow = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index))
  const updateLink = (index: number, field: "name" | "url", value: string) =>
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)))

  const filteredFaculties = faculties.filter((f) =>
    f.name.toLowerCase().includes(facultyValue.toLowerCase())
  )

  // Programs filtered by currently typed faculty (if matches an existing one exactly) or all
  const filteredPrograms = programs.filter((p) => {
    const matchesFaculty = facultyValue.trim() === ""
      || p.faculty_name.toLowerCase().includes(facultyValue.toLowerCase())
    return matchesFaculty && p.name.toLowerCase().includes(programValue.toLowerCase())
  })

  const handleSelectFaculty = (faculty: FacultyOption) => {
    setFacultyValue(faculty.name)
    setIsFacultyDropdownOpen(false)
    // Clear program if it no longer belongs to this faculty
    const stillValid = programs.some(
      (p) => p.faculty_name === faculty.name && p.name === programValue
    )
    if (!stillValid) setProgramValue("")
  }

  const handleSelectProgram = (program: ProgramOption) => {
    setProgramValue(program.name)
    // Auto-fill faculty if empty or different
    if (!facultyValue.trim() || facultyValue !== program.faculty_name) {
      setFacultyValue(program.faculty_name)
    }
    setIsProgramDropdownOpen(false)
  }

  const selectedDiscipline = disciplines.find((d) => d.id === selectedDisciplineId)

  const handleConfirm = () => {
    if (!selectedDisciplineId || !selectedDiscipline) return
    if (!facultyValue.trim() || !programValue.trim()) return

    const selectedModuleNumbers = modules
      .filter((m) => selectedModuleIds.includes(m.id))
      .map((m) => m.number)

    onSubmit({
      disciplineId: selectedDisciplineId,
      discipline: selectedDiscipline.name,
      faculty: facultyValue.trim(),
      program: programValue.trim(),
      numberOfGroups: parseInt(numberOfGroups) || 1,
      duration: selectedModuleNumbers,
      moduleIds: selectedModuleIds,
      links,
    })
    onClose()
  }

  const isConfirmDisabled =
    !selectedDisciplineId ||
    !facultyValue.trim() ||
    !programValue.trim() ||
    !numberOfGroups ||
    selectedModuleIds.length === 0

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? "bg-black/50" : "bg-black/0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl w-full max-w-xl mx-4 p-2 overflow-hidden shadow-2xl transition-all duration-300 ${
          isAnimating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#2300fa]">Новая заявка</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-[2px] bg-[#2300fa] mt-2" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto">

          {/* 1. Discipline */}
          <div className="mb-3">
            <h3 className="font-bold text-[#2300fa] text-sm mb-2">Дисциплина</h3>
            <div className="grid grid-cols-2 gap-2">
              {disciplines.map((discipline) => (
                <label
                  key={discipline.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedDisciplineId === discipline.id ? "#2300fa" : "#e5e5e5",
                    backgroundColor: selectedDisciplineId === discipline.id ? "#f0f0ff" : "#ffffff",
                  }}
                >
                  <input
                    type="radio"
                    name="discipline"
                    checked={selectedDisciplineId === discipline.id}
                    onChange={() => setSelectedDisciplineId(discipline.id)}
                    className="w-4 h-4 accent-[#2300fa]"
                  />
                  <span className="text-sm text-black">{discipline.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Faculty — free-text with suggestions */}
          <div className="mb-3 relative" ref={facultyRef}>
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Факультет</label>
            <Input
              placeholder="Введите или выберите факультет..."
              value={facultyValue}
              onChange={(e) => {
                setFacultyValue(e.target.value)
                setIsFacultyDropdownOpen(true)
              }}
              onFocus={() => setIsFacultyDropdownOpen(true)}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm"
            />
            {isFacultyDropdownOpen && filteredFaculties.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                {filteredFaculties.map((faculty) => (
                  <button
                    key={faculty.id}
                    onClick={() => handleSelectFaculty(faculty)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                      facultyValue === faculty.name ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    {faculty.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Program — free-text with suggestions filtered by faculty */}
          <div className="mb-3 relative" ref={programRef}>
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Образовательная программа</label>
            <Input
              placeholder="Введите или выберите образовательную программу..."
              value={programValue}
              onChange={(e) => {
                setProgramValue(e.target.value)
                setIsProgramDropdownOpen(true)
              }}
              onFocus={() => setIsProgramDropdownOpen(true)}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm"
            />
            {isProgramDropdownOpen && filteredPrograms.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                {filteredPrograms.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => handleSelectProgram(program)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                      programValue === program.name ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    <span>{program.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Number of Groups */}
          <div className="mb-3">
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Количество групп</label>
            <Input
              type="number"
              min="1"
              placeholder="Введите количество групп"
              value={numberOfGroups}
              onChange={(e) => setNumberOfGroups(e.target.value.replace(/\D/g, ""))}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm w-32"
            />
          </div>

          {/* 5. Course Duration (Modules) */}
          <div className="mb-3">
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Продолжительность курса (модули)</label>
            <div className="flex gap-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  className={`flex-1 py-2 px-4 text-center text-sm font-medium rounded-md border transition-colors ${
                    selectedModuleIds.includes(module.id)
                      ? "bg-[#2300fa] text-white border-[#2300fa]"
                      : "bg-white text-black border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {module.number}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Links Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-[#2300fa] text-sm">Ссылки</label>
              <button
                onClick={addLinkRow}
                className="flex items-center gap-1 text-xs font-medium text-[#2300fa] hover:text-[#1a00c0] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить ссылку
              </button>
            </div>
            {links.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Ссылки не добавлены</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 grid grid-cols-[1fr_1fr_32px] px-3 py-1.5">
                  <span className="text-xs font-medium text-[#2300fa]">Название ссылки</span>
                  <span className="text-xs font-medium text-[#2300fa]">Ссылка</span>
                  <span />
                </div>
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_32px] gap-2 px-3 py-1.5 border-t border-gray-100 items-center"
                  >
                    <Input
                      placeholder="Курс LMS"
                      value={link.name}
                      onChange={(e) => updateLink(index, "name", e.target.value)}
                      className="bg-gray-50 border-none rounded-md h-8 text-xs"
                    />
                    <Input
                      placeholder="https://edu.hse.ru/course/..."
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                      className="bg-gray-50 border-none rounded-md h-8 text-xs"
                    />
                    <button
                      onClick={() => removeLinkRow(index)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="w-full h-10 rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-medium border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Подтвердить
          </Button>
        </div>
      </div>
    </div>
  )
}
