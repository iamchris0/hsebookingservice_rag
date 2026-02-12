"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FiltersProps } from "../types"

export function Filters({ onNameChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Поиск по ФИО..."
        className="w-[250px] bg-white rounded-full border-border"
        onChange={(e) => onNameChange?.(e.target.value)}
      />
      <Select>
        <SelectTrigger className="w-[250px] bg-white rounded-full border-border">
          <SelectValue placeholder="Дисциплина" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="math">Mathematics</SelectItem>
          <SelectItem value="physics">Physics</SelectItem>
          <SelectItem value="cs">Computer Science</SelectItem>
          <SelectItem value="chemistry">Chemistry</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[250px] bg-white rounded-full border-border">
          <SelectValue placeholder="Программа" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="advanced">Advanced</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="beginner">Beginner</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[250px] bg-white rounded-full border-border">
          <SelectValue placeholder="Модули" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Module 1</SelectItem>
          <SelectItem value="2">Module 2</SelectItem>
          <SelectItem value="3">Module 3</SelectItem>
          <SelectItem value="4">Module 4</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
