// Простой пул промисов с ограничением параллелизма
// Используется для параллельного экспорта множества графиков без лагов UI

export async function promisePool(tasks, concurrency = 4) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      if (currentIndex >= tasks.length) return;
      nextIndex++;
      try {
        results[currentIndex] = await tasks[currentIndex]();
      } catch (error) {
        results[currentIndex] = undefined;
        // eslint-disable-next-line no-console
        console.warn('promisePool task failed at index', currentIndex, error);
      }
      await new Promise((r) => setTimeout(r));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function mapToTasks(items, mapFn) {
  return items.map((item, index) => () => mapFn(item, index));
}


