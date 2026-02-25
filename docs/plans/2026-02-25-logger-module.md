# Logger 模块实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建统一的日志模块，替代项目中分散的 console 调用，支持分级日志、环境感知和命名空间。

**Architecture:** 单例 Logger 类 + 命名空间子 logger。通过 import.meta.env.DEV 判断环境，开发环境输出格式化日志（时间戳+颜色），生产环境仅输出 ERROR 级别。

**Tech Stack:** TypeScript, Vite (环境变量), Jest (测试)

---

## Task 1: 创建类型定义 (types.ts)

**Files:**
- Create: `src/engine/logger/types.ts`

**Step 1: 创建类型定义文件**

```typescript
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
```

**Step 2: 运行类型检查**

Run: `pnpm lint`
Expected: PASS (无类型错误)

**Step 3: 提交**

```bash
git add src/engine/logger/types.ts
git commit -m "feat(logger): 添加类型定义

- LogLevel 枚举 (DEBUG/INFO/WARN/ERROR)
- LoggerConfig 接口
- LogColor 接口"
```

---

## Task 2: 创建格式化工具 (formatter.ts)

**Files:**
- Create: `src/engine/logger/formatter.ts`
- Create: `tests/logger/formatter.test.ts`

**Step 1: 编写格式化工具测试**

```typescript
/**
 * formatter 单元测试
 */
import { formatTimestamp, formatNamespace, getColorForLevel } from '../../src/engine/logger/formatter';
import { LogLevel } from '../../src/engine/logger/types';

describe('formatter', () => {
  describe('formatTimestamp', () => {
    it('应格式化时间戳为 HH:MM:SS.mmm', () => {
      const date = new Date('2026-02-25T14:32:05.123Z');
      const result = formatTimestamp(date);
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
  });

  describe('formatNamespace', () => {
    it('应格式化命名空间为 [Namespace]', () => {
      expect(formatNamespace('MovementSystem')).toBe('[MovementSystem]');
    });

    it('应处理嵌套命名空间', () => {
      expect(formatNamespace('Global:MovementSystem')).toBe('[Global:MovementSystem]');
    });
  });

  describe('getColorForLevel', () => {
    it('应为每个级别返回正确的颜色', () => {
      expect(getColorForLevel(LogLevel.DEBUG).style).toBe('color: gray');
      expect(getColorForLevel(LogLevel.INFO).style).toBe('color: blue');
      expect(getColorForLevel(LogLevel.WARN).style).toBe('color: orange');
      expect(getColorForLevel(LogLevel.ERROR).style).toBe('color: red');
    });
  });
});
```

**Step 2: 运行测试验证失败**

Run: `pnpm test tests/logger/formatter.test.ts`
Expected: FAIL with "Cannot find module '../../src/engine/logger/formatter'"

**Step 3: 实现格式化工具**

```typescript
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
```

**Step 4: 运行测试验证通过**

Run: `pnpm test tests/logger/formatter.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add src/engine/logger/formatter.ts tests/logger/formatter.test.ts
git commit -m "feat(logger): 添加格式化工具

- formatTimestamp: 格式化时间戳为 HH:MM:SS.mmm
- formatNamespace: 格式化命名空间
- getColorForLevel: 获取日志级别颜色
- formatLevel: 格式化日志级别字符串"
```

---

## Task 3: 创建 Logger 类核心实现

**Files:**
- Create: `src/engine/logger/Logger.ts`
- Modify: `src/engine/logger/types.ts` (添加 shouldLog 方法类型)

**Step 1: 创建 Logger 类骨架和测试**

```typescript
/**
 * Logger 单元测试
 */
import { Logger } from '../../src/engine/logger/Logger';
import { LogLevel } from '../../src/engine/logger/types';

// Mock import.meta.env.DEV
const originalDev = import.meta.env.DEV;

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock DEV 环境变量
    (import.meta as any).env = { DEV: true };
    logger = new Logger('TestNamespace', { level: LogLevel.DEBUG, namespace: 'TestNamespace' });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    (import.meta as any).env = { DEV: originalDev };
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
      (import.meta as any).env = { DEV: false };
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
```

