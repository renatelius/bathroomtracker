/**
 * Система SVG-иконок (react-native-svg).
 * Единая сетка 24x24, толщина линии 1.8, скруглённые углы.
 * Цвет наследуется через prop `color`, size через `size`.
 */
import React from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { palette } from '../theme';

// Табличные пути (в координатах 24x24)
const PATHS = {
  // Прогноз: спираль/решетка + точка
  forecast: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 12l4-3" />
      <Circle cx="12" cy="12" r="1.6" />
    </>
  ),
  // Лог (еда): тарелка
  food: (
    <>
      <Circle cx="12" cy="13" r="8" />
      <Path d="M8 5c-1 1.5-1 4 0 5" />
      <Path d="M12 5c-1 1.5-1 4 0 5" />
      <Path d="M4 21h16" />
    </>
  ),
  // Календарь
  calendar: (
    <>
      <Rect x="4" y="6" width="16" height="15" rx="2.5" />
      <Path d="M4 10.5h16" />
      <Path d="M8.5 3.5V6" />
      <Path d="M15.5 3.5V6" />
    </>
  ),
  // История: часы со стрелкой
  history: (
    <>
      <Circle cx="12" cy="13" r="8.5" />
      <Path d="M12 9v4l2.6 1.8" />
      <Path d="M4.5 4.5L8 7" />
    </>
  ),
  // Настройки: шестерёнка (упрощённая)
  settings: (
    <>
      <Circle cx="12" cy="12" r="3.2" />
      <Path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
    </>
  ),
  // Профиль: силуэт
  profile: (
    <>
      <Circle cx="12" cy="8.5" r="3.5" />
      <Path d="M5 20c1.2-3.2 4-5 7-5s5.8 1.8 7 5" />
    </>
  ),
  // Будильник
  alarm: (
    <>
      <Circle cx="12" cy="14" r="7" />
      <Path d="M12 11v3.2l2 1.2" />
      <Path d="M16.5 4l2.5 3M7.5 4L5 7" />
    </>
  ),
  // Фото: камера
  photo: (
    <>
      <Rect x="3" y="6.5" width="18" height="14" rx="3" />
      <Circle cx="12" cy="13.5" r="4" />
      <Path d="M8.5 6.5l1.2-2.5h4.6l1.2 2.5" />
    </>
  ),
  // Чат: облако
  chat: (
    <>
      <Path d="M21 11.5a8 8 0 0 1-8 8 8.3 8.3 0 0 1-3.2-.6L4 20l1.4-3A8 8 0 1 1 21 11.5z" />
    </>
  ),
  // Друзья: два силуэта
  friends: (
    <>
      <Circle cx="9" cy="8.5" r="3" />
      <Circle cx="17" cy="10" r="2.6" />
      <Path d="M3.5 20c.8-2.6 2.9-4.2 5.5-4.2s4.7 1.6 5.5 4.2" />
      <Path d="M16.5 16.2c2 .5 3.6 1.9 4.2 3.9" />
    </>
  ),
  // Список/журнал
  list: (
    <>
      <Path d="M9 6h11M9 12h11M9 18h11" />
      <Circle cx="4.5" cy="6" r="0.8" />
      <Circle cx="4.5" cy="12" r="0.8" />
      <Circle cx="4.5" cy="18" r="0.8" />
    </>
  ),
  // Галочка
  check: (
    <>
      <Path d="M4 12.5l5 5L20 6.5" />
    </>
  ),
  // Закрыть
  close: (
    <>
      <Path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  // Плюс
  plus: (
    <>
      <Path d="M12 5v14M5 12h14" />
    </>
  ),
  // Назад/стрелка
  arrowLeft: (
    <>
      <Path d="M14.5 5L7.5 12l7 7" />
    </>
  ),
  // Язык (глобус)
  globe: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18" />
      <Path d="M12 3c2.5 2.7 3.7 5.8 3.7 9S14.5 18.3 12 21c-2.5-2.7-3.7-5.8-3.7-9S9.5 5.7 12 3z" />
    </>
  ),
  // Калории/энергия (молния)
  energy: (
    <>
      <Path d="M13 3L5 13.5h6L11 21l8-10.5h-6z" />
    </>
  ),
};

export default function Icon({ name, size = 22, color = palette.textPrimary, strokeWidth = 'regular', children }) {
  const widths = { thin: 1.5, regular: 1.8, bold: 2.2 };
  const sw = typeof strokeWidth === 'number' ? strokeWidth : widths[strokeWidth] || widths.regular;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {React.Children.toArray(children || PATHS[name]).map((el, i) =>
        React.cloneElement(el, {
          key: i,
          stroke: color,
          strokeWidth: sw,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fill: el.props.fill ? 'currentColor' : 'none',
        })
      )}
    </Svg>
  );
}

export const iconNames = Object.keys(PATHS);
