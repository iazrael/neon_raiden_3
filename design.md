# Neon Raiden III 设计文档

## 1. 架构设计

### 1.1 ECS 模式

项目采用 **Entity-Component-System (ECS)** 架构，这是游戏开发中常用的数据驱动设计模式。

#### 核心概念

| 概念 | 说明 | 实现 |
|------|------|------|
| **Entity** | 实体是一个唯一 ID，由组件组合而成 | `EntityId` (number) |
| **Component** | 组件是纯数据结构，无逻辑 | 继承 `Component` 的类 |
| **System** | 系统是纯函数，处理组件数据 | `(world: World, dt: number) => void` |
| **World** | 世界持有所有实体、组件和全局状态 | `World` 接口 |

#### 设计原则

```
┌─────────────────────────────────────────────────────────────┐
│                        World                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Entity 1   │  │  Entity 2   │  │  Entity 3   │  ...    │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │Transform│ │  │ │Transform│ │  │ │Transform│ │         │
│  │ │Velocity │ │  │ │Health   │ │  │ │Sprite   │ │         │
│  │ │Sprite   │ │  │ │EnemyTag │ │  │ │Bullet   │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  events: GameEvent[]     // 事件队列（帧内有效）            │
│  time: number            // 游戏时间                        │
│  score: number           // 全局分数                        │
│  level: number           // 当前关卡                        │
│  timeScale: number       // 时间缩放                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 实体查询

使用 `view()` 函数查询拥有特定组件组合的实体：

```typescript
// 查询所有有 Transform 和 Velocity 的实体
for (const [id, [transform, velocity], comps] of view(world, [Transform, Velocity])) {
    // 处理逻辑
}

// 类型安全的组件获取
const [health, shield] = getComponents(world, entityId, [Health, Shield]);
```

### 1.3 事件系统

系统间通过事件队列进行解耦通信：

```typescript
// 推送事件
pushEvent(world, { type: 'Hit', pos: {x, y}, damage, owner, victim });

