# Game Settings Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建一个游戏设置模块，支持灵活启用/禁用各个 ECS 系统，并提供设置面板 UI

**Architecture:**
- `GameSettings` 单例类管理设置，使用 `LocalStorageBackend` 持久化
- Engine 的 `recordSys` 函数在执行前检查系统是否启用
- React 组件 `SettingsPanel` 提供开关界面，Q 键触发暂停并显示面板

**Tech Stack:** TypeScript, React, Tailwind CSS, lucide-react, RxJS BehaviorSubject

---

## Task 1: 创建 Settings 模块类型定义

**Files:**
- Create: `src/engine/settings/types.ts`

**Step 1: 创建类型定义文件**

```typescript
// src/engine/settings/types.ts

/**
 * 游戏设置数据结构
 */
export interface GameSettingsData {
    /** 设置版本号，用于未来迁移 */
    version: number;
    /** 系统开关映射，undefined 表示默认启用 */
    systems: Record<string, boolean | undefined>;
    /** 最后更新时间 */
    updatedAt: number;
}

/**
 * 系统开关状态（用于 UI 显示）
 */
export type SystemToggleState = Record<string, boolean>;

/**
 * 已知系统名称列表（从 Engine.framePipeline 提取）
 */
export const KNOWN_SYSTEMS = [
    // P1 决策层
    'InputSystem', 'SpawnSystem', 'BossSystem', 'EnemySystem',
    // P2 状态层
    'BuffSystem', 'WeaponSystem',
    // P3 物理层
    'HomingSystem', 'MovementSystem', 'BounceSystem',
    // P4 交互层
    'BombSystem', 'CollisionSystem',
    // P5 结算层
    'PickupSystem', 'DamageResolutionSystem', 'ChainSystem', 'LootSystem', 'ComboSystem', 'LevelSystem',
    // P7 表现层
    'CameraSystem', 'EffectSystem', 'BlinkSystem', 'AudioSystem',
    // P8 清理层
    'LifetimeSystem', 'CleanupSystem',
    // 快照与渲染
    'buildSnapshot', 'RenderSystem',
] as const;

export type SystemName = typeof KNOWN_SYSTEMS[number];

/**
 * LocalStorage 键名
 */
export const GAME_SETTINGS_KEY = 'game_settings';

/**
 * 当前设置版本
 */
export const GAME_SETTINGS_VERSION = 1;
```

**Step 2: 提交**

```bash
git add src/engine/settings/types.ts
git commit -m "feat(settings): add type definitions for GameSettings module"
```

---

## Task 2: 实现 GameSettings 核心类

**Files:**
- Create: `src/engine/settings/GameSettings.ts`

**Step 1: 创建 GameSettings 类**

