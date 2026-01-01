/**
 * Logging System for Sphyra SMS Reminder
 * Persistent logging with in-app viewer for debugging
 */
import { Storage } from './storage';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

const STORAGE_KEY = '@sphyra:logs';
const MAX_LOGS = 500; // Keep last 500 log entries

class Logger {
  private logs: LogEntry[] = [];
  private initialized = false;

  /**
   * Initialize logger by loading existing logs
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const storedLogs = await Storage.get<LogEntry[]>(STORAGE_KEY);
      if (storedLogs && Array.isArray(storedLogs)) {
        this.logs = storedLogs;
      }
      this.initialized = true;
      console.log(`Logger initialized with ${this.logs.length} existing logs`);
    } catch (error) {
      console.error('Error initializing logger:', error);
      this.logs = [];
      this.initialized = true;
    }
  }

  /**
   * Add a log entry
   */
  private async addLog(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.initialize();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Add to memory
    this.logs.push(entry);

    // Keep only last MAX_LOGS entries
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }

    // Persist to storage (async, don't wait)
    this.persistLogs().catch(err =>
      console.error('Error persisting logs:', err)
    );

    // Also log to console for immediate debugging
    const emoji = this.getEmojiForLevel(level);
    const logData = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
    console.log(`${emoji} [${category}] ${message}${logData}`);
  }

  /**
   * Persist logs to storage
   */
  private async persistLogs(): Promise<void> {
    try {
      await Storage.set(STORAGE_KEY, this.logs);
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  /**
   * Get emoji for log level
   */
  private getEmojiForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.SUCCESS:
        return '✅';
      default:
        return '📝';
    }
  }

  // Public logging methods

  debug(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.ERROR, category, message, data);
  }

  success(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.SUCCESS, category, message, data);
  }

  /**
   * Get all logs
   */
  async getLogs(): Promise<LogEntry[]> {
    await this.initialize();
    return [...this.logs]; // Return copy
  }

  /**
   * Get logs filtered by category
   */
  async getLogsByCategory(category: string): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs filtered by level
   */
  async getLogsByLevel(level: LogLevel): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get recent logs (last N entries)
   */
  async getRecentLogs(count: number = 50): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    await Storage.remove(STORAGE_KEY);
    console.log('All logs cleared');
  }

  /**
   * Export logs as text (for sharing/debugging)
   */
  async exportLogsAsText(): Promise<string> {
    await this.initialize();

    let text = `=== Sphyra SMS Reminder - Log Export ===\n`;
    text += `Exported: ${new Date().toISOString()}\n`;
    text += `Total entries: ${this.logs.length}\n`;
    text += `\n${'='.repeat(50)}\n\n`;

    for (const log of this.logs) {
      const emoji = this.getEmojiForLevel(log.level);
      text += `${emoji} ${log.timestamp} [${log.level}] [${log.category}]\n`;
      text += `   ${log.message}\n`;
      if (log.data) {
        text += `   Data: ${JSON.stringify(log.data)}\n`;
      }
      text += '\n';
    }

    return text;
  }

  /**
   * Get log statistics
   */
  async getStats(): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    await this.initialize();

    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
    };
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
