# HitBox 调试渲染功能设计

**日期**: 2026-02-12
**作者**: Claude Code
**状态**: 设计完成

---

## 1. 需求概述

在新引擎的渲染系统中添加调试功能，当 debug 开关打开时，将所有实体的 HitBox 用虚线绘制出来，帮助开发者可视化和调试碰撞检测。

### 功能要求
- **显示范围**: 所有带 HitBox 组件的实体
- **视觉样式**: 使用虚线绘制，按 CollisionLayer 区分颜色
- **开关控制**: 通过 DebugConfig 统一管理

---

## 2. 技术方案

### 2.1 实现方式

采用 **独立函数 + 条件调用** 的方式：

| 方案 | 描述 |
|------|------|
| **函数封装** | 在 RenderSystem 中新增 `drawDebugHitBoxes()` 函数 |
| **条件调用** | 在主渲染函数末尾，根据 debug 开关决定是否调用 |
| **职责分离** | debug 渲染与正常渲染逻辑完全分离 |

**选择理由**:
- 代码清晰，易于维护
- 不污染核心渲染逻辑
- 易于开关和扩展

### 2.2 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/engine/config/DebugConfig.ts` | 新增 `render.showHitBoxes` 配置项 |
| `src/engine/systems/RenderSystem.ts` | 新增 debug 渲染函数及调用逻辑 |

---

## 3. 详细设计

### 3.1 DebugConfig 扩展

```typescript
export const DebugConfig = {
    /** 渲染系统调试 */
    render: {
        enabled: false,
        logEntities: false,
        showHitBoxes: false,  // ← 新增：显示 HitBox 调试视图
    },
    // ...
};
```

### 3.2 颜色映射

按 CollisionLayer 定义颜色映射表：

```typescript
/** HitBox 调试渲染颜色映射 */
const HITBOX_COLORS: Record<CollisionLayer, string> = {
    [CollisionLayer.Player]: '#00ff00',        // 绿色 - 玩家
    [CollisionLayer.Enemy]: '#ff4444',         // 红色 - 敌人
    [CollisionLayer.PlayerBullet]: '#00ffff',    // 青色 - 玩家子弹
    [CollisionLayer.EnemyBullet]: '#ff6b6b',    // 浅红 - 敌人子弹
    [CollisionLayer.Pickup]: '#ffff00',         // 黄色 - 道具
    [CollisionLayer.Obstacle]: '#888888',       // 灰色 - 障碍物
    // ... 其他层级
};
```

### 3.3 渲染函数设计

```typescript
/**
 * 绘制调试用 HitBox 虚线框
 *
 * @param ctx Canvas 2D 渲染上下文
 * @param world World 对象
 * @param camX 相机 X 偏移
 * @param camY 相机 Y 偏移
 */
function drawDebugHitBoxes(
    ctx: CanvasRenderingContext2D,
    world: World,
    camX: number,
    camY: number
): void {
    ctx.save();

    // 遍历所有带 Transform + HitBox 的实体
    for (const [id, [transform, hitbox]] of view(world, [Transform, HitBox])) {
        const x = transform.x - camX;
        const y = transform.y - camY;

        // 获取颜色
        const color = HITBOX_COLORS[hitbox.layer] || '#ffffff';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);  // 虚线效果

        // 根据形状绘制
        switch (hitbox.shape) {
            case 'circle':
                drawCircleHitbox(ctx, x, y, hitbox.radius!);
                break;
            case 'rect':
                drawRectHitbox(ctx, x, y, hitbox.halfWidth!, hitbox.halfHeight!);
                break;
            case 'capsule':
                drawCapsuleHitbox(ctx, x, y, hitbox.capRadius!, hitbox.capHeight!);
                break;
        }
    }

    ctx.restore();
}
```

### 3.4 形状绘制辅助函数

```typescript
/** 绘制圆形 HitBox */
function drawCircleHitbox(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

/** 绘制矩形 HitBox */
function drawRectHitbox(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, hh: number): void {
    ctx.beginPath();
    ctx.rect(x - hw, y - hh, hw * 2, hh * 2);
    ctx.stroke();
}

/** 绘制胶囊形 HitBox */
function drawCapsuleHitbox(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, h: number): void {
    const halfHeight = h / 2;
    // 上半圆 + 矩形 + 下半圆
    ctx.beginPath();
    ctx.arc(x, y - halfHeight, r, Math.PI, 0);
    ctx.arc(x, y + halfHeight, r, 0, Math.PI);
    ctx.closePath();
    ctx.stroke();
}
```

### 3.5 RenderSystem 主函数修改

在 `RenderSystem` 主函数末尾（所有正常渲染完成后）添加：

```typescript
export function RenderSystem(world: World, dt: number): void {
    // ... 现有渲染逻辑 ...

    // Debug: 绘制 HitBox（在所有内容之上）
    if (DebugConfig.render.showHitBoxes) {
        drawDebugHitBoxes(context, world, camX, camY);
    }
}
```

---

## 4. 实现检查清单

- [ ] 扩展 `DebugConfig` 添加 `render.showHitBoxes`
- [ ] 创建 `HITBOX_COLORS` 颜色映射表
- [ ] 实现 `drawDebugHitBoxes()` 主函数
- [ ] 实现三种形状的辅助绘制函数
- [ ] 在 `RenderSystem` 主函数中添加条件调用
- [ ] 测试各 CollisionLayer 的颜色显示
- [ ] 测试三种形状（circle/rect/capsule）的渲染

---

## 5. 后续扩展（可选）

1. **显示额外信息**: 在 HitBox 旁边显示 CollisionLayer 名称或尺寸
2. **交互式开关**: 添加快捷键（如 F1）动态切换 debug 视图
3. **性能监控**: 统计每帧绘制的 HitBox 数量
