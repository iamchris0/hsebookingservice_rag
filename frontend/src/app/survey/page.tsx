"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getQuestionsForDiscipline, QuestionConfig } from './questions';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ─── Draft persistence ────────────────────────────────────────────────────────

function getSurveyDraftKey(): string | null {
  // Keyed by account (email), not the token signature: a session that expires
  // mid-survey gets a new signature on re-login, which would otherwise orphan
  // the draft at the exact moment it's needed most.
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    const email = (JSON.parse(userStr) as { email?: string }).email;
    return email ? `survey_draft_${email}` : null;
  } catch {
    return null;
  }
}

function saveSurveyDraft(state: object): void {
  const key = getSurveyDraftKey();
  if (!key) return;
  try {
    // Remove stale drafts from previous sessions
    Object.keys(localStorage)
      .filter((k) => k.startsWith('survey_draft_') && k !== key)
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* storage full or unavailable */ }
}

function loadSurveyDraft(): Record<string, unknown> | null {
  const key = getSurveyDraftKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSurveyDraft(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('survey_draft_'))
    .forEach((k) => localStorage.removeItem(k));
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { lines: ['Информация', 'о себе'] },
  { lines: ['Образование'] },
  { lines: ['Приоритетная', 'дисциплина'] },
  { lines: ['Второй', 'приоритет'] },
  { lines: ['Мотивация'] },
  { lines: ['Рекомендации'] },
];