// 消费事件
const hitEvents = getEvents<HitEvent>(world, 'Hit');
```

**重要规则**：事件必须在当前帧生成和消费，不能跨帧传递。

---

## 2. 主循环

### 2.1 帧管线

引擎的 `framePipeline` 方法按固定顺序执行各系统：

```typescript
private framePipeline(world: World, dt: number) {
    // P1: 决策层
    InputSystem(world, dt);
    SpawnSystem(world, dt);
    BossSystem(world, dt);
    EnemySystem(world, dt);

    // P2: 状态层
    BuffSystem(world, dt);
    WeaponSystem(world, dt);

    // P3: 物理层
    HomingSystem(world, dt);
    MovementSystem(world, dt);
    BounceSystem(world, dt);

    // P4: 交互层
    BombSystem(world, dt);
    CollisionSystem(world, dt);

    // P5: 结算层
    PickupSystem(world, dt);
    ExplosionSystem(world, dt);
    ChainLightningSystem(world);
    DamageResolutionSystem(world, dt);
    LootSystem(world, dt);
    ComboSystem(world, dt);
    LevelSystem(world, dt);

    // P7: 表现层
    CameraSystem(world, dt);
    EffectSystem(world, dt);
    BlinkSystem(world, dt);
    AudioSystem(world, dt);

    // 快照
    buildSnapshot(world, dt);

    // P8: 清理层
    LifetimeSystem(world, dt);
    CleanupSystem(world, dt);

    // 渲染
    RenderSystem(world, dt);
}
```

### 2.2 时间步进

- 使用 `requestAnimationFrame` 驱动
- 时间增量 `dt` 单位为毫秒
- 最大时间增量限制为 100ms，防止失焦后跳跃

---

## 3. 组件设计

### 3.1 组件基类

所有组件继承自 `Component` 基类：

```typescript
// src/engine/types/base.ts
export class Component {
    static check(c: any): boolean {
        return c instanceof this;
    }
}
```

### 3.2 组件分类

#### 空间组件

| 组件 | 字段 | 用途 |
|------|------|------|
| `Transform` | x, y, rot | 世界坐标和旋转 |
| `Velocity` | vx, vy, vrot | 速度向量 |
| `SpeedStat` | maxLinear, maxAngular | 速度上限 |
| `HitBox` | shape, radius/halfWidth/halfHeight, layer | 碰撞盒 |
| `Lifetime` | remaining | 生命周期倒计时 |

#### 战斗组件

| 组件 | 字段 | 用途 |
|------|------|------|
| `Health` | hp, max | 生命值 |
| `Shield` | value, max | 护盾值 |
| `Weapon` | id, ammoType, cooldown, level, pattern | 武器配置 |
| `Bullet` | owner, ammoType, damage, pierceLeft | 子弹状态 |
| `Bomb` | count, maxCount | 炸弹库存 |

#### 特殊效果组件

| 组件 | 字段 | 用途 |
|------|------|------|
| `Homing` | searchRange, turnSpeed, targetId | 导弹索敌 |
| `Chain` | count, range, chainedIds | 连锁闪电 |
| `Explosion` | baseRadius, falloff | 范围爆炸 |
| `Bounce` | bouncesLeft, bounds | 子弹反弹 |
| `DamageOverTime` | damagePerSecond, remaining, interval | 持续伤害 |

#### 意图组件

意图组件是**单帧组件**，由决策系统生成，被物理/战斗系统消费后移除：

| 组件 | 字段 | 生成者 | 消费者 |
|------|------|--------|--------|
| `MoveIntent` | dx, dy, type | InputSystem, EnemySystem | MovementSystem |
| `FireIntent` | firing, angle, targetId | InputSystem, WeaponSystem | WeaponSystem |
| `BombIntent` | - | InputSystem | BombSystem |

---

## 4. 蓝图系统

### 4.1 蓝图定义

蓝图是组件配置的对象字面量，用于创建实体：

```typescript
// src/engine/blueprints/fighters.ts
export const BLUEPRINT_FIGHTER_NEON: Blueprint = {
    Transform: { x: 0, y: 0, rot: 0 },
    Velocity: { vx: 0, vy: 0, vrot: 0 },
    Health: { hp: 150, max: 200 },
    Shield: { value: 100, max: 100 },
    SpeedStat: { maxLinear: 7 * 60, maxAngular: 5 },
    HitBox: { shape: 'circle', radius: 24, layer: CollisionLayer.Player },
    Sprite: { spriteKey: SpriteKey.FIGHTER_NEON, scale: 1 },
    PlayerTag: {},
    Weapon: WEAPON_TABLE[WeaponId.TESLA],
    Bomb: { count: 3, maxCount: 9 },
    OptionCount: { count: 0, maxCount: 2 },
};
```

### 4.2 类型推导

蓝图类型通过 TypeScript 映射类型自动推导：

```typescript
// src/engine/blueprints/base.ts
export type Blueprint = Partial<{
    [K in keyof typeof Components]: ComponentShape<typeof Components[K]>;
}>;

export type ComponentShape<T> = T extends new (arg: infer P) => any
    ? P extends any[] ? never : P
    : never;
```

---

## 5. 碰撞系统

### 5.1 碰撞层

使用位掩码定义碰撞层：

```typescript
// src/engine/types/collision.ts
export enum CollisionLayer {
    None = 0,
    Player = 1 << 0,       // 1
    Enemy = 1 << 1,        // 2
    PlayerBullet = 1 << 2, // 4
    EnemyBullet = 1 << 3,  // 8
    Pickup = 1 << 4,       // 16
}
```

### 5.2 碰撞矩阵

定义哪些层之间需要检测碰撞：

```typescript
const CollisionMatrix = {
    [CollisionLayer.Player]: CollisionLayer.Enemy | CollisionLayer.EnemyBullet | CollisionLayer.Pickup,
    [CollisionLayer.Enemy]: CollisionLayer.Player | CollisionLayer.PlayerBullet,
    [CollisionLayer.PlayerBullet]: CollisionLayer.Enemy,
    [CollisionLayer.EnemyBullet]: CollisionLayer.Player,
    [CollisionLayer.Pickup]: CollisionLayer.Player,
};
```

### 5.3 碰撞形状

支持三种碰撞形状：

| 形状 | 参数 | 适用场景 |
|------|------|----------|
| `circle` | radius | 圆形子弹、小型敌人 |
| `rect` | halfWidth, halfHeight | 矩形敌人、玩家 |
| `capsule` | capRadius, capHeight | 长条形敌人 |

---

## 6. 武器系统

### 6.1 武器配置

武器由 `WeaponSpec` 定义，关联 `AmmoSpec`：

```typescript
// 武器配置
interface WeaponSpec {
    id: WeaponId | EnemyWeaponId;
    ammoType: AmmoType;
    cooldown: number;        // 冷却时间 (ms)
    pattern: WeaponPattern;  // 发射模式
    bulletCount: number;     // 每次发射数量
    spread?: number;         // 散射角度
}

