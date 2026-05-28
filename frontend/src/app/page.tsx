"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// URL бэкенда - можно задать через переменную окружения NEXT_PUBLIC_BACKEND_URL
// В Next.js переменные окружения с NEXT_PUBLIC_ доступны в клиентских компонентах
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка входа');
        setIsLoading(false);
        return;
      }

      // Сохраняем токен в localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Редирект в зависимости от роли
      const role = data.user?.role;
      if (role === 'teacher') {
        router.push('/teacher');
      } else if (role === 'student') {
        router.push(data.user?.questionnaireCompleted ? '/student' : '/survey');
      } else if (role === 'manager') {
        router.push('/manager');
      } else {
        setError('Неизвестная роль пользователя');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Ошибка подключения к серверу');
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <div 
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md"
        style={{ 
          backgroundColor: '#ffffff',
          border: '3px solid #000000'
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
            <div
              className="w-10 h-10 bg-black"
              style={{
                WebkitMaskImage: "url(../logo.png)",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
                maskImage: "url(../logo.png)",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
                height: "70px",
                width: "70px",
              }}
            />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 px-5 py-3 rounded-lg" style={{ backgroundColor: '#fee', border: '2px solid #fcc' }}>
            <p className="text-sm" style={{ color: '#c00' }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Login Input */}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="Login"
              className="w-full px-5 py-4 text-base outline-none transition-all"
              style={{ 
                backgroundColor: '#f8f8f8',
                color: '#000000',
                border: '2px solid transparent',
                borderRadius: '12px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2300fa';
                e.target.style.backgroundColor = '#ffffff';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'transparent';
                e.target.style.backgroundColor = '#f8f8f8';
              }}
              disabled={isLoading}
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Password"
              className="w-full px-5 py-4 text-base outline-none transition-all"
              style={{ 
                backgroundColor: '#f8f8f8',
                color: '#000000',
                border: '2px solid transparent',
                borderRadius: '12px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2300fa';
                e.target.style.backgroundColor = '#ffffff';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'transparent';
                e.target.style.backgroundColor = '#f8f8f8';
              }}
              disabled={isLoading}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-4 font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: '#dcff05',
              color: '#000000',
              border: 'none',
              borderRadius: '12px'
            }}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm p-4" style={{ color: '#666666' }}>
            Еще не зарегистрированы?{' '}
            <button
              type="button"
              className="hover:opacity-70 transition-opacity font-semibold"
              style={{ color: '#ff1ef7' }}
              onClick={() => router.push('/register')}
            >
              Нажмите здесь
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}