import React from 'react';
import { QuestionConfig } from './types';

const digitalLiteracyQuestions: QuestionConfig[] = [
  {
    id: 'dl_1',
    text: (
      <>
        Приложите ссылку на вашу попытку сдачи экзамена в разделе{' '}
        <a href="https://edu.hse.ru/mod/quiz/view.php?id=507480" style={{ color: '#2300fa', textDecoration: 'none' }}>
          Случайный вариант
        </a>{' '}
        Открытого банка НЭ:
      </>
    ),
  },
  {
    id: 'dl_2',
    text: 'Выберите вопрос из вашей случайной попытки и представьте, что к вам обратился студент с просьбой его пояснить. Как вы ответите?',
  },
  {
    id: 'dl_3',
    text: 'Расскажите, на чём бы вы сфокусировались, если бы вас попросили провести консультацию по Независимому экзамену?',
  },
];

export default digitalLiteracyQuestions;
