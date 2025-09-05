import { IMetricService } from './IMetricService.js';

/**
 * Mock implementation for IMetricService.
 * @implements {IMetricService}
 */
export class MockMetricService extends IMetricService {
    constructor() {
        super();
        this.metrics = [
            { id: 1, name: 'Выручка', unit: 'руб', description: 'Общая выручка' },
            { id: 2, name: 'Средний чек', unit: 'руб', description: 'Средняя сумма покупки' },
            { id: 3, name: 'Количество чеков', unit: 'шт', description: 'Общее количество транзакций' },
        ];
        this.nextId = 4;
    }

    async getAllMetrics() {
        console.log('Mock: Fetching all metrics');
        return Promise.resolve(this.metrics);
    }

    async getMetricById(id) {
        console.log(`Mock: Fetching metric with id ${id}`);
        const metric = this.metrics.find(m => m.id === id);
        return metric ? Promise.resolve(metric) : Promise.reject(new Error('Metric not found'));
    }

    async createMetric(metricData) {
        console.log('Mock: Creating metric', metricData);
        const newMetric = { ...metricData, id: this.nextId++ };
        this.metrics.push(newMetric);
        return Promise.resolve(newMetric);
    }

    async updateMetric(id, metricData) {
        console.log(`Mock: Updating metric ${id} with`, metricData);
        const index = this.metrics.findIndex(m => m.id === id);
        if (index !== -1) {
            this.metrics[index] = { ...this.metrics[index], ...metricData };
            return Promise.resolve(this.metrics[index]);
        }
        return Promise.reject(new Error('Metric not found'));
    }

    async deleteMetric(id) {
        console.log(`Mock: Deleting metric ${id}`);
        const index = this.metrics.findIndex(m => m.id === id);
        if (index !== -1) {
            this.metrics.splice(index, 1);
            return Promise.resolve();
        }
        return Promise.reject(new Error('Metric not found'));
    }
} 