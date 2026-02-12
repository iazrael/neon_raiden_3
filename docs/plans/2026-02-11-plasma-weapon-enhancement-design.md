# PLASMA 武器增强设计

## 概述

为 PLASMA 武器添加两个核心特性：
1. **精灵旋转效果**：子弹飞行时精灵图围绕自身中心旋转，类似滚动的能量球
2. **范围爆炸**：命中时对周围敌人造成距离衰减的范围伤害

同时重新平衡武器参数，将升级等级从 6 级简化为 3 级。

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 爆炸半径计算 | HitBox.radius × 倍率 | 使用含 sizeMultiplier 的实际碰撞半径，升级时爆炸范围自然增长 |
| 旋转方式 | 飞行方向 + 自转 | 类似滚动的球，视觉更动感 |
| 旋转配置位置 | AmmoSpec.spinSpeed | 通用可配置，任意弹药可用 |
| 爆炸伤害衰减 | 距离衰减 | 更真实，技术感更强 |
| 升级等级 | 3 级 | 与大多数武器一致，简化平衡 |
| 爆炸目标 | 敌人 + Boss | 两者都会受到溅射伤害 |
| 爆炸处理位置 | DamageResolutionSystem | 遵循 ECS 架构，不新增系统 |

## 技术设计

### 1. 旋转效果

#### 1.1 AmmoSpec 接口扩展

在 `src/engine/blueprints/base.ts` 的 `AmmoSpec` 接口新增：

```typescript
export interface AmmoSpec {
    // ... 现有字段 ...

    /** 自转速度（度/秒），0 或 undefined 表示不自转 */
    spinSpeed?: number;
}
```

#### 1.2 WeaponSystem 更新

在 `src/engine/systems/WeaponSystem.ts` 创建子弹时，将 `spinSpeed` 转换为 `Velocity.vrot`（弧度/秒）：

```typescript
// 计算自转角速度（度/秒 → 弧度/秒）
const spinVrot = ammoSpec.spinSpeed ? ammoSpec.spinSpeed * Math.PI / 180 : 0;

const bulletBlueprint: Blueprint = {
    // ...
    Velocity: { vx, vy, vrot: spinVrot }, // vrot 用于自转效果
    // ...
};
```

#### 1.3 MovementSystem（无需修改）

MovementSystem 已有 `Velocity.vrot` → `Transform.rot` 的处理逻辑：

```typescript
// 更新旋转（vrot是弧度/秒，用于自转等效果）
if (velocity.vrot !== 0) {
    transform.rot += velocity.vrot * dtInSeconds * timeScale;
}
```

#### 1.4 RenderSystem 更新

在 `src/engine/systems/RenderSystem.ts` 渲染精灵时，使用 `Transform.rot` 作为额外旋转：

```typescript
// 应用旋转: 最终旋转 = Sprite.rotate（基础朝向）+ Transform.rot（自转）
const baseRotation = sprite.rotate;
const transformRotation = transform.rot * 180 / Math.PI; // 弧度转度
const rotation = (baseRotation + transformRotation) * Math.PI / 180;
ctx.rotate(rotation);
```

**架构说明**：使用现有的 `Velocity.vrot` + `Transform.rot` 物理旋转机制，符合 ECS 架构设计，无需新增组件字段。

### 2. 范围爆炸

#### 2.1 AmmoSpec 接口扩展

```typescript
export interface AmmoSpec {
    // ... 现有字段 ...

    /** 爆炸半径倍率（爆炸半径 = HitBox.radius × 此倍率） */
    explosionRadiusMultiplier?: number;

    /** 爆炸伤害倍率（用于距离衰减计算时的最大伤害系数） */
    explosionDamageMultiplier?: number;
}
```

#### 2.2 Explosion 组件定义

**文件**: `src/engine/components/combat.ts`

采用与 `Chain` 一致的组件模式：

