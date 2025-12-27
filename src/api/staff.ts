import { apiClient } from './client';
import type { Staff, StaffRole } from '../types';

export const staffApi = {
  /**
   * Get all staff
   */
  getAll: async (activeOnly = false): Promise<Staff[]> => {
    const { data } = await apiClient.get<any[]>('/staff', {
      params: { active: activeOnly ? 'true' : undefined },
    });
    // Transform backend response: role object → roleId string
    // Filter specializations to only include valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return data.map((staff) => ({
      ...staff,
      role: staff.role?.id || staff.roleId || staff.role,
      specializations: (staff.specializations || []).filter((s: string) => uuidRegex.test(s)),
    }));
  },

  /**
   * Get staff by ID
   */
  getById: async (id: string, includeAppointments = false): Promise<Staff> => {
    const { data } = await apiClient.get<any>(`/staff/${id}`, {
      params: { include: includeAppointments ? 'appointments' : undefined },
    });
    // Transform backend response: role object → roleId string
    // Filter specializations to only include valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return {
      ...data,
      role: data.role?.id || data.roleId || data.role,
      specializations: (data.specializations || []).filter((s: string) => uuidRegex.test(s)),
    };
  },

  /**
   * Create new staff
   */
  create: async (staff: Partial<Staff>): Promise<Staff> => {
    // Transform frontend data to backend format
    const apiData: any = {};

    if (staff.firstName !== undefined) apiData.firstName = staff.firstName;
    if (staff.lastName !== undefined) apiData.lastName = staff.lastName;
    if (staff.email !== undefined) apiData.email = staff.email;
    if (staff.phone !== undefined) apiData.phone = staff.phone;
    if (staff.role !== undefined) apiData.roleId = staff.role; // Map role → roleId
    if (staff.specializations !== undefined) apiData.specializations = staff.specializations;
    if (staff.color !== undefined) apiData.color = staff.color;
    if (staff.isActive !== undefined) apiData.isActive = staff.isActive;
    if (staff.profileImageUrl !== undefined) apiData.profileImageUrl = staff.profileImageUrl;

    const { data } = await apiClient.post<any>('/staff', apiData);
    // Transform backend response: role object → roleId string
    return {
      ...data,
      role: data.role?.id || data.roleId || data.role,
    };
  },

  /**
   * Update staff
   */
  update: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
    // Transform frontend data to backend format
    const apiData: any = {};

    if (staff.firstName !== undefined) apiData.firstName = staff.firstName;
    if (staff.lastName !== undefined) apiData.lastName = staff.lastName;
    if (staff.email !== undefined) apiData.email = staff.email;
    if (staff.phone !== undefined) apiData.phone = staff.phone;
    if (staff.role !== undefined) apiData.roleId = staff.role; // Map role → roleId
    if (staff.specializations !== undefined) apiData.specializations = staff.specializations;
    if (staff.color !== undefined) apiData.color = staff.color;
    if (staff.isActive !== undefined) apiData.isActive = staff.isActive;
    if (staff.profileImageUrl !== undefined) apiData.profileImageUrl = staff.profileImageUrl;

    const { data } = await apiClient.put<any>(`/staff/${id}`, apiData);
    // Transform backend response: role object → roleId string
    return {
      ...data,
      role: data.role?.id || data.roleId || data.role,
    };
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
