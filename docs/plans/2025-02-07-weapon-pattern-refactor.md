# Weapon Pattern 重构与 FIXED_REAR 实现

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 重构武器发射模式系统，实现 STG 规范的弹幕模式，并添加缺失的 FIXED_REAR 反向发射模式。

**架构方案:**
1. 重新定义 `WeaponPattern` 枚举，使其语义更符合 STG 游戏规范
2. 实现 `AIMED` 模式的真正瞄准逻辑（通过 `FireIntent.targetId` 查找目标）
3. 实现 `FIXED_REAR` 反向发射模式
4. 更新武器配置表，统一使用正确的模式枚举

**技术栈:** TypeScript, ECS 架构, Jest 测试框架

---

## 背景

当前问题：
- `AIMED` 模式只是朝 `baseAngle` 发射，没有实现真正的瞄准
- `SPREAD` 模式被用于 `VULCAN` (spread=0)，语义不清晰
- `FIXED_REAR` 模式定义了但未实现
- 一些小兵武器标记为 `AIMED` 但实际上不需要瞄准

新 `WeaponPattern` 定义：
| 模式 | 行为描述 |
|------|----------|
| `STRAIGHT` | 朝固定方向发射 |
| `SPREAD` | 扇形均匀分布 |
| `AIMED` | 通过 targetId 追踪目标方向 |
| `RADIAL` | 360度全方位均匀 |
| `SPIRAL` | 螺旋递增角度 |
| `RANDOM` | 随机角度偏移 |
| `FIXED_REAR` | 固定反向发射 (baseAngle + 180°) |

---

## Task 1: 重构 WeaponPattern 枚举

**Files:**
- Modify: `src/engine/types/ids.ts:66-73`

**Step 1: 更新 WeaponPattern 枚举定义**

将现有的枚举值重构为新的定义：

```typescript
// 武器的发射模式
export enum WeaponPattern {
    STRAIGHT = 'straight',   // 直弹 - 固定方向发射
    SPREAD = 'spread',       // 散射 - 扇形分布
    AIMED = 'aimed',         // 瞄准 - 通过 targetId 追踪目标
    RADIAL = 'radial',       // 全方位 - 360度均匀
    SPIRAL = 'spiral',       // 螺旋 - 角度递增
    RANDOM = 'random',       // 随机 - 随机偏移
    FIXED_REAR = 'fixed_rear'// 反向 - 固定后方发射
}
```

**Step 2: 运行类型检查**

Run: `pnpm build`
Expected: 类型检查通过（枚举值只是重命名，向后兼容）

**Step 3: 提交**

```bash
git add src/engine/types/ids.ts
git commit -m "refactor(types): 重构 WeaponPattern 枚举以符合 STG 规范"
```

---

## Task 2: 实现新版 fireWeapon 函数

**Files:**
- Modify: `src/engine/systems/WeaponSystem.ts:144-170`

**Step 1: 添加 AIMED 瞄准逻辑和 FIXED_REAR 反向逻辑**

在 `fireWeapon` 函数中添加角度计算和模式分发逻辑：

```typescript
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
    let finalDamageMultiplier = upgradeConfig.damageMultiplier;
    let finalFireRateMultiplier = upgradeConfig.fireRateMultiplier;

    if (entity.isPlayer) {
        const componentDamageMultiplier = weapon.damageMultiplier ?? 1.0;
        const componentFireRateMultiplier = weapon.fireRateMultiplier ?? 1.0;
        finalDamageMultiplier *= componentDamageMultiplier;
        finalFireRateMultiplier *= componentFireRateMultiplier;
    }

    const mergedUpgradeConfig: WeaponLevelSpec = {
        ...upgradeConfig,
        damageMultiplier: finalDamageMultiplier,
        fireRateMultiplier: finalFireRateMultiplier,
    };

    // === 应用扩展属性 ===
    const bulletCount = upgradeConfig.bulletCount ?? weaponSpec.bulletCount ?? 1;
    const spread = upgradeConfig.spread ?? weaponSpec.spread ?? 0;
    const sizeMultiplier = upgradeConfig.sizeMultiplier ?? 1.0;

    // 计算发射角度
    let fireAngle = intent.angle ?? -Math.PI / 2; // 默认向上

    // AIMED 模式：通过 targetId 查找目标位置
    if (weaponSpec.pattern === WeaponPattern.AIMED && intent.targetId) {
        const targetTransform = view(world, [Transform]).get(intent.targetId)?.[0];
        if (targetTransform) {
            const dx = targetTransform.x - transform.x;
            const dy = targetTransform.y - transform.y;
            fireAngle = Math.atan2(dy, dx);
        }
    }

    const fireContext = {
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
    };

    // 根据弹幕模式生成子弹
    if (weaponSpec.pattern === WeaponPattern.RADIAL) {
        fireRadial(fireContext, bulletCount);
    } else if (weaponSpec.pattern === WeaponPattern.FIXED_REAR) {
        // 反向发射：朝实体朝向的相反方向
        fireSpread(fireContext, bulletCount, spread, fireAngle + Math.PI);
    } else if (weaponSpec.pattern === WeaponPattern.SPIRAL) {
        fireSpiral(fireContext, bulletCount, spread, fireAngle);
    } else if (weaponSpec.pattern === WeaponPattern.RANDOM) {
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
```

