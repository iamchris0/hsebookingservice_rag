"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronRight } from "lucide-react"

interface CourseCardProps {
  id: string
  discipline: string
  program: string
  modules: string
  instructor: string
  progress: number
}

export function CourseCard({ discipline, program, modules, instructor, progress }: CourseCardProps) {
  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">{discipline}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Program</p>
          <p className="text-sm font-medium text-foreground">{program}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Modules</p>
          <p className="text-sm font-medium text-foreground">{modules}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Instructor</p>
          <p className="text-sm font-medium text-foreground">{instructor}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Progress</p>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/10">
          Continue Learning
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  )
}
