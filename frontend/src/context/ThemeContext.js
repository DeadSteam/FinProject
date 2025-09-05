import React, { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_THEME = 'light';
export const themes = {
  light: {
    '--color-primary': '#2563eb',
    '--color-primary-foreground': '#ffffff',
    '--color-background': '#ffffff',
    '--color-text': '#111827'
  },
  dark: {
    '--color-primary': '#3b82f6',
    '--color-primary-foreground': '#000000',
    '--color-background': '#111827',
    '--color-text': '#f3f4f6'
  }
};

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {}
});

export const ThemeProvider = ({ initial = DEFAULT_THEME, children }) => {
  const [theme, setTheme] = useState(initial);

  // apply css variables
  useEffect(() => {
    const root = document.documentElement;
    const vars = themes[theme] || themes.light;
    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 