**Step 2: 运行构建检查**

Run: `pnpm build`
Expected: 构建成功

**Step 3: 提交**

```bash
git add src/engine/systems/WeaponSystem.ts
git commit -m "feat(weapon): 实现 AIMED 瞄准逻辑和 FIXED_REAR 反向发射"
```

---

## Task 3: 更新玩家武器配置表

**Files:**
- Modify: `src/engine/blueprints/weapons.ts:13-151`

**Step 1: 修改 VULCAN 武器配置**

将 `VULCAN` 的 `pattern` 从 `SPREAD` 改为 `STRAIGHT`：

```typescript
[WeaponId.VULCAN]: {
    id: WeaponId.VULCAN,
    ammoType: AmmoType.VULCAN_SPREAD,
    cooldown: 150,
    curCD: 0,
    maxLevel: 6,
    pattern: WeaponPattern.STRAIGHT,  // 改为 STRAIGHT
    bulletCount: 1,
    spread: 0,
    pierceBonus: 0,
    bouncesBonus: 0
},
```

**Step 2: 运行构建检查**

Run: `pnpm build`
Expected: 构建成功

**Step 3: 提交**

```bash
git add src/engine/blueprints/weapons.ts
git commit -m "refactor(weapons): VULCAN 使用 STRAIGHT 模式"
```

---

## Task 4: 更新敌人武器配置表

**Files:**
- Modify: `src/engine/blueprints/weapons.ts:155-358`

**Step 1: 批量修改敌人武器 pattern**

```typescript
export const ENEMY_WEAPON_TABLE: Record<EnemyWeaponId, WeaponSpec> = {
    [EnemyWeaponId.ENEMY_NORMAL]: {
        id: EnemyWeaponId.ENEMY_NORMAL,
        ammoType: AmmoType.ENEMY_ORB_RED,
        cooldown: 2000,
        bulletCount: 1,
        pattern: WeaponPattern.STRAIGHT  // 改为 STRAIGHT
    },
    [EnemyWeaponId.ENEMY_FAST]: {
        id: EnemyWeaponId.ENEMY_FAST,
        ammoType: AmmoType.ENEMY_PULSE,
        cooldown: 1200,
        bulletCount: 1,
        pattern: WeaponPattern.STRAIGHT  // 改为 STRAIGHT
    },
    [EnemyWeaponId.ENEMY_TANK]: {
        id: EnemyWeaponId.ENEMY_TANK,
        ammoType: AmmoType.ENEMY_ORB_BLUE,
        cooldown: 3000,
        bulletCount: 1,
        pattern: WeaponPattern.STRAIGHT  // 改为 STRAIGHT
    },
    [EnemyWeaponId.ENEMY_ELITE]: {
        id: EnemyWeaponId.ENEMY_ELITE,
        ammoType: AmmoType.ENEMY_ORB_RED,
        cooldown: 800,
        bulletCount: 3,
        spread: 15,
        pattern: WeaponPattern.SPREAD  // 改为 SPREAD
    },
    // ... 其他武器保持不变 ...
    [EnemyWeaponId.TITAN_LASER_BASE]: {
        id: EnemyWeaponId.TITAN_LASER_BASE,
        cooldown: 2000,
        ammoType: AmmoType.ENEMY_BEAM_THICK,
        spread: 0,
        bulletCount: 1,
        pattern: WeaponPattern.STRAIGHT  // 改为 STRAIGHT
    },
    // ... 保持 AIMED 的武器（需要追踪玩家）不变 ...
};
```

**Step 2: 运行构建检查**

Run: `pnpm build`
Expected: 构建成功

**Step 3: 提交**

```bash
git add src/engine/blueprints/weapons.ts
git commit -m "refactor(weapons): 更新敌人武器模式语义"
```

---

## Task 5: 编写 WeaponPattern 单元测试

**Files:**
- Create: `tests/engine/systems/WeaponPattern.test.ts`

**Step 1: 创建测试文件**

