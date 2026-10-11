export function missingTicketFields(title: string, estimate: string, estimating: boolean) {
  return { title: !title.trim(), estimate: estimating && !estimate };
}
