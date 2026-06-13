import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_KEY = "pulsecheck_theme";
const STYLE_KEY = "pulsecheck_style";
const STYLES = ["standard", "neumorphic"];

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return "light";
};

const getInitialStyle = () => {
  const saved = localStorage.getItem(STYLE_KEY);
  return STYLES.includes(saved) ? saved : "standard";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [style, setStyle] = useState(getInitialStyle);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.style = style;
    localStorage.setItem(STYLE_KEY, style);
  }, [style]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((c) => (c === "dark" ? "light" : "dark")),
      style,
      cycleStyle: () => {
        setStyle((c) => {
          const next = (STYLES.indexOf(c) + 1) % STYLES.length;
          return STYLES[next];
        });
      },
      nextStyle: STYLES[(STYLES.indexOf(style) + 1) % STYLES.length],
    }),
    [theme, style],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