```typescript
export class Explosion extends Component {
    static check = (comp: Component): comp is Explosion => comp instanceof Explosion;

    constructor(cfg: {
        /** 爆炸半径倍率（爆炸半径 = HitBox.radius × 此倍率） */
        radiusMultiplier: number;
        /** 爆炸伤害倍率（最大溅射 = 子弹伤害 × 此倍率） */
        damageMultiplier: number;
        /** 衰减系数（0=无衰减，1=线性，>1=更陡峭） */
        falloff?: number;
    }) {
        super();
        this.radiusMultiplier = cfg.radiusMultiplier;
        this.damageMultiplier = cfg.damageMultiplier;
        this.falloff = cfg.falloff ?? 1;
    }

    radiusMultiplier: number;
    damageMultiplier: number;
    falloff: number = 1;
}
```

#### 2.3 ExplosionEvent 事件定义

**文件**: `src/engine/events/events.ts`

```typescript
export interface ExplosionEvent extends BaseEvent<'Explosion'> {
    pos: { x: number; y: number };
    radius: number;
    damage: number;
    falloff: number;  // 衰减系数
    owner: EntityId;
    excludeId?: EntityId;
}
```

#### 2.4 CollisionSystem 更新

在 `src/engine/systems/CollisionSystem.ts` 的子弹命中处理中，检查 `Explosion` 组件：

```typescript
// === 处理范围爆炸 ===
const explosionComp = bulletComps.find(Explosion.check);
if (explosionComp && bulletTransform) {
    const bulletHitBox = bulletComps.find(HitBox.check);
    const bulletRadius = bulletHitBox?.radius ?? 16;
    triggerExplosionDamage(
        world,
        bulletTransform.x,
        bulletTransform.y,
        bulletRadius,
        damage,
        explosionComp,
        attackerId,
        victimId,
    );
}
```

#### 2.5 DamageResolutionSystem 更新

在 `src/engine/systems/DamageResolutionSystem.ts` 中处理爆炸事件：

**关键设计决策**：
- 不生成 HitEvent，**直接调用 applyDamage** 避免事件循环
- 目标检查包含 **EnemyTag 和 BossTag**
- 跳过已销毁实体和排除实体
- **可配置衰减曲线**：falloff = 1 - (distance/radius)^falloffPower

```typescript
function processExplosion(world: World, event: ExplosionEvent): void {
    const { pos, radius, damage, falloff, owner, excludeId } = event;

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

        // 距离衰减计算：falloff = 1 - (distance/radius)^falloffPower
        // falloff = 0: 无衰减（全范围满伤害）
        // falloff = 1: 线性衰减
        // falloff > 1: 更陡峭的衰减（中心伤害高，边缘快速下降）
        const normalizedDistance = distance / radius;
        const falloffMultiplier = 1 - Math.pow(normalizedDistance, falloff);
        const splashDamage = damage * falloffMultiplier;

        // 只有伤害 > 0 时才应用伤害，直接调用 applyDamage
        if (splashDamage > 0) {
            applyDamage(world, {
                type: "Hit",
                pos: { x: transform.x, y: transform.y },
                damage: splashDamage,
                owner,
                victim: entityId,
            });
        }
    }
}
```

#### 2.6 EffectSystem 更新

在 `src/engine/systems/EffectSystem.ts` 中处理 `Explosion` 事件，生成**两倍半径**的冲击波特效：

```typescript
function handleExplosionEvent(world: World, event: ExplosionEvent): void {
    // 视觉冲击波半径 = 爆炸半径 × 2，让效果更明显
    spawnShockwave(world, event.pos.x, event.pos.y, "#ed64a6", event.radius * 2, 4);
    triggerShake(world, 3, 150);
}
```

### 3. 参数调整

#### 3.1 PLASMA 基础参数

**文件**: `src/engine/blueprints/ammo.ts`

| 参数 | 旧值 | 新值 | 理由 |
|------|------|------|------|
| damage | 45 | **35** | 有范围溅射，降低单发伤害 |
| speed | 300 | **280** | 略慢便于瞄准 |
| spinSpeed | - | **120** | 0.33 圈/秒 |
| explosionRadiusMultiplier | - | **2.0** | 爆炸半径 = HitBox.radius × 2 |
| explosionDamageMultiplier | - | **0.6** | 最大溅射 = 伤害 × 0.6 |
| explosionFalloff | - | **1** | 线性衰减 |

