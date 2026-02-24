# 特斯拉连锁修复设计

**日期**: 2026-02-12
**作者**: Claude Code
**状态**: 设计中

---

## 1. 问题概述

特斯拉连锁功能存在两个严重问题：

### 问题1：重复扣血
- `CollisionSystem` 生成 `HitEvent`（由 `DamageResolutionSystem` 扣血）
- `ChainSystem` 又直接扣血 `targetHealth.hp -= event.damage`
- 结果：每次连锁造成 2 倍伤害

### 问题2：事件跨帧丢失
- `ChainSystem` 处理 `ChainLightningEvent` 时，生成新的 `ChainLightningEvent` 传导下一个目标
- 根据事件系统设计，事件必须本帧消费，帧末清理
- 结果：新事件无法被处理，连锁只触发一次

---

## 2. 技术方案

### 核心思路

**创建独立的 `ChainLightningSystem`**，配合 `CollisionSystem` 的简化改动，实现特斯拉连锁逻辑。

#### 职责划分

| 系统 | 职责 |
|------|------|
| **CollisionSystem** | 检测碰撞 → 生成 `HitEvent` → 标记连锁子弹"本帧已命中" |
| **ChainLightningSystem** | 处理连锁子弹命中后的传导逻辑：伤害衰减、寻找目标、更新速度、生成特效事件 |
| **EffectSystem** | 监听 `Chaining` 事件 → 渲染电弧特效 |
| **DamageResolutionSystem** | 处理 `HitEvent` → 统一伤害结算 |

#### 处理流程

```
子弹命中敌人
    ↓
CollisionSystem
    ├─ 生成 HitEvent（伤害结算）
    ├─ 普通子弹：consumeBullet() 销毁
    └─ 连锁子弹：设置 chain.pendingVictimId = victimId，不销毁
    ↓
ChainLightningSystem（本帧处理）
    ├─ 查询 chain.pendingVictimId 不为空的子弹
    ├─ 将当前受害者加入 chain.chainedIds
    ├─ 应用伤害衰减：bullet.damage *= chain.falloff
    ├─ chain.count--
    ├─ 清除 chain.pendingVictimId
    ├─ 若 count > 0 且找到下一目标：
    │   ├─ 重置 Lifetime（延长生存时间）
    │   ├─ 更新 Velocity 指向目标
    │   └─ 生成 Chaining 事件（特效）
    └─ 否则：销毁子弹
```

### 优势

| 方面 | 原方案 | 新方案 |
|------|--------|--------|
| 伤害结算 | HitEvent + ChainSystem 双重扣血 | 仅 HitEvent 统一处理 |
| 传导状态 | 事件系统（跨帧丢失） | 子弹实体状态（可持续） |
| 职责分离 | ChainSystem 混合伤害+传导 | CollisionSystem 碰撞、ChainLightningSystem 传导 |
| 可测试性 | 需构造完整碰撞场景 | 独立系统可单独测试传导逻辑 |

---

## 3. 详细设计

### 3.1 AmmoSpec 复用现有字段

直接复用现有的 `falloff` 字段（第58行），无需添加新字段：

```typescript
export interface AmmoSpec {
    // ... 现有字段
    /** 伤害衰减系数（0=无衰减，1=线性，>1=更陡峭，默认=1） */
    falloff?: number;  // ← 复用：特斯拉连锁和范围爆炸共用
}
```

### 3.2 Chain 组件扩展

添加 `falloff` 和 `pendingVictimId` 字段：

```typescript
export class Chain extends Component {
    static check = (comp: Component): comp is Chain => comp instanceof Chain;

    constructor(cfg: {
        /** 剩余连锁次数 */
        count: number;
        /** 连锁范围（像素） */
        range: number;
        /** 已连锁过的实体 ID 列表（防重复） */
        chainedIds?: Set<EntityId>;
        /** 伤害衰减系数（从 AmmoSpec.falloff 读取） */
        falloff?: number;
    }) {
        super();
        this.count = cfg.count;
        this.range = cfg.range;
        this.chainedIds = cfg.chainedIds ?? new Set();
        this.falloff = cfg.falloff ?? 1;
    }

    /** 剩余连锁次数 */
    count: number;
    /** 连锁范围（像素） */
    range: number;
    /** 已连锁过的实体 ID 列表（防重复） */
    chainedIds: Set<EntityId>;
    /** 伤害衰减系数 */
    falloff: number = 1;
    /** 待处理的命中目标（CollisionSystem 设置，ChainLightningSystem 消费） */
    pendingVictimId?: EntityId;
}
```

