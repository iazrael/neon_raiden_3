/**
 * Logger 单元测试
 */
import { Logger } from '../../src/engine/logger/Logger';
import { LogLevel } from '../../src/engine/logger/types';
import { setDevMode } from '../../src/engine/logger/env';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    setDevMode(true);
    logger = new Logger('TestNamespace', { level: LogLevel.DEBUG, namespace: 'TestNamespace' });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    setDevMode(true); // Reset to dev mode
  });

  describe('构造函数', () => {
    it('应正确初始化命名空间和配置', () => {
      expect(logger['namespace']).toBe('TestNamespace');
      expect(logger['config'].level).toBe(LogLevel.DEBUG);
    });

    it('应使用默认配置当未传入配置时', () => {
      const defaultLogger = new Logger('Global');
      expect(defaultLogger['config'].level).toBe(LogLevel.INFO);
    });
  });

  describe('for 方法', () => {
    it('应创建带有继承命名空间的子 logger', () => {
      const childLogger = logger.for('ChildNamespace');
      expect(childLogger['namespace']).toBe('TestNamespace:ChildNamespace');
    });

    it('子 logger 应继承父级配置', () => {
      const childLogger = logger.for('ChildNamespace');
      expect(childLogger['config'].level).toBe(LogLevel.DEBUG);
    });
  });

  describe('日志级别过滤', () => {
    it('当配置级别为 INFO 时，应过滤 DEBUG 日志', () => {
      const infoLogger = new Logger('Test', { level: LogLevel.INFO, namespace: 'Test' });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      infoLogger.debug('should not show');
      expect(debugSpy).not.toHaveBeenCalled();

      debugSpy.mockRestore();
    });

    it('生产环境应只输出 ERROR 级别', () => {
      setDevMode(false);
      const prodLogger = new Logger('Test', { level: LogLevel.DEBUG, namespace: 'Test' });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      prodLogger.debug('should not show');
      prodLogger.info('should not show');
      prodLogger.warn('should not show');
      prodLogger.error('should show');

      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
