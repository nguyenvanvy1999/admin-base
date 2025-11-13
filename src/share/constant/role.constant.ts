export const defaultRoles: Record<
  'user' | 'admin',
  { id: string; title: string; description: string }
> = {
  user: {
    id: 'role_user_default',
    title: 'User',
    description: 'Default user role',
  },
  admin: {
    id: 'role_admin_default',
    title: 'Administrator',
    description: 'Administrator role',
  },
};
