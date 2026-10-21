import type { AdminUser } from '@/types/admin';

export type StaffRole = AdminUser['role'];

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffCreateInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
}

export interface StaffUpdateInput {
  name?: string;
  role?: StaffRole;
  isActive?: boolean;
  /** Omit to keep the current password. */
  password?: string;
}
