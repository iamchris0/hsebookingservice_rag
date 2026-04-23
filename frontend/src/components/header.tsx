"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, LogOut } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

// URL бэкенда - можно задать через переменную окружения NEXT_PUBLIC_BACKEND_URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function Header() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Получаем токен из localStorage
      const token = localStorage.getItem('token');
      
      // Если токен есть, отправляем запрос на сервер для логирования выхода
      if (token) {
        try {
          await fetch(`${BACKEND_URL}/api/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });
        } catch (error) {
          // Игнорируем ошибки сети, так как токен все равно будет удален на клиенте
          console.warn('Logout request failed, but continuing with local cleanup:', error);
        }
      }

      // Очищаем токен и данные пользователя из localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Перенаправляем на страницу логина
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Даже при ошибке очищаем локальные данные и перенаправляем
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="relative h-16 overflow-hidden" style={{ backgroundColor: "#DCFF05" }}>
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-lg">
            <Image src="../logo.png" alt="D/C Logo" width={80} height={40} className="object-contain invert" />
          </div>
        </Link>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" className="bg-black hover:bg-black/80 text-white">
            <User className="w-4 h-4 mr-2" />
            Профиль
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-black hover:bg-black/80 text-white disabled:opacity-50"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? 'Logging out...' : 'Выход'}
          </Button>
        </div>
      </div>
    </header>
  )
}