**文件**: `src/engine/blueprints/weapons.ts`

| 参数 | 旧值 | 新值 | 理由 |
|------|------|------|------|
| cooldown | 600 | **700** | 范围伤害强，增加冷却平衡 |

#### 3.2 升级配置（3 级）

**文件**: `src/engine/configs/weaponGrowth.ts`

```typescript
[WeaponId.PLASMA]: {
    id: WeaponId.PLASMA,
    levels: [
        { level: 1, damageMultiplier: 1.0, fireRateMultiplier: 1.0, sizeMultiplier: 1.0 },
        { level: 2, damageMultiplier: 1.4, fireRateMultiplier: 1.15, sizeMultiplier: 1.4 },
        { level: 3, damageMultiplier: 1.8, fireRateMultiplier: 1.3, sizeMultiplier: 1.8 },
    ],
},
```

**升级效果说明**：

爆炸半径随 sizeMultiplier 增长（基于 HitBox.radius）：

| 等级 | 伤害 | 爆炸半径 | 冷却 | 尺寸 |
|------|------|----------|------|------|
| 1 | 35 | 32px | 700ms | 16px |
| 2 | 49 | 45px | 609ms | 22px |
| 3 | 63 | 58px | 538ms | 29px |

## 涉及文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/engine/blueprints/base.ts` | 修改 | AmmoSpec 接口新增 spinSpeed、explosionRadiusMultiplier、explosionDamageMultiplier |
| `src/engine/blueprints/ammo.ts` | 修改 | PLASMA_ORB 配置添加新参数 |
| `src/engine/blueprints/weapons.ts` | 修改 | PLASMA 武器冷却调整 |
| `src/engine/configs/weaponGrowth.ts` | 修改 | 升级配置改为 3 级 |
| `src/engine/systems/WeaponSystem.ts` | 修改 | 创建子弹时设置 Velocity.vrot |
| `src/engine/systems/MovementSystem.ts` | 无需修改 | 已有 vrot → rot 处理逻辑 |
| `src/engine/systems/CollisionSystem.ts` | 修改 | 子弹命中时生成 ExplosionEvent |
| `src/engine/systems/DamageResolutionSystem.ts` | 修改 | 新增 processExplosion 处理爆炸伤害 |
| `src/engine/systems/RenderSystem.ts` | 修改 | 渲染时使用 Transform.rot 作为额外旋转 |
| `src/engine/systems/EffectSystem.ts` | 修改 | 处理 ExplosionEvent 生成冲击波特效 |
| `src/engine/events/events.ts` | 新增 | ExplosionEvent 类型定义 |

## 实施步骤

1. **扩展接口**
   - base.ts: AmmoSpec 新增 spinSpeed、explosionRadiusMultiplier、explosionDamageMultiplier

2. **新增事件类型**
   - events.ts: 新增 ExplosionEvent 接口

3. **更新弹药和武器配置**
   - ammo.ts: PLASMA_ORB 添加旋转和爆炸参数
   - weapons.ts: PLASMA 冷却时间调整
   - weaponGrowth.ts: 升级配置改为 3 级

4. **实现旋转逻辑（使用现有 ECS 机制）**
   - WeaponSystem: 创建子弹时将 spinSpeed 转换为 Velocity.vrot
   - MovementSystem: 无需修改（已有 vrot → rot 处理）
   - RenderSystem: 渲染时使用 Transform.rot 作为额外旋转

5. **实现爆炸逻辑**
   - CollisionSystem: 子弹命中时生成 ExplosionEvent（使用 HitBox.radius）
   - DamageResolutionSystem: 新增 processExplosion 函数直接调用 applyDamage
   - EffectSystem: 处理 ExplosionEvent 生成两倍半径冲击波

6. **测试验证**
   - pnpm lint
   - pnpm build
   - 游戏内验证旋转和爆炸效果
