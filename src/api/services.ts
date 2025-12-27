import { apiClient } from './client';
import type { Service, ServiceCategory } from '../types';

export const servicesApi = {
  /**
   * Get all services
   */
  getAll: async (categoryId?: string): Promise<Service[]> => {
    const { data } = await apiClient.get<Service[]>('/services', {
      params: { categoryId },
    });
    return data;
  },

  /**
   * Get service by ID
   */
  getById: async (id: string): Promise<Service> => {
    const { data} = await apiClient.get<Service>(`/services/${id}`);
    return data;
  },

  /**
   * Create new service
   */
  create: async (service: Partial<Service>): Promise<Service> => {
    // Transform frontend data to backend format
    // Only send fields that backend validation accepts
    const apiData: any = {};

    if (service.name !== undefined) apiData.name = service.name;
    if (service.description !== undefined) apiData.description = service.description;
    if (service.duration !== undefined) apiData.duration = service.duration;
    if (service.price !== undefined) apiData.price = service.price;
    if (service.category !== undefined) apiData.categoryId = service.category; // Map category → categoryId
    if (service.color !== undefined) apiData.color = service.color;
    if (service.imageUrl !== undefined) apiData.imageUrl = service.imageUrl;

    const { data } = await apiClient.post<Service>('/services', apiData);
    return data;
  },

  /**
   * Update service
   */
  update: async (id: string, service: Partial<Service>): Promise<Service> => {
    // Transform frontend data to backend format
    // Only send fields that backend validation accepts
    const apiData: any = {};

    if (service.name !== undefined) apiData.name = service.name;
    if (service.description !== undefined) apiData.description = service.description;
    if (service.duration !== undefined) apiData.duration = service.duration;
    if (service.price !== undefined) apiData.price = service.price;
    if (service.category !== undefined) apiData.categoryId = service.category; // Map category → categoryId
    if (service.color !== undefined) apiData.color = service.color;
    if (service.imageUrl !== undefined) apiData.imageUrl = service.imageUrl;

    const { data } = await apiClient.put<Service>(`/services/${id}`, apiData);
    return data;
  },

  /**
   * Delete service
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}`);
  },

  /**
   * Get all service categories
   */
  getCategories: async (activeOnly = false): Promise<ServiceCategory[]> => {
    const { data } = await apiClient.get<ServiceCategory[]>('/services/categories/all', {
      params: { active: activeOnly ? 'true' : undefined },
    });
    return data;
  },

  /**
   * Create service category
   */
  createCategory: async (category: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const { data } = await apiClient.post<ServiceCategory>('/services/categories', category);
    return data;
  },

  /**
   * Update service category
   */
  updateCategory: async (id: string, category: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const { data } = await apiClient.put<ServiceCategory>(`/services/categories/${id}`, category);
    return data;
  },

  /**
   * Delete service category
   */
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/categories/${id}`);
  },
};
