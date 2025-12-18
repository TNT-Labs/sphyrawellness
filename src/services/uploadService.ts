import { Service, Staff } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Upload image for a service
 */
export async function uploadServiceImage(serviceId: string, file: File): Promise<{ imageUrl: string; service: Service }> {
  const formData = new FormData();
  formData.append('image', file);

  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/upload/service/${serviceId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload image');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete image for a service
 */
export async function deleteServiceImage(serviceId: string): Promise<{ service: Service }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/upload/service/${serviceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete image');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Upload profile image for a staff member
 */
export async function uploadStaffImage(staffId: string, file: File): Promise<{ imageUrl: string; staff: Staff }> {
  const formData = new FormData();
  formData.append('image', file);

  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/upload/staff/${staffId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload image');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete profile image for a staff member
 */
export async function deleteStaffImage(staffId: string): Promise<{ staff: Staff }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/upload/staff/${staffId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete image');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get full URL for an image
 */
export function getImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;

  // If already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Images are served from server root (not /api path)
  // API_URL is http://localhost:3001/api, but images are at http://localhost:3001/uploads
  // So we need to extract base URL and append image path
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}${imageUrl}`;
}
