/**
 * Адаптивная тема (светлая/тёмная) — по системной настройке useColorScheme.
 * Провайдер выдаёт палитру текущего режима. Экранный компонент:
 *   const palette = useThemeColors();
 * Для принудительного ручного режима можно задать <ThemeProvider mode="dark">.
 */
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { paletteLight, paletteDark } from './palettes';

export const PaletteContext = createContext(paletteLight);
export const useThemeColors = () => useContext(PaletteContext);

/**
 * @param {'light'|'dark'|'system'} mode - по умолчанию 'system' (следует за ОС)
 */
export function ThemeProvider({ mode = 'system', children }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const resolved = mode === 'system' ? system || 'light' : mode;
  const palette = resolved === 'dark' ? paletteDark : paletteLight;

  return (
    <PaletteContext.Provider value={palette}>
      {children}
    </PaletteContext.Provider>
  );
}
