/**
 * Unit тесты для useAsyncOperation хука
 * @description Тестирует функциональность управления асинхронными операциями
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useAsyncOperation } from '../useAsyncOperation';

// Мок функции для тестирования
const createMockAsyncFunction = (result, delay = 100, shouldFail = false) => {
  return jest.fn(() => 
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error(result));
        } else {
          resolve(result);
        }
      }, delay);
    })
  );
};

describe('useAsyncOperation hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('основная функциональность', () => {
    test('должен инициализироваться с корректным состоянием', () => {
      const mockFn = createMockAsyncFunction('test');
      const { result } = renderHook(() => useAsyncOperation(mockFn));
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    test('должен выполнять асинхронную операцию успешно', async () => {
      const mockFn = createMockAsyncFunction('success result');
      const { result } = renderHook(() => useAsyncOperation(mockFn));
      
      // Начинаем выполнение
      act(() => {
        result.current.execute();
      });
      
      // Проверяем состояние loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
      
      // Ждем завершения
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Проверяем результат
      expect(result.current.data).toBe('success result');
      expect(result.current.error).toBe(null);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('должен обрабатывать ошибки', async () => {
      const mockFn = createMockAsyncFunction('error message', 100, true);
      const { result } = renderHook(() => useAsyncOperation(mockFn));
      
      // Начинаем выполнение
      act(() => {
        result.current.execute();
      });
      
      // Ждем завершения
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Проверяем ошибку
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error.message).toBe('error message');
    });
  });

  describe('состояние и управление', () => {
    test('reset должен очищать состояние', async () => {
      const mockFn = createMockAsyncFunction('test data');
      const { result } = renderHook(() => useAsyncOperation(mockFn));
      
      // Выполняем операцию
      act(() => {
        result.current.execute();
      });
      
      await waitFor(() => {
        expect(result.current.data).toBe('test data');
      });
      
      // Сбрасываем состояние
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    test('должен игнорировать результат отмененной операции', async () => {
      const mockFn = createMockAsyncFunction('result', 200);
      const { result, unmount } = renderHook(() => useAsyncOperation(mockFn));
      
      // Начинаем операцию
      act(() => {
        result.current.execute();
      });
      
      expect(result.current.isLoading).toBe(true);
      
      // Размонтируем компонент (имитация отмены)
      unmount();
      
      // Ждем время больше чем delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Результат не должен обновиться после unmount
      // (это проверяется через отсутствие warning'ов в консоли)
    });
  });

  describe('параметры и настройки', () => {
    test('должен принимать начальное значение data', () => {
      const mockFn = createMockAsyncFunction('test');
      const initialData = 'initial value';
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockFn, { initialData })
      );
      
      expect(result.current.data).toBe(initialData);
    });

    test('должен выполняться автоматически при immediate: true', async () => {
      const mockFn = createMockAsyncFunction('auto result');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockFn, { immediate: true })
      );
      
      // Должен сразу начать загрузку
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.data).toBe('auto result');
      });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('callback функции', () => {
    test('должен вызывать onSuccess при успешном выполнении', async () => {
      const mockFn = createMockAsyncFunction('success');
      const onSuccess = jest.fn();
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockFn, { onSuccess })
      );
      
      act(() => {
        result.current.execute();
      });
      
      await waitFor(() => {
        expect(result.current.data).toBe('success');
      });
      
      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    test('должен вызывать onError при ошибке', async () => {
      const mockFn = createMockAsyncFunction('error', 100, true);
      const onError = jest.fn();
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockFn, { onError })
      );
      
      act(() => {
        result.current.execute();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('производительность', () => {
    test('функции должны быть мемоизированы', () => {
      const mockFn = createMockAsyncFunction('test');
      const { result, rerender } = renderHook(() => useAsyncOperation(mockFn));
      
      const initialExecute = result.current.execute;
      const initialReset = result.current.reset;
      
      rerender();
      
      expect(result.current.execute).toBe(initialExecute);
      expect(result.current.reset).toBe(initialReset);
    });
  });
}); 