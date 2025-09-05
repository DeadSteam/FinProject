import { IShopService } from './IShopService.js';

/**
 * Mock implementation for IShopService.
 * @implements {IShopService}
 */
export class MockShopService extends IShopService {
    constructor() {
        super();
        this.shops = [
            { id: 1, name: 'Магазин на Ленина', address: 'ул. Ленина, 1' },
            { id: 2, name: 'Магазин на Мира', address: 'пр. Мира, 12' },
            { id: 3, name: 'Центральный', address: 'пл. Центральная, 3' },
        ];
        this.nextId = 4;
    }

    async getAllShops() {
        console.log('Mock: Fetching all shops');
        return Promise.resolve(this.shops);
    }

    async getShopById(id) {
        console.log(`Mock: Fetching shop with id ${id}`);
        const shop = this.shops.find(s => s.id === id);
        return shop ? Promise.resolve(shop) : Promise.reject(new Error('Shop not found'));
    }

    async createShop(shopData) {
        console.log('Mock: Creating shop', shopData);
        const newShop = { ...shopData, id: this.nextId++ };
        this.shops.push(newShop);
        return Promise.resolve(newShop);
    }

    async updateShop(id, shopData) {
        console.log(`Mock: Updating shop ${id} with`, shopData);
        const index = this.shops.findIndex(s => s.id === id);
        if (index !== -1) {
            this.shops[index] = { ...this.shops[index], ...shopData };
            return Promise.resolve(this.shops[index]);
        }
        return Promise.reject(new Error('Shop not found'));
    }

    async deleteShop(id) {
        console.log(`Mock: Deleting shop ${id}`);
        const index = this.shops.findIndex(s => s.id === id);
        if (index !== -1) {
            this.shops.splice(index, 1);
            return Promise.resolve();
        }
        return Promise.reject(new Error('Shop not found'));
    }
} 