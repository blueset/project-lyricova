import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
} as const;

export const hashPassword = (password: string): Promise<string> =>
  hash(password, ARGON2_OPTIONS);

export const isArgon2idHash = (storedHash: string): boolean =>
  storedHash.startsWith("$argon2id$");

export const verifyPassword = async ({
  hash: storedHash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> => {
  if (!isArgon2idHash(storedHash)) return false;
  return verify(storedHash, password, ARGON2_OPTIONS);
};
