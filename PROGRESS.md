# BathroomTracker — ходовая информация

Автообновляемый файл для переноса контекста между сессиями.

## Проект
- **Что:** BathroomTracker — React Native (Expo SDK 54), plain JS (ESM-ядро `.mjs`), AsyncStorage.
- **Путь:** `B:\Проекты\BathroomTracker`
- **Репозиторий:** `renatelius/bathroomtracker`, ветки `main` + `gh-pages`
- **Сайт:** https://renatelius.github.io/bathroomtracker/
- **GitHub PAT:** `C:\Users\Ren\AppData\Local\Temp\opencode\GH_PAT.txt` (fine-grained, **нет `workflow` scope**).
  - B64-заголовок: `-c http.extraHeader="Authorization: Basic <b64 'x-access-token:<token>'>"`. Токен не печатать.
- **gh-pages:** `experiments.baseUrl: "/bathroomtracker/"` + `.nojekyll`.

## Команды / флаги
- **Kiro CLI:** `C:\Users\Ren\AppData\Local\Kiro-Cli\kiro-cli.exe`, запуск с `Push-Location "B:\Проекты\BathroomTracker"` (иначе не читает B:),
  `--no-interactive --agent-engine v2 --output-format stream-json --trust-tools=read,grep,glob`, вывод в файл, извлечение из `"runFinished"` → `"finalText"`. Кодировка — UTF-8.
- **Тесты:** 12/12 зелёные; сборки web (1021 модуль) и Android (1382) зелёные.
- **Установлен пакет:** `expo-image-picker ~17.0.11`.

## Круглый стол (4 агента)
- opencode (код/оркестратор), Kiro CLI (реальный, бесплатный), Devin Cloud (ролевой/платный, по команде), Amazon Quick (мост через `.quick/tasks/task-01.md`).
- Протокол: краткие позиции → вердикт opencode → план без merge-конфликтов → спросить пользователя.
- Скиллы: `C:\Users\Ren\.config\opencode\skills\{devin-cloud-ops,amazon-q-kiro}\SKILL.md`, командный `multi-agent-team\SKILL.md`.
- Мост Amazon Quick: `B:\Проекты\ZeroRPG\.quick\README.md`; заброшенный CLI: `C:\Users\Ren\.config\opencode\scripts\quick-cli\` (запуск через `quick-cli.cmd`).

## Приоритеты (решено)
1. Дизайн + UI
2. Фото приёма пищи + калории (распознавание — архитектура + mock, без API-ключа)
3. Профиль + i18n (5 языков)
4. Друзья/чат — **отложено** (нужен бэкенд)
5. Иконки — SVG-ассеты + скрипт PNG

## Тон пользователя (важно!)
- **Ругается на остановки** — продолжать цепочку без пауз; **не** впадать в словесные петли (был негатив по этому поводу).
- Пользователь разрешил качать недостающее из интернета.
- Сначала думать, потом выдавать ответ по факту (без лишней воды).

## Completed
- **Дизайн-система:** `src/theme/index.js` (беж/бирюза, акцент `#2F7D63`, токены, card/button/etc).
- **Иконки:** `scripts/gen-icons.mjs` → `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`; `app.json` — adaptive `#2F7D63`, splash `#F4F6F3`.
- **Экраны:** PredictScreen (сигнатура `schedulePrediction({predictedAtMs, leadMinutes})`), SettingsScreen, Onboarding, LogScreen, CalendarScreen, HistoryScreen (фото), ProfileScreen.
- **Фото и калории:** `expo-image-picker`, «Своё фото» (quality 0.5), ручной ввод калорий, демо-оценка по фото; картинки из Open Food Facts (`imageUrl`) в поиске.
- **Распознавание:** `src/services/vision.js` — контракт `evaluateMealByPhoto(uri)` → `{calories, confidence, items, provider, note}`; mock-заглушка, точка подключения реального API помечена.
- **i18n:** `src/i18n/{locales,index}.js` — 5 языков (ru/en/es/de/fr), `detectLang()` по `Intl`, `I18nProvider`/`useI18n`; подключено в App.js (табы переведены), таб «Профиль».
- **Профиль:** `src/screens/ProfileScreen.js` — аватар (фото/инициалы), данные, выбор языка, сброс данных.
- **Хранилище:** ключ `bt.lang` + `getLang`/`saveLang`.
- **task-01.md** обновлён под Amazon Quick; README обновлён; `.quick/` в `.gitignore`.
- **Kiro-ревью (2×) применено:** iOS `getDefaultCalendarSourceAsync`, убран `getExpoPushTokenCore`, валидация времени звонка; Button.js — `icon && {marginLeft:8}` (не `Icon &&`); сжатие photo quality 0.5 (LogScreen+ProfileScreen); подсказка «Оценка по фото — демо-режим».
- **Коммиты main (запушены):** `9b20afc`, `52fd050` (Design overhaul), `050b714` (Fix Button icon + compress photos).
- **gh-pages:** задеплоены `273ae5f`, затем `e42a464` (фиксы Kiro). index 200, бандл 200 (~1.5 MB).