**Step 2: 运行测试验证失败**

Run: `pnpm test tests/logger/Logger.test.ts`
Expected: FAIL with "Cannot find module '../../src/engine/logger/Logger'"

**Step 3: 实现 Logger 类**

```typescript
/**
 * Logger 类核心实现
 *
 * 提供统一的日志输出接口，支持：
 * - 日志级别过滤 (DEBUG/INFO/WARN/ERROR)
 * - 命名空间（通过 for() 方法创建子 logger）
 * - 环境感知（开发/生产环境不同输出策略）
 */
import { LogLevel, LoggerConfig } from './types';
import { formatTimestamp, formatNamespace, getColorForLevel, formatLevel } from './formatter';

/**
 * Logger 默认配置
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  namespace: 'Global',
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
    const isDev = import.meta.env.DEV;
    if (!isDev && level !== LogLevel.ERROR) {
      return;
    }

    // 3. 格式化输出
    const formatted = this.format(level, message);

    // 4. 选择输出方式
    if (isDev) {
      // 开发环境：带颜色和格式
      const color = getColorForLevel(level);
      const consoleMethod = level === LogLevel.ERROR ? 'error' :
                           level === LogLevel.WARN ? 'warn' :
                           level === LogLevel.INFO ? 'info' : 'log';
      (console as any)[consoleMethod](`%c${formatted}`, color.style, ...args);
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
```

**Step 4: 运行测试验证通过**

Run: `pnpm test tests/logger/Logger.test.ts`
Expected: PASS

**Step 5: 运行类型检查**

Run: `pnpm lint`
Expected: PASS

**Step 6: 提交**

```bash
git add src/engine/logger/Logger.ts tests/logger/Logger.test.ts
git commit -m "feat(logger): 实现 Logger 类核心功能

- 构造函数：支持自定义配置，默认 INFO 级别
- for 方法：创建带命名空间的子 logger
- debug/info/warn/error 方法：各级别日志输出
- 私有 log 方法：核心逻辑（级别过滤、环境判断、格式化）
- shouldLog 方法：级别过滤判断
- format 方法：日志格式化"
```

---

## Task 4: 创建默认实例导出 (index.ts)

**Files:**
- Create: `src/engine/logger/index.ts`
- Create: `tests/logger/index.test.ts`

**Step 1: 编写默认实例测试**

```typescript
/**
 * logger 模块入口测试
 */
import { logger } from '../../src/engine/logger';
import { LogLevel } from '../../src/engine/logger/types';

describe('logger 默认实例', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    (import.meta as any).env = { DEV: true };
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
```

**Step 2: 运行测试验证失败**

Run: `pnpm test tests/logger/index.test.ts`
Expected: FAIL with "Cannot find module '../../src/engine/logger'"

**Step 3: 实现默认实例导出**

```typescript
/**
 * Logger 模块入口
 *
 * 导出默认 logger 实供全局使用
 */
import { Logger } from './Logger';
import { LogLevel } from './types';

/**
 * 全局默认 logger 实例
 * 开发环境：DEBUG 级别
 * 生产环境：ERROR 级别
 */
const defaultLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR;
export const logger = new Logger('Global', {
  level: defaultLevel,
  namespace: 'Global',
});

// 导出类型和类供扩展使用
export { Logger, LogLevel };
export type { LoggerConfig, LogColor } from './types';
```

**Step 4: 运行测试验证通过**

Run: `pnpm test tests/logger/index.test.ts`
Expected: PASS

**Step 5: 运行类型检查**

Run: `pnpm lint`
Expected: PASS

**Step 6: 提交**

```bash
git add src/engine/logger/index.ts tests/logger/index.test.ts
git commit -m "feat(logger): 导出默认 logger 实例

- 根据 import.meta.env.DEV 自动设置日志级别
- 开发环境: DEBUG 级别
- 生产环境: ERROR 级别
- 导出 Logger 类和类型供扩展使用"
```

---

## Task 5: 添加 engine/index.ts 导出

**Files:**
- Modify: `src/engine/index.ts`