**设计说明**：使用 `pendingVictimId` 字段替代独立的 `HasHitThisFrame` 组件，状态内聚在 Chain 组件内部，语义更清晰。

### 3.3 CollisionSystem.handleBulletHit 简化

**只负责标记命中，不处理传导逻辑**：

```typescript
function handleBulletHit(
    world: World,
    id1: EntityId,
    id2: EntityId,
    comps1: Component[],
    comps2: Component[],
): void {
    // ... 现有的 owner/victim 识别逻辑 ...

    // 1. 生成 HitEvent（统一伤害结算）
    const hitEvent: HitEvent = {
        type: "Hit",
        pos: { x: victimTransform.x, y: victimTransform.y },
        damage,
        owner: attackerId,
        victim: victimId,
    };
    pushEvent(world, hitEvent);

    // 2. 处理特斯拉连锁：设置待处理目标，交给 ChainLightningSystem 处理
    const chain = bulletComps.find(Chain.check);
    if (chain && bullet) {
        // 标记待处理的命中目标，让 ChainLightningSystem 处理传导
        chain.pendingVictimId = victimId;
        // 暂时不销毁子弹，等待 ChainLightningSystem 决定
    } else {
        // 普通子弹，正常消耗
        consumeBullet(bulletComps, bullet);
    }
}
```

### 3.4 新增 ChainLightningSystem

**完整处理连锁传导逻辑**：

```typescript
/**
 * 特斯拉连锁传导系统
 *
 * 职责：
 * - 处理 chain.pendingVictimId 不为空的子弹
 * - 应用伤害衰减、寻找下一个目标、更新速度
 * - 生成 Chaining 事件供 EffectSystem 渲染电弧特效
 *
 * 系统类型：逻辑层
 * 执行顺序：P6 - 在 CollisionSystem 之后
 */
export function ChainLightningSystem(world: World): void {
    // 查询有待处理命中目标的连锁子弹
    for (const [bulletId, [transform, velocity, chain, bullet]] of
        view(world, [Transform, Velocity, Chain, Bullet])) {

        // 跳过没有待处理命中的子弹
        if (chain.pendingVictimId === undefined) continue;

        const currentVictimId = chain.pendingVictimId;

        // 1. 将当前受害者加入已连锁列表
        chain.chainedIds.add(currentVictimId);

        // 2. 应用伤害衰减
        bullet.damage = (bullet.damage ?? 0) * chain.falloff;

        // 3. 减少连锁次数
        chain.count--;

        // 4. 清除待处理标记
        chain.pendingVictimId = undefined;

        // 5. 查找下一个目标
        if (chain.count > 0) {
            const nextTarget = findNextTarget(
                world,
                transform.x,
                transform.y,
                chain.range,
                chain.chainedIds,
            );

            if (nextTarget) {
                // 找到目标：延长生存时间并更新速度
                const lifetime = getComponent(world, bulletId, Lifetime);
                if (lifetime) {
                    lifetime.remaining = 2000; // 给予足够时间到达目标
                }

                updateBulletVelocity(world, bulletId, nextTarget);

                // 生成连锁传导事件（供 EffectSystem 渲染电弧）
                pushEvent(world, {
                    type: 'Chaining',
                    from: { x: transform.x, y: transform.y },
                    to: nextTarget,
                });
            } else {
                // 无目标可连，销毁子弹
                markForDestroy(world, bulletId, "consumed", "bullet");
            }
        } else {
            // 连锁次数用完，销毁子弹
            markForDestroy(world, bulletId, "consumed", "bullet");
        }
    }
}
```

