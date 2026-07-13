export class DomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly field: string | null = null) { super(message); }
}
export type ApiResult<T> = { success: true; data: T; message: string; errors: null; meta: Record<string, unknown> } | { success: false; data: null; message: string; errors: Array<{code:string;field:string|null;message:string}>; meta: Record<string, unknown> };
