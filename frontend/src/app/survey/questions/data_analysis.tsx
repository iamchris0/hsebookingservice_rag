import React from 'react';
import { QuestionConfig } from './types';

const dataAnalysisQuestions: QuestionConfig[] = [
  {
    id: 'questionExplanation',
    text: 'Как вы объясните студенту разницу между медианой и средним?',
  },
  {
    id: 'pizzaCodeFix',
    text: 'Анализируем датасет по пиццериям. Задача — найти название ресторана (Restaurant), где стоимость пиццы (Price) максимальна. Студент написал следующий код. Исправьте ошибки студента в коде (не меняя логики решения) и поясните каждую ошибку, которую допустил студент.',
    imageSrc: '/andan.png',
  },
];

export default dataAnalysisQuestions;
