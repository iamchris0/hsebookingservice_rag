"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function GroupFilters() {
  return (
    <div className="flex flex-wrap gap-3">
      <Select>
        <SelectTrigger className="w-[200px] bg-white rounded-full border-border">
          <SelectValue placeholder="Filter by discipline" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="math">Mathematics</SelectItem>
          <SelectItem value="physics">Physics</SelectItem>
          <SelectItem value="cs">Computer Science</SelectItem>
          <SelectItem value="chemistry">Chemistry</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[200px] bg-white rounded-full border-border">
          <SelectValue placeholder="Filter by program" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="advanced">Advanced</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="beginner">Beginner</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[200px] bg-white rounded-full border-border">
          <SelectValue placeholder="Filter by module" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Module 1</SelectItem>
          <SelectItem value="2">Module 2</SelectItem>
          <SelectItem value="3">Module 3</SelectItem>
          <SelectItem value="4">Module 4</SelectItem>
          <SelectItem value="5">Module 5</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