// ─── Shared input component ───────────────────────────────────────────────────

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  hasError,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hasError?: boolean;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '10px 0',
        fontSize: 15,
        color: '#111',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: `1.5px solid ${hasError ? '#e53e3e' : focused ? '#2300fa' : '#d1d5db'}`,
        outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
      }}
    />
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 2 }}>
        {label} <span style={{ color: '#e53e3e' }}>*</span>
      </div>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: number }) {
  // With 6 equal columns the center of column i is at (2i+1)/12 * 100%.
  // Line spans from center of col 0 to center of col 5 → left: 8.33%, width: 83.33%.
  // Completed portion width from col 0 center to col (current-1) center:
  //   width = (current - 1) / 6 * 100%
  const completedPct = (current - 1) / 6 * 100;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ position: 'relative' }}>
        {/* Gray base line */}
        <div style={{
          position: 'absolute',
          top: 18,
          left: `${100 / 12}%`,
          right: `${100 / 12}%`,
          height: 2,
          backgroundColor: '#e5e7eb',
          zIndex: 0,
        }} />
        {/* Black completed line */}
        <div style={{
          position: 'absolute',
          top: 18,
          left: `${100 / 12}%`,
          width: `${completedPct}%`,
          height: 2,
          backgroundColor: '#000',
          zIndex: 0,
          transition: 'width 0.25s ease',
        }} />

        {/* Step columns — each gets flex:1 so circles are always centered */}
        <div style={{ display: 'flex' }}>
          {STEPS.map((step, i) => {
            const active = i + 1 === current;
            const done = i + 1 < current;
            return (
              <div key={i} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}>
                {/* Circle */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: active || done ? '#000' : '#e5e7eb',
                  color: active || done ? '#dcff05' : '#999',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  transition: 'all 0.2s',
                }}>
                  {i + 1}
                </div>
                {/* Label — directly below its own circle, same column */}
                <div style={{
                  marginTop: 8,
                  fontSize: 11,
                  textAlign: 'center',
                  color: active ? '#111' : '#aaa',
                  fontWeight: active ? 600 : 400,
                  lineHeight: 1.35,
                  maxWidth: 80,
                }}>
                  {step.lines.map((line, j) => (
                    <span key={j}>{line}{j < step.lines.length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SelectInput ─────────────────────────────────────────────────────────────

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  hasError,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '10px 0',
          paddingRight: 20,
          fontSize: 15,
          color: value ? '#111' : '#aaa',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: `1.5px solid ${hasError ? '#e53e3e' : focused ? '#2300fa' : '#d1d5db'}`,
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span style={{
        position: 'absolute', right: 4, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
        fontSize: 11, color: '#888',
      }}>▾</span>
    </div>
  );
}

// ─── TextArea ─────────────────────────────────────────────────────────────────

function TextArea({
  value,
  onChange,
  placeholder,
  hasError,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '10px 0',
        fontSize: 15,
        color: '#111',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: `1.5px solid ${hasError ? '#e53e3e' : focused ? '#2300fa' : '#d1d5db'}`,
        outline: 'none',
        resize: 'vertical',
        minHeight: 72,
        lineHeight: 1.6,
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        display: 'block',
      }}
    />
  );
}

// ─── Nav buttons ──────────────────────────────────────────────────────────────

const leftBtnStyle: React.CSSProperties = {
  backgroundColor: '#f0f0f0',
  color: '#555',
  border: 'none',
  borderRadius: 10,
  padding: '12px 22px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

function NavButtons({
  onBack,
  onNext,
  onClear,
  nextLabel = 'Далее',
  loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  onClear?: () => void;
  nextLabel?: string;
  loading?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {onBack && (
          <button type="button" onClick={onBack} disabled={loading} style={leftBtnStyle}>
            ← Назад
          </button>
        )}
        {onClear && (
          <button type="button" onClick={onClear} disabled={loading} style={leftBtnStyle}>
            Очистить
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        style={{
          backgroundColor: '#dcff05',
          color: '#000',
          border: 'none',
          borderRadius: 10,
          padding: '12px 36px',
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {loading ? 'Сохранение...' : <>{nextLabel} &rarr;</>}
      </button>
    </div>
  );
}

// ─── Section 1: О себе ────────────────────────────────────────────────────────

interface S1 {
  lastName: string;
  firstName: string;
  middleName: string;
  telegram: string;
  birthday: string;
  citizenship: string;
  hseEmail: string;
  phone: string;
}

const emptyS1 = (): S1 => ({
  lastName: '', firstName: '', middleName: '',
  telegram: '', birthday: '', citizenship: '',
  hseEmail: '', phone: '',
});

function validateS1(s: S1): Partial<Record<keyof S1, string>> {
  const e: Partial<Record<keyof S1, string>> = {};
  if (!s.lastName.trim())    e.lastName   = 'Обязательное поле';
  if (!s.firstName.trim())   e.firstName  = 'Обязательное поле';
  if (!s.middleName.trim())  e.middleName = 'Обязательное поле';
  if (!s.telegram.trim())    e.telegram   = 'Обязательное поле';
  else if (!/^@\S+$/.test(s.telegram))   e.telegram   = 'Должен начинаться с @';
  if (!s.birthday)           e.birthday   = 'Обязательное поле';
  if (!s.citizenship.trim()) e.citizenship = 'Обязательное поле';
  if (!s.hseEmail.trim())    e.hseEmail   = 'Обязательное поле';
  else if (!/@edu\.hse\.ru$/.test(s.hseEmail))
    e.hseEmail = 'Почта должна оканчиваться на @edu.hse.ru';
  if (!s.phone.trim())       e.phone      = 'Обязательное поле';
  return e;
}

const onlyLetters = (v: string) => v.replace(/[^a-zA-Zа-яёА-ЯЁ\s-]/g, '');
const onlyPhone   = (v: string) => v.replace(/[^0-9+\-().\s]/g, '');

function Section1({
  data, errors, loading,
  onChange, onNext, onClear,
}: {
  data: S1;
  errors: Partial<Record<keyof S1, string>>;
  loading: boolean;
  onChange: (f: keyof S1, v: string) => void;
  onNext: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 32 }}>
        Информация о себе
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <Field label="Фамилия" error={errors.lastName}>
          <TextInput value={data.lastName} onChange={(v) => onChange('lastName', onlyLetters(v))}
            placeholder="Иванов" hasError={!!errors.lastName} disabled={loading} />
        </Field>

        <Field label="Имя" error={errors.firstName}>
          <TextInput value={data.firstName} onChange={(v) => onChange('firstName', onlyLetters(v))}
            placeholder="Иван" hasError={!!errors.firstName} disabled={loading} />
        </Field>

        <Field label="Отчество" error={errors.middleName}>
          <TextInput value={data.middleName} onChange={(v) => onChange('middleName', onlyLetters(v))}
            placeholder="Иванович" hasError={!!errors.middleName} disabled={loading} />
        </Field>

        <Field label="Telegram" error={errors.telegram}>
          <TextInput value={data.telegram}
            onChange={(v) => onChange('telegram', v.startsWith('@') ? v : `@${v}`)}
            placeholder="@username" hasError={!!errors.telegram} disabled={loading} />
        </Field>

        <Field label="Дата рождения" error={errors.birthday}>
          <TextInput value={data.birthday} onChange={(v) => onChange('birthday', v)}
            type="date" hasError={!!errors.birthday} disabled={loading} />
        </Field>

        <Field label="Гражданство" error={errors.citizenship}>
          <TextInput value={data.citizenship} onChange={(v) => onChange('citizenship', v)}
            placeholder="РФ" hasError={!!errors.citizenship} disabled={loading} />
        </Field>

        <Field label="Электронная почта EDU.HSE" error={errors.hseEmail} hint="Например: ivanov@edu.hse.ru">
          <TextInput value={data.hseEmail} onChange={(v) => onChange('hseEmail', v)}
            placeholder="student@edu.hse.ru" type="email"
            hasError={!!errors.hseEmail} disabled={loading} />
        </Field>

        <Field label="Номер телефона" error={errors.phone}>
          <TextInput value={data.phone} onChange={(v) => onChange('phone', onlyPhone(v))}
            placeholder="+7 (999) 000-00-00" hasError={!!errors.phone} disabled={loading} />
        </Field>
      </div>

      <NavButtons onNext={onNext} onClear={onClear} loading={loading} />
    </div>
  );
}

// ─── Section 2: Образование ───────────────────────────────────────────────────

interface S2 {
  faculty: string;
  program: string;
  studyYear: string;
  hasDebts: string;
  rating: string;
  digitalLiteracyScore: string;
  programmingScore: string;
  dataAnalysisScore: string;
}

const emptyS2 = (): S2 => ({
  faculty: '', program: '', studyYear: '', hasDebts: '',
  rating: '', digitalLiteracyScore: '', programmingScore: '', dataAnalysisScore: '',
});

function validateS2(s: S2): Partial<Record<keyof S2, string>> {
  const e: Partial<Record<keyof S2, string>> = {};
  if (!s.faculty.trim())       e.faculty              = 'Обязательное поле';
  if (!s.program.trim())       e.program              = 'Обязательное поле';
  if (!s.studyYear)            e.studyYear            = 'Обязательное поле';
  if (!s.hasDebts)             e.hasDebts             = 'Обязательное поле';
  if (!s.rating.trim())        e.rating               = 'Обязательное поле';
  if (!s.digitalLiteracyScore) e.digitalLiteracyScore = 'Выберите оценку';
  if (!s.programmingScore)     e.programmingScore     = 'Выберите оценку';
  if (!s.dataAnalysisScore)    e.dataAnalysisScore    = 'Выберите оценку';
  return e;
}

const EXAMS: { key: keyof S2; label: string }[] = [
  { key: 'digitalLiteracyScore', label: 'Цифровая грамотность и ИИ' },
  { key: 'programmingScore',     label: 'Программирование' },
  { key: 'dataAnalysisScore',    label: 'Анализ данных' },
];

const SCORE_OPTIONS = ['1','2','3','4','5','6','7','8','9','10'];

function Section2({
  data, errors, loading,
  onChange, onNext, onBack, onClear,
}: {
  data: S2;
  errors: Partial<Record<keyof S2, string>>;
  loading: boolean;
  onChange: (f: keyof S2, v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 32 }}>
        Образование
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Faculty + Program */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <Field label="Факультет" error={errors.faculty}>
            <TextInput value={data.faculty} onChange={(v) => onChange('faculty', v)}
              placeholder="ФКН" hasError={!!errors.faculty} disabled={loading} />
          </Field>
          <Field label="Образовательная программа" error={errors.program}>
            <TextInput value={data.program} onChange={(v) => onChange('program', v)}
              placeholder="ПМИ" hasError={!!errors.program} disabled={loading} />
          </Field>
        </div>

        {/* Course + Debts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <Field label="Курс" error={errors.studyYear}>
            <SelectInput
              value={data.studyYear}
              onChange={(v) => onChange('studyYear', v)}
              placeholder="Выберите курс"
              options={[1,2,3,4,5,6].map((n) => ({ value: String(n), label: `${n} курс` }))}
              hasError={!!errors.studyYear}
              disabled={loading}
            />
          </Field>
          <Field label="Есть ли задолженности?" error={errors.hasDebts}>
            <SelectInput
              value={data.hasDebts}
              onChange={(v) => onChange('hasDebts', v)}
              placeholder="Выберите..."
              options={[
                { value: 'no', label: 'Нет' },
                { value: 'yes', label: 'Да' },
                { value: 'little', label: 'Да, но по уважительной причине' }
              ]}
              hasError={!!errors.hasDebts}
              disabled={loading}
            />
          </Field>
        </div>

        {/* Rating full width */}
        <Field label="Ваш текущий рейтинг" error={errors.rating}>
          <TextInput value={data.rating} onChange={(v) => onChange('rating', v)}
            placeholder="1 из 100" hasError={!!errors.rating} disabled={loading} />
        </Field>

        {/* Exam scores table */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', color: '#111', marginBottom: 16 }}>
            Оценки за независимые экзамены
          </h3>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', padding: '10px 20px', backgroundColor: '#f8f8f8' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Экзамен</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Оценка</span>
            </div>

            {EXAMS.map((exam) => (
              <div key={exam.key} style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                padding: '16px 20px',
                borderTop: '1px solid #e5e7eb',
                alignItems: 'start',
              }}>
                <span style={{ fontSize: 14, color: '#111', paddingTop: 4 }}>{exam.label}</span>
                <div>
                  {/* 1–10 radio row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                    {SCORE_OPTIONS.map((n) => (
                      <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`exam-${exam.key}`}
                          value={n}
                          checked={data[exam.key] === n}
                          onChange={() => onChange(exam.key, n)}
                          style={{ accentColor: '#000', cursor: 'pointer', width: 14, height: 14 }}
                        />
                        <span style={{ fontSize: 14, color: '#333' }}>{n}</span>
                      </label>
                    ))}
                  </div>
                  {/* "Не сдавал(а)" */}
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`exam-${exam.key}`}
                        value="none"
                        checked={data[exam.key] === 'none'}
                        onChange={() => onChange(exam.key, 'none')}
                        style={{ accentColor: '#000', cursor: 'pointer', width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 14, color: '#666' }}>Не сдавал(а)</span>
                    </label>
                  </div>
                  {errors[exam.key] && (
                    <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }}>{errors[exam.key]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NavButtons onBack={onBack} onClear={onClear} onNext={onNext} loading={loading} />
    </div>
  );
}

// ─── Section 3: Приоритетная дисциплина ──────────────────────────────────────

interface S3 {
  disciplineId: string;
  groups: string;
  answers: Record<string, string>;
}

const emptyS3 = (): S3 => ({
  disciplineId: '', groups: '1', answers: {},
});

function validateS3(s: S3, questions: QuestionConfig[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s.disciplineId) e.disciplineId = 'Выберите дисциплину';
  for (const q of questions) {
    if (!(s.answers[q.id] ?? '').trim()) e[q.id] = 'Обязательное поле';
  }
  return e;
}

function QuestionField({
  question, imageSrc, value, onChange, error, disabled,
}: {
  question: React.ReactNode;
  imageSrc?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#333', lineHeight: 1.65, marginBottom: 10 }}>
        {question}
      </div>
      {imageSrc && (
        <img
          src={imageSrc}
          alt="Иллюстрация к вопросу"
          style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12, border: '1px solid #e5e7eb' }}
        />
      )}
      <TextArea value={value} onChange={onChange} placeholder="Введите ваш ответ..."
        hasError={!!error} disabled={disabled} />
      {error && <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function Section3({
  data, errors, loading, disciplines, questions,
  onChange, onAnswerChange, onNext, onBack, onClear,
}: {
  data: S3;
  errors: Record<string, string>;
  loading: boolean;
  disciplines: { id: number; name: string }[];
  questions: QuestionConfig[];
  onChange: (f: 'disciplineId' | 'groups', v: string) => void;
  onAnswerChange: (questionId: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 10 }}>
        Приоритетная дисциплина
      </h2>
      <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 28 }}>
        Со списком дисциплин и образовательных программ, на которых они читаются, можно ознакомиться по{' '}
        <a href="https://docs.google.com/spreadsheets/d/1o8fQKSrxz9jBJKOucxIIuVmNMcneLAKeWlSVpvcuTbE/edit" style={{ color: '#2300fa', textDecoration: 'none' }}>ссылке</a>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Field label="Выберите дисциплину" error={errors.disciplineId}>
          <SelectInput
            value={data.disciplineId}
            onChange={(v) => onChange('disciplineId', v)}
            placeholder="–"
            options={disciplines.map((d) => ({ value: String(d.id), label: d.name }))}
            hasError={!!errors.disciplineId}
            disabled={loading}
          />
        </Field>

        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 12 }}>
            Какое количество групп по курсу вы готовы взять?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['1', '2'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange('groups', n)}
                disabled={loading}
                style={{
                  flex: 1, padding: '13px 16px', fontSize: 14, fontWeight: 600,
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  backgroundColor: data.groups === n ? '#000' : '#f0f0f0',
                  color: data.groups === n ? '#dcff05' : '#666',
                  transition: 'all 0.15s',
                }}
              >
                {n} групп{n === '2' ? 'ы' : 'а'}
              </button>
            ))}
          </div>
        </div>

        {data.disciplineId && questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q.text}
            imageSrc={q.imageSrc}
            value={data.answers[q.id] ?? ''}
            onChange={(v) => onAnswerChange(q.id, v)}
            error={errors[q.id]}
            disabled={loading}
          />
        ))}
      </div>

      <NavButtons onBack={onBack} onClear={onClear} onNext={onNext} loading={loading} />
    </div>
  );
}

