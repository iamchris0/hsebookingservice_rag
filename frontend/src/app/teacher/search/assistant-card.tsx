"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, GraduationCap, BookOpen, Mail } from "lucide-react"
import { SelectAssistantDialog } from "./select-assistant-dialog"

interface Skill {
  number: number
  name: string
}

interface Assignment {
  discipline: string
  program: string
  groups: number
}

interface AssistantCardProps {
  id: string
  name: string
  skills: Skill[]
  faculty: string
  trainingProgram: string
  email: string
  isFavorite?: boolean
  currentAssignments?: Assignment[]
}

export function AssistantCard({ 
  name, 
  skills, 
  faculty, 
  trainingProgram, 
  email,
  isFavorite = false,
  currentAssignments = []
}: AssistantCardProps) {
  const [favorite, setFavorite] = useState(isFavorite)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col">
      {/* Header: Name and Favorite */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base text-black">{name}</h3>
        <button 
          onClick={() => setFavorite(!favorite)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Star 
            className={`w-5 h-5 ${favorite ? 'fill-[#ff1ef7] text-[#ff1ef7]' : 'text-gray-300'}`} 
          />
        </button>
      </div>

      {/* Skills Box */}
      <div className="bg-gray-100 rounded-lg p-3 mb-3">
        {skills.map((skill, index) => (
          <div key={skill.number}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#DCFF05] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-black">{skill.number}</span>
              </div>
              <span className="text-sm font-medium text-black">{skill.name}</span>
            </div>
            {index < skills.length - 1 && (
              <div className="border-b border-gray-300 my-2 ml-10" />
            )}
          </div>
        ))}
      </div>

      {/* Info Sections */}
      <div className="space-y-2 flex-1">
        {/* Faculty */}
        <div className="flex items-center gap-3 h-12">
          <div className="w-8 h-8 rounded-full bg-[#DCFF05] flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#2300fa]">Faculty of Education</p>
            <p className="text-sm font-medium text-black truncate">{faculty}</p>
          </div>
        </div>

        {/* Training Program */}
        <div className="flex items-center gap-3 h-12">
          <div className="w-8 h-8 rounded-full bg-[#DCFF05] flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#2300fa]">Training Program</p>
            <p className="text-sm font-medium text-black truncate">{trainingProgram}</p>
          </div>
        </div>

        {/* Contacts */}
        <div className="flex items-center gap-3 h-12">
          <div className="w-8 h-8 rounded-full bg-[#DCFF05] flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#2300fa]">Contacts</p>
            <p className="text-sm font-medium text-black truncate">{email}</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          className="flex-1 rounded-full border-[#2300fa] text-[#2300fa] bg-transparent hover:bg-blue-50 text-sm h-9"
        >
          Learn More
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 rounded-full border-[#000000] bg-[#DCFF05] hover:bg-[#c9eb00] text-black text-sm h-9"
          onClick={() => setIsDialogOpen(true)}
        >
          Select
        </Button>
      </div>

      <SelectAssistantDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        assistantName={name}
        currentAssignments={currentAssignments}
      />
    </Card>
  )
}