```typescript
// src/engine/settings/GameSettings.ts

import { BehaviorSubject } from 'rxjs';
import type { IStorageBackend } from '../storage/base/IStorageBackend';
import { LocalStorageBackend } from '../storage/base/LocalStorageBackend';
import type { GameSettingsData, SystemToggleState } from './types';
import {
    GAME_SETTINGS_KEY,
    GAME_SETTINGS_VERSION,
    KNOWN_SYSTEMS,
} from './types';

/**
 * GameSettings 配置选项
 */
export interface GameSettingsOptions {
    /** 存储后端，默认使用 LocalStorage */
    backend?: IStorageBackend;
    /** 存储键名 */
    storageKey?: string;
    /** 版本不兼容时的回调 */
    onVersionMismatch?: (currentVersion: number, savedVersion: number) => void;
}

/**
 * 游戏设置管理器（单例）
 *
 * 职责：
 * - 管理系统开关状态
 * - 持久化到 LocalStorage
 * - 提供状态变更通知
 */
export class GameSettings {
    private static instance: GameSettings | null = null;
    private backend: IStorageBackend;
    private storageKey: string;
    private version: number;
    private onVersionMismatch?: (currentVersion: number, savedVersion: number) => void;

    /** 当前设置数据 */
    private data: GameSettingsData;

    /** 状态变更通知流 */
    public readonly changes$ = new BehaviorSubject<SystemToggleState>({});

    private constructor(options: GameSettingsOptions = {}) {
        this.backend = options.backend ?? new LocalStorageBackend('neon_raiden_');
        this.storageKey = options.storageKey ?? GAME_SETTINGS_KEY;
        this.version = GAME_SETTINGS_VERSION;
        this.onVersionMismatch = options.onVersionMismatch;

        // 初始化默认数据
        this.data = this.createDefaultData();
    }

    /**
     * 初始化单例
     */
    static async initialize(options: GameSettingsOptions = {}): Promise<GameSettings> {
        if (!GameSettings.instance) {
            const instance = new GameSettings(options);
            await instance.load();
            GameSettings.instance = instance;
        }
        return GameSettings.instance;
    }

    /**
     * 获取单例实例
     */
    static getInstance(): GameSettings {
        if (!GameSettings.instance) {
            throw new Error('GameSettings not initialized. Call initialize() first.');
        }
        return GameSettings.instance;
    }

    /**
     * 重置单例（主要用于测试）
     */
    static resetInstance(): void {
        if (GameSettings.instance) {
            GameSettings.instance.changes$.complete();
            GameSettings.instance = null;
        }
    }

    /**
     * 从存储加载设置
     */
    private async load(): Promise<void> {
        const result = await this.backend.get<GameSettingsData>(this.storageKey);

        if (result.success && result.data) {
            // 版本检测
            if (result.data.version !== this.version) {
                this.onVersionMismatch?.(this.version, result.data.version);
                // 版本不匹配，使用默认值
                this.data = this.createDefaultData();
                await this.save();
            } else {
                // 合并加载的数据与默认值（处理新增系统）
                this.data = this.mergeWithDefaults(result.data);
            }
        } else {
            // 首次加载，保存默认值
            await this.save();
        }

        // 发布初始状态
        this.publishState();
    }

    /**
     * 保存设置到存储
     */
    private async save(): Promise<void> {
        this.data.updatedAt = Date.now();
        await this.backend.set(this.storageKey, this.data);
        this.publishState();
    }

    /**
     * 发布状态变更
     */
    private publishState(): void {
        this.changes$.next(this.getAllSystemStates());
    }

    /**
     * 检查系统是否启用
     * @param name 系统名称
     * @returns true 表示启用，false 表示禁用。未配置时默认返回 true
     */
    isSystemEnabled(name: string): boolean {
        // Map 中不存在的系统默认启用
        const value = this.data.systems[name];
        return value ?? true;
    }

    /**
     * 设置系统启用状态
     * @param name 系统名称
     * @param enabled true 启用，false 禁用
     */
    async setSystemEnabled(name: string, enabled: boolean): Promise<void> {
        // 如果是启用状态且与默认值一致，可以删除该条目以节省空间
        if (enabled) {
            delete this.data.systems[name];
        } else {
            this.data.systems[name] = false;
        }
        await this.save();
    }

    /**
     * 获取所有系统状态（用于 UI 显示）
     */
    getAllSystemStates(): SystemToggleState {
        const states: SystemToggleState = {};
        for (const system of KNOWN_SYSTEMS) {
            states[system] = this.isSystemEnabled(system);
        }
        return states;
    }

    /**
     * 重置所有设置为默认（全部启用）
     */
    async resetToDefaults(): Promise<void> {
        this.data.systems = {};
        await this.save();
    }

    /**
     * 创建默认设置数据
     */
    private createDefaultData(): GameSettingsData {
        return {
            version: this.version,
            systems: {}, // 空表示全部启用
            updatedAt: Date.now(),
        };
    }

    /**
     * 将加载的数据与默认值合并（处理新增系统）
     */
    private mergeWithDefaults(loaded: GameSettingsData): GameSettingsData {
        return {
            version: loaded.version,
            systems: { ...loaded.systems }, // 保留用户自定义配置
            updatedAt: loaded.updatedAt,
        };
    }
}
```

**Step 2: 提交**

```bash
git add src/engine/settings/GameSettings.ts
git commit -m "feat(settings): implement GameSettings class with LocalStorage persistence"
```

---

## Task 3: 创建 Settings 模块导出入口

**Files:**
- Create: `src/engine/settings/index.ts`

**Step 1: 创建导出文件**

```typescript
// src/engine/settings/index.ts

export { GameSettings, type GameSettingsOptions } from './GameSettings';
export { type GameSettingsData, type SystemToggleState, KNOWN_SYSTEMS, type SystemName, GAME_SETTINGS_KEY, GAME_SETTINGS_VERSION } from './types';

/**
 * 初始化 GameSettings 单例的便捷函数
 */
export async function initGameSettings(options?: import('./GameSettings').GameSettingsOptions): Promise<GameSettings> {
    return await GameSettings.initialize(options);
}
```

**Step 2: 提交**

```bash
git add src/engine/settings/index.ts
git commit -m "feat(settings): add module exports"
```

---

## Task 4: 在 Engine 中集成 GameSettings

