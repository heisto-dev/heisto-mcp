/** Read-only adapter contract. No connection credentials are distributed. */
export interface Db {
  query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
