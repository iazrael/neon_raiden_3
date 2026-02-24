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
    'PickupSystem', 'DamageResolutionSystem', 'ChainLightningSystem', 'LootSystem', 'ComboSystem', 'LevelSystem',
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
