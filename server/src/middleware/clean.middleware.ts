import { NextFunction, Request, Response } from "express";

export function removeEmptyAndTrim<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeEmptyAndTrim) as unknown as T;
  } else if (typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue !== "") {
          (acc as any)[key] = trimmedValue;
        }
      } else {
        const cleanedValue = removeEmptyAndTrim(value);
        if (value === null || value === undefined || (cleanedValue !== "" && cleanedValue !== null)) {
          (acc as any)[key] = cleanedValue;
        }
      }
      return acc;
    }, {} as T);
  } else {
    return obj;
  }
}

export function cleanBodyMiddleware(req: Request, res: Response, next: NextFunction) {
  req.body = removeEmptyAndTrim(req.body);
  next();
}
