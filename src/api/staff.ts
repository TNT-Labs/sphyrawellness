import { apiClient } from './client';
import type { Staff, StaffRole } from '../types';

export const staffApi = {
  /**
   * Get all staff
   */
  getAll: async (activeOnly = false): Promise<Staff[]> => {
    const { data } = await apiClient.get<Staff[]>('/staff', {
      params: { active: activeOnly ? 'true' : undefined },
    });
    return data;
  },

  /**
   * Get staff by ID
   */
  getById: async (id: string, includeAppointments = false): Promise<Staff> => {
    const { data } = await apiClient.get<Staff>(`/staff/${id}`, {
      params: { include: includeAppointments ? 'appointments' : undefined },
    });
    return data;
  },

  /**
   * Create new staff
   */
  create: async (staff: Partial<Staff>): Promise<Staff> => {
    const { data } = await apiClient.post<Staff>('/staff', staff);
    return data;
  },

  /**
   * Update staff
   */
  update: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
    const { data } = await apiClient.put<Staff>(`/staff/${id}`, staff);
    return data;
  },

  /**
   * Delete staff
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/${id}`);
  },

  /**
   * Get all staff roles
   */
  getRoles: async (activeOnly = false): Promise<StaffRole[]> => {
    const { data } = await apiClient.get<StaffRole[]>('/staff/roles/all', {
      params: { active: activeOnly ? 'true' : undefined },
    });
    return data;
  },

  /**
   * Create staff role
   */
  createRole: async (role: Partial<StaffRole>): Promise<StaffRole> => {
    const { data } = await apiClient.post<StaffRole>('/staff/roles', role);
    return data;
  },

  /**
   * Update staff role
   */
  updateRole: async (id: string, role: Partial<StaffRole>): Promise<StaffRole> => {
    const { data } = await apiClient.put<StaffRole>(`/staff/roles/${id}`, role);
    return data;
  },

  /**
   * Delete staff role
   */
  deleteRole: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/roles/${id}`);
  },
};
