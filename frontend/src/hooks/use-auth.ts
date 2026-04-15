"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// URL бэкенда - использует переменную окружения или fallback на localhost
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export function useAuth(requiredRole?: string | string[]) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Проверяем наличие токена в localStorage
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
          // Нет токена - перенаправляем на страницу логина
          router.push('/');
          return;
        }

        const userData: User = JSON.parse(userStr);

        // Проверяем токен на сервере
        const response = await fetch(`${BACKEND_URL}/api/protected`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          // Токен невалиден - очищаем и перенаправляем
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/');
          return;
        }

        // Проверяем роль, если требуется
        if (requiredRole && userData.role !== requiredRole) {
          // Неправильная роль - перенаправляем на соответствующую страницу
          if (userData.role === 'teacher') {
            router.push('/manager');
          } else if (userData.role === 'student') {
            router.push('/student');
          } else if (userData.role === 'manager') {
            router.push('/manager');
          } else {
            router.push('/');
          }
          return;
        }

        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        // При ошибке очищаем и перенаправляем
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - requiredRole and router are stable

  return { isLoading, isAuthenticated, user };
}
