/**
 * logger 模块入口测试
 */
import { logger } from '../../src/engine/logger';
import { LogLevel } from '../../src/engine/logger/types';

describe('logger 默认实例', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // 使用 setDevMode 设置开发环境
    const { setDevMode } = require('../../src/engine/logger/env');
    setDevMode(true);
    consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('应导出默认 logger 实例', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.for).toBeDefined();
  });

  it('应能正常调用日志方法', () => {
    logger.info('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('应能创建子 logger', () => {
    const childLogger = logger.for('TestSystem');
    expect(childLogger).toBeDefined();
  });
});
