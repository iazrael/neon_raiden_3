/**
 * 爆炸系统 (ExplosionSystem)
 *
 * 职责：
 * - 提供 triggerExplosionDamage 方法供 CollisionSystem 调用
 * - 处理 ExplosionEvent，生成 HitEvent 给 DamageResolutionSystem
 *
 * 系统类型：事件响应层
 * 执行顺序：P5 - 在 CollisionSystem 之后
 */

import { EntityId } from "../types";
import { World, pushEvent, getEvents, view } from "../world";
import { Transform, Health, EnemyTag, BossTag, DestroyTag, Explosion } from "../components";
import { ExplosionEvent, HitEvent } from "../events";

/**
 * 触发范围爆炸（供 CollisionSystem 调用）
 * 计算最终爆炸半径并发送 ExplosionEvent
 * @param world 世界对象
 * @param x 爆炸中心 X 坐标
 * @param y 爆炸中心 Y 坐标
 * @param damage 子弹伤害
 * @param explosion Explosion 组件
 * @param attackerId 攻击者实体 ID
 * @param excludeId 排除的实体 ID（主目标，避免重复伤害）
 */
export function triggerExplosionDamage(
    world: World,
    x: number,
    y: number,
    damage: number,
    explosion: Explosion,
    attackerId: EntityId,
    excludeId: EntityId
): void {
    // 计算最终爆炸半径
    const finalRadius = explosion.baseRadius * explosion.radiusMultiplier;

    pushEvent(world, {
        type: "Explosion",
        pos: { x, y },
        radius: finalRadius,
        damage,
        falloff: explosion.falloff,
        owner: attackerId,
        excludeId,
    } as ExplosionEvent);
}

/**
 * 爆炸系统主函数
 * 处理 ExplosionEvent，生成 HitEvent
 * @param world 世界对象
 * @param dt 时间增量（毫秒）
 */
export function ExplosionSystem(world: World, dt: number): void {
    const explosionEvents = getEvents<ExplosionEvent>(world, "Explosion");

    for (const event of explosionEvents) {
        processExplosion(world, event);
    }
}

/**
 * 处理范围爆炸
 * 搜索范围内的敌人，生成带距离衰减的 HitEvent
 * @param world 世界对象
 * @param event 爆炸事件
 */
function processExplosion(world: World, event: ExplosionEvent): void {
    const { pos, radius, damage, falloff, owner, excludeId } = event;

    // 搜索爆炸范围内的所有敌人（包括 Boss）
    for (const [entityId, [transform], comps] of view(world, [Transform, Health])) {
        // 跳过排除的实体（主目标）
        if (excludeId !== undefined && entityId === excludeId) continue;

        // 跳过非敌人实体（需要有 EnemyTag 或 BossTag）
        const isEnemy = comps.some(EnemyTag.check);
        const isBoss = comps.some(BossTag.check);
        if (!isEnemy && !isBoss) continue;

        // 跳过已销毁的实体
        if (comps.some(DestroyTag.check)) continue;

        // 计算距离
        const dx = transform.x - pos.x;
        const dy = transform.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 判断是否在爆炸范围内
        if (distance > radius) continue;

        // 距离衰减计算
        // 基础公式：rawFalloff = 1 - (distance/radius)^falloffPower
        // 最终范围：[minFalloff, 1.0]，即边缘伤害 = 40%，中心伤害 = 100%
        const normalizedDistance = distance / radius;
        const rawFalloff = 1 - Math.pow(normalizedDistance, falloff);
        const minFalloff = 0.4; // 边缘最小伤害 40%

        // 将 [0, 1] 映射到 [minFalloff, 1]
        const falloffMultiplier = minFalloff + (1 - minFalloff) * rawFalloff;
        const splashDamage = damage * falloffMultiplier;

        // 只有伤害 > 0 时才生成 HitEvent
        if (splashDamage > 0) {
            pushEvent(world, {
                type: "Hit",
                pos: { x: transform.x, y: transform.y },
                damage: splashDamage,
                owner,
                victim: entityId,
            } as HitEvent);
        }
    }
}
