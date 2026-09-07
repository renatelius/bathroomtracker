/**
 * Адаптивная тема (светлая/тёмная) — по системной настройке useColorScheme.
 * Провайдер выдаёт палитру текущего режима. Экранный компонент:
 *   const palette = useThemeColors();
 * Для принудительного ручного режима можно задать <ThemeProvider mode="dark">.
 */
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { paletteLight, paletteDark, auraPalettes } from './palettes';

export const PaletteContext = createContext(paletteLight);
export const useThemeColors = () => useContext(PaletteContext);

/**
 * @param {string} aura - id ауры (пастель/киберпанк/космос); если задана —
 *   берётся её палитра из auraPalettes и режим ОС игнорируется.
 * @param {'light'|'dark'|'system'} mode - по умолчанию 'system' (следует за ОС)
 */
export function ThemeProvider({ mode = 'system', aura = null, children }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  // Аура имеет приоритет: полностью перекрашивает приложение.
  if (aura && Object.prototype.hasOwnProperty.call(auraPalettes, aura)) {
    return <PaletteContext.Provider value={auraPalettes[aura]}>{children}</PaletteContext.Provider>;
  }
  const resolved = mode === 'system' ? system || 'light' : mode;
  const palette = resolved === 'dark' ? paletteDark : paletteLight;

  return (
    <PaletteContext.Provider value={palette}>
      {children}
    </PaletteContext.Provider>
  );
}
