import { rest } from 'msw';

// Base API URL for mocking
const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

export const handlers = [
  // Authentication endpoints
  rest.post(`${API_BASE}/auth/login`, (req, res, ctx) => {
    const { identifier, password } = req.body;
    
    if (identifier === 'admin@test.com' && password === 'admin123') {
      return res(
        ctx.status(200),
        ctx.json({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@test.com',
            roles: ['admin', 'finance']
          }
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ detail: 'Invalid credentials' })
    );
  }),

  rest.post(`${API_BASE}/auth/refresh`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'new-mock-access-token'
      })
    );
  }),

  rest.get(`${API_BASE}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({ detail: 'Unauthorized' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        roles: ['admin', 'finance'],
        phone: '+1234567890'
      })
    );
  }),

  // Users endpoints
  rest.get(`${API_BASE}/users`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          username: 'admin',
          email: 'admin@test.com',
          roles: ['admin'],
          phone: '+1234567890'
        },
        {
          id: 2,
          username: 'user',
          email: 'user@test.com',
          roles: ['user'],
          phone: '+0987654321'
        }
      ])
    );
  }),

  rest.post(`${API_BASE}/users`, (req, res, ctx) => {
    const userData = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: Date.now(),
        ...userData,
        created_at: new Date().toISOString()
      })
    );
  }),

  // Categories endpoints
  rest.get(`${API_BASE}/finance/categories`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          name: 'Доходы',
          description: 'Категория доходов',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Расходы',
          description: 'Категория расходов',
          created_at: '2024-01-01T00:00:00Z'
        }
      ])
    );
  }),

  // Shops endpoints
  rest.get(`${API_BASE}/finance/shops`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          name: 'Магазин 1',
          description: 'Описание магазина 1',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Магазин 2',
          description: 'Описание магазина 2',
          created_at: '2024-01-01T00:00:00Z'
        }
      ])
    );
  }),

  // Metrics endpoints
  rest.get(`${API_BASE}/finance/metrics`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          name: 'Продажи',
          category_id: 1,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Затраты',
          category_id: 2,
          created_at: '2024-01-01T00:00:00Z'
        }
      ])
    );
  }),

  // Error simulation endpoints
  rest.get(`${API_BASE}/error/500`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ detail: 'Internal Server Error' })
    );
  }),

  rest.get(`${API_BASE}/error/timeout`, (req, res, ctx) => {
    return res(
      ctx.delay(10000), // 10 second delay to simulate timeout
      ctx.status(200),
      ctx.json({ message: 'This should timeout' })
    );
  }),

  // Catch-all handler for unhandled requests
  rest.all('*', (req, res, ctx) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`No handler found for ${req.method} ${req.url}`);
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'Not found' })
    );
  })
]; 