/**
 * Input sanitization utilities
 * Sanitizes user input to prevent XSS attacks and enforce length limits
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * and enforcing length limits
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string {
  if (!input) return ''

  // Trim whitespace
  let sanitized = input.trim()

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

  // React escapes HTML by default, but we'll also remove script tags as extra safety
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  return sanitized
}

/**
 * Sanitizes a textarea input (allows newlines)
 */
export function sanitizeTextarea(
  input: string | null | undefined,
  maxLength: number = 5000
): string {
  if (!input) return ''

  let sanitized = input.trim()

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // Remove null bytes and control characters (except newlines, tabs, and carriage returns)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  return sanitized
}

/**
 * Sanitizes a description field (shorter limit)
 */
export function sanitizeDescription(input: string | null | undefined): string {
  return sanitizeString(input, 500)
}

/**
 * Sanitizes notes field (longer limit)
 */
export function sanitizeNotes(input: string | null | undefined): string {
  return sanitizeTextarea(input, 2000)
}

/**
 * Sanitizes a reason field (short limit)
 */
export function sanitizeReason(input: string | null | undefined): string {
  return sanitizeString(input, 200)
}
