/**
 * Поиск блюд и калорий через Open Food Facts API.
 * https://world.openfoodfacts.org/
 */

const BASE = 'https://world.openfoodfacts.org/cgi/search.pl';

/**
 * Поиск продуктов по названию, возвращает нормализованный список.
 * Извлекает калории (ккал) из nutriments.energy-kcal_100g.
 *
 * @param {string} query - поисковый запрос
 * @param {number} [limit=25]
 * @returns {Promise<{id:string, name:string, kcal100g:number|null,
 *           brand:string|null, imageUrl:string|null}[]>}
 */
export async function searchFoods(query, limit = 25) {
  if (!query || !query.trim()) return [];

  const url = `${BASE}?search_terms=${encodeURIComponent(query.trim())}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}` +
    `&fields=code,product_name,brands,image_small_url,nutriments`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Food Facts: HTTP ${res.status}`);

  const data = await res.json();
  const products = data.products || [];

  return products
    .filter((p) => p && p.product_name)
    .map((p) => {
      const n = p.nutriments || {};
      const kcal100g =
        typeof n['energy-kcal_100g'] === 'number'
          ? n['energy-kcal_100g']
          : typeof n['energy-kcal_100g'] === 'string'
            ? parseFloat(n['energy-kcal_100g'])
            : null;
      return {
        id: p.code || `${p.product_name}_${Math.random().toString(36).slice(2, 8)}`,
        name: p.product_name,
        kcal100g,
        brand: p.brands || null,
        imageUrl: p.image_small_url || null,
      };
    });
}

/**
 * Расчёт калорий порции по данным продукта.
 * Если у продукта есть ккал/100г и известен вес порции в граммах -> ккал порции.
 *
 * @param {number|null} kcal100g
 * @param {number} grams - вес порции в граммах
 * @returns {number|null}
 */
export function kcalForServing(kcal100g, grams = 100) {
  if (kcal100g == null || !grams || grams <= 0) return null;
  return Math.round((kcal100g * grams) / 100);
}
