import test from 'node:test';
import assert from 'node:assert/strict';
import { getMicrocopy, pickMessage, fillMessage, SCENARIOS, MSG } from './microcopy.mjs';

test('MSG содержит все сценарии и непустые наборы', () => {
  for (const s of ['highCalories', 'lowWater', 'highStress', 'success', 'emptyField']) {
    assert.ok(Array.isArray(MSG[s]) && MSG[s].length > 0, `сценарий ${s} должен быть непустым`);
  }
});

test('SCENARIOS перечисляет все ключи MSG', () => {
  assert.deepEqual(SCENARIOS.sort(), Object.keys(MSG).sort());
});

test('getMicrocopy возвращает строку из набора сценария', () => {
  for (const s of SCENARIOS) {
    const msg = getMicrocopy(s);
    assert.equal(typeof msg, 'string');
    assert.ok(msg.length > 0);
  }
});

test('getMicrocopy подставляет value на место {value}', () => {
  const msg = getMicrocopy('highCalories', 7500);
  assert.match(msg, /7500/);
  assert.ok(!msg.includes('{value}'));
});

test('getMicrocopy не подставляет value, когда его нет', () => {
  const msg = getMicrocopy('success');
  assert.ok(!msg.includes('{value}'));
});

test('getMicrocopy для неизвестного сценария возвращает пустую строку', () => {
  assert.equal(getMicrocopy('nope'), '');
});

test('pickMessage берёт случайный элемент и терпит пустой список', () => {
  assert.ok(['a', 'b', 'c'].includes(pickMessage(['a', 'b', 'c'])));
  assert.equal(pickMessage([]), '');
  assert.equal(pickMessage(null), '');
});

test('fillMessage заменяет все вхождения {value}', () => {
  assert.equal(fillMessage('v={value} v2={value}', 3), 'v=3 v2=3');
  assert.equal(fillMessage('без плейсхолдера', 7), 'без плейсхолдера');
  assert.equal(fillMessage(null, 7), '');
});