/**
 * API Cache with ETag support
 * Reduces unnecessary network requests and saves battery
 */
import { Storage } from './storage';

interface CacheEntry {
  data: any;
  etag?: string;
  timestamp: number;
  expiresAt: number;
}

export class APICache {
  private static readonly CACHE_PREFIX = '@sphyra:cache:';
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key
   */
  private static getCacheKey(url: string): string {
    return `${this.CACHE_PREFIX}${url}`;
  }

  /**
   * Set cache entry
   */
  static async set(
    url: string,
    data: any,
    ttl: number = this.DEFAULT_TTL,
    etag?: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(url);
    const entry: CacheEntry = {
      data,
      etag,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    await Storage.set(cacheKey, entry);
  }

  /**
   * Get cache entry if valid
   */
  static async get(url: string): Promise<{ data: any; etag?: string } | null> {
    const cacheKey = this.getCacheKey(url);
    const entry = await Storage.get<CacheEntry>(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      // Remove expired entry
      await this.remove(url);
      return null;
    }

    return {
      data: entry.data,
      etag: entry.etag,
    };
  }

  /**
   * Get ETag for conditional request
   */
  static async getETag(url: string): Promise<string | null> {
    const cached = await this.get(url);
    return cached?.etag || null;
  }

  /**
   * Remove cache entry
   */
  static async remove(url: string): Promise<void> {
    const cacheKey = this.getCacheKey(url);
    await Storage.remove(cacheKey);
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<void> {
    // This would require getting all keys and filtering by prefix
    // For now, we'll rely on individual cache expiration
    console.log('Cache clear all - individual entries will expire based on TTL');
  }

  /**
   * Check if cache exists and is valid
   */
  static async isValid(url: string): Promise<boolean> {
    const entry = await this.get(url);
    return entry !== null;
  }
}
