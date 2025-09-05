/**
 * @typedef {object} Metric
 * @property {number} id
 * @property {string} name
 * @property {string} unit - The unit of measurement (e.g., "руб", "шт").
 * @property {string|null} description
 */

/**
 * @typedef {object} IMetricService
 * @property {() => Promise<Metric[]>} getAllMetrics - Fetches all metrics.
 * @property {(id: number) => Promise<Metric>} getMetricById - Fetches a single metric by its ID.
 * @property {(metricData: Omit<Metric, 'id'>) => Promise<Metric>} createMetric - Creates a new metric.
 * @property {(id: number, metricData: Partial<Metric>) => Promise<Metric>} updateMetric - Updates an existing metric.
 * @property {(id: number) => Promise<void>} deleteMetric - Deletes a metric.
 */ 