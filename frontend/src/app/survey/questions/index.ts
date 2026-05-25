import dataAnalysisQuestions from './data_analysis';
import pythonQuestions from './python';
import mlQuestions from './ml';
import digitalLiteracyQuestions from './digital-literacy';
import { QuestionConfig } from './types';

export type { QuestionConfig };

const DISCIPLINE_QUESTIONS: Record<string, QuestionConfig[]> = {
  'Анализ данных': dataAnalysisQuestions,
  'Программирование на Python': pythonQuestions,
  'Машинное обучение': mlQuestions,
  'Цифровая грамотность': digitalLiteracyQuestions,
};

export function getQuestionsForDiscipline(disciplineName: string): QuestionConfig[] {
  return DISCIPLINE_QUESTIONS[disciplineName] ?? [];
}
