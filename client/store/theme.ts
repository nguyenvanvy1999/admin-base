import localStore from '@client/libs/localStore';
import { create } from 'zustand';

export type Theme = 'light' | 'dark';

export type ThemeStore = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const useThemeStore = create<ThemeStore>((set) => ({
  theme: localStore.getTheme(),
  setTheme: (theme: Theme) => {
    set({ theme });
    localStore.setTheme(theme);
  },
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStore.setTheme(newTheme);
      return { theme: newTheme };
    });
  },
}));

export default useThemeStore;
