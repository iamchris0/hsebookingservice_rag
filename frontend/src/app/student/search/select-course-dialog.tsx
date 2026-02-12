"use client"

interface SelectCourseDialogProps {
  isOpen: boolean
  onClose: () => void
  teacherName: string
}

export function SelectCourseDialog({ isOpen, onClose, teacherName }: SelectCourseDialogProps) {
  if (!isOpen) return null

  return (
    <div>
      {/* TODO: implement dialog */}
    </div>
  )
}
