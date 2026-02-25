# 性能审核指南

## 游戏性能核心指标

### 帧率目标
- **60 FPS**：每帧预算 ~16.6ms
- **120 FPS**：每帧预算 ~8.3ms

### 性能预算分配（60 FPS）
| 系统 | 时间预算 |
|------|----------|
| 输入处理 | 1ms |
| 游戏逻辑 | 8ms |
| 物理模拟 | 3ms |
| 渲染准备 | 2ms |
| 渲染执行 | 2.6ms |

## 关键性能模式

### 1. 对象池模式

**问题**：频繁创建/销毁对象导致 GC 压力

**解决方案**：
```typescript
// 对象池实现
class ObjectPool<T> {
  private pool: T[] = [];

  get(factory: () => T): T {
    return this.pool.pop() ?? factory();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

**适用场景**：
- 子弹/粒子系统
- 临时向量计算
- 事件对象

### 2. 脏标记模式

**问题**：每帧重新计算所有数据

**解决方案**：
```typescript
interface DirtyComponent {
  dirty: boolean;
  version: number;
}

// 仅处理脏标记实体
const dirtyEntities = view(world, ['DirtyComponent']);
for (const entity of dirtyEntities) {
  if (entity.dirtyComponent.dirty) {
    // 重新计算
    entity.dirtyComponent.dirty = false;
  }
}
```

### 3. 空间分区

**问题**：O(n²) 碰撞检测

**解决方案**：
- **网格分区**：均匀划分空间
- **四叉树**：2D 空间动态分区
- **八叉树**：3D 空间动态分区

```typescript
// 简单网格分区示例
const CELL_SIZE = 64;
function getCellKey(x: number, y: number): string {
  return `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
}
```

### 4. 批量处理

**问题**：频繁状态切换导致性能下降

**解决方案**：
```typescript
// 按材质/纹理分组渲染
const batches = new Map<string, Entity[]>();
for (const entity of entities) {
  const material = entity.renderComponent.material;
  if (!batches.has(material)) {
    batches.set(material, []);
  }
  batches.get(material)!.push(entity);
}

// 批量渲染
for (const [material, entities] of batches) {
  setMaterial(material);
  renderEntities(entities);
}
```

## 性能反模式

### ❌ 避免的模式

1. **嵌套循环**
```typescript
// BAD: O(n²)
for (const a of entities) {
  for (const b of entities) {
    checkCollision(a, b);
  }
}

// GOOD: O(n) 使用空间分区
for (const cell of spatialGrid) {
  checkCollisionsInCell(cell);
}
```

2. **热路径对象分配**
```typescript
// BAD: 每帧创建新对象
function update() {
  const temp = { x: 0, y: 0 }; // 每帧分配
  // ...
}

// GOOD: 复用对象
const temp = { x: 0, y: 0 };
function update() {
  temp.x = 0;
  temp.y = 0;
  // ...
}
```

3. **无效的视图查询**
```typescript
// BAD: 每帧重建查询
function system(world: World) {
  const entities = view(world, ['Position', 'Velocity']);
  // ...
}

// GOOD: 缓存查询（如果实体不频繁增删）
const positionVelocityQuery = createQuery(['Position', 'Velocity']);
function system(world: World) {
  const entities = positionVelocityQuery(world);
  // ...
}
```

## 性能分析工具

### 内置分析
```typescript
// 性能计时
function system(world: World, deltaTimeMs: number) {
  const start = performance.now();

  // 系统逻辑...

  const elapsed = performance.now() - start;
  if (elapsed > 1) { // 超过 1ms 警告
    console.warn(`System slow: ${elapsed.toFixed(2)}ms`);
  }
}
```

### 帧时间监控
```typescript
interface FrameStats {
  fps: number;
  frameTime: number;
  systemTimes: Map<string, number>;
}
```

## 事件系统性能

### 事件处理最佳实践

1. **事件队列本帧清空**
```typescript
// 正确：每帧处理完所有事件
while (eventQueue.length > 0) {
  const event = eventQueue.shift()!;
  handleEvent(event);
}
```

2. **避免事件累积**
```typescript
// 错误：事件可能跨帧
setTimeout(() => {
  eventQueue.push(lateEvent); // 跨帧事件
}, 100);
```

## 内存优化

### 类型化数组
```typescript
// 大量数值数据使用 TypedArray
const positions = new Float32Array(maxEntities * 2);
// 更快访问，更低内存
```

### 常量折叠
```typescript
// 编译时常量
const GRAVITY = 9.8;
const DT = 1 / 60;

// 避免运行时计算
const deltaVelocity = GRAVITY * DT; // 预计算
```

## 渲染性能

### 视口剔除
```typescript
// 仅渲染可见实体
function isVisible(entity: Entity, viewport: Rect): boolean {
  return intersects(entity.bounds, viewport);
}
```

### LOD（细节层次）
```typescript
// 根据距离调整细节
function getLOD(distance: number): LODLevel {
  if (distance < 100) return 'high';
  if (distance < 500) return 'medium';
  return 'low';
}
```

### 离屏渲染缓存
```typescript
// 复杂图形缓存为纹理
const cachedTexture = renderToTexture(complexShape);
// 后续直接绘制纹理
```