### 3.5 新增 Chaining 事件类型

```typescript
/**
 * 连锁传导事件
 * 供 EffectSystem 渲染电弧特效
 */
export interface ChainingEvent extends Event {
    type: 'Chaining';
    /** 传导起点 */
    from: { x: number; y: number };
    /** 传导目标实体 ID */
    to: EntityId;
}
```

### 3.6 辅助函数设计

#### findNextTarget

```typescript
/**
 * 寻找下一个连锁目标
 */
function findNextTarget(
    world: World,
    fromX: number,
    fromY: number,
    range: number,
    chainedIds: Set<EntityId>,
): EntityId | undefined {
    let nearestDist = range;
    let nearestId: EntityId | undefined;

    for (const [enemyId, [enemyTransform, enemyHealth]] of view(world, [Transform, Health, EnemyTag])) {
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
```

#### updateBulletVelocity

```typescript
/**
 * 更新子弹速度指向目标
 */
function updateBulletVelocity(
    world: World,
    bulletId: EntityId,
    targetId: EntityId,
): void {
    const bulletTransform = getComponent(world, bulletId, Transform);
    const targetTransform = getComponent(world, targetId, Transform);

    if (!bulletTransform || !targetTransform) return;

    const dx = targetTransform.x - bulletTransform.x;
    const dy = targetTransform.y - bulletTransform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    // 获取子弹速度
    const velocity = getComponent(world, bulletId, Velocity);
    if (!velocity) return;

    // 获取子弹速度大小（保持原有速度）
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

    // 更新方向指向目标
    velocity.vx = (dx / dist) * speed;
    velocity.vy = (dy / dist) * speed;
}
```

**注意**：`getComponent` 需要从 `world.ts` 导出。如果尚未导出，需要补充。

---

## 4. 删除内容

| 文件 | 操作 |
|------|------|
| `src/engine/systems/ChainSystem.ts` | **删除**（旧实现有双重扣血和跨帧事件问题） |
| `src/engine/events.ts: ChainLightningEvent` | **删除**（不再使用事件传导） |

---

## 5. 实现检查清单

### 5.1 新增内容

- [ ] 新增 `ChainingEvent` 事件类型（src/engine/events.ts）
- [ ] 新增 `ChainLightningSystem` 系统（src/engine/systems/）
- [ ] 新增 `findNextTarget()` 辅助函数（在 ChainLightningSystem 中）
- [ ] 新增 `updateBulletVelocity()` 辅助函数（在 ChainLightningSystem 中）

### 5.2 修改内容

- [ ] Chain 组件添加 `falloff` 和 `pendingVictimId` 字段
- [ ] CollisionSystem 简化 `handleBulletHit()`：连锁子弹设置 `chain.pendingVictimId`
- [ ] CollisionSystem 移除 `triggerChainLightning()` 调用
- [ ] world.ts 导出 `getComponent()` 函数（如果尚未导出）
- [ ] 主循环添加 `ChainLightningSystem` 到系统执行序列（P6，CollisionSystem 之后）

### 5.3 删除内容

- [ ] 删除 `ChainSystem.ts` 文件（src/engine/systems/）
- [ ] 移除 `ChainLightningEvent` 事件类型（src/engine/events.ts）

### 5.4 验证

- [ ] 运行 `pnpm lint` 通过
- [ ] 运行 `pnpm test` 通过
- [ ] 运行 `pnpm build` 通过
- [ ] 游戏测试：验证连锁传导正常、伤害递减、无重复扣血

---

## 6. 预期效果

1. **伤害正确**：每次命中只造成一次伤害，通过 HitEvent 统一结算
2. **连锁正常**：子弹可以在多个敌人间传导，直到次数用完或找不到目标
3. **伤害递减**：每次命中后伤害值按 `falloff` 衰减
4. **职责分离**：CollisionSystem 专注碰撞检测，ChainLightningSystem 处理传导逻辑
5. **可扩展性**：EffectSystem 可通过 Chaining 事件渲染电弧特效