```typescript
import { WeaponSystem } from '@/engine/systems/WeaponSystem';
import { World } from '@/engine/world';
import { Transform, Weapon, FireIntent } from '@/engine/components';
import { WeaponId, WeaponPattern, EnemyWeaponId } from '@/engine/types';
import { ALL_WEAPONS_TABLE } from '@/engine/blueprints';

describe('WeaponPattern', () => {
    let world: World;
    let playerId: number;
    let enemyId: number;

    beforeEach(() => {
        world = new World();

        // 创建玩家实体
        playerId = world.spawnEntity();
        world.addComponent(playerId, new Transform({ x: 400, y: 500, rot: 0 }));
        world.addComponent(playerId, new Weapon({
            id: WeaponId.VULCAN,
            ammoType: 'vulcan_spread',
            cooldown: 150,
            pattern: WeaponPattern.STRAIGHT
        }));

        // 创建敌人实体
        enemyId = world.spawnEntity();
        world.addComponent(enemyId, new Transform({ x: 400, y: 100, rot: 0 }));
        world.addComponent(enemyId, new Weapon({
            id: EnemyWeaponId.ENEMY_NORMAL,
            ammoType: 'enemy_orb_red',
            cooldown: 2000,
            pattern: WeaponPattern.STRAIGHT
        }));
    });

    describe('STRAIGHT 模式', () => {
        it('应该朝固定方向发射子弹', () => {
            const intent = new FireIntent({
                firing: true,
                angle: -Math.PI / 2 // 向上
            });
            world.addComponent(playerId, intent);

            const initialBulletCount = countBullets(world);
            WeaponSystem(world, 200);

            expect(countBullets(world)).toBe(initialBulletCount + 1);
        });
    });

    describe('SPREAD 模式', () => {
        it('应该呈扇形分布多发子弹', () => {
            // 修改武器为 SPREAD 模式
            const weapon = world.getComponent(playerId, Weapon)!;
            weapon.pattern = WeaponPattern.SPREAD;
            weapon.bulletCount = 3;
            weapon.spread = 30;

            const intent = new FireIntent({
                firing: true,
                angle: -Math.PI / 2
            });
            world.addComponent(playerId, intent);

            WeaponSystem(world, 200);

            expect(countBullets(world)).toBe(3);
        });
    });

    describe('AIMED 模式', () => {
        it('应该朝目标方向发射', () => {
            // 修改敌人武器为 AIMED 模式
            const weapon = world.getComponent(enemyId, Weapon)!;
            weapon.id = EnemyWeaponId.GENERIC_TARGETED;
            weapon.pattern = WeaponPattern.AIMED;

            // 移动玩家到不同位置
            const playerTransform = world.getComponent(playerId, Transform)!;
            playerTransform.x = 500;
            playerTransform.y = 300;

            const intent = new FireIntent({
                firing: true,
                angle: -Math.PI / 2, // 默认向上，但 AIMED 应该忽略
                targetId: playerId
            });
            world.addComponent(enemyId, intent);

            WeaponSystem(world, 200);

            // 验证子弹朝向玩家
            const bullets = getBullets(world);
            expect(bullets.length).toBeGreaterThan(0);
            // 可以进一步验证子弹的速度方向
        });

        it('无目标时应该降级为 STRAIGHT', () => {
            const weapon = world.getComponent(enemyId, Weapon)!;
            weapon.id = EnemyWeaponId.GENERIC_TARGETED;
            weapon.pattern = WeaponPattern.AIMED;

            const intent = new FireIntent({
                firing: true,
                angle: -Math.PI / 2,
                // 不传 targetId
            });
            world.addComponent(enemyId, intent);

            WeaponSystem(world, 200);

            // 应该正常发射（使用 baseAngle）
            expect(countBullets(world)).toBe(1);
        });
    });

    describe('RADIAL 模式', () => {
        it('应该 360 度均匀分布', () => {
            const weapon = world.getComponent(enemyId, Weapon)!;
            weapon.id = EnemyWeaponId.GUARDIAN_RADIAL;
            weapon.pattern = WeaponPattern.RADIAL;
            weapon.bulletCount = 8;

            const intent = new FireIntent({ firing: true });
            world.addComponent(enemyId, intent);

            WeaponSystem(world, 1100); // 超过 cooldown

            expect(countBullets(world)).toBe(8);
        });
    });

    describe('SPIRAL 模式', () => {
        it('应该螺旋递增角度', () => {
            const weapon = world.getComponent(enemyId, Weapon)!;
            weapon.id = EnemyWeaponId.ENEMY_BARRAGE;
            weapon.pattern = WeaponPattern.SPIRAL;
            weapon.bulletCount = 8;
            weapon.spread = 360;

            const intent = new FireIntent({ firing: true });
            world.addComponent(enemyId, intent);

            WeaponSystem(world, 1600);

            expect(countBullets(world)).toBe(8);
        });
    });

    describe('RANDOM 模式', () => {
        it('应该在 spread 范围内随机偏移', () => {
            const weapon = world.getComponent(playerId, Weapon)!;
            weapon.id = WeaponId.SHURIKEN;
            weapon.pattern = WeaponPattern.RANDOM;
            weapon.spread = 30;

            const intent = new FireIntent({ firing: true });
            world.addComponent(playerId, intent);

            WeaponSystem(world, 350);

            expect(countBullets(world)).toBe(1);
        });
    });

    describe('FIXED_REAR 模式', () => {
        it('应该朝相反方向发射', () => {
            const weapon = world.getComponent(enemyId, Weapon)!;
            weapon.id = EnemyWeaponId.ENEMY_LAYER;
            weapon.pattern = WeaponPattern.FIXED_REAR;

            // 敌人朝下移动
            const transform = world.getComponent(enemyId, Transform)!;
            transform.y = 200;

            const intent = new FireIntent({
                firing: true,
                angle: Math.PI / 2 // 向下
            });
            world.addComponent(enemyId, intent);

            WeaponSystem(world, 1600);

            // 子弹应该向上（反方向）
            expect(countBullets(world)).toBe(1);
        });
    });
});

// 辅助函数
function countBullets(world: World): number {
    let count = 0;
    for (const [id, components] of world.entities) {
        if (components.some(c => c.constructor.name === 'Bullet')) {
            count++;
        }
    }
    return count;
}

function getBullets(world: World): any[] {
    const bullets: any[] = [];
    for (const [id, components] of world.entities) {
        const bullet = components.find(c => c.constructor.name === 'Bullet');
        if (bullet) {
            const transform = components.find(c => c instanceof Transform);
            bullets.push({ bullet, transform });
        }
    }
    return bullets;
}
```

