import { compareSync, hashSync } from "bcryptjs";

export const hash = hashSync;
export const compare = compareSync;
