export function isInt(value: any): boolean {
  return /^-?\d+$/.test(String(value));
}

export function isPositiveInt(value: any): boolean {
  return /^\d+$/.test(String(value)) && parseInt(String(value)) > 0;
}

export function isNonNegativeInt(value: any): boolean {
  return /^\d+$/.test(String(value));
}

export function isFloat(value: any): boolean {
  return /^-?\d+(\.\d+)?$/.test(String(value));
}

export function isPositiveFloat(value: any): boolean {
  return /^\d+(\.\d+)?$/.test(String(value)) && parseFloat(String(value)) > 0;
}

export function isNumber(value: any): boolean {
  return /^-?\d+(\.\d+)?$/.test(String(value));
}