**Step 1: 添加 logger 导出**

在 `src/engine/index.ts` 中添加：

```typescript
export * from './logger';
```

**Step 2: 运行类型检查**

Run: `pnpm lint`
Expected: PASS

**Step 3: 提交**

```bash
git add src/engine/index.ts
git commit -m "feat(logger): 在 engine/index.ts 中导出 logger 模块"
```

---

## Task 6: 全局替换 console 调用

**Files:**
- Modify: 22 个包含 console 调用的文件

**Step 1: 查找所有 console 调用**

Run: `grep -r "console\.\(log\|warn\|error\|debug\|info\)" src/engine --include="*.ts" -l`

Expected: 输出以下文件列表
```
src/engine/systems/DamageResolutionSystem.ts
src/engine/systems/ChainLightningSystem.ts
src/engine/systems/WeaponSystem.ts
src/engine/systems/EffectSystem.ts
src/engine/systems/RenderSystem.ts
src/engine/systems/LevelSystem.ts
src/engine/systems/ExplosionSystem.ts
src/engine/systems/AudioSystem.ts
src/engine/audio/AudioEngine.ts
src/engine/SpriteManager.ts
src/engine/systems/PickupSystem.ts
src/engine/ReactEngine.ts
src/engine/factory.ts
src/views/components/ReloadPrompt.tsx
src/engine/utils/timeUtils.ts
src/engine/utils/performance.ts
src/engine/systems/boss/BossPhaseSystem.ts
src/engine/systems/boss/BossCombatSystem.ts
src/engine/systems/boss/BossMovementSystem.ts
src/engine/systems/SpawnSystem.ts
src/engine/systems/LootSystem.ts
src/engine/configs/bossData.ts
```

**Step 2: 在每个文件头部添加 logger 导入**

在每个文件顶部添加（如果尚未导入）：

```typescript
import { logger } from '../logger';  // 根据实际路径调整
```

**Step 3: 替换 console 调用**

| 原调用 | 新调用 |
|--------|--------|
| `console.log(` | `logger.info(` |
| `console.info(` | `logger.info(` |
| `console.warn(` | `logger.warn(` |
| `console.error(` | `logger.error(` |
| `console.debug(` | `logger.debug(` |

**Step 4: 为主要 Systems 添加命名空间**

为关键的 ECS Systems 添加带命名空间的子 logger：

```typescript
// 例如在 MovementSystem.ts 中
const log = logger.for('MovementSystem');
log.info('Player moved');
```

**Step 5: 逐文件测试**

每个文件修改后运行：
Run: `pnpm lint`
Expected: PASS

**Step 6: 提交每个文件的修改**

```bash
# 示例
git add src/engine/systems/MovementSystem.ts
git commit -m "refactor(logger): MovementSystem 使用 logger 替代 console"
```

对所有 22 个文件重复此步骤。

---

## Task 7: 运行完整测试套件

**Files:**
- No file changes

**Step 1: 运行类型检查**

Run: `pnpm lint`
Expected: PASS

**Step 2: 运行所有测试**

Run: `pnpm test`
Expected: PASS

**Step 3: 验证构建**

Run: `pnpm build`
Expected: PASS

**Step 4: 最终提交**

```bash
git add .
git commit -m "chore(logger): 完成所有 console 调用迁移

- 所有 22 个文件已迁移到 logger
- 主要 Systems 使用命名空间子 logger
- 类型检查通过
- 所有测试通过
- 构建成功"
```

---

## 验收标准

- [ ] 所有类型检查通过 (`pnpm lint`)
- [ ] 所有单元测试通过 (`pnpm test`)
- [ ] 构建成功 (`pnpm build`)
- [ ] 开发环境输出格式化日志（时间戳+颜色）
- [ ] 生产环境仅输出 ERROR 级别
- [ ] 所有原始 console 调用已替换
- [ ] 主要 ECS Systems 使用命名空间 logger

---

## 相关文档

- 设计文档: `docs/plans/2026-02-25-logger-module-design.md`
- 项目规范: `CLAUDE.md` (ECS 架构)
