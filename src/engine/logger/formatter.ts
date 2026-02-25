/**
 * 日志格式化工具
 */
import { LogLevel, LogColor } from './types';

/**
 * 格式化时间戳为 HH:MM:SS.mmm
 * @param date 日期对象
 * @returns 格式化后的时间戳字符串
 */
export function formatTimestamp(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 格式化命名空间
 * @param namespace 命名空间字符串
 * @returns 格式化后的命名空间 [Namespace]
 */
export function formatNamespace(namespace: string): string {
  return `[${namespace}]`;
}

/**
 * 获取日志级别对应的颜色
 * @param level 日志级别
 * @returns 颜色配置
 */
export function getColorForLevel(level: LogLevel): LogColor {
  const colors: Record<LogLevel, LogColor> = {
    [LogLevel.DEBUG]: { style: 'color: gray' },
    [LogLevel.INFO]: { style: 'color: blue' },
    [LogLevel.WARN]: { style: 'color: orange' },
    [LogLevel.ERROR]: { style: 'color: red' },
  };
  return colors[level];
}

/**
 * 格式化日志级别字符串
 * @param level 日志级别
 * @returns 大写的级别字符串
 */
export function formatLevel(level: LogLevel): string {
  return LogLevel[level].toUpperCase();
}