// 弹药配置
interface AmmoSpec {
    id: AmmoType;
    damage: number;
    radius: number;
    speed: number;
    pierce: number;          // 穿透次数
    bounces: number;         // 反弹次数
    onHit: string[];         // 命中效果
    explosion?: number;      // 爆炸半径
    falloff?: number;        // 伤害衰减
}
```

### 6.2 发射模式

| 模式 | 说明 |
|------|------|
| `STRAIGHT` | 固定方向直线发射 |
| `SPREAD` | 扇形散射 |
| `AIMED` | 瞄准目标发射 |
| `RADIAL` | 360度全方位发射 |
| `SPIRAL` | 螺旋递增角度 |
| `RANDOM` | 随机偏移 |
| `FIXED_REAR` | 向后方发射 |
| `SPINNING_RADIAL` | 持续旋转的全向发射 |

### 6.3 武器升级

每个武器有独立的升级路线：

```typescript
interface WeaponLevelSpec {
    level: number;
    damageMultiplier: number;
    fireRateMultiplier: number;
    bulletCount?: number;
    spread?: number;
    homing?: HomingUpgrade;     // 导弹专用
    chain?: ChainUpgrade;       // 特斯拉专用
    explosion?: ExplosionUpgrade; // 等离子专用
}
```

---

## 7. 敌人系统

### 7.1 敌人类型

| ID | 类型 | 特点 |
|----|------|------|
| `NORMAL` | 普通 | 基础敌人 |
| `FAST` | 快速 | 高速低血 |
| `TANK` | 坦克 | 低速高血 |
| `KAMIKAZE` | 自爆 | 接近玩家后爆炸 |
| `ELITE_GUNBOAT` | 精英炮艇 | 高血量多武器 |
| `LASER_INTERCEPTOR` | 激光拦截机 | 发射激光 |
| `MINE_LAYER` | 布雷船 | 布置地雷 |
| `PULSAR` | 脉冲 | 脉冲攻击 |
| `FORTRESS` | 堡垒 | 重型敌人 |
| `STALKER` | 追踪者 | 追踪玩家 |
| `BARRAGE` | 弹幕 | 高密度弹幕 |

### 7.2 Boss 系统

Boss 有独立的 AI 和武器配置：

| Boss ID | 名称 | 特点 |
|---------|------|------|
| `GUARDIAN` | 守护者 | 关卡 1 Boss |
| `INTERCEPTOR` | 拦截者 | 关卡 2 Boss |
| `DESTROYER` | 毁灭者 | 关卡 3 Boss |
| `ANNIHILATOR` | 歼灭者 | 关卡 4 Boss |
| `DOMINATOR` | 主宰者 | 关卡 5 Boss |
| `OVERLORD` | 霸主 | 关卡 6 Boss |
| `TITAN` | 泰坦 | 关卡 7 Boss |
| `COLOSSUS` | 巨像 | 关卡 8 Boss |
| `LEVIATHAN` | 利维坦 | 关卡 9 Boss |
| `APOCALYPSE` | 天启 | 关卡 10 最终 Boss |

---

## 8. 事件系统

### 8.1 事件类型

所有事件继承自 `BaseEvent`：

```typescript
// src/engine/events/base.ts
export interface BaseEvent<T extends string> {
    type: T;
}
```

### 8.2 主要事件

| 事件类型 | 字段 | 触发时机 |
|----------|------|----------|
| `Hit` | pos, damage, owner, victim | 碰撞瞬间 |
| `Kill` | pos, victim, killer, score | HP ≤ 0 |
| `Pickup` | pos, itemId, owner | 拾取道具 |
| `WeaponFired` | pos, weaponId, owner | 发射子弹 |
| `BossPhaseChange` | phase, bossId | Boss 阶段切换 |
| `CamShake` | intensity, duration | 震屏效果 |
| `LevelUp` | oldLevel, newLevel, source | 玩家升级 |
| `ComboBreak` | combo, reason | 连击中断 |
| `Explosion` | pos, radius, damage, owner | 范围爆炸 |
| `ChainLightning` | fromX, fromY, toId, count | 连锁闪电 |

---

## 9. 渲染系统

### 9.1 精灵管理

使用 `SpriteManager` 管理所有精灵资源：

```typescript
// 精灵键定义
export enum SpriteKey {
    FIGHTER_NEON = 'fighter_neon',
    OPTION = 'option',
    ENEMY_NORMAL = 'enemy_normal',
    // ...
}

