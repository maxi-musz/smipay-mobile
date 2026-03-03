/** Generic state wrapper for any async operation (API calls, etc.) */
export interface AsyncState<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export const initialAsyncState: AsyncState = {
  data: null,
  isLoading: false,
  error: null,
};

export function createAsyncState<T>(data: T | null = null): AsyncState<T> {
  return { data, isLoading: false, error: null };
}