**Files:**
- Modify: `src/engine/engine.ts:41-62` (添加成员变量)
- Modify: `src/engine/engine.ts:107-132` (初始化)
- Modify: `src/engine/engine.ts:180-184` (修改 recordSys)
- Modify: `src/engine/engine.ts:244-252` (添加 getter)

**Step 1: 添加导入和成员变量**

在文件顶部添加导入：
```typescript
import { GameSettings } from './settings';
```

在 Engine 类中添加私有成员（约第 42 行）：
```typescript
export class Engine {
    private raf = 0;
    private world: World | null = null;
    private canvas: HTMLCanvasElement;
    private resizeObserver?: ResizeObserver;
    public snapshot$ = new BehaviorSubject<GameSnapshot | null>(null);

    /**
     * 游戏设置管理器
     */
    private gameSettings: GameSettings;
```

**Step 2: 修改构造函数初始化 GameSettings**

将构造函数改为 async 初始化模式：
```typescript
constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // 延迟初始化，在 start() 中完成
    this.gameSettings = null as any;
}

/**
 * 初始化设置管理器
 */
private async initSettings(): Promise<void> {
    if (!this.gameSettings) {
        this.gameSettings = await GameSettings.initialize({
            storageKey: 'game_settings',
        });
    }
}
```

**Step 3: 修改 start 方法为 async 并初始化设置**

```typescript
async start(bp: Blueprint) {
    // 初始化设置
    await this.initSettings();

    this.world = createWorld();
    // ... 其余代码保持不变
```

**Step 4: 修改 recordSys 函数检查系统状态**

```typescript
// 辅助函数：记录系统耗时
const recordSys = (name: string, layer: string, fn: () => void) => {
    // 检查系统是否启用，禁用则跳过
    if (!this.gameSettings.isSystemEnabled(name)) {
        return;
    }
    const startMs = performance.now();
    fn();
    this.performanceMonitor.recordSystem(name, layer, performance.now() - startMs);
};
```

**Step 5: 添加 getter 方法暴露 GameSettings**

在类的 getter 区域添加：
```typescript
/**
 * 获取游戏设置实例
 */
get settings(): GameSettings {
    return this.gameSettings;
}
```

**Step 6: 提交**

```bash
git add src/engine/engine.ts
git commit -m "feat(engine): integrate GameSettings with system toggle support"
```

---

## Task 5: ReactEngine 暴露 GameSettings 访问

**Files:**
- Modify: `src/engine/ReactEngine.ts:390-398`

**Step 1: 添加 getGameSettings 方法**

在 ReactEngine 类的 getStorage() 方法后添加：
```typescript
/**
 * 获取游戏设置实例（供 UI 使用）
 */
getGameSettings(): GameSettings {
    return this.engine.settings;
}
```

**Step 2: 添加导入**

在文件顶部添加：
```typescript
import { GameSettings } from './settings';
```

**Step 3: 提交**

```bash
git add src/engine/ReactEngine.ts
git commit -m "feat(reactEngine): expose GameSettings via getGameSettings()"
```

---

## Task 6: 创建 SettingsPanel React 组件

**Files:**
- Create: `components/SettingsPanel.tsx`

**Step 1: 安装 lucide-react（如果未安装）**

```bash
pnpm add lucide-react
```

**Step 2: 创建 SettingsPanel 组件**

```tsx
// components/SettingsPanel.tsx

import React, { useState, useEffect } from 'react';
import { Settings, RotateCcw, X } from 'lucide-react';
import type { GameSettings } from '@/src/engine/settings';

interface SettingsPanelProps {
    gameSettings: GameSettings;
    onClose: () => void;
}

type TabId = 'Systems';

// 系统分组配置
const SYSTEM_GROUPS = [
    { layer: 'P1 决策层', systems: ['InputSystem', 'SpawnSystem', 'BossSystem', 'EnemySystem'] },
    { layer: 'P2 状态层', systems: ['BuffSystem', 'WeaponSystem'] },
    { layer: 'P3 物理层', systems: ['HomingSystem', 'MovementSystem', 'BounceSystem'] },
    { layer: 'P4 交互层', systems: ['BombSystem', 'CollisionSystem'] },
    { layer: 'P5 结算层', systems: ['PickupSystem', 'DamageResolutionSystem', 'ChainSystem', 'LootSystem', 'ComboSystem', 'LevelSystem'] },
    { layer: 'P7 表现层', systems: ['CameraSystem', 'EffectSystem', 'BlinkSystem', 'AudioSystem'] },
    { layer: 'P8 清理层', systems: ['LifetimeSystem', 'CleanupSystem'] },
    { layer: '渲染', systems: ['buildSnapshot', 'RenderSystem'] },
] as const;

/**
 * Switch 开关子组件
 */
const Switch: React.FC<{ checked: boolean; onCheckedChange: () => void; disabled?: boolean }> = ({
    checked,
    onCheckedChange,
    disabled = false,
}) => (
    <button
        onClick={onCheckedChange}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
            checked ? 'bg-[#00ffff]/50' : 'bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        type="button"
    >
        <div
            className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 shadow-md ${
                checked ? 'left-7 bg-[#00ffff]' : 'left-1 bg-gray-400'
            }`}
        />
    </button>
);

