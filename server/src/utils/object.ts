export function isObject<T = object>(value: any): value is T {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isEmptyObject(obj: any): boolean {
  return isObject(obj) && Object.keys(obj).length === 0;
}

export function deepClone<T>(obj: T): T {
  if (!isObject(obj)) return obj;
  return JSON.parse(JSON.stringify(obj)) as T;
}

type PathImpl<T, K extends keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? T[K] extends Array<infer U>
      ? U extends Record<string, any>
        ? K | `${K}.${PathImpl<U, keyof U>}`
        : K
      : K | `${K}.${PathImpl<T[K], keyof T[K]>}`
    : K
  : never;

type Path<T> = PathImpl<T, keyof T>;

export function hasKeys<T extends Record<string, any>, P extends Path<T>>(obj: T, ...paths: P[]): boolean {
  for (const path of paths) {
    const keys = path.split(".");
    let current: Record<string, unknown> = obj as Record<string, unknown>;

    for (const key of keys) {
      if (current === null || typeof current !== "object") {
        return false;
      }

      if (Array.isArray(current)) {
        if (!current.every(item => key in item)) {
          return false;
        }
        current = current[0][key];
      } else {
        if (!(key in current)) {
          return false;
        }

        current = current[key] as Record<string, unknown>;
      }
    }

    if (current === null || current === undefined) {
      return false;
    }
  }

  return true;
}

export function removeNullish<T>(obj: T): T {
  if (!isObject(obj)) return obj;

  const newObj = { ...obj };

  for (const key in newObj) {
    if (newObj[key] === null || newObj[key] === undefined) {
      delete newObj[key];
    } else {
      newObj[key] = removeNullish(newObj[key]);
    }
  }

  return newObj;
}