// ─── Section 4: Второй приоритет ─────────────────────────────────────────────

interface S4 {
  disciplineId: string; // '' = not chosen, 'skip' = Не рассматриваю, numeric = real discipline
  groups: string;
  answers: Record<string, string>;
}

const emptyS4 = (): S4 => ({
  disciplineId: '', groups: '1', answers: {},
});

function validateS4(s: S4, questions: QuestionConfig[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s.disciplineId) e.disciplineId = 'Выберите дисциплину или укажите, что не рассматриваете';
  if (s.disciplineId && s.disciplineId !== 'skip') {
    for (const q of questions) {
      if (!(s.answers[q.id] ?? '').trim()) e[q.id] = 'Обязательное поле';
    }
  }
  return e;
}

function Section4({
  data, errors, loading, disciplines, questions, excludedDisciplineId,
  onChange, onAnswerChange, onNext, onBack, onClear,
}: {
  data: S4;
  errors: Record<string, string>;
  loading: boolean;
  disciplines: { id: number; name: string }[];
  questions: QuestionConfig[];
  excludedDisciplineId: string;
  onChange: (f: 'disciplineId' | 'groups', v: string) => void;
  onAnswerChange: (questionId: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClear: () => void;
}) {
  const options = [
    ...disciplines
      .filter((d) => String(d.id) !== excludedDisciplineId)
      .map((d) => ({ value: String(d.id), label: d.name })),
    { value: 'skip', label: 'Не рассматриваю 2-й приоритет' },
  ];

  const hasRealDiscipline = data.disciplineId && data.disciplineId !== 'skip';

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 10 }}>
        Второй приоритет
      </h2>
      <p style={{ fontSize: 18, color: '#666', lineHeight: 1.65, marginBottom: 28 }}>
        Какой еще курс (блок курсов) вы рассматриваете для ассистирования?
      </p>
      <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 28 }}>
        Со списком дисциплин и образовательных программ, на которых они читаются, можно ознакомиться по{' '}
        <a href="https://docs.google.com/spreadsheets/d/1o8fQKSrxz9jBJKOucxIIuVmNMcneLAKeWlSVpvcuTbE/edit" style={{ color: '#2300fa', textDecoration: 'none' }}>ссылке</a>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Field label="Выберите дисциплину" error={errors.disciplineId}>
          <SelectInput
            value={data.disciplineId}
            onChange={(v) => onChange('disciplineId', v)}
            placeholder="–"
            options={options}
            hasError={!!errors.disciplineId}
            disabled={loading}
          />
        </Field>

        {hasRealDiscipline && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 12 }}>
              Какое количество групп по курсу вы готовы взять?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['1', '2'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange('groups', n)}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '13px 16px', fontSize: 14, fontWeight: 600,
                    borderRadius: 10, border: 'none', cursor: 'pointer',
                    backgroundColor: data.groups === n ? '#000' : '#f0f0f0',
                    color: data.groups === n ? '#dcff05' : '#666',
                    transition: 'all 0.15s',
                  }}
                >
                  {n} групп{n === '2' ? 'ы' : 'а'}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasRealDiscipline && questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q.text}
            imageSrc={q.imageSrc}
            value={data.answers[q.id] ?? ''}
            onChange={(v) => onAnswerChange(q.id, v)}
            error={errors[q.id]}
            disabled={loading}
          />
        ))}
      </div>

      <NavButtons onBack={onBack} onClear={onClear} onNext={onNext} loading={loading} />
    </div>
  );
}

