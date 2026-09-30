/** Joins the truthy class names — the DS's only way of composing modifiers. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}