## ЗАВЕРШЕНО: адаптивная тёмная тема
Реализована по вердикту круглого стола «идеальный дизайн → тёмная тема + доступность».

### Что сделано
- `src/theme/palettes.js` — `paletteLight` + `paletteDark` (beige/teal, спокойный медицинский регистр, акцент `#2F7D63` light / `#58C6A0` dark; поля: bg, surface, surfaceAlt, text*, accent, accentSoft, info, success, warning, danger + soft-варианты, border, divider, forecastLow/Mid/High, shadow, overlay).
- `src/theme/theme-context.js` — `ThemeProvider` (prop `mode` = 'system'|'light'|'dark'), `useThemeColors()`, экспорт `PaletteContext`.
- `src/theme/index.js` — `palette` = `paletteLight` (обратная совместимость), `export { paletteLight, paletteDark, ThemeProvider, useThemeColors }`. Убраны старые дубли полей палитры.
- `App.js` — импорт `{ useThemeColors, ThemeProvider }`; `MainNavigator` использует `const palette = useThemeColors()`; корень `App` обёрнут в `<ThemeProvider><Root/></ThemeProvider>`.
- Переведены на `useThemeColors()` ВСЕ компоненты `src/ui/`: Card, Button, Chip, **Icon, ScreenHeader, Section, TextField** (палитросодержащие стили → инлайн через хук).
- Переведены ВСЕ 7 экранов: CalendarScreen, HistoryScreen, LogScreen, Onboarding, PredictScreen, ProfileScreen, SettingsScreen (статичный импорт `palette` → хук внутри компонента; палитросодержащие StyleSheet-поля → инлайн).
- `CalendarScreen.load` переведён на `useCallback(..., [palette])`, чтобы пересчёт меток календаря шёл при смене темы.

### Проверки (зелёные)
- `npm test` — 12/12.
- Babel-синтаксис по всем ui/screens/theme/App — ок.
- `npx expo export --platform web` — бандл 1023 модулей, ~1.48 MB, зелёный.
- Все `palette.*` использования — внутри компонентов (хук); статичных импортов `palette` не осталось.

### Дальше (по вердикту, после тёмной темы)
- Свайп-навигация в логах, progressive-онбординг, accessibility (контраст, крупные цели, голосовое описание прогноза), микpo-анимации, приватность-подтверждения.
- Без бэкенда: друзья/чат. Без API-ключа: реальное распознавание калорий.

## Блокеры / риски
- Статичные `StyleSheet.create` НЕ перерисуются при смене темы — палитросодержащие свойства строятся инлайн через хук (учтено при переводе всех экранов/компонентов).
- Примечание: `CalendarScreen.js` и `ProfileScreen.js` содержат UTF-8 BOM в начале (пресуществующее, не мешает Metro).
- Друзья/чат — нужен бэкенд. Реальное распознавание — нужен API-ключ (сейчас mock).

