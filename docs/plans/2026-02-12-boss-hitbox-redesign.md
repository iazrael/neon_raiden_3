# Boss HitBox 重构设计

**日期**: 2026-02-12
**状态**: 设计中
**优先级**: 中

## 背景

Boss 精灵图已更新为 PNG 格式，尺寸也相应变化。原有的 HitBox 配置（统一使用圆形，半径为 boss radius 的 80%）不再匹配新的视觉设计。

## 目标

1. 根据每个 Boss 的视觉外形选择合适的 HitBox 形状（circle/rect）
2. 调整 HitBox 尺寸为精灵尺寸的 40-50%（而非 80%），使判定区更精确
3. 保持游戏性体验的同时提升判定准确性

## Boss 外形分析

| BossId | 外形描述 | 精灵尺寸 | 宽高比 | HitBox 形状 |
|--------|----------|----------|--------|-------------|
| GUARDIAN | 圆形圣甲虫 | 150×150 | 1.00 | circle |
| INTERCEPTOR | 竖长大黄蜂 | 235×185 | 1.27 | rect |
| DESTROYER | 竖长甲虫 | 125×220 | 0.57 | rect |
| DOMINATOR | 方正机械水母 | 150×150 | 1.00 | circle |
| OVERLORD | 竖长天牛 | 170×234 | 0.73 | rect |
| TITAN | 方正飞蛾 | 150×174 | 0.86 | rect |
| COLOSSUS | 方形蜘蛛 | 200×200 | 1.00 | circle |
| LEVIATHAN | 环状蜈蚣 | 200×200 | 1.00 | circle |
| ANNIHILATOR | 方形蝙蝠 | 169×165 | 1.02 | rect |
| APOCALYPSE | 巨龙（下方留白） | 230×190 | 1.21 | rect |

## HitBox 配置方案

| BossId | 形状 | 参数 | 计算说明 |
|--------|------|------|----------|
| GUARDIAN | circle | radius: 60 | 150 × 0.4 |
| INTERCEPTOR | rect | halfWidth: 70, halfHeight: 55 | 235×0.3, 185×0.3 |
| DESTROYER | rect | halfWidth: 40, halfHeight: 80 | 125×0.32, 220×0.36 |
| DOMINATOR | circle | radius: 50 | 150 × 0.33 |
| OVERLORD | rect | halfWidth: 60, halfHeight: 90 | 170×0.35, 234×0.38 |
| TITAN | rect | halfWidth: 50, halfHeight: 60 | 150×0.33, 174×0.34 |
| COLOSSUS | circle | radius: 70 | 200 × 0.35 |
| LEVIATHAN | circle | radius: 80 | 200 × 0.4 |
| ANNIHILATOR | rect | halfWidth: 60, halfHeight: 55 | 169×0.35, 165×0.33 |
| APOCALYPSE | rect | halfWidth: 80, halfHeight: 60 | 230×0.35, 190×0.32（考虑下方留白） |

## 设计原则

1. **形状选择**：
   - 完全正方形（宽高比 1:1）使用 `circle`
   - 其他情况使用 `rect`

2. **尺寸计算**：
   - 圆形：radius = 边长 × 0.33~0.4
   - 矩形：halfWidth = 宽度 × 0.3~0.35，halfHeight = 高度 × 0.3~0.38
   - APOCALYPSE 特殊处理：下方留白，halfHeight 减小

3. **游戏性考虑**：
   - HitBox 尺寸约为视觉体积的 40-50%
   - 判定区比视觉略小，提升玩家闪避体验

## 实现计划

### 修改范围

文件：`src/engine/blueprints/bosses.ts`

修改 `createBossBlueprint` 函数，添加基于 BossId 的 HitBox 配置映射。

### 代码结构

```typescript
// Boss HitBox 配置映射
const BOSS_HITBOX_CONFIG: Record<BossId, {
    shape: 'circle' | 'rect';
    radius?: number;
    halfWidth?: number;
    halfHeight?: number;
}> = {
    [BossId.GUARDIAN]: { shape: 'circle', radius: 60 },
    [BossId.INTERCEPTOR]: { shape: 'rect', halfWidth: 70, halfHeight: 55 },
    // ... 其他 boss
};

function createBossBlueprint(...): Blueprint {
    // ...
    const hitboxConfig = BOSS_HITBOX_CONFIG[bossId];
    return {
        // ...
        HitBox: {
            shape: hitboxConfig.shape,
            layer: CollisionLayer.Enemy,
            ...hitboxConfig
        },
        // ...
    };
}
```

## 后续优化

### TODO: HitBox Pivot 偏移支持

当前 HitBox 的中心点是 `Transform.x/y`，而 Sprite 的渲染中心受 `pivotX/pivotY` 影响。如果两者不一致，会导致视觉中心和碰撞中心错位。

**潜在解决方案**：
1. 为 HitBox 添加 `offsetX/offsetY` 字段
2. 在碰撞检测时应用偏移
3. 修改 `CollisionSystem.ts` 中的相关函数

**影响文件**：
- `src/engine/components/base.ts` - HitBox 组件
- `src/engine/systems/CollisionSystem.ts` - 碰撞检测逻辑

## 验证计划

1. 运行游戏，测试每个 Boss 的碰撞判定
2. 确认 HitBox 与视觉外形基本对齐
3. 验证游戏体验（判定区域是否合理）
