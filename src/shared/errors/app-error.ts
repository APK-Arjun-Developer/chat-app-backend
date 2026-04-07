export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error";
};
