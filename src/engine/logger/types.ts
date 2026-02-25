/**
 * Logger 模块类型定义
 */

/**
 * 日志级别枚举
 * 数值越大，级别越高
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger 配置接口
 */
export interface LoggerConfig {
  /** 最小日志级别，低于此级别的日志不会输出 */
  level: LogLevel;
  /** 命名空间，用于标识日志来源 */
  namespace: string;
}

/**
 * 日志颜色配置
 */
export interface LogColor {
  /** CSS 样式字符串 */
  style: string;
}
