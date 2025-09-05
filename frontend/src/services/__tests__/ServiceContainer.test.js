/**
 * Unit тесты для ServiceContainer (Dependency Injection)
 * @description Тестирует функциональность IoC контейнера из Phase 4
 */

import { ServiceContainer } from '../ServiceContainer';

// Mock интерфейса для тестирования
class MockTestService {
  constructor(dependency) {
    this.dependency = dependency;
  }
  
  getData() {
    return 'mock data';
  }
}

class MockDependency {
  getValue() {
    return 'dependency value';
  }
}

describe('ServiceContainer', () => {
  let container;

  beforeEach(() => {
    container = new ServiceContainer();
    // Очищаем предыдущие регистрации для изоляции тестов
    container.clear();
  });

  describe('основная функциональность', () => {
    test('должен создаваться с Map коллекциями', () => {
      expect(container.services).toBeInstanceOf(Map);
      expect(container.factories).toBeInstanceOf(Map);
      expect(container.singletons).toBeInstanceOf(Map);
    });

    test('должен регистрировать фабрики сервисов', () => {
      const mockFactory = () => new MockTestService();
      
      container.registerFactory('testService', mockFactory);
      
      expect(container.factories.has('testService')).toBe(true);
      expect(container.factories.get('testService')).toBe(mockFactory);
    });

    test('должен получать сервисы через get()', () => {
      container.registerFactory('testService', () => new MockTestService());
      
      const instance = container.get('testService');
      
      expect(instance).toBeInstanceOf(MockTestService);
      expect(instance.getData()).toBe('mock data');
    });

    test('должен создавать синглтоны', () => {
      container.registerSingleton('testService', () => new MockTestService());
      
      const instance1 = container.get('testService');
      const instance2 = container.get('testService');
      
      expect(instance1).toBe(instance2); // Тот же объект
    });

    test('должен создавать новые экземпляры для фабрик', () => {
      container.registerFactory('testService', () => new MockTestService());
      
      const instance1 = container.get('testService');
      const instance2 = container.get('testService');
      
      expect(instance1).not.toBe(instance2); // Разные объекты
      expect(instance1).toBeInstanceOf(MockTestService);
      expect(instance2).toBeInstanceOf(MockTestService);
    });
  });

  describe('dependency injection', () => {
    test('должен внедрять зависимости', () => {
      // Регистрируем зависимость
      container.registerSingleton('dependency', () => new MockDependency());
      
      // Регистрируем сервис с зависимостью
      container.registerFactory('testService', (container) => {
        const dependency = container.get('dependency');
        return new MockTestService(dependency);
      });
      
      const instance = container.get('testService');
      
      expect(instance.dependency).toBeInstanceOf(MockDependency);
      expect(instance.dependency.getValue()).toBe('dependency value');
    });

    test('должен обрабатывать цепочки зависимостей', () => {
      // Регистрируем базовую зависимость
      container.registerSingleton('baseDep', () => ({ value: 'base' }));
      
      // Зависимость второго уровня
      container.registerSingleton('midDep', (container) => ({
        base: container.get('baseDep'),
        value: 'middle'
      }));
      
      // Конечный сервис
      container.registerFactory('finalService', (container) => ({
        mid: container.get('midDep'),
        value: 'final'
      }));
      
      const instance = container.get('finalService');
      
      expect(instance.value).toBe('final');
      expect(instance.mid.value).toBe('middle');
      expect(instance.mid.base.value).toBe('base');
    });
  });

  describe('error handling', () => {
    test('должен выбрасывать ошибку для незарегистрированного сервиса', () => {
      expect(() => {
        container.get('nonExistentService');
      }).toThrow("Service 'nonExistentService' not found");
    });

    test('должен обрабатывать ошибки в factory функциях', () => {
      container.registerFactory('failingService', () => {
        throw new Error('Factory error');
      });
      
      expect(() => {
        container.get('failingService');
      }).toThrow('Factory error');
    });
  });

  describe('проверка наличия сервисов', () => {
    test('has() должен возвращать корректный результат', () => {
      expect(container.has('testService')).toBe(false);
      
      container.registerFactory('testService', () => new MockTestService());
      
      expect(container.has('testService')).toBe(true);
    });

    test('getServiceNames() должен возвращать список сервисов', () => {
      container.registerFactory('service1', () => ({}));
      container.registerSingleton('service2', () => ({}));
      container.registerInstance('service3', {});
      
      const names = container.getServiceNames();
      
      expect(names).toContain('service1');
      expect(names).toContain('service2');
      expect(names).toContain('service3');
    });
  });

  describe('управление жизненным циклом', () => {
    test('clear() должен очищать все сервисы', () => {
      container.registerFactory('testService', () => new MockTestService());
      container.get('testService');
      
      container.clear();
      
      expect(container.services.size).toBe(0);
      expect(container.factories.size).toBe(0);
      expect(container.singletons.size).toBe(0);
    });

    test('remove() должен удалять конкретный сервис', () => {
      container.registerFactory('service1', () => ({ id: 1 }));
      container.registerFactory('service2', () => ({ id: 2 }));
      
      container.remove('service1');
      
      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(true);
    });
  });

  describe('тестирование и мокинг', () => {
    test('setupForTesting() должен работать', () => {
      const mockService = { getData: () => 'mocked data' };
      
      container.setupForTesting({
        testService: mockService
      });
      
      expect(container.get('testService')).toBe(mockService);
    });

    test('должен поддерживать мокинг интерфейсов', () => {
      container.registerInterface('ITestService', () => new MockTestService());
      
      const mockImplementation = { getData: () => 'mocked' };
      container.mockInterface('ITestService', mockImplementation);
      
      expect(container.get('ITestService')).toBe(mockImplementation);
    });

    test('должен восстанавливать оригинальные реализации', () => {
      container.registerInterface('ITestService', () => new MockTestService());
      const original = container.get('ITestService');
      
      const mockImplementation = { getData: () => 'mocked' };
      container.mockInterface('ITestService', mockImplementation);
      container.restoreInterface('ITestService');
      
      const restored = container.get('ITestService');
      expect(restored).toBeInstanceOf(MockTestService);
    });
  });

  describe('производительность', () => {
    test('синглтоны должны создаваться только один раз', () => {
      let callCount = 0;
      
      container.registerSingleton('testService', () => {
        callCount++;
        return new MockTestService();
      });
      
      // Первый вызов - создание
      const instance1 = container.get('testService');
      expect(callCount).toBe(1);
      
      // Последующие вызовы - из кэша
      const instance2 = container.get('testService');
      const instance3 = container.get('testService');
      
      expect(callCount).toBe(1); // Factory вызван только один раз
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });
}); 