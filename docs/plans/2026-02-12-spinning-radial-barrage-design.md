# 旋转弹幕系统设计文档

**日期**: 2026-02-12
**需求**: GUARDIAN Boss 第二阶段增加电风扇式旋转弹幕

---

## 一、需求概述

为 GUARDIAN Boss 的第二阶段（血量 50% 以下）增加旋转弹幕特性：
- 弹幕发射方向持续旋转，类似电风扇的单向持续旋转
- 旋转速度：中速（180-240°/秒）
- 覆盖范围：基于现有 `GUARDIAN_RADIAL_ENRAGED` 配置（360° 全向，16 颗子弹）

---

## 二、架构设计

### 2.1 核心方案

新增 `WeaponPattern.SPINNING_RADIAL` 弹幕模式，在现有 `WeaponSystem` 中增加旋转角度累积逻辑。

### 2.2 设计原则

1. **最小改动**：复用现有武器系统，只增加新模式
2. **状态独立**：每个实体的旋转状态独立存储
3. **类型安全**：严格遵循 TypeScript 类型规范
4. **符合 ECS**：状态存在组件，逻辑在系统

---

## 三、数据结构变更

### 3.1 Weapon 组件扩展

**文件**: `src/engine/components/base.ts`

```typescript
export class Weapon extends Component {
    // ... 现有字段

    /** 旋转累积角度（弧度），用于 SPINNING_RADIAL 模式 */
    public spinAngle: number = 0;
}
```

### 3.2 弹幕模式枚举

**文件**: `src/engine/configs/weapons.ts`

```typescript
export enum WeaponPattern {
    STRAIGHT = 'STRAIGHT',
    SPREAD = 'SPREAD',
    AIMED = 'AIMED',
    RADIAL = 'RADIAL',
    SPIRAL = 'SPIRAL',
    RANDOM = 'RANDOM',
    SPINNING_RADIAL = 'SPINNING_RADIAL'  // 新增
}
```

### 3.3 武器配置接口

**文件**: `src/engine/configs/weapons.ts`

```typescript
export interface WeaponSpec {
    // ... 现有字段

    /** 旋转速度（度/秒），仅 SPINNING_RADIAL 模式使用 */
    spinSpeed?: number;
}
```

---

## 四、核心逻辑实现

### 4.1 旋转发射函数

**文件**: `src/engine/systems/WeaponSystem.ts`

```typescript
/**
 * 处理旋转全向弹幕
 * 发射方向随时间持续旋转，每次发射累积角度增量
 *
 * @param ctx 发射上下文
 * @param weapon 武器组件（持有 spinAngle 状态）
 */
function fireSpinningRadial(ctx: FireContext, weapon: Weapon): void {
    const spec = weapon.spec;

    // 获取旋转速度，默认 180°/秒
    const spinSpeedDegPerSec = spec.spinSpeed ?? 180;

    // 计算本次角度增量（度 → 弧度）
    const spinDelta = spinSpeedDegPerSec * ctx.deltaTimeMs / 1000 * Math.PI / 180;

    // 累积旋转角度
    weapon.spinAngle += spinDelta;

    // 防止精度累积溢出，保持在 [0, 2π) 范围
    weapon.spinAngle %= Math.PI * 2;

    // 发射子弹
    const count = spec.bulletCount ?? 8;
    for (let i = 0; i < count; i++) {
        const angle = weapon.spinAngle + (Math.PI * 2 * i / count);
        createBullet(ctx, angle);
    }
}
```

### 4.2 系统集成

**文件**: `src/engine/systems/WeaponSystem.ts`

在 `fireWeaponByPattern` 函数中增加 case 分支：

```typescript
function fireWeaponByPattern(ctx: FireContext, weapon: Weapon): void {
    switch (weapon.spec.pattern) {
        // ... 现有 case
        case WeaponPattern.SPINNING_RADIAL:
            fireSpinningRadial(ctx, weapon);
            break;
        default:
            logger.warn(`Unknown weapon pattern: ${weapon.spec.pattern}`);
    }
}
```

