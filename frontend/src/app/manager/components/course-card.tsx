import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Users, BookOpen, GraduationCap, UsersRound } from "lucide-react"
import { Course } from "../types"

export interface CourseCardProps {
  course: Course
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function CourseCard({ course, onEdit, onDelete }: CourseCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <p className="text-base font-bold text-black m-4 text-center">
              Вы уверены, что хотите удалить этот курс?
            </p>
            <p className="text-sm text-gray-500 mb-6 text-center">Это действие необратимо.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full border-2 border-gray-300 text-black hover:bg-gray-50"
                onClick={() => setConfirmOpen(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 rounded-full bg-[#ff1ef7] hover:bg-[#e000dc] text-white border-0"
                onClick={() => { onDelete(course.id); setConfirmOpen(false) }}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
      <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
          <h2 className="text-base font-bold text-[#000000] min-h-[32px] leading-tight">
            {course.teacherName}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              onClick={() => onEdit(course.id)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#ff1ef7] hover:text-[#ff1ef7] hover:bg-red-50"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
  
        <CardContent className="space-y-2 px-4 pb-4 flex-1">
          <div className="flex items-start gap-2.5 h-[44px]">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#DCFF05" }}
            >
              <Users className="h-4 w-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
                Assistant
              </p>
              <p className={`text-xs ${course.assistantName ? 'text-black font-medium' : 'text-[#ff1ef7]'} leading-tight line-clamp-2`}>
                {course.assistantName || "No assistant assigned"}
              </p>
            </div>
          </div>
  
          <div className="flex items-start gap-2.5 h-[44px]">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#DCFF05" }}
            >
              <GraduationCap className="h-4 w-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
                Faculty
              </p>
              <p className="text-xs font-medium text-black leading-tight line-clamp-2">{course.faculty}</p>
            </div>
          </div>
  
          <div className="flex items-start gap-2.5 h-[44px]">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#DCFF05" }}
            >
              <BookOpen className="h-4 w-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
                Educational Program
              </p>
              <p className="text-xs font-medium text-black leading-tight line-clamp-2">{course.program}</p>
            </div>
          </div>
  
          <div className="flex items-start gap-2.5 h-[44px]">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#DCFF05" }}
            >
              <UsersRound className="h-4 w-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: "#2300fa" }}>
                Number of Groups
              </p>
              <p className="text-xs font-medium text-black leading-tight">{course.numberOfGroups}</p>
            </div>
          </div>
  
          <div>
            <p className="text-xs mb-2" style={{ color: "#2300fa" }}>
              Course Duration
            </p>
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
        </CardContent>
  
        <CardFooter className="p-4 pt-0">
          <Button
            variant="outline"
            className="w-full h-10 text-sm font-medium bg-transparent border-2 border-blue-600 text-black hover:bg-blue-600 hover:text-white rounded-full transition-colors"
          >
            More Details
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}