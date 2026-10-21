export interface Faq {
  _id: string;
  question: string;
  answer: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface FaqInput {
  question: string;
  answer: string;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}
