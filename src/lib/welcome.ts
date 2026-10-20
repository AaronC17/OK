export const WELCOME_PERCENT = 10

/** Welcome applies once, to products only. All amounts remain integer CRC cents. */
export function welcomeDiscount(subtotalMinor: number, eligible: boolean): number {
  return eligible ? Math.round(subtotalMinor / 10) : 0
}
