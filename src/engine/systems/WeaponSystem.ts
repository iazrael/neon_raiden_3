/**
 * 武器系统 (WeaponSystem)
 *
 * 职责：
 * - 处理 FireIntent 组件，发射子弹
 * - 玩家的 FireIntent 由 InputSystem 根据武器冷却自动生成
 * - 敌人的 FireIntent 由 AI 系统生成
 * - 根据武器配置生成子弹实体
 * - 处理武器冷却重置
 * - 支持不同的弹幕模式（SPREAD、AIMED、RADIAL、SPIRAL等）
 *
 * 系统类型：状态层
 * 执行顺序：P2 - 在决策层之后，物理层之前
 */

import { World } from '../world';
import { Transform, Weapon, FireIntent, PlayerTag } from '../components';
import { Homing, Chain } from '../components';
import { spawnBullet } from '../factory';
import { CollisionLayer } from '../types/collision';
import { AMMO_TABLE } from '../blueprints/ammo';
import { ALL_WEAPONS_TABLE } from '../blueprints/weapons';
import { Blueprint, WeaponSpec, AmmoSpec, WeaponLevelSpec } from '../blueprints';
import { pushEvent, removeComponent, view, getEntity } from '../world';
import { WeaponFiredEvent } from '../events';
import { BULLET_SPRITE_CONFIG } from '../configs/sprites/bullets';
import { getWeaponUpgrade } from '../configs/weaponGrowth';
import { BulletSpriteSpec } from '../configs/sprites/bullets';
import { getEffectiveTimeScale } from '../utils/timeUtils';
import { WeaponPattern } from '../types';

/**
 * 武器系统主函数
 */
export function WeaponSystem(world: World, dt: number): void {

    for (const [id, [transform, weapon], comps] of view(world, [Transform, Weapon])) {
        // 第一步：更新所有武器的冷却时间
        if (weapon.curCD > 0) {
            // 获取有效时间缩放（玩家武器不受影响）
            const timeScale = getEffectiveTimeScale(world, id);
            weapon.curCD -= dt * timeScale;
        }
        // 检查冷却是否完成
        if (weapon.curCD > 0) {
            continue;
        }
        // 第二步：获取有开火意图且冷却完成的武器
        const intent = comps.find(FireIntent.check);
        if (!intent || !intent.firing) {
            continue; // 没有开火意图，跳过
        }
        // 消费掉开火意图（传入实例而非类）
        removeComponent(world, id, intent);

        // 第三步：发射武器
        const isPlayer = !!comps.find(PlayerTag.check);
        // console.log(`Entity ${id} firing weapon ${weapon.id}`);
        fireWeapon(world, {
            id,
            transform,
            weapon,
            intent,
            isPlayer
        });
    }
}

/**
 * 发射武器
 */
