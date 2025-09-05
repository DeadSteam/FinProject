/**
 * Unit тесты для useToggle хука
 * @description Тестирует функциональность переключения boolean состояния
 */

import { renderHook, act } from '@testing-library/react';

import { useToggle } from '../useToggle';

describe('useToggle hook', () => {
  describe('основная функциональность', () => {
    test('должен инициализироваться с false по умолчанию', () => {
      const { result } = renderHook(() => useToggle());
      
      expect(result.current[0]).toBe(false);
      expect(typeof result.current[1]).toBe('function');
    });

    test('должен принимать начальное значение', () => {
      const { result } = renderHook(() => useToggle(true));
      
      expect(result.current[0]).toBe(true);
    });

    test('должен переключать значение при вызове toggle', () => {
      const { result } = renderHook(() => useToggle(false));
      
      act(() => {
        result.current[1](); // toggle()
      });
      
      expect(result.current[0]).toBe(true);
      
      act(() => {
        result.current[1](); // toggle()
      });
      
      expect(result.current[0]).toBe(false);
    });
  });

  describe('функции управления состоянием', () => {
    test('должен возвращать функции setTrue, setFalse, toggle', () => {
      const { result } = renderHook(() => useToggle(false));
      const [value, toggle, setTrue, setFalse] = result.current;
      
      expect(typeof toggle).toBe('function');
      expect(typeof setTrue).toBe('function');
      expect(typeof setFalse).toBe('function');
    });

    test('setTrue должен устанавливать значение в true', () => {
      const { result } = renderHook(() => useToggle(false));
      const [, , setTrue] = result.current;
      
      act(() => {
        setTrue();
      });
      
      expect(result.current[0]).toBe(true);
    });

    test('setFalse должен устанавливать значение в false', () => {
      const { result } = renderHook(() => useToggle(true));
      const [, , , setFalse] = result.current;
      
      act(() => {
        setFalse();
      });
      
      expect(result.current[0]).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('должен сохранять явно переданные значения как есть', () => {
      const { result: nullResult } = renderHook(() => useToggle(null));
      const { result: undefinedResult } = renderHook(() => useToggle(undefined));
      const { result: emptyResult } = renderHook(() => useToggle());
      
      // useToggle сохраняет явно переданные значения
      expect(nullResult.current[0]).toBe(null);
      // undefined заменяется на default false из-за параметра по умолчанию
      expect(undefinedResult.current[0]).toBe(false);
      // Без аргументов также используется default false
      expect(emptyResult.current[0]).toBe(false);
    });

    test('должен правильно переключать non-boolean значения', () => {
      const { result } = renderHook(() => useToggle(null));
      
      act(() => {
        result.current[1](); // toggle() - null -> true
      });
      
      expect(result.current[0]).toBe(true);
      
      act(() => {
        result.current[1](); // toggle() - true -> false
      });
      
      expect(result.current[0]).toBe(false);
    });

    test('должен правильно обрабатывать множественные вызовы', () => {
      const { result } = renderHook(() => useToggle(false));
      
      // Множественные переключения
      act(() => {
        result.current[1](); // false -> true
        result.current[1](); // true -> false
        result.current[1](); // false -> true
      });
      
      expect(result.current[0]).toBe(true);
    });
  });

  describe('производительность', () => {
    test('функции должны быть мемоизированы', () => {
      const { result, rerender } = renderHook(() => useToggle(false));
      
      const initialToggle = result.current[1];
      const initialSetTrue = result.current[2];
      const initialSetFalse = result.current[3];
      
      rerender();
      
      expect(result.current[1]).toBe(initialToggle);
      expect(result.current[2]).toBe(initialSetTrue);
      expect(result.current[3]).toBe(initialSetFalse);
    });
  });
}); 