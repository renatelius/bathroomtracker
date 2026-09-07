/**
 * «Аура» — персональная тема оформления (Вайб и Эстетика).
 * Провайдер хранит выбранную ауру в настройках (bt.settings.aura) и отдаёт её
 * ThemeProvider'у, который выбирает палитру из auraPalettes. Все экраны уже
 * читают палитру через useThemeColors(), поэтому перекрашивается всё приложение.
 *
 *   const { aura, setAura } = useAura();
 *   <ThemeProvider aura={aura}>…</ThemeProvider>
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSettings, saveSettings } from '../store/storage';
import { auraPalettes } from './palettes';

export const DEFAULT_AURA = 'pastel';

/** Справочник аур: id → имя + эмодзи. Порядок — порядок отображения в настройках. */
export const AURAS = [
  { id: 'pastel', name: 'Пастельный дзен', emoji: '🌸', isDark: false },
  { id: 'cyberpunk', name: 'Неоновый киберпанк', emoji: '🌆', isDark: true },
  { id: 'deepspace', name: 'Глубокий космос', emoji: '🌌', isDark: true },
];

export function isAuraId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(auraPalettes, id);
}

const AuraContext = createContext({ aura: DEFAULT_AURA, setAura: () => {} });
export const useAura = () => useContext(AuraContext);

/**
 * @param {string} [initialAura] - аура, заданная до первого чтения хранилища
 */
export function AuraProvider({ children }) {
  const [aura, setAuraState] = useState(DEFAULT_AURA);

  // Загружаем сохранённую ауру один раз при монтировании.
  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => {
        if (alive && s && isAuraId(s.aura)) setAuraState(s.aura);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setAura = useCallback(async (id) => {
    if (!isAuraId(id)) return;
    setAuraState(id);
    try {
      await saveSettings({ aura: id });
    } catch (e) {
      // хранилище недоступно — оставляем текущее значение в памяти
    }
  }, []);

  return <AuraContext.Provider value={{ aura, setAura }}>{children}</AuraContext.Provider>;
}