/**
 * Logger 类核心实现
 *
 * 提供统一的日志输出接口，支持：
 * - 日志级别过滤 (DEBUG/INFO/WARN/ERROR)
 * - 命名空间（通过 for() 方法创建子 logger）
 * - 环境感知（开发/生产环境不同输出策略）
 */
import { LogLevel, LoggerConfig } from "./types";
import { formatTimestamp, formatNamespace, getColorForLevel, formatLevel } from "./formatter";
import { isDev } from "./env";

/**
 * Logger 默认配置
 */
const DEFAULT_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    namespace: "Global",
};

/**
 * Logger 类
 */
export class Logger {
    private namespace: string;
    private config: LoggerConfig;

    constructor(namespace: string, config?: LoggerConfig) {
        this.namespace = namespace;
        this.config = config || DEFAULT_CONFIG;
    }

    /**
     * 创建带命名空间的子 logger
     * @param childNamespace 子命名空间
     * @returns 新的 Logger 实例
     */
    for(childNamespace: string): Logger {
        const combinedNamespace = `${this.namespace}:${childNamespace}`;
        return new Logger(combinedNamespace, this.config);
    }

    /**
     * 输出 DEBUG 级别日志
     */
    debug(message: string, ...args: unknown[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    /**
     * 输出 INFO 级别日志
     */
    info(message: string, ...args: unknown[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    /**
     * 输出 WARN 级别日志
     */
    warn(message: string, ...args: unknown[]): void {
        this.log(LogLevel.WARN, message, ...args);
    }

    /**
     * 输出 ERROR 级别日志
     */
    error(message: string, ...args: unknown[]): void {
        this.log(LogLevel.ERROR, message, ...args);
    }

    /**
     * 核心日志方法
     * @param level 日志级别
     * @param message 日志消息
     * @param args 额外参数
     */
    private log(level: LogLevel, message: string, ...args: unknown[]): void {
        // 1. 级别过滤
        if (!this.shouldLog(level)) {
            return;
        }

        // 2. 环境判断：生产环境只输出 ERROR
        const isDevelopment = isDev();
        if (!isDevelopment && level !== LogLevel.ERROR) {
            return;
        }

        // 3. 格式化输出
        const formatted = this.format(level, message);

        // 4. 选择输出方式
        if (isDevelopment) {
            // 开发环境：带颜色和格式
            const color = getColorForLevel(level);
            switch (level) {
                case LogLevel.ERROR:
                    console.error(`%c${formatted}`, color.style, ...args);
                    break;
                case LogLevel.WARN:
                    console.warn(`%c${formatted}`, color.style, ...args);
                    break;
                case LogLevel.INFO:
                    console.info(`%c${formatted}`, color.style, ...args);
                    break;
                default:
                    console.log(`%c${formatted}`, color.style, ...args);
                    break;
            }
        } else {
            // 生产环境：简化格式，只输出 error
            console.error(`${formatLevel(level)} ${this.namespace}: ${message}`, ...args);
        }
    }

    /**
     * 判断是否应该输出该级别的日志
     * @param level 日志级别
     * @returns 是否输出
     */
    private shouldLog(level: LogLevel): boolean {
        return level >= this.config.level;
    }

    /**
     * 格式化日志消息
     * @param level 日志级别
     * @param message 消息内容
     * @returns 格式化后的字符串
     */
    private format(level: LogLevel, message: string): string {
        const timestamp = formatTimestamp(new Date());
        const levelStr = formatLevel(level);
        const namespace = formatNamespace(this.namespace);
        return `[${timestamp}] [${levelStr}] ${namespace} ${message}`;
    }
}
