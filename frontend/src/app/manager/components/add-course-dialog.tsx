"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CourseData, Discipline, LinkRow } from "../types"

interface AddCourseDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CourseData) => void
  editData?: CourseData | null
}

const disciplines: Discipline[] = [
  "Data Analysis",
  "Programming",
  "Machine Learning",
  "Mathematics",
]

const mockTeachers = [
  "Prof. Ivanov A.S.",
  "Prof. Smirnova E.V.",
  "Prof. Kuznetsov M.I.",
  "Prof. Volkov R.A.",
  "Prof. Popova N.K.",
  "Prof. Lebedev D.O.",
  "Prof. Novikova I.P.",
  "Prof. Fedorov V.G.",
  "Prof. Morozova T.L.",
  "Prof. Andreev S.N.",
]

export function AddCourseDialog({ isOpen, onClose, onSubmit, editData }: AddCourseDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Form state
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false)
  const teacherRef = useRef<HTMLDivElement>(null)
  const [teacherSearch, setTeacherSearch] = useState("")
  const [faculty, setFaculty] = useState("")
  const [program, setProgram] = useState("")
  const [numberOfGroups, setNumberOfGroups] = useState("")
  const [selectedModules, setSelectedModules] = useState<number[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setSelectedDiscipline(editData.discipline)
        setSelectedTeacher(editData.teacherName)
        setTeacherSearch(editData.teacherName)
        setFaculty(editData.faculty)
        setProgram(editData.program)
        setNumberOfGroups(String(editData.numberOfGroups))
        setSelectedModules(editData.duration)
        setLinks(editData.links || [])
      }
      setIsVisible(true)
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setSelectedDiscipline(null)
        setSelectedTeacher("")
        setTeacherSearch("")
        setFaculty("")
        setProgram("")
        setNumberOfGroups("")
        setSelectedModules([])
        setLinks([])
        setIsTeacherDropdownOpen(false)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen, editData])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teacherRef.current && !teacherRef.current.contains(e.target as Node)) {
        setIsTeacherDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const toggleModule = (module: number) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    )
  }

  const addLinkRow = () => {
    setLinks((prev) => [...prev, { name: "", url: "" }])
  }

  const removeLinkRow = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, field: "name" | "url", value: string) => {
    setLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    )
  }

  const filteredTeachers = mockTeachers.filter((t) =>
    t.toLowerCase().includes(teacherSearch.toLowerCase()),
  )

  const handleSelectTeacher = (teacher: string) => {
    setSelectedTeacher(teacher)
    setTeacherSearch(teacher)
    setIsTeacherDropdownOpen(false)
  }

  const handleConfirm = () => {
    if (!selectedDiscipline) return
    onSubmit({
      discipline: selectedDiscipline,
      teacherName: selectedTeacher,
      faculty,
      program,
      numberOfGroups: parseInt(numberOfGroups) || 1,
      duration: selectedModules,
      links,
    })
    onClose()
  }

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
            <h2 className="text-lg font-bold text-[#2300fa]">{editData ? "Edit Course" : "Add New Course"}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-[2px] bg-[#2300fa] mt-2" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto">
          {/* 1. Discipline Selection */}
          <div className="mb-3">
            <h3 className="font-bold text-[#2300fa] text-sm mb-2">Discipline</h3>
            <div className="grid grid-cols-2 gap-2">
              {disciplines.map((discipline) => (
                <label
                  key={discipline}
                  className="flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedDiscipline === discipline ? '#2300fa' : '#e5e5e5',
                    backgroundColor: selectedDiscipline === discipline ? '#f0f0ff' : '#ffffff'
                  }}
                >
                  <input
                    type="radio"
                    name="discipline"
                    value={discipline}
                    checked={selectedDiscipline === discipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value as Discipline)}
                    className="w-4 h-4 accent-[#2300fa]"
                  />
                  <span className="text-sm" style={{ color: '#000000' }}>{discipline}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Teacher Dropdown */}
          <div className="mb-3 relative" ref={teacherRef}>
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Teacher</label>
            <Input
              placeholder="Search teacher..."
              value={teacherSearch}
              onChange={(e) => {
                setTeacherSearch(e.target.value)
                setSelectedTeacher(e.target.value)
                setIsTeacherDropdownOpen(true)
              }}
              onFocus={() => setIsTeacherDropdownOpen(true)}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm"
            />
            {isTeacherDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher) => (
                    <button
                      key={teacher}
                      onClick={() => handleSelectTeacher(teacher)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                        selectedTeacher === teacher ? "bg-gray-100 font-medium" : ""
                      }`}
                    >
                      {teacher}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-sm text-gray-400">No teachers found</div>
                )}
              </div>
            )}
          </div>

          {/* 3. Faculty */}
          <div className="mb-3">
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Faculty</label>
            <Input
              placeholder="Enter faculty name"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm"
            />
          </div>

          {/* 4. Educational Program */}
          <div className="mb-3">
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">
              Educational Program
            </label>
            <Input
              placeholder="Enter educational program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm"
            />
          </div>

          {/* 5. Number of Groups */}
          <div className="mb-3">
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">
              Number of Groups
            </label>
            <Input
              type="number"
              min="1"
              placeholder="Enter number"
              value={numberOfGroups}
              onChange={(e) => setNumberOfGroups(e.target.value.replace(/\D/g, ""))}
              className="bg-gray-100 border-none rounded-lg h-9 text-sm w-32"
            />
          </div>

          {/* 6. Course Duration (Modules) */}
          <div className="mb-3">
            <label className="block font-bold text-[#2300fa] text-sm mb-1.5">
              Course Duration (modules)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((module) => (
                <button
                  key={module}
                  onClick={() => toggleModule(module)}
                  className={`flex-1 py-2 px-4 text-center text-sm font-medium rounded-md border transition-colors ${
                    selectedModules.includes(module)
                      ? "bg-[#2300fa] text-white border-[#2300fa]"
                      : "bg-white text-black border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {module}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Links Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-[#2300fa] text-sm">Links</label>
              <button
                onClick={addLinkRow}
                className="flex items-center gap-1 text-xs font-medium text-[#2300fa] hover:text-[#1a00c0] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add link
              </button>
            </div>

            {links.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No links added yet</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 grid grid-cols-[1fr_1fr_32px] px-3 py-1.5">
                  <span className="text-xs font-medium text-[#2300fa]">Link Name</span>
                  <span className="text-xs font-medium text-[#2300fa]">URL</span>
                  <span />
                </div>
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_32px] gap-2 px-3 py-1.5 border-t border-gray-100 items-center"
                  >
                    <Input
                      placeholder="Name"
                      value={link.name}
                      onChange={(e) => updateLink(index, "name", e.target.value)}
                      className="bg-gray-50 border-none rounded-md h-8 text-xs"
                    />
                    <Input
                      placeholder="https://..."
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
            disabled={
              !selectedDiscipline ||
              !selectedTeacher ||
              !faculty ||
              !program ||
              !numberOfGroups ||
              selectedModules.length === 0
            }
            className="w-full h-10 rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-medium border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editData ? "Save Changes" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  )
}
