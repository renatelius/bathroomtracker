/**
 * i18n-провайдер: автоопределение региона + ручной выбор языка.
 * Использование:
 *   <I18nProvider><App/></I18nProvider>
 *   const { t, lang, setLang } = useI18n();
 *   t('tabForecast')
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getLang, saveLang } from '../store/storage';
import { LOCALES, detectLang, FALLBACK_LANG } from './locales';

const I18nContext = createContext({ t: (k) => k, lang: FALLBACK_LANG, setLang: () => {} });
export const useI18n = () => useContext(I18nContext);

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(FALLBACK_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getLang();
      setLangState(detectLang(saved));
      setReady(true);
    })();
  }, []);

  const setLang = useCallback(async (code) => {
    if (LOCALES[code]) {
      setLangState(code);
      await saveLang(code);
    }
  }, []);

  const dict = LOCALES[lang] || LOCALES[FALLBACK_LANG];
  const t = useCallback(
    (key, vars) => {
      let str = dict[key] ?? LOCALES[FALLBACK_LANG][key] ?? key;
      if (vars) {
        for (const k of Object.keys(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
        }
      }
      return str;
    },
    [dict]
  );

  if (!ready) return children;

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}
