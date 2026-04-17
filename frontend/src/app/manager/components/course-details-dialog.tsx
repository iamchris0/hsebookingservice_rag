"use client"

import { useState, useEffect } from "react"
import { X, Users, BookOpen, GraduationCap, UsersRound, Link as LinkIcon, Tag } from "lucide-react"
import { Course } from "../types"

interface CourseDetailsDialogProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

export function CourseDetailsDialog({ course, isOpen, onClose }: CourseDetailsDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const t = setTimeout(() => setIsAnimating(true), 50)
      return () => clearTimeout(t)
    } else {
      setIsAnimating(false)
      const timeout = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  if (!isVisible || !course) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

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
            <h2 className="text-lg font-bold text-[#2300fa]">Course Details</h2>
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
        <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto space-y-3">
          {/* Row 1: Discipline + Teacher */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Discipline</span>
              </div>
              <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{course.discipline}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Teacher</span>
              </div>
              <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{course.teacherName}</p>
            </div>
          </div>

          {/* Row 2: Assistant */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-[#2300fa]" />
              <span className="text-xs font-bold text-[#2300fa]">Assistant</span>
            </div>
            <p className={`text-sm bg-gray-100 rounded-lg px-3 py-2 ${course.assistantName ? "text-black" : "text-[#ff1ef7]"}`}>
              {course.assistantName || "No assistant assigned"}
            </p>
          </div>

          {/* Row 3: Faculty + Educational Program */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Faculty</span>
              </div>
              <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{course.faculty}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Educational Program</span>
              </div>
              <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{course.program}</p>
            </div>
          </div>

          {/* Row 4: Number of Groups (20%) + Course Duration (80%) */}
          <div className="flex gap-3 items-end">
            <div style={{ flex: "0 0 20%" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <UsersRound className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Groups</span>
              </div>
              <div className="h-9 flex items-center justify-center text-sm font-semibold bg-gray-100 rounded-lg">
                {course.numberOfGroups}
              </div>
            </div>
            <div style={{ flex: "0 0 calc(80% - 0.75rem)" }}>
              <p className="text-xs font-bold text-[#2300fa] mb-1">Course Duration</p>
              <div className="flex">
                {[1, 2, 3, 4].map((moduleNum, index) => (
                  <div
                    key={moduleNum}
                    className={`flex-1 h-9 flex items-center justify-center text-sm font-semibold ${
                      course.duration.includes(moduleNum) ? "bg-black shadow-md" : "bg-gray-200 text-gray-400"
                    } ${index === 0 ? "rounded-l-full" : ""} ${index === 3 ? "rounded-r-full" : ""}`}
                    style={course.duration.includes(moduleNum) ? { color: "#DCFF05" } : {}}
                  >
                    {moduleNum}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 5: Links */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#2300fa]" />
              <span className="text-xs font-bold text-[#2300fa]">Links</span>
            </div>
            {!course.links || course.links.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No links</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 grid grid-cols-2 px-3 py-1.5">
                  <span className="text-xs font-medium text-[#2300fa]">Link Name</span>
                  <span className="text-xs font-medium text-[#2300fa]">URL</span>
                </div>
                {course.links.map((link, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-2 px-3 py-2 border-t border-gray-100 items-center"
                  >
                    <span className="text-sm text-black truncate">{link.name}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#2300fa] underline truncate hover:text-[#1a00c0] transition-colors"
                    >
                      {link.url}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