// ─── Section 5: Мотивация ─────────────────────────────────────────────────────

interface S5 {
  motivation: string;
  achievements: string;
  priorCourses: string;
}

const emptyS5 = (): S5 => ({ motivation: '', achievements: '', priorCourses: '' });

function validateS5(s: S5): Partial<Record<keyof S5, string>> {
  const e: Partial<Record<keyof S5, string>> = {};
  if (!s.motivation.trim())    e.motivation    = 'Обязательное поле';
  if (!s.achievements.trim())  e.achievements  = 'Обязательное поле';
  if (!s.priorCourses.trim())  e.priorCourses  = 'Обязательное поле';
  return e;
}

function MotivationField({
  label, value, onChange, placeholder, error, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 12 }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: 14,
          color: '#111',
          backgroundColor: '#fff',
          border: `1px solid ${error ? '#e53e3e' : focused ? '#2300fa' : '#e5e7eb'}`,
          borderRadius: 8,
          outline: 'none',
          resize: 'vertical',
          minHeight: 96,
          lineHeight: 1.6,
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          display: 'block',
        }}
      />
      {error && <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function Section5({
  data, errors, loading,
  onChange, onNext, onBack, onClear,
}: {
  data: S5;
  errors: Partial<Record<keyof S5, string>>;
  loading: boolean;
  onChange: (f: keyof S5, v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 32 }}>
        Мотивация
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <MotivationField
          label="Расскажите, почему вы хотите быть ассистентом:"
          value={data.motivation}
          onChange={(v) => onChange('motivation', v)}
          placeholder="Почему вам интересно стать ассистентом?"
          error={errors.motivation}
          disabled={loading}
        />
        <MotivationField
          label="Расскажите о ваших достижениях:"
          value={data.achievements}
          onChange={(v) => onChange('achievements', v)}
          placeholder="Например, публикации, победы в конкурсах и т. п."
          error={errors.achievements}
          disabled={loading}
        />
        <MotivationField
          label="Изучали ли вы аналогичные курсы раньше?"
          value={data.priorCourses}
          onChange={(v) => onChange('priorCourses', v)}
          placeholder="Опишите, пожалуйста, ваш опыт в этой области"
          error={errors.priorCourses}
          disabled={loading}
        />
      </div>

      <NavButtons onBack={onBack} onClear={onClear} onNext={onNext} loading={loading} />
    </div>
  );
}