/**
 * 设置面板组件
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ gameSettings, onClose }) => {
    const [activeTab] = useState<TabId>('Systems');
    const [systemStates, setSystemStates] = useState<Record<string, boolean>>({});

    // 组件挂载时加载当前状态
    useEffect(() => {
        setSystemStates(gameSettings.getAllSystemStates());
    }, [gameSettings]);

    // 切换系统开关
    const handleToggle = async (systemName: string) => {
        const newState = !systemStates[systemName];
        setSystemStates((prev) => ({ ...prev, [systemName]: newState }));
        await gameSettings.setSystemEnabled(systemName, newState);
    };

    // 重置所有设置
    const handleReset = async () => {
        await gameSettings.resetToDefaults();
        setSystemStates(gameSettings.getAllSystemStates());
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-[90%] max-w-2xl p-1 rounded-lg bg-gradient-to-r from-[#00ffff] via-[#ff00ff] to-[#00ff88]">
                <div className="bg-[#0a0a0a] rounded-lg p-6 border border-[#00ffff]/30 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] to-[#00ff88] flex items-center gap-2">
                            <Settings size={24} className="text-[#00ffff]" />
                            SETTINGS
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            type="button"
                            aria-label="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tab Indicator */}
                    <div className="flex gap-4 mb-6 border-b border-gray-800">
                        <button
                            className={`px-4 py-2 font-mono text-sm transition-colors ${
                                activeTab === 'Systems'
                                    ? 'text-[#00ffff] border-b-2 border-[#00ffff]'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                            type="button"
                        >
                            SYSTEMS
                        </button>
                    </div>

                    {/* Systems Tab Content */}
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {SYSTEM_GROUPS.map((group) => (
                            <div key={group.layer}>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    {group.layer}
                                </div>
                                <div className="space-y-2">
                                    {group.systems.map((system) => (
                                        <div
                                            key={system}
                                            className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-800"
                                        >
                                            <span className="text-sm text-gray-300 font-mono">{system}</span>
                                            <Switch
                                                checked={systemStates[system] ?? true}
                                                onCheckedChange={() => handleToggle(system)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-800 border border-gray-600 text-gray-400 rounded hover:border-gray-400 hover:text-gray-200 transition-all font-mono text-sm flex items-center gap-2"
                            type="button"
                        >
                            <RotateCcw size={16} />
                            Reset All
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-[#00ffff]/10 border border-[#00ffff]/50 text-[#00ffff] rounded hover:bg-[#00ffff]/20 transition-all font-mono text-sm"
                            type="button"
                        >
                            Close (Q)
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1a1a1a;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #00ffff;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #00cccc;
                }
            `}</style>
        </div>
    );
};
```

**Step 3: 提交**

```bash
git add components/SettingsPanel.tsx
git commit -m "feat(ui): add SettingsPanel component with system toggles"
```

---

## Task 7: App.tsx 添加 Q 键监听和状态管理

**Files:**
- Modify: `App.tsx:2-3` (添加导入)
- Modify: `App.tsx:34` (添加状态)
- Modify: `App.tsx:156-220` (添加 Q 键监听 useEffect)
- Modify: `App.tsx:176-216` (传递 props 给 GameUI)

**Step 1: 添加导入**

```typescript
import { GameSettings } from './src/engine/settings';
import { SettingsPanel } from './components/SettingsPanel';
```

**Step 2: 添加状态变量**

在其他 state 声明后添加：
```typescript
const [showSettings, setShowSettings] = useState(false);
const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
```

**Step 3: 添加 Q 键监听**

在 P 键监听的 useEffect 后添加：
```typescript
// Q 键切换设置面板
useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
        if ((e.key === 'q' || e.key === 'Q') && gameState === GameState.PLAYING) {
            setShowSettings((prev) => {
                const newState = !prev;
                if (newState) {
                    engineRef.current?.pause();
                } else {
                    engineRef.current?.resume();
                }
                return newState;
            });
        }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
}, [gameState]);
```

**Step 4: 获取 GameSettings 实例**

在 engine 初始化后添加：
```typescript
// 获取 GameSettings 实例
useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
        setGameSettings(engine.getGameSettings());
    }
}, [engineRef.current]);
```

**Step 5: 更新 GameUI props**

添加以下 props：
```tsx
<GameUI
    // ... existing props
    showSettings={showSettings}
    onSettingsClose={() => setShowSettings(false)}
    gameSettings={gameSettings}
