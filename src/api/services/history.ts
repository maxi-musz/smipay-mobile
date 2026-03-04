import { api } from "@/lib/api";
import type { ApiResponse, HistoryListData, SingleTransaction } from "@/types";

const HISTORY = "/history";

export interface FetchHistoryParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  credit_debit?: string;
  search?: string;
}

export async function fetchTransactionHistory(params: FetchHistoryParams = {}) {
  const { data } = await api.get<ApiResponse<HistoryListData>>(
    `${HISTORY}/fetch-all-history`,
    { params },
  );
  return data;
}

export async function fetchTransactionById(id: string) {
  const { data } = await api.get<ApiResponse<SingleTransaction>>(
    `${HISTORY}/${id}`,
  );
  return data;
}