## Завершено: Доступность и контраст (WCAG AA)
- **Контраст:** пересчитаны пары «текст/фон» по формуле WCAG; подняты до AA (4.5:1) в `palettes.js`:
  - Light: `textMuted` #8A938C → #666F69, `accent` #2F7D63 → #2A735C, `forecastLow/Mid` синхронно.
  - Dark: `textMuted` #7E8B83 → #8A978D, `forecastLow` синхронно.
  - Все ключевые пары светлая/тёмная тема ≥4.5 (textOnAccent/accent 5.67 / 8.81; textMuted на bg 4.78; accent на accentSoft 4.61).
- **Управление (role/state/label):** Button (button+disabled), Chip (radio+selected, label, minHeight 44), LogScreen табы/найти/еда/фото, HistoryScreen кнопка удаления (44×44), PredictScreen карточка прогноза (голосовое описание), CalendarScreen напоминание, SettingsScreen Switch (switch+label+state), ProfileScreen аватар.
- **Баг (нашёл Kiro):** `Onboarding.js` `TouchableChip` был некликабелен — `onPress` уходил на инертный `<Card>` (обычный View). Переписан на `TouchableOpacity` + `accessibilityRole="radio"` + selected; выбранное выделено `info`-рамкой + галочкой, текст `textPrimary` (info/infoSoft 3.80 — рамка как графика 3:1 ок).
- **Проверки:** `npm test` 12/12; Babel; `expo export web` — успешно. Kiro-ревью провёл; спорные ratios проверены точным WCAG-расчётом (PASS).

## Завершено: Микроанимации (RN Animated, без новых зависимостей)
- **`src/ui/FadeIn.js` (новый):** FadeIn — плавное появление (fade + сдвиг вверх) на монтировании через `Animated.spring` (`useNativeDriver`), `delay` для каскада, `.stop()` на анмаунте. Экспортируется через `src/ui/index.js`.
- **`Button.js` / `Chip.js`:** press-фидбек — scale-спринг (вниз на нажатии, вверх на отпускании) через обёртку `Animated.View`; событие `onPress` на внутреннем `TouchableOpacity`, так что тап срабатывает корректно.
- **`PredictScreen.js`:** hero-карточка прогноза обёрнута в `FadeIn`.
- **`HistoryScreen.js`:** строки списка обёрнуты в `FadeIn` с каскадной задержкой `index*45` (cap 180 мс), `translateY: 8`.
- Навигационные переходы табов НЕ менял (низкая ценность/риск без stack-навигатора) — анимации сделаны внутри экранов.
- **Kiro-ревью:** правки учтены (стабильные deps эффекта, `stop()` cleanup, корректный spring, `delay` в spring = валиден в RN). Проверки: `npm test` 12/12, Babel, `expo export web` — зелёные.

## Завершено: Прогрессивный онбординг + Экспорт/импорт данных (JSON)
- **Прогрессивный онбординг:** `src/screens/Onboarding.js` переписан в 4 шага (Пол → Рост/вес/год → Телосложение → Сводка), прогресс-бар, «Назад»/«Далее» (валидация на шаг), финальная сводка перед сохранением.
- **Экспорт/импорт:** `src/store/storage.js` — `exportData()` (собирает profile/meals/defecations/settings/lang в JSON с `app`/`version`/`exportedAt`) и `importData(json,{replace})` (merge без дублей по id, либо полная замена). Добавлены `saveMeals`/`saveDefecations`.
- **UI (SettingsScreen):** карточка «Данные» — кнопка «Экспорт в JSON» (на web скачивает `.json` + показывает текст для копирования), поле импорта (multiline) + «Импортировать» с подтверждением и обработкой ошибок.
- **Проверки:** Babel OK, `npm test` 19/19, `expo export web` OK; логика экспорт/импорт (round-trip, merge-дедуп, restore, reject, replace) проверена на заглушенном бэкенде — 14/14.

