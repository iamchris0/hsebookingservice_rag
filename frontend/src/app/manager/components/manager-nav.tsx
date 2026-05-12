"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function ManagerNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-1">
          <Link
            href="/manager"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/manager"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Курсы
          </Link>
          <Link
            href="/manager/ai-assistant"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/manager/ai-assistant"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            ИИ помощник
          </Link>
        </div>
      </div>
    </nav>
  )
}
