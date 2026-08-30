# BathroomTracker

Мобильное приложение (React Native / Expo) для трекинга питания и дефекаций
с предсказанием даты и времени следующей дефекации по многофакторной
математической модели.

## Возможности

- **Онбординг** — сбор антропометрии: пол, рост, вес, год рождения, тип
  телосложения (астеник / нормостеник / гиперстеник).
- **Лог еды** — поиск блюд через Open Food Facts API, калории из
  `nutriments.energy-kcal_100g`, выбор веса порции.
- **Лог дефекаций** — отметка времени дефекации одним нажатием.
- **Прогноз** — дата/время следующей дефекации с окном достоверности и
  разбивкой факторов модели.
- **История** — все приёмы пищи и дефекации, удаление записей.
- **Настройки** — по желанию: включить будильник (звонок за N минут до прогноза,
  N = 0/5/10/15/30/60) и событие в нативном системном календаре.
- **Нативная интеграция (оба уровня):**
  - **Календарь** — `expo-calendar`: создаёт реальное событие прогноза в системном
    календаре телефона (работает в Expo Go).
  - **Будильник (звук)** — `expo-notifications`: громкое уведомление со звуком за
    выбранные минуты до прогноза (работает в Expo Go).
  - **Системный будильник (dev-build)** — зарезервирован в `alarmService`
    (`alarmMode: 'system'`), потребует сборки через EAS Build с нативным модулем.
- Хранение — локально (AsyncStorage), слой абстракции в `src/store/storage.js`
  (можно заменить на SQLite/Realm).

## Нативная интеграция (подробно)

Сервисы: `src/services/calendarService.js`, `src/services/notifications.js`,
`src/services/alarmService.js`, настройки в `src/screens/SettingsScreen.js`.

- `calendarService` — `expo-calendar`: запрос разрешения, создание календаря
  «BathroomTracker» (iOS через `getDefaultCalendarSourceAsync`), создание события
  прогноза на `predictedAtMs`.
- `notifications` — `expo-notifications`: звуковой будильник, который звонит за
  `leadMinutes` до прогноза (`schedulePrediction({ predictedAtMs, leadMinutes })`);
  валидация, что время звонка в будущем.
- `alarmService` — единая абстракция: применяет настройки (будильник + календарь)
  под текущий прогноз; `alarmMode: 'system'` зарезервирован под dev-build.
- Настройки пользователя хранятся в AsyncStorage (`alarmEnabled`, `alarmLeadMinutes`,
  `calendarEnabled`, `alarmMode`).

> **Важно про уровни:** в Expo Go доступен только «звуковой будильник» (громкое
> уведомление со звуком) и событие календаря. Настоящий системный звонок в
> приложении «Часы» требует dev-build (EAS Build) с нативным модулем
> `react-native-alarm-clock` — заложено в коде, включается при отдельной сборке.

## Запуск

```bash
npm install
npm start        # Expo dev server (QR для Expo Go)
npm run android  # запуск на Android
npm test         # юнит-тесты математического ядра
```

## Математическая модель (src/model/model.mjs)

Чистый ESM-модуль, без зависимостей от React Native, тестируется в Node.

```
T_next = t_last + T_pred
T_pred = F_base × k_body × k_food × k_rhythm
```

- **F_base** — базовый интервал из истории:
  - ≥7 интервалов → EMA с отбрасыванием выбросов (>3σ),
  - 2–6 → медиана, кламп [12ч, 96ч],
  - 0–1 → физиологический дефолт 28ч.
- **k_body** — пол, ИМТ, тип телосложения, возраст (старше 50 — замедление).
- **k_food** — ккал за последние 48ч против персональной нормы
  (~30 ккал/кг); избыток ускоряет (exp-поправка), нехватка замедляет;
  плотный приём за последние 8ч — дополнительный стимул.
- **k_rhythm** — суточный ритм: близость к привычному часу дефекации.

Результат возвращает `predictedAtMs`, окно достоверности `lowMs`/`highMs`
(± std интервалов) и значения всех факторов.

## Структура

```
src/
  model/model.mjs        # математическое ядро
  model/model.test.mjs   # юнит-тесты (node:test)
  services/foodApi.js    # Open Food Facts API
  services/calendarService.js  # интеграция с нативным календарём (expo-calendar)
  services/notifications.js    # звуковой будильник (expo-notifications)
  services/alarmService.js     # абстракция будильника/календаря (оба уровня)
  store/storage.js       # абстракция хранилища (AsyncStorage)
  screens/
    Onboarding.js        # антропометрия
    LogScreen.js         # лог еды и дефекаций
    PredictScreen.js     # прогноз (+ кнопка напоминания)
    CalendarScreen.js    # календарь с прогнозом и окном достоверности
    SettingsScreen.js    # настройки будильника и календаря
    HistoryScreen.js     # история
```
