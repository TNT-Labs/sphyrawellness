/**
 * Storage utility using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export class Storage {
  /**
   * Save data to storage
   */
  static async set(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving to storage:', error);
      throw error;
    }
  }

  /**
   * Get data from storage
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get string value
   */
  static async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error reading string from storage:', error);
      return null;
    }
  }

  /**
   * Set string value
   */
  static async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving string to storage:', error);
      throw error;
    }
  }
}