// ─── Section 6: Рекомендации ──────────────────────────────────────────────────

interface S6 {
  hasRecommendation: 'yes' | 'no';
  teacherEmail: string;
}

const emptyS6 = (): S6 => ({ hasRecommendation: 'no', teacherEmail: '' });

function validateS6(s: S6): Partial<Record<keyof S6, string>> {
  const e: Partial<Record<keyof S6, string>> = {};
  if (s.hasRecommendation === 'yes') {
    if (!s.teacherEmail.trim())        e.teacherEmail = 'Обязательное поле';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.teacherEmail))
                                       e.teacherEmail = 'Введите корректный email';
  }
  return e;
}

function Section6({
  data, errors, loading,
  onChange, onNext, onBack,
}: {
  data: S6;
  errors: Partial<Record<keyof S6, string>>;
  loading: boolean;
  onChange: (f: keyof S6, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 32 }}>
        Рекомендации
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Field label="Есть ли у вас рекомендация от преподавателя?">
          <SelectInput
            value={data.hasRecommendation}
            onChange={(v) => onChange('hasRecommendation', v)}
            options={[
              { value: 'no',  label: 'Нет' },
              { value: 'yes', label: 'Да' },
            ]}
            disabled={loading}
          />
        </Field>

        {data.hasRecommendation === 'yes' && (
          <Field label="Пожалуйста, укажите адрес электронной почты преподавателя" error={errors.teacherEmail}>
            <TextInput
              value={data.teacherEmail}
              onChange={(v) => onChange('teacherEmail', v)}
              placeholder="teacher@hse.ru"
              type="email"
              hasError={!!errors.teacherEmail}
              disabled={loading}
            />
          </Field>
        )}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Завершить" loading={loading} />
    </div>
  );
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        border: '3px solid #000',
        borderRadius: 16,
        padding: '56px 48px',
        maxWidth: 520,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          height: 70, width: 70,
          backgroundColor: '#000',
          WebkitMaskImage: 'url(../logo.png)',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskImage: 'url(../logo.png)',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'contain',
          margin: '0 auto 28px',
        }} />

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 16 }}>
          Анкета ассистента
        </h1>
        <p style={{ fontSize: 20, color: '#666', lineHeight: 1.7, marginBottom: 12 }}>
          Привет! 🤓
        </p>
        <p style={{ fontSize: 18, color: '#999', lineHeight: 1.6, marginBottom: 40 }}>
          Я помощник Data Culture. Моя задача — помогать преподавателям и студентам.<br />
          Пожалуйста, заполните анкету, чтобы преподаватели могли вас выбрать.
        </p>
        
        

        <button
          onClick={onStart}
          style={{
            backgroundColor: '#dcff05',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            padding: '14px 48px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SurveyPage() {
  const { isLoading } = useAuth('student');
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);

  const [s1, setS1] = useState<S1>(emptyS1);
  const [s1Errors, setS1Errors] = useState<Partial<Record<keyof S1, string>>>({});

  const [s2, setS2] = useState<S2>(emptyS2);
  const [s2Errors, setS2Errors] = useState<Partial<Record<keyof S2, string>>>({});

  const [disciplines, setDisciplines] = useState<{ id: number; name: string }[]>([]);
  const [s3, setS3] = useState<S3>(emptyS3);
  const [s3Errors, setS3Errors] = useState<Record<string, string>>({});

  const [s4, setS4] = useState<S4>(emptyS4);
  const [s4Errors, setS4Errors] = useState<Record<string, string>>({});

  const [s5, setS5] = useState<S5>(emptyS5);
  const [s5Errors, setS5Errors] = useState<Partial<Record<keyof S5, string>>>({});

  const [s6, setS6] = useState<S6>(emptyS6);
  const [s6Errors, setS6Errors] = useState<Partial<Record<keyof S6, string>>>({});

  const [saving, setSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Fetch disciplines
  useEffect(() => {
    if (isLoading) return;
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/api/disciplines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setDisciplines(await res.json());
      } catch { /* best-effort */ }
    };
    load();
  }, [isLoading]);

  // Restore draft once auth is ready
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (isLoading) return;
    const draft = loadSurveyDraft();
    if (draft) {
      if (draft.s1) setS1(draft.s1 as S1);
      if (draft.s2) setS2(draft.s2 as S2);
      if (draft.s3) setS3(draft.s3 as S3);
      if (draft.s4) setS4(draft.s4 as S4);
      if (draft.s5) setS5(draft.s5 as S5);
      if (draft.s6) setS6(draft.s6 as S6);
      if (typeof draft.step === 'number') setStep(draft.step);
      if (draft.started) setStarted(true);
    }
    draftRestoredRef.current = true;
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft on every change (debounced 500 ms)
  useEffect(() => {
    if (isLoading || !draftRestoredRef.current) return;
    const timer = setTimeout(() => {
      saveSurveyDraft({ s1, s2, s3, s4, s5, s6, step, started });
    }, 500);
    return () => clearTimeout(timer);
  }, [s1, s2, s3, s4, s5, s6, step, started, isLoading]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #000', borderTopColor: 'transparent' }}
          className="animate-spin" />
      </div>
    );
  }

  if (!started) return <WelcomeScreen onStart={() => setStarted(true)} />;

  // ── Complete: validate all sections, save everything, redirect ────────────
  const handleComplete = async () => {
    const e1 = validateS1(s1);
    const e2 = validateS2(s2);
    const disc3 = disciplines.find((d) => String(d.id) === s3.disciplineId);
    const questions3 = disc3 ? getQuestionsForDiscipline(disc3.name) : [];
    const e3 = validateS3(s3, questions3);

    const disc4 = disciplines.find((d) => String(d.id) === s4.disciplineId);
    const questions4 = disc4 ? getQuestionsForDiscipline(disc4.name) : [];
    const e4 = validateS4(s4, questions4);

    if (Object.keys(e1).length > 0) {
      setS1Errors(e1);
      setStep(1);
      return;
    }
    if (Object.keys(e2).length > 0) {
      setS2Errors(e2);
      setStep(2);
      return;
    }
    if (Object.keys(e3).length > 0) {
      setS3Errors(e3);
      setStep(3);
      return;
    }
    if (Object.keys(e4).length > 0) {
      setS4Errors(e4);
      setStep(4);
      return;
    }
    const e5 = validateS5(s5);
    if (Object.keys(e5).length > 0) {
      setS5Errors(e5);
      setStep(5);
      return;
    }
    const e6 = validateS6(s6);
    if (Object.keys(e6).length > 0) {
      setS6Errors(e6);
      setStep(6);
      return;
    }

    setSaving(true);
    setCompleteError(null);

    // Every step must actually be confirmed saved before we tell the student
    // they're done. Previously none of these calls checked their response, so
    // a single failure (expired session, a transient 500, ...) still ended in
    // "success": the local flag was set, the draft was wiped, and the student
    // was sent onward — while the backend might not have saved anything and
    // questionnaire_completed stayed false. The next login would then bounce
    // them straight back to a blank survey, which looked like a lockout.
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const step = async (label: string, path: string, init: RequestInit) => {
      let response: Response;
      try {
        response = await fetch(`${BACKEND_URL}${path}`, init);
      } catch {
        throw new Error(`Не удалось сохранить раздел «${label}»: нет соединения с сервером`);
      }
      if (response.status === 401) {
        throw new Error('Сессия истекла. Войдите заново — введённые данные сохранены как черновик.');
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Не удалось сохранить раздел «${label}»`);
      }
    };

    try {
      await step('Информация о себе', '/api/student/profile', {
        method: 'PUT', headers: h,
        body: JSON.stringify({
          firstName: s1.firstName, lastName: s1.lastName, middleName: s1.middleName,
          telegram: s1.telegram, birthday: s1.birthday,
          citizenship: s1.citizenship, phone: s1.phone,
        }),
      });

      await step('Образование', '/api/student/education', {
        method: 'PUT', headers: h,
        body: JSON.stringify({
          faculty: s2.faculty, program: s2.program,
          studyYear: parseInt(s2.studyYear),
          hasDebts: s2.hasDebts === 'yes',
          rating: s2.rating,
          digitalLiteracyScore: s2.digitalLiteracyScore === 'none' ? '-' : s2.digitalLiteracyScore,
          programmingScore:     s2.programmingScore     === 'none' ? '-' : s2.programmingScore,
          dataAnalysisScore:    s2.dataAnalysisScore    === 'none' ? '-' : s2.dataAnalysisScore,
        }),
      });

      await step('Приоритетная дисциплина', '/api/student/priorities', {
        method: 'PUT', headers: h,
        body: JSON.stringify({
          disciplineId: parseInt(s3.disciplineId),
          desiredGroupSize: parseInt(s3.groups),
          answers: s3.answers,
          priority: 1,
        }),
      });

      if (s4.disciplineId && s4.disciplineId !== 'skip') {
        await step('Второй приоритет', '/api/student/priorities', {
          method: 'PUT', headers: h,
          body: JSON.stringify({
            disciplineId: parseInt(s4.disciplineId),
            desiredGroupSize: parseInt(s4.groups),
            answers: s4.answers,
            priority: 2,
          }),
        });
      }

      if (s6.hasRecommendation === 'yes') {
        await step('Рекомендации', '/api/student/recommendation', {
          method: 'PUT', headers: h,
          body: JSON.stringify({ teacherEmail: s6.teacherEmail }),
        });
      }

      await step('Мотивация', '/api/student/motivation', {
        method: 'PUT', headers: h,
        body: JSON.stringify({
          motivation: s5.motivation,
          achievements: s5.achievements,
          priorCourses: s5.priorCourses,
        }),
      });

      await step('Завершение анкеты', '/api/student/survey/complete', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });

      // Only now, with every section confirmed saved, is it safe to mark the
      // survey done locally and let the draft go.
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        localStorage.setItem('user', JSON.stringify({ ...user, questionnaireCompleted: true }));
      }

      clearSurveyDraft();
      router.push('/student/my-groups');
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Не удалось сохранить анкету');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '40px 20px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <ProgressBar current={step} />

        <div style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          border: '1.5px solid #e5e7eb',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          padding: '40px 48px',
        }}>
          {step === 1 && (
            <Section1
              data={s1}
              errors={s1Errors}
              loading={saving}
              onChange={(f, v) => {
                setS1((p) => ({ ...p, [f]: v }));
                setS1Errors((p) => ({ ...p, [f]: undefined }));
              }}
              onNext={() => setStep(2)}
              onClear={() => { setS1(emptyS1()); setS1Errors({}); }}
            />
          )}
          {step === 2 && (
            <Section2
              data={s2}
              errors={s2Errors}
              loading={saving}
              onChange={(f, v) => {
                setS2((p) => ({ ...p, [f]: v }));
                setS2Errors((p) => ({ ...p, [f]: undefined }));
              }}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              onClear={() => { setS2(emptyS2()); setS2Errors({}); }}
            />
          )}
          {step === 3 && (
            <Section3
              data={s3}
              errors={s3Errors}
              loading={saving}
              disciplines={disciplines}
              questions={(() => {
                const d = disciplines.find((d) => String(d.id) === s3.disciplineId);
                return d ? getQuestionsForDiscipline(d.name) : [];
              })()}
              onChange={(f, v) => {
                setS3((p) => ({ ...p, [f]: v }));
                if (f === 'disciplineId') setS3Errors({});
              }}
              onAnswerChange={(qId, v) => {
                setS3((p) => ({ ...p, answers: { ...p.answers, [qId]: v } }));
                setS3Errors((p) => { const n = { ...p }; delete n[qId]; return n; });
              }}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              onClear={() => { setS3(emptyS3()); setS3Errors({}); }}
            />
          )}
          {step === 4 && (
            <Section4
              data={s4}
              errors={s4Errors}
              loading={saving}
              disciplines={disciplines}
              excludedDisciplineId={s3.disciplineId}
              questions={(() => {
                const d = disciplines.find((d) => String(d.id) === s4.disciplineId);
                return d ? getQuestionsForDiscipline(d.name) : [];
              })()}
              onChange={(f, v) => {
                setS4((p) => ({ ...p, [f]: v }));
                if (f === 'disciplineId') setS4Errors({});
              }}
              onAnswerChange={(qId, v) => {
                setS4((p) => ({ ...p, answers: { ...p.answers, [qId]: v } }));
                setS4Errors((p) => { const n = { ...p }; delete n[qId]; return n; });
              }}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
              onClear={() => { setS4(emptyS4()); setS4Errors({}); }}
            />
          )}
          {step === 5 && (
            <Section5
              data={s5}
              errors={s5Errors}
              loading={saving}
              onChange={(f, v) => {
                setS5((p) => ({ ...p, [f]: v }));
                setS5Errors((p) => ({ ...p, [f]: undefined }));
              }}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
              onClear={() => { setS5(emptyS5()); setS5Errors({}); }}
            />
          )}
          {step === 6 && (
            <Section6
              data={s6}
              errors={s6Errors}
              loading={saving}
              onChange={(f, v) => {
                setS6((p) => ({ ...p, [f]: v }));
                setS6Errors((p) => ({ ...p, [f]: undefined }));
              }}
              onNext={handleComplete}
              onBack={() => setStep(5)}
            />
          )}
          {completeError && (
            <div style={{
              marginTop: 20, padding: '14px 16px',
              backgroundColor: '#fee', border: '1.5px solid #fcc', borderRadius: 10,
            }}>
              <p style={{ fontSize: 13, color: '#c00', lineHeight: 1.5 }}>{completeError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
