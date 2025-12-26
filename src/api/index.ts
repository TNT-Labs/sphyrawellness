/**
 * API Client - PostgreSQL + REST API
 *
 * Centralized API access for all backend operations.
 * All API calls use Axios with JWT authentication.
 */

export { apiClient } from './client';
export * from './auth';
export * from './customers';
export * from './services';
export * from './staff';
export * from './appointments';
export * from './payments';
export * from './settings';