// 精灵配置
interface SpriteConfig {
    src: string;      // 图像路径
    frameW: number;   // 帧宽度
    frameH: number;   // 帧高度
    frames: number;   // 总帧数
    duration: number; // 动画时长 (ms)
}
```

### 9.2 相机系统

相机支持震动和缩放效果：

```typescript
interface CameraState {
    x: number;          // 偏移 X
    y: number;          // 偏移 Y
    shakeX: number;     // 震动 X
    shakeY: number;     // 震动 Y
    zoom: number;       // 缩放比例
    shakeTimer: number; // 震动计时器
    shakeIntensity: number; // 震动强度
}
```

---

## 10. 存储系统

### 10.1 存储架构

```
src/engine/storage/
├── base/
│   ├── IStorageBackend.ts      # 存储后端接口
│   └── LocalStorageBackend.ts  # LocalStorage 实现
├── GameStorage.ts              # 游戏数据存储
├── StorageEventListener.ts     # 存储事件监听
└── types.ts                    # 类型定义
```

### 10.2 存储数据

- 游戏设置（音量、控制模式等）
- 解锁进度（战机、武器）
- 最高分数
- 成就记录

---

## 11. 性能优化

### 11.1 对象池

频繁创建销毁的实体使用对象池：

```typescript
// src/engine/world.ts
export const pools: Record<string, Component[][]> = {
    bullet: [],
    enemy: [],
    pickup: [],
};

export function returnToPool(pool: string, comps: Component[]) {
    comps.length = 0;
    pools[pool].push(comps);
}

export function getFromPool(pool: string): Component[] {
    return pools[pool].pop() ?? [];
}
```

### 11.2 性能监控

引擎内置性能监控器，可追踪各系统耗时：

```typescript
// 获取性能数据流
engine.performanceStream.subscribe(snapshot => {
    console.log('Frame time:', snapshot.frameTimeMs);
    console.log('System times:', snapshot.systemTimes);
});
```

---

## 12. 测试策略

### 12.1 测试目录结构

```
tests/
├── components/        # 组件测试
├── systems/           # 系统测试
├── integration/       # 集成测试
├── performance/       # 性能测试
├── blueprints/        # 蓝图测试
├── configs/           # 配置测试
├── unit/              # 单元测试
└── setup.ts           # 测试环境设置
```

### 12.2 测试命名约定

- `*.test.ts` - 测试文件
- `*.integration.test.ts` - 集成测试
- `*.performance.test.ts` - 性能测试

---

## 13. 扩展指南

### 13.1 添加新组件

1. 在 `src/engine/components/` 创建组件文件
2. 继承 `Component` 基类
3. 在 `src/engine/components/index.ts` 导出
4. 添加 JSDoc 注释

### 13.2 添加新系统

1. 在 `src/engine/systems/` 创建系统文件
2. 导出系统函数 `(world: World, dt: number) => void`
3. 在 `src/engine/systems/index.ts` 导出
4. 在 `src/engine/engine.ts` 的 `framePipeline` 中注册
5. 添加 JSDoc 注释说明处理的组件类型

### 13.3 添加新武器

1. 在 `src/engine/types/ids.ts` 添加 `WeaponId` 和 `AmmoType`
2. 在 `src/engine/blueprints/weapons.ts` 添加武器和弹药配置
3. 在 `src/engine/configs/sprites/bullets.ts` 添加子弹精灵配置
4. 如有特殊效果，在 `WeaponSystem` 或新建系统处理

---

## 14. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 3.0.0 | 2026-02 | ECS 架构重构完成 |
| 2.x | - | React 组件化架构 |
| 1.x | - | 初始版本 |