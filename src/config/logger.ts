/* eslint-disable no-console */
export const logger = {
  info: (meta: Record<string, unknown>, message: string) => console.log(`[INFO] ${message}`, meta),
  error: (meta: Record<string, unknown>, message: string) => console.error(`[ERROR] ${message}`, meta),
};
