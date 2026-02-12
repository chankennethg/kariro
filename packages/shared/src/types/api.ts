export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

export interface PaginatedResponse<T> {
  readonly success: boolean;
  readonly data: readonly T[];
  readonly error: string | null;
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
  };
}
