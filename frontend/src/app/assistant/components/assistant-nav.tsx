"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from '@/lib/utils'

export function AssistantNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-1">
          <Link
            href="/student"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/student"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            My Courses
          </Link>
          <Link
            href="/student/schedule"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/student/schedule"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Schedule
          </Link>
        </div>
      </div>
    </nav>
  )
}
