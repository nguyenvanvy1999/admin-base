const storagePrefix = 'fin_track';
const themeTag = 'theme';

export type Theme = 'light' | 'dark';

const localStore = {
  getTheme: (): Theme => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(
      `${storagePrefix}.${themeTag}`,
    ) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    return prefersDark ? 'dark' : 'light';
  },
  setTheme: (theme: Theme) => {
    if (typeof window === 'undefined') return;
    const key = `${storagePrefix}.${themeTag}`;
    window.localStorage.setItem(key, theme);
  },
  toggleTheme: () => {
    const prevTheme = localStore.getTheme();
    const newTheme = prevTheme === 'light' ? 'dark' : 'light';
    localStore.setTheme(newTheme);
    return newTheme;
  },
};

export default localStore;