function fireWeapon(
    world: World,
    entity: {
        id: number;
        transform: Transform;
        weapon: Weapon;
        intent: FireIntent;
        isPlayer: boolean;
    }
): void {
    const { id, transform, weapon, intent } = entity;

    // 获取配置
    const ammoSpec = AMMO_TABLE[weapon.ammoType];
    if (!ammoSpec) return;

    const weaponSpec = ALL_WEAPONS_TABLE[weapon.id];
    if (!weaponSpec) return;

    const spriteSpec = BULLET_SPRITE_CONFIG[weapon.ammoType];
    if (!spriteSpec) return;

    // 获取升级配置（玩家使用升级表，敌人使用 weapon 自身的倍率）
    const upgradeConfig: WeaponLevelSpec = entity.isPlayer
        ? getWeaponUpgrade(weapon.id as any, weapon.level || 1)
        : {
            level: 1,
            damageMultiplier: weapon.damageMultiplier || 1.0,
            fireRateMultiplier: weapon.fireRateMultiplier || 1.0,
        };

    // === 合并组件级别的倍率（仅玩家） ===
    // 玩家可通过 Weapon 组件的 damageMultiplier/fireRateMultiplier 进一步调整升级表配置
    let finalDamageMultiplier = upgradeConfig.damageMultiplier;
    let finalFireRateMultiplier = upgradeConfig.fireRateMultiplier;

    if (entity.isPlayer) {
        const componentDamageMultiplier = weapon.damageMultiplier ?? 1.0;
        const componentFireRateMultiplier = weapon.fireRateMultiplier ?? 1.0;
        finalDamageMultiplier *= componentDamageMultiplier;
        finalFireRateMultiplier *= componentFireRateMultiplier;
    }

    // 创建合并后的升级配置用于后续逻辑
    const mergedUpgradeConfig: WeaponLevelSpec = {
        ...upgradeConfig,
        damageMultiplier: finalDamageMultiplier,
        fireRateMultiplier: finalFireRateMultiplier,
    };

    // === 应用扩展属性 ===
    // 优先使用升级配置，否则使用武器基础配置
    const bulletCount = upgradeConfig.bulletCount ?? weaponSpec.bulletCount ?? 1;
    const spread = upgradeConfig.spread ?? weaponSpec.spread ?? 0;
    const sizeMultiplier = upgradeConfig.sizeMultiplier ?? 1.0;

    // 计算发射角度
    let fireAngle = intent.angle ?? -Math.PI / 2; // 默认向上

    // AIMED 模式：通过 targetId 查找目标位置
    if (weaponSpec.pattern === WeaponPattern.AIMED && intent.targetId) {
        const targetComps = getEntity(world, intent.targetId);
        if (targetComps) {
            const targetTransform = targetComps.find(c => c instanceof Transform) as Transform | undefined;
            if (targetTransform) {
                const dx = targetTransform.x - transform.x;
                const dy = targetTransform.y - transform.y;
                fireAngle = Math.atan2(dy, dx);
            }
        }
    }

    const fireContext: FireContext = {
        world,
        transform,
        weapon,
        weaponSpec,
        ammoSpec,
        spriteSpec,
        upgradeConfig: mergedUpgradeConfig,
        sizeMultiplier,
        ownerId: id,
        isPlayer: entity.isPlayer,
        // FIXME: 这里更合理的是从 hitbox 或者 sprite 读, 往实体的正前方推算机头发射位置, 但是也可能跟具体战机有关系
        fireOffset: entity.isPlayer ? { x: 0, y: -24 } : { x: 0, y: 0 }
    };

    // 根据弹幕模式生成子弹
    if (weaponSpec.pattern === WeaponPattern.RADIAL) {
        // 径向发射 - 360度均匀分布
        fireRadial(fireContext, bulletCount);
    } else if (weaponSpec.pattern === WeaponPattern.FIXED_REAR) {
        // 反向发射：朝实体朝向的相反方向
        fireSpread(fireContext, bulletCount, spread, fireAngle + Math.PI);
    } else if (weaponSpec.pattern === WeaponPattern.SPIRAL) {
        // 螺旋发射
        fireSpiral(fireContext, bulletCount, spread, fireAngle);
    } else if (weaponSpec.pattern === WeaponPattern.RANDOM) {
        // 随机发射
        fireRandom(fireContext, bulletCount, spread, fireAngle);
    } else {
        // STRAIGHT, SPREAD, AIMED (计算后) 都使用这个函数
        fireSpread(fireContext, bulletCount, spread, fireAngle);
    }

    // 重置冷却：实际冷却 = 武器冷却 / 射速倍率
    weapon.curCD = weapon.cooldown / finalFireRateMultiplier;

    // 生成武器发射事件
    const firedEvent: WeaponFiredEvent = {
        type: 'WeaponFired',
        pos: { x: transform.x, y: transform.y },
        weaponId: weapon.id,
        owner: id
    };
    pushEvent(world, firedEvent);
}

interface FireContext {
    world: World;
    transform: Transform;
    weapon: Weapon;
    weaponSpec: WeaponSpec;
    ammoSpec: AmmoSpec;
    spriteSpec: BulletSpriteSpec;
    upgradeConfig: WeaponLevelSpec;
    sizeMultiplier: number;
    fireOffset: { x: number, y: number };
    ownerId: number;
    isPlayer: boolean;
}

/**
 * 扇形发射
 */
function fireSpread(ctx: FireContext, count: number, spread: number, baseAngle: number): void {
    for (let i = 0; i < count; i++) {
        const angleOffset = spread !== 0
            ? (spread * (i / (count - 1) - 0.5)) * (Math.PI / 180)
            : 0;
        const angle = baseAngle + angleOffset;
        createBullet(ctx, angle);
    }
}

/**
 * 径向发射（360度均匀分布，不使用 baseAngle）
 */
function fireRadial(ctx: FireContext, count: number): void {
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        createBullet(ctx, angle);
    }
}

/**
 * 螺旋发射
 */
function fireSpiral(ctx: FireContext, count: number, spread: number, baseAngle: number): void {
    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (spread * i * Math.PI / 180);
        createBullet(ctx, angle);
    }
}

/**
 * 随机发射
 */
function fireRandom(ctx: FireContext, count: number, spread: number, baseAngle: number): void {
    for (let i = 0; i < count; i++) {
        const randomOffset = (Math.random() - 0.5) * 2 * spread * Math.PI / 180;
        const angle = baseAngle + randomOffset;
        createBullet(ctx, angle);
    }
}

