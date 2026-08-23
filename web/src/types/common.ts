export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface ApiMessageResponse {
  message: string;
}

export interface DeviceContext {
  ipAddress?: string;
  userAgent?: string;
}
