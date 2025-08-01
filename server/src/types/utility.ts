export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type IdType = string | number;

export type Prettify<T> = { [P in keyof T]: T[P] };
