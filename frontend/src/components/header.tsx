"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, LogOut, ExternalLink } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

// URL бэкенда - можно задать через переменную окружения NEXT_PUBLIC_BACKEND_URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function Header() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Кнопка «Реестр DC» — только для преподавателей (роль из сохранённого при входе пользователя)
  const [isTeacher, setIsTeacher] = useState(false);
  const [openingDc, setOpeningDc] = useState(false);
  useEffect(() => {
    try {
      setIsTeacher(JSON.parse(localStorage.getItem('user') || 'null')?.role === 'teacher');
    } catch {
      setIsTeacher(false);
    }
  }, []);

  // Получаем одноразовую ссылку и открываем реестр DC в новой вкладке уже с выполненным входом
  const openDcRegistry = async () => {
    const tab = window.open('', '_blank');
    setOpeningDc(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/dc/handoff`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Не удалось открыть реестр DC');
      if (tab) tab.location.href = data.url;
      else window.location.href = data.url;
    } catch (error) {
      tab?.close();
      alert(error instanceof Error ? error.message : 'Не удалось открыть реестр DC');
    } finally {
      setOpeningDc(false);
    }
  };

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
          {isTeacher && (
            <Button
              variant="ghost"
              size="sm"
              className="bg-black hover:bg-black/80 text-white disabled:opacity-50"
              onClick={openDcRegistry}
              disabled={openingDc}
              title="Мои курсы и данные в реестре Data Culture"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Реестр DC
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="bg-black hover:bg-black/80 text-white"
            onClick={() => router.push('/profile')}
          >
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
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? 'Выходим...' : ''}
          </Button>
        </div>
      </div>
    </header>
  )
}
