/**
 * Universal localStorage wrapper for key-value storage
 * Provides safe access to localStorage with error handling
 */
class Storage {
  /**
   * Get value from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist or error occurs
   * @returns {*} - Stored value or default value
   */
  static get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      
      // Try to parse as JSON, fallback to string if parsing fails
      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value;
      }
    } catch (error) {
      console.warn(`Failed to get value from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Set value in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} - True if successful, false if error occurred
   */
  static set(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.warn(`Failed to set value in localStorage for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Remove value from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} - True if successful, false if error occurred
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove value from localStorage for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Check if key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean} - True if key exists, false otherwise
   */
  static has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.warn(`Failed to check key existence in localStorage for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all localStorage data
   * @returns {boolean} - True if successful, false if error occurred
   */
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }

  /**
   * Get all keys from localStorage
   * @returns {string[]} - Array of keys
   */
  static keys() {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn('Failed to get keys from localStorage:', error);
      return [];
    }
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
} 