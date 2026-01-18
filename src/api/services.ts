import { apiClient } from './client';
import type { Service, ServiceCategory } from '../types';

export const servicesApi = {
  /**
   * Get all services
   */
  getAll: async (categoryId?: string): Promise<Service[]> => {
    const { data } = await apiClient.get<any[]>('/services', {
      params: { categoryId },
    });
    // Transform backend response: category object → categoryId string, Decimal price → number
    return data.map((service) => ({
      ...service,
      category: service.category?.id || service.categoryId || service.category,
      price: typeof service.price === 'string' ? parseFloat(service.price) : service.price,
    }));
  },

  /**
   * Get service by ID
   */
  getById: async (id: string): Promise<Service> => {
    const { data } = await apiClient.get<any>(`/services/${id}`);
    // Transform backend response: category object → categoryId string, Decimal price → number
    return {
      ...data,
      category: data.category?.id || data.categoryId || data.category,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
    };
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
    if (service.isVisibleToCustomers !== undefined) apiData.isVisibleToCustomers = service.isVisibleToCustomers;

    const { data } = await apiClient.post<any>('/services', apiData);
    // Transform backend response: category object → categoryId string, Decimal price → number
    return {
      ...data,
      category: data.category?.id || data.categoryId || data.category,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
    };
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
    if (service.isVisibleToCustomers !== undefined) apiData.isVisibleToCustomers = service.isVisibleToCustomers;

    const { data } = await apiClient.put<any>(`/services/${id}`, apiData);
    // Transform backend response: category object → categoryId string, Decimal price → number
    return {
      ...data,
      category: data.category?.id || data.categoryId || data.category,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
    };
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
