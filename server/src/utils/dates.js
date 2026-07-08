function pad(n) { return n < 10 ? '0' + n : n; }

export function weekStart(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - day + 1);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function monthStart(date = new Date()) {
  const value = new Date(date);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-01`;
}

export function yearStart(date = new Date()) {
  const value = new Date(date);
  return `${value.getFullYear()}-01-01`;
}
