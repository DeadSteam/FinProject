/**
 * @typedef {object} Shop
 * @property {number} id
 * @property {string} name
 * @property {string|null} address
 */

/**
 * @typedef {object} IShopService
 * @property {() => Promise<Shop[]>} getAllShops - Fetches all shops.
 * @property {(id: number) => Promise<Shop>} getShopById - Fetches a single shop by its ID.
 * @property {(shopData: Omit<Shop, 'id'>) => Promise<Shop>} createShop - Creates a new shop.
 * @property {(id: number, shopData: Partial<Shop>) => Promise<Shop>} updateShop - Updates an existing shop.
 * @property {(id: number) => Promise<void>} deleteShop - Deletes a shop.
 */ 