---

## 五、武器配置

**文件**: `src/engine/blueprints/weapons.ts`

```typescript
[EnemyWeaponId.GUARDIAN_RADIAL_ENRAGED]: {
    id: EnemyWeaponId.GUARDIAN_RADIAL_ENRAGED,
    cooldown: 600,
    ammoType: AmmoType.ENEMY_ORB_BLUE,
    bulletCount: 16,
    pattern: WeaponPattern.SPINNING_RADIAL,  // 改为新模式
    spinSpeed: 216  // 216°/秒 = 0.6 圈/秒，约 1.67 秒转一圈
}
```

**计算说明**：
- `spinSpeed: 216` 度/秒
- 每 600ms (cooldown) 发射一次
- 每次角度增量 = 216 × 0.6 = 129.6°
- 约 2.78 次发射完成 360° 旋转

---

## 六、数据流与调用链

```
GameLoop
    └── BossPhaseSystem
            └── 检测血量 < 50%
                    └── 更新 BossAI.phase = 1
                            └── 切换武器为 GUARDIAN_RADIAL_ENRAGED

GameLoop
    └── WeaponSystem.fireWeapons
            └── 检查 cooldown
                    └── pattern === SPINNING_RADIAL
                            └── fireSpinningRadial
                                    ├── weapon.spinAngle += spinDelta
                                    └── 创建 16 颗子弹，角度 = spinAngle + i * (360/16)
```

---

## 七、风险与边缘情况

| 风险 | 说明 | 缓解方案 |
|------|------|---------|
| 精度累积误差 | 长时间运行 `spinAngle` 可能溢出 | 每 2π 取模（`spinAngle %= Math.PI * 2`） |
| 武器切换 | 切换武器时旋转状态残留 | 在 `WeaponSystem` 切换武器时重置 `spinAngle = 0` |
| 多实体共享 | 如果多个 Boss 用同一武器，状态可能冲突 | 状态存在 `Weapon` 组件中，每个实体独立 |
| 初始角度 | 每次进入 P2 初始角度固定 | 可选：首次发射时随机初始化 `spinAngle` |

---

## 八、测试覆盖计划

| 测试场景 | 验证点 |
|---------|-------|
| 基础旋转 | 发射 3 次，每次角度递增约 130° |
| 完整旋转 | 发射约 1.67 秒，角度应完成 360° 循环 |
| 精度取模 | 长时间运行，`spinAngle` 保持在 [0, 2π) 范围 |
| 武器切换 | P1→P2 切换时，`spinAngle` 正确重置 |
| 多 Boss | 两个 Boss 同时使用，旋转角度独立 |
| 边界值 | spinSpeed = 0、负值、极大值 |

---

## 九、实施步骤

1. **扩展类型定义**
   - `Weapon` 组件增加 `spinAngle` 字段
   - `WeaponPattern` 枚举增加 `SPINNING_RADIAL`
   - `WeaponSpec` 接口增加 `spinSpeed` 字段

2. **实现发射逻辑**
   - `WeaponSystem.fireSpinningRadial` 函数

3. **集成到系统**
   - `fireWeaponByPattern` 增加 case 分支

4. **更新武器配置**
   - P2 武器改为 `SPINNING_RADIAL` + `spinSpeed: 216`

5. **编写测试**
   - 覆盖上述测试场景

6. **验证**
   - 运行 `pnpm lint && pnpm test && pnpm build`

---

## 十、修改文件清单

| 文件 | 改动类型 |
|------|---------|
| `src/engine/components/base.ts` | 修改 |
| `src/engine/configs/weapons.ts` | 修改 |
| `src/engine/systems/WeaponSystem.ts` | 修改 |
| `src/engine/blueprints/weapons.ts` | 修改 |
| `tests/weaponSystem.test.ts` | 新增测试 |
