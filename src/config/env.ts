const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  PORT: toNumber(process.env.PORT, 3000),
  DB_PATH: process.env.DB_PATH ?? "chat.db",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  BCRYPT_SALT_ROUNDS: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
};
