/**
 * Logger 模块入口
 *
 * 导出默认 logger 实例供全局使用
 */
import { Logger } from './Logger';
import { LogLevel } from './types';
import { isDev } from './env';

/**
 * 全局默认 logger 实例
 * 开发环境：DEBUG 级别
 * 生产环境：ERROR 级别
 */
const defaultLevel = isDev() ? LogLevel.DEBUG : LogLevel.ERROR;
export const logger = new Logger('Global', {
  level: defaultLevel,
  namespace: 'Global',
});

// 导出类型和类供扩展使用
export { Logger, LogLevel };
export type { LoggerConfig, LogColor } from './types';
