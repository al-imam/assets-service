import { ulid as Id } from "ulid";
import { z } from "zod";

export function ulid() {
  return Id();
}

export function isULID(value: string) {
  return z.string().ulid().safeParse(value).success;
}