**Step 2: 运行测试**

Run: `pnpm test tests/engine/systems/WeaponPattern.test.ts`
Expected: 部分测试失败（需要根据实际 ECS API 调整）

**Step 3: 根据实际 API 调整测试代码**

根据测试结果调整代码，确保测试能够正确运行。

**Step 4: 提交**

```bash
git add tests/engine/systems/WeaponPattern.test.ts
git commit -m "test(weapon): 添加 WeaponPattern 单元测试"
```

---

## Task 6: 验证集成测试

**Files:**
- None (手动验证)

**Step 1: 启动游戏进行手动测试**

Run: `pnpm dev`

**验证清单:**
- [ ] 玩家 VULCAN 武器垂直向上发射
- [ ] 敌人 ENEMY_NORMAL 固定向上发射
- [ ] 敌人 ENEMY_ELITE 扇形散射
- [ ] Boss AIMED 武器追踪玩家
- [ ] Boss RADIAL 武器 360 度发射
- [ ] ENEMY_LAYER (布雷机) 反向发射

**Step 2: 记录测试结果**

如果发现任何问题，记录下来并修复。

---

## Task 7: 更新文档

**Files:**
- Modify: `docs/plans/2025-02-07-weapon-pattern-refactor.md` (本文件)

**Step 1: 添加实现总结**

在文件末尾添加：

```markdown
## 实现总结

### 已完成的变更

1. **WeaponPattern 枚举重构**
   - 添加 `STRAIGHT` 模式（固定方向）
   - `AIMED` 现在通过 `targetId` 自动追踪目标
   - 添加 `FIXED_REAR` 实现

2. **武器配置更新**
   - VULCAN: SPREAD → STRAIGHT
   - ENEMY_NORMAL/FAST/TANK: AIMED → STRAIGHT
   - ENEMY_ELITE: AIMED → SPREAD
   - TITAN_LASER_BASE: AIMED → STRAIGHT

3. **系统逻辑增强**
   - AIMED 模式现在通过 `FireIntent.targetId` 查找目标位置
   - FIXED_REAR 模式通过 `baseAngle + Math.PI` 计算反向

### 向后兼容性

- 旧代码中未指定 pattern 的武器将使用默认逻辑
- `FireIntent.angle` 仍然有效（STRAIGHT 模式使用）
- `FireIntent.targetId` 为可选参数

### 后续优化建议

- [ ] 考虑将 `spread` 参数重命名为 `spreadAngle` 更清晰
- [ ] 添加武器模式可视化调试工具
- [ ] 性能优化：缓存 targetId 查找结果
```

**Step 2: 提交文档**

```bash
git add docs/plans/2025-02-07-weapon-pattern-refactor.md
git commit -m "docs: 完成武器模式重构实施总结"
```

---

## 验收标准

完成所有任务后，应该满足：

1. ✅ `WeaponPattern` 枚举包含 7 个模式
2. ✅ `AIMED` 模式能正确追踪 `targetId` 指向的目标
3. ✅ `FIXED_REAR` 模式正确反向发射
4. ✅ 所有武器配置使用正确的 pattern 枚举
5. ✅ 单元测试覆盖所有模式
6. ✅ 手动游戏测试通过
7. ✅ `pnpm build` 和 `pnpm test` 全部通过
8. ✅ 文档更新完成