/**
 * 创建子弹实体
 *
 * 子弹属性计算公式：
 * - 最终伤害 = 弹药基础伤害 × 升级伤害倍率
 * - 最终穿透 = 弹药基础穿透 + 武器穿透加成
 * - 最终反弹 = 弹药基础反弹 + 武器反弹加成
 */
function createBullet(ctx: FireContext, angle: number): void {
    const { world, transform, weapon, fireOffset, weaponSpec,
        ammoSpec, spriteSpec, upgradeConfig, sizeMultiplier, ownerId } = ctx;

    // 计算最终属性
    const finalDamage = ammoSpec.damage * upgradeConfig.damageMultiplier;
    const finalPierce = ammoSpec.pierce + (weaponSpec.pierceBonus ?? 0);
    const finalBounces = ammoSpec.bounces + (weaponSpec.bouncesBonus ?? 0);

    // 计算发射偏移（相对于实体中心）
    const spawnX = transform.x + fireOffset.x;
    const spawnY = transform.y + fireOffset.y;

    // 计算速度向量 - speed 是像素/秒
    const vx = Math.cos(angle) * ammoSpec.speed;
    const vy = Math.sin(angle) * ammoSpec.speed;

    // 创建子弹蓝图
    // 精灵图旋转角度计算：精灵图默认朝上，需要根据飞行方向调整旋转
    // 公式：rotate = (angle + Math.PI/2) * 180 / Math.PI
    // 验证：
    //   - 向上发射 (angle = -π/2): rotate = (-π/2 + π/2) * 180/π = 0°
    //   - 向下发射 (angle = π/2):  rotate = (π/2 + π/2) * 180/π = 180°
    //   - 向右发射 (angle = 0):     rotate = (0 + π/2) * 180/π = 90°
    //   - 向左发射 (angle = π):     rotate = (π + π/2) * 180/π = 270°
    const spriteRotate = (angle + Math.PI / 2) * 180 / Math.PI;

    // 计算自转角速度（度/秒 → 弧度/秒）
    const spinVrot = ammoSpec.spinSpeed ? ammoSpec.spinSpeed * Math.PI / 180 : 0;

    const bulletBlueprint: Blueprint = {
        Transform: { x: 0, y: 0, rot: 0 }, // 子弹位置由 spawnBullet 参数设置，rot 不参与渲染
        Velocity: { vx, vy, vrot: spinVrot }, // vrot 用于自转效果
        Sprite: {
            spriteKey: spriteSpec.spriteKey,
            color: spriteSpec.color,
            scale: sizeMultiplier,
            rotate: spriteRotate, // 精灵图旋转角度（度），控制子弹初始朝向
        },
        Bullet: {
            owner: ownerId,
            ammoType: weapon.ammoType,
            damage: finalDamage,
            pierceLeft: finalPierce,
            bouncesLeft: finalBounces,
        },
        HitBox: {
            shape: 'circle',
            radius: ammoSpec.radius * sizeMultiplier,
            layer: ctx.isPlayer ? CollisionLayer.PlayerBullet : CollisionLayer.EnemyBullet,
        },
        Lifetime: {
            timer: 3000, // 3秒后销毁
        },
    };

    // === 添加专属组件 ===
    // 注意：这里传递配置对象，而不是组件实例
    // spawnFromBlueprint 会用 new ComponentCtor(args) 创建实例
    if (upgradeConfig.homing) {
        bulletBlueprint.Homing = {
            searchRange: upgradeConfig.homing.searchRange,
            turnSpeed: upgradeConfig.homing.turnSpeed,
        };
    }

    if (upgradeConfig.chain) {
        bulletBlueprint.Chain = {
            count: upgradeConfig.chain.count,
            range: upgradeConfig.chain.range,
            chainedIds: new Set(),
        };
    }

    // 如果弹药有爆炸配置，添加 Explosion 组件
    if (ammoSpec.explosion) {
        bulletBlueprint.Explosion = {
            baseRadius: ammoSpec.explosion,
            falloff: ammoSpec.falloff ?? 1,
            radiusMultiplier: upgradeConfig.explosion?.radiusMultiplier ?? 1,
        };
    }

    // 如果弹药有反弹次数，添加Bounce组件
    if (finalBounces > 0) {
        bulletBlueprint.Bounce = {
            bouncesLeft: finalBounces,
            bounds: {
                bounceX: true,   // 左右边界反弹
                bounceTop: true, // 顶部边界反弹
                bounceBottom: false, // 底部不反弹（让子弹飞出屏幕）
            },
        };
    }

    // 子弹旋转由 Sprite.rotate 控制，Transform.rot 保持为 0
    spawnBullet(world, bulletBlueprint, spawnX, spawnY, 0);
}