## Завершено: Уведомления/напоминания доведены до ума
- **Фикс дублей:** `alarmService.applyReminder` теперь гасит прежний будильник (`cancelAlarm`) перед установкой нового — при каждом «Применить/пересчёт» больше не копятся повторные уведомления.
- **Разрешения без назойливости:** в `services/notifications.js` добавлен `checkNotificationPermission()` (через `getPermissionsAsync`); `ensurePermissions` запрашивает только если статус `undetermined` — не переспрашивает при каждом применении.
- **Честная обратная связь:** `schedulePrediction` возвращает `{reason}` (`ok`/`no_permission`/`too_soon`) вместо глухого `null`; SettingsScreen показывает конкретную причину («Слишком скоро», «Нет разрешения»).
- **Тап по уведомлению → Лог:** `onNotificationTap` + новый `services/nav.js` (`setGoToLogHandler`/`goToLog`); App регистрирует навигационный ref и по нажатию на напоминание открывает вкладку «Лог» (native).
- **Проверки:** Babel по App/services OK, `npm test` 19/19, `expo export web` OK, dev-бандл без ошибок; проводка подтверждена в бандле.

## Завершено: Свайп-навигация в логах
- **`src/screens/LogScreen.js`:** между под-режимами «Поиск» и «Своё фото» теперь можно переключаться горизонтальным свайпом (лево/право), помимо тапов по табам.
- Реализовано через `PanResponder` + `Animated.View` (translateX при свайпе, spring-возврат, смена режима при `|dx| > 64`); вертикальный скролл не конфликтует (респондер берётся только при горизонтальном жесте).
- Добавлена подсказка «Свайп влево/вправо — переключение режимов».
- **Проверки:** Babel OK, `npm test` 19/19, `expo export web` OK, dev-бандл без ошибок; проводка свайпа подтверждена в бандле.

## Завершено: Геймификация / прогрессия (безопасная, нейтральная)
- **`src/model/progression.mjs` (новый, чистый модуль, тестируемый):**
  - `computeStreak` — серия подряд идущих дней c записью дефекации (серия жива, если сегодня ещё не записано; сломана при пропуске >1 дня).
  - `bestStreak` — максимальная серия за историю.
  - `computeStats` — суммарные записи, активные дни, консистентность ведения (%) и средний интервал/дисперсия (регулярность).
  - `computeMilestones` — достижения по числу записей (1/10/25/50/100) + «Стабильный ритм» (std интервалов ≤ 12 ч).
  - Поощряет регулярность ведения, а НЕ частоту — чтобы не подталкивать к нездоровому поведению.
- **`src/ui/ProgressionCard.js` (новый):** карточка прогресса — бейдж серии, метрики (регулярность %, средний интервал), чипы достижений, подсказка «следующее достижение»; `accessible` + суммарный `accessibilityLabel` для VoiceOver.
- **`src/ui/Icon.js`:** добавлена иконка `flame` (серия/страйк).
- **`src/screens/PredictScreen.js`:** секция «Ваш прогресс» с ProgressionCard под карточкой прогноза; статистика через `useMemo` из `defecations`.
- **Тесты:** +7 тестов прогрессии в `model.test.mjs` — всего **19/19**.
- **Kiro-ревью:** математика корректна (краевые случаи), токены темы ок, контраст ок, дизайн не подталкивает к овер-логингу; учтены правки по a11y (label карточки).

## Relevant Files
- `src/theme/index.js`, `src/theme/palettes.js` (новый), `src/theme/theme-context.js` (новый)
- `src/ui/` — все компоненты переведены на `useThemeColors()` (Card, Button, Chip, Icon, ScreenHeader, Section, TextField)
- `src/services/vision.js` — mock-оценка калорий по фото
- `src/screens/*` — PredictScreen, LogScreen, ProfileScreen и др.
- `src/i18n/locales.js`, `src/i18n/index.js`
- `src/store/storage.js` — ключ `bt.lang`, `getLang`/`saveLang`
- `scripts/gen-icons.mjs` — генератор PNG-иконок
- `App.js` — табы + I18nProvider + ThemeProvider + иконки табов
- `app.json` — иконки/adaptive `#2F7D63`, splash `#F4F6F3`
- `.quick/tasks/task-01.md` — для Amazon Quick
- `C:\Users\Ren\AppData\Local\Temp\opencode\kiro_ux_market.txt` — вердикт Kiro по UX-анализу
