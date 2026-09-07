/**
 * Сервис генерации PDF-отчёта о здоровье ЖКТ.
 * Нативный путь: expo-print -> PDF файл -> expo-sharing (меню «Поделиться»).
 * Web-fallback: открывает системный диалог печати (Save as PDF), т.к. на
 * вебе нет системного шаринга.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { getMeals, getDefecations, getAllDailyFactors } from '../store/storage';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Генерирует PDF-отчёт за последние N дней и открывает меню «Поделиться».
 * @param {number} days - период в днях (по умолчанию 30)
 * @returns {Promise<string|null>} uri PDF (на нативе) или null (на вебе)
 */
export async function generateHealthReport(days = 30) {
  try {
    const [meals, defecations, dailyMap] = await Promise.all([
      getMeals(),
      getDefecations(),
      getAllDailyFactors(),
    ]);

    const now = Date.now();
    const startMs = now - days * DAY_MS;
    const stats = calculateStats({ meals, defecations, dailyMap, startMs, days });
    const html = buildReportHTML(stats);

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return null;
    }

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Поделиться недоступно', 'Функция «Поделиться» недоступна на этом устройстве.');
      return uri;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Отчёт о здоровье ЖКТ',
    });

    return uri;
  } catch (e) {
    console.error('Ошибка генерации отчёта:', e);
    throw e;
  }
}

/**
 * Подсчёт статистики за период.
 * @param {{meals: Array, defecations: Array, dailyMap: Object, startMs: number, days: number}} input
 */
function calculateStats({ meals, defecations, dailyMap, startMs, days }) {
  const inPeriod = (timeMs) => Number.isFinite(timeMs) && timeMs >= startMs;

  const periodMeals = meals.filter((m) => inPeriod(m && m.timeMs));
  const periodDef = defecations.filter((d) => inPeriod(d && d.timeMs));

  const mealCount = periodMeals.length;
  const totalCalories = periodMeals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);

  let totalWater = 0;
  let waterDaysCount = 0;
  let totalStress = 0;
  let stressDaysCount = 0;

  for (const key of Object.keys(dailyMap)) {
    const dayMs = parseInt(key.slice(0, 4), 10) && keyToMs(key);
    if (!inPeriod(dayMs)) continue;
    const row = dailyMap[key] || {};
    if (Number.isFinite(row.waterGlasses)) {
      totalWater += row.waterGlasses;
      waterDaysCount++;
    }
    if (Number.isFinite(row.stressLevel)) {
      totalStress += row.stressLevel;
      stressDaysCount++;
    }
  }

  const bristolCounts = {};
  for (const d of periodDef) {
    if (d && Number.isInteger(d.bristol)) {
      bristolCounts[d.bristol] = (bristolCounts[d.bristol] || 0) + 1;
    }
  }
  const bristolEntries = Object.entries(bristolCounts).sort((a, b) => b[1] - a[1]);
  const mostCommonBristol = bristolEntries.length ? Number(bristolEntries[0][0]) : null;

  return {
    days,
    mealCount,
    defecationCount: periodDef.length,
    avgCalories: mealCount ? Math.round(totalCalories / mealCount) : 0,
    totalCalories,
    avgWater: waterDaysCount ? (totalWater / waterDaysCount).toFixed(1) : 0,
    avgStress: stressDaysCount ? (totalStress / stressDaysCount).toFixed(1) : null,
    stressDaysCount,
    frequency: days > 0 ? (periodDef.length / days).toFixed(2) : '0.00',
    mostCommonBristol,
    bristolCounts,
  };
}

/** 'YYYY-MM-DD' (локальная дата) -> timestamp начала дня. */
function keyToMs(key) {
  const [y, m, d] = key.split('-').map((x) => parseInt(x, 10));
  if (![y, m, d].every(Number.isInteger)) return NaN;
  return new Date(y, m, d).getTime();
}

/** Рендер HTML-отчёта (iOS-стиль). */
function buildReportHTML(stats) {
  const today = new Date().toLocaleDateString('ru-RU');
  const waterMark = Number(stats.avgWater) >= 8 ? '✅ Норма' : '⚠️ Пейте больше';
  const stressMark =
    stats.avgStress == null
      ? '— нет данных'
      : Number(stats.avgStress) <= 3
        ? '✅ Стабильно'
        : '⚠️ Повышен';
  const freqMark =
    Number(stats.frequency) >= 0.3 && Number(stats.frequency) <= 3
      ? '✅ Норма'
      : '⚠️ Консультация врача';

  const bristolLine =
    stats.mostCommonBristol != null
      ? `Наиболее частый тип: ${stats.mostCommonBristol} (${stats.bristolCounts[stats.mostCommonBristol]} раз)`
      : '— нет данных';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 30px;
            color: #1c1c1e;
            background: #ffffff;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007AFF;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #8e8e93;
            margin: 8px 0 0 0;
            font-size: 14px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f2f2f7;
            border-radius: 12px;
            padding: 18px;
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #007AFF;
            margin: 0;
        }
        .stat-label {
            font-size: 13px;
            color: #8e8e93;
            margin-top: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #1c1c1e;
            font-size: 18px;
            margin-bottom: 10px;
            border-left: 4px solid #34C759;
            padding-left: 10px;
        }
        .row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e5ea;
        }
        .row:last-child { border-bottom: none; }
        .footer {
            text-align: center;
            color: #8e8e93;
            font-size: 11px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e5ea;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🩺 Отчёт о здоровье ЖКТ</h1>
        <p>Период: последние ${stats.days} дней • Сформирован: ${today}</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <p class="stat-value">${stats.defecationCount}</p>
            <p class="stat-label">Всего событий</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${stats.frequency}</p>
            <p class="stat-label">Среднее в день</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${stats.avgCalories}</p>
            <p class="stat-label">Ср. калорий/приём</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${stats.avgWater}</p>
            <p class="stat-label">Стаканов воды/день</p>
        </div>
    </div>

    <div class="section">
        <h2>📊 Детальная статистика</h2>
        <div class="row">
            <span>Всего приёмов пищи</span>
            <strong>${stats.mealCount}</strong>
        </div>
        <div class="row">
            <span>Общая калорийность</span>
            <strong>${stats.totalCalories} ккал</strong>
        </div>
        <div class="row">
            <span>Средний уровень стресса</span>
            <strong>${stats.avgStress == null ? '—' : `${stats.avgStress} / 5`}</strong>
        </div>
        <div class="row">
            <span>Бристоль</span>
            <strong>${bristolLine}</strong>
        </div>
    </div>

    <div class="section">
        <h2>💡 Интерпретация</h2>
        <div class="row">
            <span>Гидратация</span>
            <strong>${waterMark}</strong>
        </div>
        <div class="row">
            <span>Уровень стресса</span>
            <strong>${stressMark}</strong>
        </div>
        <div class="row">
            <span>Регулярность</span>
            <strong>${freqMark}</strong>
        </div>
    </div>

    <div class="footer">
        Сформировано в BathroomTracker • Не является медицинской рекомендацией
    </div>
</body>
</html>
    `;
}