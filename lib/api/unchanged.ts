// unchanged keeps the data already on screen when a background refresh brings back the same thing,
// so React has nothing to redraw (TL-232). Compares by value (the API's JSON), not by identity.
// ponytail: JSON.stringify per refresh; fine for a board's or backlog page's worth of data.
export function unchanged<T>(current: T | null | undefined, next: T): T {
  return current != null && JSON.stringify(current) === JSON.stringify(next) ? current : next;
}
