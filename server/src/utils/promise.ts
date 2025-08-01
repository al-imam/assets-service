type Result<T> = [T, null] | [null, Error];

interface WrapOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export type ReturnWrap<T, U = object> = (config: WrapOptions<T> & U) => Promise<Result<T>>;

export async function wrap<T>(promise: Promise<T>, config?: WrapOptions<T>): Promise<Result<T>> {
  try {
    const data = await promise;
    config?.onSuccess?.(data);
    return [data, null];
  } catch (caught) {
    const error = caught as Error;
    config?.onError?.(error);
    return [null, error];
  }
}

export function wrapSync<T>(fn: () => T, onSuccess?: (data: T) => void, onError?: (error: Error) => void): Result<T> {
  try {
    const data = fn();
    onSuccess?.(data);
    return [data, null];
  } catch (caught) {
    const error = caught as Error;
    onError?.(error);
    return [null, error];
  }
}

export function runPromisesSequentially<T, R = T>(
  ...promises: Array<Promise<T> | ((prevValue: T) => Promise<R>)>
): Promise<R> {
  return promises.reduce<Promise<R>>((prevPromise, curr) => {
    if (typeof curr === "function") {
      return prevPromise.then(curr as any);
    } else {
      return prevPromise.then(() => curr as any);
    }
  }, Promise.resolve() as Promise<any>);
}
