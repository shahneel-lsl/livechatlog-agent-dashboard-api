/**
 * Utility functions for the application
 * Add your utility functions here
 */

export class UtilsHelper {
  /**
   * Format a date to ISO string
   */
  static formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Generate a random string
   */
  static generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
