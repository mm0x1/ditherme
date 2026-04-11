/**
 * Generates a unique ID with a given prefix.
 */
export function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