/>
```

**Step 6: 提交**

```bash
git add App.tsx
git commit -m "feat(app): add Q key handler for settings panel"
```

---

## Task 8: GameUI 集成 SettingsPanel

**Files:**
- Modify: `components/GameUI.tsx:40-41` (添加 props 类型)
- Modify: `components/GameUI.tsx:69-70` (添加 props 解构)
- Modify: `components/GameUI.tsx:1` (添加导入)
- Modify: `components/GameUI.tsx:550` (添加渲染)

**Step 1: 添加导入**

```tsx
import type { GameSettings } from '@/src/engine/settings';
import { SettingsPanel } from './SettingsPanel';
```

**Step 2: 添加 props 类型**

在 GameUIProps 接口中添加：
```typescript
showSettings?: boolean;
onSettingsClose?: () => void;
gameSettings?: GameSettings | null;
```

**Step 3: 添加 props 解构**

在解构声明中添加：
```typescript
showSettings = false,
onSettingsClose,
gameSettings,
```

**Step 4: 添加渲染条件**

在文件末尾、return 闭合前添加：
```tsx
{/* Settings Panel */}
{showSettings && gameSettings && (
    <SettingsPanel gameSettings={gameSettings} onClose={onSettingsClose!} />
)}
```

**Step 5: 提交**

```bash
git add components/GameUI.tsx
git commit -m "feat(gameui): integrate SettingsPanel"
```

---

## Task 9: 测试与验证

**Files:**
- Test: Manual testing

**Step 1: 运行构建**

```bash
pnpm build
```

Expected: Build succeeds without errors

**Step 2: 启动开发服务器**

```bash
pnpm dev
```

**Step 3: 功能验证清单**

1. **按 Q 键打开面板**
   - 启动游戏
   - 按 Q 键
   - Expected: 游戏暂停，设置面板出现

2. **切换系统开关**
   - 在面板中切换任意系统开关
   - 关闭面板恢复游戏
   - Expected: 被禁用的系统不再生效（如关闭 AudioSystem 后无声音）

3. **持久化验证**
   - 修改设置后刷新页面
   - 打开设置面板
   - Expected: 设置保持之前的状态

4. **Reset All 按钮**
   - 点击 Reset All
   - Expected: 所有开关恢复为启用状态

5. **边界情况**
   - 尝试关闭 RenderSystem（游戏画面应停止更新）
   - 尝试关闭 InputSystem（玩家应无法控制）

**Step 4: 性能检查**

- 打开浏览器 DevTools Performance
- 确认 `isSystemEnabled` 调用没有明显性能开销

**Step 5: 提交测试修复（如有）**

```bash
git commit -a -m "fix: address issues found during testing"
```

---

## Task 10: 更新文档

**Files:**
- Modify: `src/engine/README.md`

**Step 1: 添加 Settings 模块说明**

在 README.md 中添加：
```markdown
## Settings Module

The `settings` module provides game-wide configuration management with LocalStorage persistence.

### Usage

```typescript
import { GameSettings } from './settings';

// Initialize (typically done in Engine)
const settings = await GameSettings.initialize();

// Check if a system is enabled
if (settings.isSystemEnabled('AudioSystem')) {
    // Run audio logic
}

// Toggle a system
await settings.setSystemEnabled('AudioSystem', false);

// Reset to defaults
await settings.resetToDefaults();
```

### System Toggling

Systems can be toggled at runtime via the Settings Panel (Q key during gameplay).
Disabled systems are skipped in the `framePipeline` without performance overhead.
```

**Step 2: 提交**

```bash
git add src/engine/README.md
git commit -m "docs: add Settings module documentation"
```

---

## Final Review

**Verify all tests pass:**
```bash
pnpm test
pnpm lint
pnpm build
```

**Summary of changes:**
- Created `src/engine/settings/` module with GameSettings class
- Integrated system toggle check in Engine.recordSys
- Added SettingsPanel React component with neon-styled UI
- Wired up Q key handler in App.tsx
- Updated documentation

**Total estimated time:** 60-90 minutes
