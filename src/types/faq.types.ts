export interface CreateFaqDto {
  question: string;
  answer: string;
  category?: string;
}

export interface UpdateFaqDto {
  question?: string;
  answer?: string;
  category?: string;
  is_active?: boolean;
}
