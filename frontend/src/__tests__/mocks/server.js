import { setupServer } from 'msw/node';

import { handlers } from './handlers';

// Setup MSW server with default handlers
export const server = setupServer(...handlers);

// Enable API mocking before tests start
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after tests finish
afterAll(() => {
  server.close();
}); 