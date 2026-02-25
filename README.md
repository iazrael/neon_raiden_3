# Neon Raiden III (霓电战记III)

基于 **ECS 架构** 的高性能网页飞行射击游戏。

## 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **样式**: TailwindCSS 4
- **音频**: Tone.js (程序化音效生成)
- **状态管理**: RxJS (响应式快照流)
- **测试**: Jest 30

## 架构概览

项目采用 **ECS (Entity-Component-System)** 架构，实现数据与逻辑的完全解耦。

```
src/engine/
├── components/      # 组件 - 纯数据结构
├── systems/         # 系统 - 纯函数逻辑
├── blueprints/      # 蓝图 - 实体模板
├── configs/         # 配置 - 游戏数值
├── events/          # 事件 - 系统通信
├── types/           # 类型定义
├── world.ts         # 世界状态与工具函数
├── engine.ts        # 主循环与系统编排
└── factory.ts       # 实体工厂函数
```

### 系统分层

系统按职责分为 8 层，严格按顺序执行：

| 层级 | 名称 | 职责 | 系统 |
|------|------|------|------|
| P1 | 决策层 | 输入与 AI | InputSystem, SpawnSystem, BossSystem, EnemySystem |
| P2 | 状态层 | 数值更新 | BuffSystem, WeaponSystem |
| P3 | 物理层 | 位移计算 | HomingSystem, MovementSystem, BounceSystem |
| P4 | 交互层 | 碰撞检测 | BombSystem, CollisionSystem |
| P5 | 结算层 | 事件处理 | PickupSystem, ExplosionSystem, ChainLightningSystem, DamageResolutionSystem, LootSystem, ComboSystem, LevelSystem |
| P7 | 表现层 | 视听反馈 | CameraSystem, EffectSystem, BlinkSystem, AudioSystem |
| P8 | 清理层 | 生命周期 | LifetimeSystem, CleanupSystem |

### 组件分类

| 类别 | 组件 | 说明 |
|------|------|------|
| 空间 | Transform, Velocity, SpeedStat, HitBox, Lifetime | 位置、速度、碰撞盒、生命周期 |
| 战斗 | Health, Shield, Weapon, Bullet, Bomb | 生命值、护盾、武器、子弹、炸弹 |
| 增益 | DamageOverTime, InvulnerableState, TimeSlowState | 持续伤害、无敌、时间减速 |
| 特殊 | Homing, Chain, Explosion, Bounce | 导弹索敌、连锁闪电、范围爆炸、反弹 |
| 意图 | MoveIntent, FireIntent, BombIntent | 单帧意图，系统间通信 |
| 标签 | PlayerTag, EnemyTag, BossTag | 实体类型标识 |
| 渲染 | Sprite, Particle | 精灵、粒子效果 |

## 游戏特性

### 关卡系统
- **10 个关卡**：难度逐级提升
- **10 种 Boss**：Guardian、Interceptor、Destroyer、Annihilator、Dominator、Overlord、Titan、Colossus、Leviathan、Apocalypse
- **动态难度**：敌人属性随关卡增长

### 武器系统
8 种独特武器，每种都有升级路线：

| 武器 | 特性 |
|------|------|
| **Vulcan** | 散弹扇形发射 |
| **Laser** | 激光束穿透 |
| **Missile** | 追踪导弹 |
| **Wave** | 波动脉冲 |
| **Plasma** | 等离子球范围爆炸 |
| **Tesla** | 电磁连锁闪电 |
| **Magma** | 熔岩池持续伤害 |
| **Shuriken** | 手里剑反弹 |

### 敌人类型
- **普通敌人**：Normal、Fast、Tank、Kamikaze
- **精英敌人**：EliteGunboat、LaserInterceptor、MineLayer、Pulsar、Fortress、Stalker、Barrage

### 辅助系统
- **连击系统**：连击数影响伤害倍率，100 连击触发狂暴模式
- **护盾系统**：可恢复的额外生命值
- **僚机系统**：环绕玩家的辅助射击单位
- **炸弹系统**：清屏大招，最多持有 9 颗

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 类型检查
pnpm lint

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage

# 构建生产版本
pnpm build
```

## 项目结构

```
neon_raiden/
├── src/
│   ├── engine/           # ECS 引擎核心
│   │   ├── components/   # 组件定义
│   │   ├── systems/      # 系统逻辑
│   │   ├── blueprints/   # 实体蓝图
│   │   ├── configs/      # 配置常量
│   │   ├── events/       # 事件定义
│   │   ├── types/        # 类型定义
│   │   ├── utils/        # 工具函数
│   │   ├── input/        # 输入管理
│   │   ├── storage/      # 存储管理
│   │   ├── settings/     # 设置管理
│   │   ├── audio/        # 音频系统
│   │   └── logger/       # 日志系统
│   ├── views/            # React UI 组件
│   ├── App.tsx           # 应用入口
│   └── main.tsx          # 启动入口
├── tests/                # 测试用例
├── public/               # 静态资源
└── package.json
```

## 核心设计原则

1. **组件纯数据**：组件只存储数据，不包含任何逻辑
2. **系统纯函数**：系统是无状态的纯函数，输入 World 和 deltaTime
3. **事件解耦**：系统间通过事件队列通信，事件不跨帧传递
4. **类型安全**：全项目禁止使用 `any`，使用 TypeScript 类型推导
5. **JSDoc 注释**：所有公开 API 必须有文档注释

## 许可证

MIT