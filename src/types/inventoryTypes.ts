export type GetTransactionQuery = {
  search?: string;
  ingredient_id?: string;
  user_id?: string;
  transaction_type?: 'import' | 'export' | 'adjustment';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: string;
};

export type GetInventoryDailyQuery = {
  search?: string;
  ingredient_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: string;
};
