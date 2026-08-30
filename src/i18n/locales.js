/**
 * Локализации (5 языков). Ключи семантические, значения — строки UI
 * (заголовки табов, кнопки, подписи). Полные экраны могут расширять словари.
 */
export const LANGS = [
  { code: 'ru', label: 'Русский', native: 'Русский' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Español', native: 'Español' },
  { code: 'de', label: 'Deutsch', native: 'Deutsch' },
  { code: 'fr', label: 'Français', native: 'Français' },
];

export const LOCALES = {
  ru: {
    tabForecast: 'Прогноз',
    tabLog: 'Лог',
    tabCalendar: 'Календарь',
    tabHistory: 'История',
    tabSettings: 'Настройки',
    tabProfile: 'Профиль',
    forecast: 'Прогноз',
    log: 'Лог',
    calendar: 'Календарь',
    history: 'История',
    settings: 'Настройки',
    profile: 'Профиль',
    done: 'Готово',
    add: 'Добавить',
    searchFoodHint: 'Поиск блюда',
    defecationNow: 'Дефекация сейчас',
    noData: 'Пока нет данных',
    language: 'Язык',
    name: 'Имя',
  },
  en: {
    tabForecast: 'Forecast',
    tabLog: 'Log',
    tabCalendar: 'Calendar',
    tabHistory: 'History',
    tabSettings: 'Settings',
    tabProfile: 'Profile',
    forecast: 'Forecast',
    log: 'Log',
    calendar: 'Calendar',
    history: 'History',
    settings: 'Settings',
    profile: 'Profile',
    done: 'Done',
    add: 'Add',
    searchFoodHint: 'Search food',
    defecationNow: 'Defecation now',
    noData: 'No data yet',
    language: 'Language',
    name: 'Name',
  },
  es: {
    tabForecast: 'Pronóstico',
    tabLog: 'Registro',
    tabCalendar: 'Calendario',
    tabHistory: 'Historial',
    tabSettings: 'Ajustes',
    tabProfile: 'Perfil',
    forecast: 'Pronóstico',
    log: 'Registro',
    calendar: 'Calendario',
    history: 'Historial',
    settings: 'Ajustes',
    profile: 'Perfil',
    done: 'Listo',
    add: 'Añadir',
    searchFoodHint: 'Buscar alimento',
    defecationNow: 'Defecación ahora',
    noData: 'Sin datos aún',
    language: 'Idioma',
    name: 'Nombre',
  },
  de: {
    tabForecast: 'Vorhersage',
    tabLog: 'Protokoll',
    tabCalendar: 'Kalender',
    tabHistory: 'Verlauf',
    tabSettings: 'Einstellungen',
    tabProfile: 'Profil',
    forecast: 'Vorhersage',
    log: 'Protokoll',
    calendar: 'Kalender',
    history: 'Verlauf',
    settings: 'Einstellungen',
    profile: 'Profil',
    done: 'Fertig',
    add: 'Hinzufügen',
    searchFoodHint: 'Lebensmittel suchen',
    defecationNow: 'Stuhlgang jetzt',
    noData: 'Noch keine Daten',
    language: 'Sprache',
    name: 'Name',
  },
  fr: {
    tabForecast: 'Prévision',
    tabLog: 'Journal',
    tabCalendar: 'Calendrier',
    tabHistory: 'Historique',
    tabSettings: 'Réglages',
    tabProfile: 'Profil',
    forecast: 'Prévision',
    log: 'Journal',
    calendar: 'Calendrier',
    history: 'Historique',
    settings: 'Réglages',
    profile: 'Profil',
    done: 'Terminé',
    add: 'Ajouter',
    searchFoodHint: 'Rechercher un aliment',
    defecationNow: 'Défécation maintenant',
    noData: 'Aucune donnée',
    language: 'Langue',
    name: 'Nom',
  },
};

export const FALLBACK_LANG = 'ru';

/**
 * Автоопределение языка по региону устройства (Intl, доступен в RN).
 * Приоритет: сохранённый выбор > регион > fallback.
 */
export function detectLang(savedLang) {
  if (savedLang && LOCALES[savedLang]) return savedLang;
  try {
    const loc = (Intl.DateTimeFormat().resolvedOptions().locale || 'ru').toLowerCase();
    const code = loc.split(/[-_]/)[0];
    if (LOCALES[code]) return code;
    const supported = ['es', 'de', 'fr'];
    const regionMatch = loc.match(/[-_](ES|DE|FR|MX|AR|CO)/i);
    if (regionMatch && LOCALES[regionMatch[1].toLowerCase()]) return regionMatch[1].toLowerCase();
    const extras = loc.match(/[-_](ES|DE|FR|MX|AR|CO)/i);
    void extras;
    // Латиноамериканские регионы -> испанский
    if (/[-_](MX|AR|CO|CL|PE)$/i.test(loc)) return 'es';
    if (/[-_](DE|AT|CH)$/i.test(loc)) return 'de';
    if (/[-_](FR|BE|CA|CH|LU)$/i.test(loc)) return 'fr';
    return FALLBACK_LANG;
  } catch (e) {
    return FALLBACK_LANG;
  }
}
