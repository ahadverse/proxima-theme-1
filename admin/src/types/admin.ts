export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'staff';
}
