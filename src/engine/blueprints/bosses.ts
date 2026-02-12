//
// Boss单位蓝图文件
// 包含游戏中所有Boss类型的蓝图定义
//

import { DROPTABLE_BOSS } from '../configs/droptables/common';
import { BOSS_DATA } from '../configs/bossData';
import { BossId, CollisionLayer } from '../types';
import { Blueprint } from './base';
import { SpriteKey } from '../configs/sprites';
import { ENEMY_WEAPON_TABLE } from './weapons';

// Boss SpriteKey 映射
const BOSS_SPRITE_MAP: Record<BossId, SpriteKey> = {
    [BossId.GUARDIAN]: SpriteKey.BOSS_GUARDIAN,
    [BossId.INTERCEPTOR]: SpriteKey.BOSS_INTERCEPTOR,
    [BossId.DESTROYER]: SpriteKey.BOSS_DESTROYER,
    [BossId.ANNIHILATOR]: SpriteKey.BOSS_ANNIHILATOR,
    [BossId.DOMINATOR]: SpriteKey.BOSS_DOMINATOR,
    [BossId.OVERLORD]: SpriteKey.BOSS_OVERLORD,
    [BossId.TITAN]: SpriteKey.BOSS_TITAN,
    [BossId.COLOSSUS]: SpriteKey.BOSS_COLOSSUS,
    [BossId.LEVIATHAN]: SpriteKey.BOSS_LEVIATHAN,
    [BossId.APOCALYPSE]: SpriteKey.BOSS_APOCALYPSE,
};

/**
 * Boss HitBox 配置
 * 根据每个 Boss 的视觉外形设计合适的碰撞盒
 */
interface BossHitBoxConfig {
    /** 碰撞形状 */
    shape: 'circle' | 'rect';
    /** 圆形半径 */
    radius?: number;
    /** 矩形半宽 */
    halfWidth?: number;
    /** 矩形半高 */
    halfHeight?: number;
}

/**
 * Boss HitBox 配置
 * 根据每个 Boss 的视觉外形设计合适的碰撞盒
 * 尺寸按精灵尺寸的 60% 计算（圆形直径或矩形边长）
 */
const BOSS_HITBOX_CONFIG: Record<BossId, BossHitBoxConfig> = {
    [BossId.GUARDIAN]: { shape: 'circle', radius: 65 },
    [BossId.INTERCEPTOR]: { shape: 'rect', halfWidth: 70, halfHeight: 55 },
    [BossId.DESTROYER]: { shape: 'rect', halfWidth: 40, halfHeight: 80 },
    [BossId.DOMINATOR]: { shape: 'circle', radius: 50 },
    [BossId.OVERLORD]: { shape: 'rect', halfWidth: 60, halfHeight: 90 },
    [BossId.TITAN]: { shape: 'rect', halfWidth: 50, halfHeight: 60 },
    [BossId.COLOSSUS]: { shape: 'circle', radius: 70 },
    [BossId.LEVIATHAN]: { shape: 'circle', radius: 80 },
    [BossId.ANNIHILATOR]: { shape: 'rect', halfWidth: 60, halfHeight: 55 },
    [BossId.APOCALYPSE]: { shape: 'rect', halfWidth: 80, halfHeight: 60 },
};

/**
 * 辅助函数：快速生成 Boss 蓝图
 *
 * 从BOSS_DATA读取第一阶段武器并初始化到Weapon组件中
 * BossAI.phase初始化为0（0-based索引）
 */
