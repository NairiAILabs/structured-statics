export function num(x: number, dp = 1): string {
  return x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

export function util(x: number): string {
  return x.toFixed(2);
}

export function kg(x: number): string {
  if (Math.abs(x) >= 1000) return `${num(x / 1000, 2)} t`;
  return `${Math.round(x)} kg`;
}

export function eur(x: number): string {
  return `€${Math.round(x).toLocaleString("en-US")}`;
}
