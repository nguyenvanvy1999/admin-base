import { create } from 'zustand';

export type UserStore = {
  user: User;
  setUser: (user: User) => void;
  clearUser: () => void;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  hasPermission: (permission: string) => boolean;
};

export type User = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
};

const defaultUser: User = {
  id: '',
  username: '',
  name: null,
  role: 'user',
};
const useUserStore = create<UserStore>((set, get) => ({
  user: defaultUser,
  setUser: (user: User) => set({ user }),
  clearUser: () => set({ user: defaultUser }),
  isAdmin: () => {
    const { user } = get();
    return user.role === 'admin';
  },
  isSuperAdmin: () => {
    const { user } = get();
    return user.isSuperAdmin === true;
  },
  hasPermission: (permission: string) => {
    const { user } = get();
    return user.permissions?.includes(permission) ?? false;
  },
}));

export default useUserStore;
