"use client"

interface DeleteCourseDialogProps {
  isOpen: boolean
  onClose: () => void
  teacherName: string
}

export function DeleteCourseDialog({ isOpen, onClose, teacherName }: DeleteCourseDialogProps) {
  if (!isOpen) return null

  return (
    <div>
      {/* TODO: implement dialog */}
    </div>
  )
}
