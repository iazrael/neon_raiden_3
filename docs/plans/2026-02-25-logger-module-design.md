# Logger 模块设计文档

**日期**: 2026-02-25
**状态**: 设计已完成，待实施

## 概述

设计一个统一的日志模块，替代项目中分散的 `console` 调用。支持分级日志、环境感知和命名空间，开发环境输出格式化日志，生产环境仅输出 ERROR 级别。

## 目标

- 统一日志输出接口，便于维护和调试
- 支持日志级别过滤，生产环境减少噪音
- 命名空间功能，快速定位日志来源（ECS Systems）
- 无侵入迁移，全局替换现有 `console` 调用

## 架构设计

### 目录结构

```
src/engine/logger/
├── index.ts          # 导出默认 logger 实例
├── Logger.ts         # Logger 类核心实现
├── types.ts          # 日志级别、配置类型定义
└── formatter.ts      # 日志格式化工具（时间戳、颜色）
```

### 核心组件

#### 1. LogLevel 枚举

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
```

#### 2. LoggerConfig 接口

```typescript
export interface LoggerConfig {
  level: LogLevel;
  namespace: string;
}
```

#### 3. Logger 类

- **单例模式**：导出默认实例
- **命名空间**：支持通过 `for()` 创建子 logger
- **环境感知**：通过 `import.meta.env.DEV` 判断

## API 设计

### 导出与使用

```typescript
import { logger } from '@/engine/logger';

// 全局日志
logger.info('Game started');

// 创建命名子 logger
const log = logger.for('MovementSystem');
log.debug('Player position updated', { x: 100, y: 200 });
log.warn('Invalid position');
log.error('Movement failed', new Error('Collision detected'));
```

### 核心方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `debug(message, ...args)` | 消息 + 可选数据 | DEBUG 级别 |
| `info(message, ...args)` | 消息 + 可选数据 | INFO 级别 |
| `warn(message, ...args)` | 消息 + 可选数据 | WARN 级别 |
| `error(message, ...args)` | 消息 + 可选数据/Error | ERROR 级别 |
| `for(namespace)` | 命名空间字符串 | 创建带前缀的子 logger |

## 输出格式

### 开发环境

```
[14:32:05.123] [DEBUG] [MovementSystem] Player position updated {"x":100,"y":200}
[14:32:05.456] [INFO] [GameSystem] Level 2 started
[14:32:06.789] [WARN] [RenderSystem] Low FPS detected (45fps)
[14:32:07.012] [ERROR] [AudioSystem] Failed to load sound: explosion.mp3
```

### 生产环境

```
[ERROR] AudioSystem: Failed to load sound: explosion.mp3
```
- 仅输出 ERROR 级别
- 无时间戳
- 无颜色

### 颜色方案

| 级别 | 浏览器颜色 |
|------|------------|
| DEBUG | gray |
| INFO | blue |
| WARN | orange |
| ERROR | red |

## 核心逻辑

```typescript
class Logger {
  private namespace: string;
  private config: LoggerConfig;

  constructor(namespace: string, config?: LoggerConfig) {
    this.namespace = namespace;
    this.config = config || this.getDefaultConfig();
  }

  // 创建子 logger
  for(childNamespace: string): Logger {
    return new Logger(
      `${this.namespace}:${childNamespace}`,
      this.config
    );
  }

  // 日志方法（debug/info/warn/error 类似）
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    // 1. 环境判断 + 级别过滤
    if (!this.shouldLog(level)) return;

    // 2. 格式化输出
    const formatted = this.format(level, message, ...args);

    // 3. 根据环境选择输出方式
    if (import.meta.env.DEV) {
      console[level](formatted, ...args);
    } else {
      // 生产环境：仅 error
      console.error(formatted, ...args);
    }
  }
}
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| Error 对象 | 提取 message 和 stack，格式化输出 |
| 循环引用对象 | 安全的 JSON 序列化 |
| 大对象输出 | 截断或省略 |
| 非字符串 message | 强制转换为字符串 |
| 生产环境 debug 调用 | 静默忽略 |

## 迁移计划

1. 创建 logger 模块
2. 全局替换 `console.log` → `logger.info`
3. 全局替换 `console.warn` → `logger.warn`
4. 全局替换 `console.error` → `logger.error`
5. 为各 Systems 添加命名空间

## 测试策略

| 测试类型 | 覆盖内容 |
|----------|----------|
| 单元测试 | 级别过滤、环境判断、格式化、命名空间 |
| 集成测试 | 与现有系统集成后的行为验证 |
| 快照测试 | 输出格式一致性验证 |
