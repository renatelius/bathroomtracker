/**
 * Лёгкий роутинг-мост: позволяет сервисам (напр. уведомлениям) переключать
 * вкладку, не завися от навигационного стека напрямую.
 */

let goToLogHandler = null;

/** Регистрирует обработчик перехода на вкладку «Лог» (задаётся из App). */
export function setGoToLogHandler(fn) {
  goToLogHandler = fn;
}

/** Переключает на вкладку «Лог» (если обработчик установлен). */
export function goToLog() {
  goToLogHandler && goToLogHandler();
}