function createBossBlueprint(
    bossId: BossId,
    hp: number,
    score: number
): Blueprint {
    // 读取Boss配置，获取第一阶段武器
    const bossSpec = BOSS_DATA[bossId];
    const phase1WeaponId = bossSpec?.phases[0]?.weaponId;
    const weaponSpec = phase1WeaponId ? ENEMY_WEAPON_TABLE[phase1WeaponId] : undefined;

    // 获取 HitBox 配置
    const hitboxConfig = BOSS_HITBOX_CONFIG[bossId];

    // 构建 HitBox：根据 shape 类型只赋值对应属性
    const hitBox = hitboxConfig.shape === 'circle'
        ? { shape: hitboxConfig.shape as 'circle', layer: CollisionLayer.Enemy, radius: hitboxConfig.radius }
        : { shape: hitboxConfig.shape as 'rect', layer: CollisionLayer.Enemy, halfWidth: hitboxConfig.halfWidth, halfHeight: hitboxConfig.halfHeight };

    return {
        Transform: { x: 400, y: -200, rot: 0 },
        Health: { hp, max: hp },
        Sprite: { spriteKey: BOSS_SPRITE_MAP[bossId], scale: 1 },
        BossTag: { id: bossId },
        BossAI: { phase: 0, nextPatternTime: 0 }, // 确保0-based索引
        HitBox: hitBox,
        SpeedStat: { maxLinear: 120, maxAngular: 5 },
        ScoreValue: { value: score },
        DropTable: { table: DROPTABLE_BOSS },
        BossEntrance: {
            targetY: 150,      // 可视区域顶部
            entranceSpeed: 150 // 快速向下移动（150像素/秒）
        },
        Weapon: weaponSpec ? { ...weaponSpec } : undefined, // 解构创建新对象，避免共享引用
        Velocity: { vx: 0, vy: 0 } // 初始化速度为0（由BossSystem控制）
    };
}

export const BLUEPRINT_BOSS_GUARDIAN = createBossBlueprint(BossId.GUARDIAN, 2000, 5000);
export const BLUEPRINT_BOSS_INTERCEPTOR = createBossBlueprint(BossId.INTERCEPTOR, 3200, 10000);
export const BLUEPRINT_BOSS_DESTROYER = createBossBlueprint(BossId.DESTROYER, 5800, 15000);
export const BLUEPRINT_BOSS_ANNIHILATOR = createBossBlueprint(BossId.ANNIHILATOR, 7000, 20000);
export const BLUEPRINT_BOSS_DOMINATOR = createBossBlueprint(BossId.DOMINATOR, 8200, 25000);
export const BLUEPRINT_BOSS_OVERLORD = createBossBlueprint(BossId.OVERLORD, 10600, 30000);
export const BLUEPRINT_BOSS_TITAN = createBossBlueprint(BossId.TITAN, 16000, 35000);
export const BLUEPRINT_BOSS_COLOSSUS = createBossBlueprint(BossId.COLOSSUS, 17200, 40000);
export const BLUEPRINT_BOSS_LEVIATHAN = createBossBlueprint(BossId.LEVIATHAN, 18400, 45000);
export const BLUEPRINT_BOSS_APOCALYPSE = createBossBlueprint(BossId.APOCALYPSE, 20000, 50000);

// 导出Boss蓝图表
export const BOSSES_TABLE: Record<BossId, Blueprint> = {
    [BossId.GUARDIAN]: BLUEPRINT_BOSS_GUARDIAN,
    [BossId.INTERCEPTOR]: BLUEPRINT_BOSS_INTERCEPTOR,
    [BossId.DESTROYER]: BLUEPRINT_BOSS_DESTROYER,
    [BossId.ANNIHILATOR]: BLUEPRINT_BOSS_ANNIHILATOR,
    [BossId.DOMINATOR]: BLUEPRINT_BOSS_DOMINATOR,
    [BossId.OVERLORD]: BLUEPRINT_BOSS_OVERLORD,
    [BossId.TITAN]: BLUEPRINT_BOSS_TITAN,
    [BossId.COLOSSUS]: BLUEPRINT_BOSS_COLOSSUS,
    [BossId.LEVIATHAN]: BLUEPRINT_BOSS_LEVIATHAN,
    [BossId.APOCALYPSE]: BLUEPRINT_BOSS_APOCALYPSE,
};
