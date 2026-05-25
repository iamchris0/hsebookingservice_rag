import { ReactNode } from 'react';

export interface QuestionConfig {
  id: string;
  text: ReactNode;
  /** Path to a static image shown inside the question (e.g. a code screenshot). */
  imageSrc?: string;
}
