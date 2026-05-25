"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

type Role = 'student' | 'teacher' | 'manager';

const ROLE_LABELS: Record<Role, string> = {
  student: 'Студент',
  teacher: 'Преподаватель',
  manager: 'Менеджер',
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isStaff = role === 'teacher' || role === 'manager';

  const inputStyle = {
    backgroundColor: '#f8f8f8',
    color: '#000000',
    border: '2px solid transparent',
    borderRadius: '12px',
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#2300fa';
    e.target.style.backgroundColor = '#ffffff';
  };

  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'transparent';
    e.target.style.backgroundColor = '#f8f8f8';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const body: Record<string, string> = {
        email,
        password,
        role,
        firstName: isStaff ? firstName : '',
        lastName: isStaff ? lastName : '',
        middleName: isStaff ? middleName : '',
      };
      if (isStaff) {
        body.adminPassword = adminPassword;
      }

      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка регистрации');
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      if (role === 'student') {
        router.push('/survey');
      } else if (role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/manager');
      }
    } catch {
      setError('Ошибка подключения к серверу');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <div
        className="w-full space-y-6 bg-white p-10 rounded-xl shadow-md"
        style={{
          backgroundColor: '#ffffff',
          border: '3px solid #000000',
          maxWidth: isStaff ? '640px' : '448px',
          transition: 'max-width 0.2s ease',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            style={{
              WebkitMaskImage: 'url(../../logo.png)',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskImage: 'url(../../logo.png)',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              maskSize: 'contain',
              height: '70px',
              width: '70px',
              backgroundColor: '#000000',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-3 rounded-lg" style={{ backgroundColor: '#fee', border: '2px solid #fcc' }}>
            <p className="text-sm" style={{ color: '#c00', textAlign: 'center' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="Email"
            className="w-full px-5 py-4 text-base outline-none transition-all"
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
            disabled={isLoading}
            required
          />

          {/* Password */}
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Пароль"
            className="w-full px-5 py-4 text-base outline-none transition-all"
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
            disabled={isLoading}
            required
          />

          {/* Role selector */}
          <div className="flex gap-2 pt-1">
            {(['student', 'teacher', 'manager'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setAdminPassword('');
                  setFirstName('');
                  setLastName('');
                  setMiddleName('');
                  setError('');
                }}
                disabled={isLoading}
                className="flex-1 py-3 text-sm font-semibold transition-all rounded-xl"
                style={{
                  backgroundColor: role === r ? '#000000' : '#f0f0f0',
                  color: role === r ? '#ffffff' : '#666666',
                  border: 'none',
                }}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Staff-only fields */}
          {isStaff && (
            <>
              {/* Last name / First name / Middle name in one row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setError(''); }}
                  placeholder="Фамилия"
                  className="w-full px-4 py-4 text-base outline-none transition-all"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                  disabled={isLoading}
                  required
                />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                  placeholder="Имя"
                  className="w-full px-4 py-4 text-base outline-none transition-all"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                  disabled={isLoading}
                  required
                />
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => { setMiddleName(e.target.value); setError(''); }}
                  placeholder="Отчество"
                  className="w-full px-4 py-4 text-base outline-none transition-all"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                  disabled={isLoading}
                />
              </div>

              {/* Admin password */}
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setError(''); }}
                placeholder="Пароль доступа"
                className="w-full px-5 py-4 text-base outline-none transition-all"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
                disabled={isLoading}
                required
              />
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-4 font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#dcff05',
              color: '#000000',
              border: 'none',
              borderRadius: '12px',
            }}
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Back to login */}
        <div className="text-center">
          <p className="text-sm" style={{ color: '#666666' }}>
            Уже есть аккаунт?{' '}
            <button
              type="button"
              className="hover:opacity-70 transition-opacity font-semibold"
              style={{ color: '#ff1ef7' }}
              onClick={() => router.push('/')}
            >
              Войти
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
