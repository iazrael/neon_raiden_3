/**
 * 特斯拉连锁传导系统 (ChainLightningSystem)
 *
 * 职责：
 * - 监听 ChainPendingEvent 事件
 * - 搜索下一个目标
 * - 从原子弹复制属性创建新的连锁子弹
 * - 生成 ChainingEvent 供特效系统渲染电弧
 *
 * 系统类型：逻辑层
 * 执行顺序：P6 - 在 CollisionSystem 之后
 */

import { World, getEvents, view, getComponent, pushEvent, getEntity } from "../world";
import { ChainPendingEvent, ChainingEvent } from "../events";
import { spawnBullet } from "../factory";
import { Transform, Health, EnemyTag, Bullet, Sprite, HitBox, Lifetime, Chain, Velocity } from "../components";
import { EntityId } from "../types";
import { Blueprint } from "../blueprints/base";
import { logger } from "../logger";

const log = logger.for("ChainLightningSystem");

/**
 * 特斯拉连锁传导系统主函数
 */
export function ChainLightningSystem(world: World): void {
    // 获取所有 ChainPendingEvent
    const pendingEvents = getEvents<ChainPendingEvent>(world, "ChainPending");

    for (const event of pendingEvents) {
        // 只有当还有连锁次数时才索敌并创建子弹
        if (event.count <= 0) continue;

        // 从受害者位置搜索下一个目标
        const nextTarget = findNextTargetForChain(
            world,
            event.victimPos.x,
            event.victimPos.y,
            event.range,
            event.chainedIds
        );

        if (nextTarget) {
            const targetTransform = getComponent(world, nextTarget, Transform);
            const targetHealth = getComponent(world, nextTarget, Health);

            // 二次验证：确保目标仍然存在且存活（防止同帧内被击杀）
            if (targetTransform && targetHealth && targetHealth.hp > 0) {
                // 计算衰减后的伤害和连锁次数
                const nextDamage = event.damage * event.falloff;
                const nextCount = event.count - 1;

                // 生成 ChainingEvent 供特效系统渲染电弧
                pushEvent(world, {
                    type: "Chaining",
                    from: event.bulletPos,
                    to: nextTarget,
                } as ChainingEvent);

                // 从原子弹复制属性创建连锁子弹
                spawnChainBullet(
                    world,
                    event.bulletId,
                    event.bulletPos,
                    { x: targetTransform.x, y: targetTransform.y },
                    nextDamage,
                    nextCount,
                    event.falloff,
                    event.chainedIds
                );
            }
        }
    }
}

/**
 * 寻找下一个连锁目标
 * @param world 世界对象
 * @param fromX 搜索起点 X
 * @param fromY 搜索起点 Y
 * @param range 搜索半径
 * @param chainedIds 已连锁的实体 ID 列表
 * @returns 最近的目标实体 ID，或 undefined
 */
function findNextTargetForChain(
    world: World,
    fromX: number,
    fromY: number,
    range: number,
    chainedIds: Set<number>
): number | undefined {
    let nearestDist = range;
    let nearestId: number | undefined;

    for (const [enemyId, [enemyTransform, enemyHealth]] of view(world, [Transform, Health])) {
        // 检查是否为敌人（必须有 EnemyTag）
        const enemyComps = world.entities.get(enemyId);
        if (!enemyComps || !enemyComps.some(EnemyTag.check)) continue;

        // 跳过已连锁的和已死亡的
        if (chainedIds.has(enemyId)) continue;
        if (enemyHealth.hp <= 0) continue;

        const dx = enemyTransform.x - fromX;
        const dy = enemyTransform.y - fromY;
        const distSq = dx * dx + dy * dy;

        if (distSq < nearestDist * nearestDist) {
            nearestDist = Math.sqrt(distSq);
            nearestId = enemyId;
        }
    }

    return nearestId;
}

/**
 * 创建连锁子弹（从原子弹复制属性）
 * @param world 世界对象
 * @param bulletId 原子弹实体 ID
 * @param from 起点（子弹位置）
 * @param to 终点（目标位置）
 * @param damage 子弹伤害（已衰减）
 * @param count 剩余连锁次数
 * @param falloff 伤害衰减系数
 * @param chainedIds 已连锁的实体 ID 列表
 */
function spawnChainBullet(
    world: World,
    bulletId: EntityId,
    from: { x: number; y: number },
    to: { x: number; y: number },
    damage: number,
    count: number,
    falloff: number,
    chainedIds: Set<number>
): void {
    // 获取原子弹的所有组件
    const bulletComps = getEntity(world, bulletId);
    if (!bulletComps) return;

    const bullet = bulletComps.find(Bullet.check) as Bullet | undefined;
    const sprite = bulletComps.find(Sprite.check) as Sprite | undefined;
    const hitbox = bulletComps.find(HitBox.check) as HitBox | undefined;
    const lifetime = bulletComps.find(Lifetime.check) as Lifetime | undefined;
    const chain = bulletComps.find(Chain.check) as Chain | undefined;

    if (!bullet || !sprite || !hitbox || !lifetime || !chain) {
        log.error("子弹缺少必要组件");
        return;
    }

    // 计算从起点到终点的方向和速度
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    // 计算速度向量（保持原子弹的速度大小）
    const velocity = bulletComps.find(Velocity.check) as Velocity | undefined;
    const speed = velocity ? Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy) : 1200;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    // 计算子弹朝向（用于 Sprite.rotate）
    const angle = Math.atan2(dy, dx);
    const spriteRotate = ((angle + Math.PI / 2) * 180) / Math.PI;

    // 创建子弹蓝图（从原子弹复制属性）
    const bulletBlueprint: Blueprint = {
        Transform: { x: 0, y: 0, rot: 0 },
        Velocity: { vx, vy, vrot: velocity?.vrot ?? 0 },
        Sprite: {
            spriteKey: sprite.spriteKey,
            color: sprite.color,
            scale: sprite.scale,
            rotate: spriteRotate,
        },
        Bullet: {
            owner: bullet.owner,
            ammoType: bullet.ammoType,
            damage,
            pierceLeft: bullet.pierceLeft,
            bouncesLeft: bullet.bouncesLeft,
        },
        HitBox: {
            shape: hitbox.shape,
            radius: hitbox.radius,
            halfWidth: hitbox.halfWidth,
            halfHeight: hitbox.halfHeight,
            capRadius: hitbox.capRadius,
            capHeight: hitbox.capHeight,
            layer: hitbox.layer,
        },
        Lifetime: {
            remaining: 3000, // 新子弹, 要重置生命周期
        },
        Chain: {
            count,
            range: chain.range,
            falloff,
            chainedIds: new Set(chainedIds),
        },
    };

    // 从起点生成子弹
    spawnBullet(world, bulletBlueprint, from.x, from.y, 0);
}
