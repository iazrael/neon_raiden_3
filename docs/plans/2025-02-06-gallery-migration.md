# Gallery 组件迁移计划

## 概述

将 Gallery 组件从老版本配置（`game/config`）迁移到新版本配置（`src/engine/configs/gallery`），统一使用新的类型系统和存储机制。

**日期**: 2025-02-06
**状态**: 待实施

---

## 1. 类型映射关系

| 老版本 | 新版本 | 值是否一致 |
|--------|--------|------------|
| `WeaponType` | `WeaponId` | ✅ 完全一致 |
| `EnemyType` | `EnemyId` | ✅ 完全一致 |
| `BossType` | `BossId` | ✅ 完全一致 |
| `FighterType.PLAYER` | `FighterId.NEON` | ⚠️ 值不同 |

---

## 2. 变更文件清单

### 2.1 类型定义

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/configs/base.ts` | 修改 | `GalleryEntry` 添加 `sprite: SpriteKey` 和 `color: string` |
| `src/engine/configs/sprites/base.ts` | 修改 | `SpriteKey.PLAYER` 改名为 `SpriteKey.FIGHTER_NEON` |

### 2.2 图鉴配置

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/configs/gallery/weapons.ts` | 修改 | 添加 `sprite` 和 `color` 到每个条目 |
| `src/engine/configs/gallery/enemies.ts` | 修改 | 添加 `sprite` 和 `color` 到每个条目 |
| `src/engine/configs/gallery/bosses.ts` | 修改 | 添加 `sprite` 和 `color` 到每个条目 |
| `src/engine/configs/gallery/fighters.ts` | 修改 | 添加 `sprite` 和 `color` 到每个条目 |
| `src/engine/configs/gallery/unlock.ts` | **新建** | 解锁检查函数模块 |
| `src/engine/configs/gallery/index.ts` | 修改 | 导出 unlock 模块 |

### 2.3 组件文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/gallery/types.ts` | 修改 | 使用新类型结构，移除老版本引用 |
| `components/Gallery.tsx` | 修改 | 使用新配置导入，重构数据源 |
| `components/gallery/ItemList.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/ItemDetailPanel.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/WeaponListItem.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/WeaponDetail.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/EnemyListItem.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/EnemyDetail.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/BossListItem.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/BossDetail.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/FighterListItem.tsx` | 修改 | 适配新数据结构 |
| `components/gallery/FighterDetail.tsx` | 修改 | 适配新数据结构 |

---

## 3. 详细变更内容

### 3.1 `GalleryEntry` 类型更新

**文件**: `src/engine/configs/base.ts`

```typescript
import { SpriteKey } from './sprites/base';

export type GalleryEntry = {
    id: string;
    name: string;
    chineseName: string;
    description: string;
    rarity: string;
    unlock: string;
    unlockParam: number;
    // 新增字段
    sprite: SpriteKey;    // 引用 SpriteKey 枚举
    color: string;        // 主题颜色 (hex + alpha)
};
```

### 3.2 SpriteKey 枚举更新

**文件**: `src/engine/configs/sprites/base.ts`

```typescript
export enum SpriteKey {
    // 修改：PLAYER -> FIGHTER_NEON
    FIGHTER_NEON = "player",
    OPTION = "option",
    // ... 其他保持不变
}
```

同时更新 `SPRITE_REGISTRY` 中的 key 引用。

### 3.3 图鉴配置更新

**示例** (`weapons.ts`):

```typescript
import { WeaponId } from '../../types/ids';
import { GalleryEntry } from '../base';
import { SpriteKey } from '../sprites/base';

export const GALLERY_WEAPONS: Record<WeaponId, GalleryEntry> = {
  [WeaponId.VULCAN]: {
    id: WeaponId.VULCAN,
    name: 'Vulcan Gun',
    chineseName: '星裂火神炮',
    description: '智能弹道预测系统根据敌机密度自动调整扇形覆盖...',
    rarity: 'common',
    unlock: 'default',
    unlockParam: 0,
    sprite: SpriteKey.BULLET_VULCAN,
    color: '#ebdd17ff',
  },
  // ... 其他武器
};
```

### 3.4 解锁检查模块

**新建文件**: `src/engine/configs/gallery/unlock.ts`

```typescript
import { WeaponId, EnemyId, BossId, FighterId } from '../../types/ids';
import { GameStorage } from '../../storage/GameStorage';

/**
 * 获取存储实例（确保已初始化）
 */
function getStorage(): GameStorage {
    return GameStorage.getInstance();
}

/**
 * 检查武器是否已解锁
 */
export function isWeaponUnlocked(weaponId: WeaponId): boolean {
    try {
        const storage = getStorage();
        const stats = storage.getWeaponStats(weaponId);
        return stats?.unlocked ?? false;
    } catch {
        return false;
    }
}

/**
 * 检查敌人是否已解锁
 */
export function isEnemyUnlocked(enemyId: EnemyId): boolean {
    try {
        const storage = getStorage();
        const stats = storage.getEnemyStats(enemyId);
        return stats?.unlocked ?? false;
    } catch {
        return false;
    }
}

/**
 * 检查 Boss 是否已解锁
 */
export function isBossUnlocked(bossId: BossId): boolean {
    try {
        const storage = getStorage();
        const stats = storage.getBossStats(bossId);
        return stats?.unlocked ?? false;
    } catch {
        return false;
    }
}

/**
 * 检查战机是否已解锁
 */
export function isFighterUnlocked(fighterId: FighterId): boolean {
    try {
        const storage = getStorage();
        const stats = storage.getFighterStats(fighterId);
        return stats?.unlocked ?? false;
    } catch {
        return false;
    }
}
```

### 3.5 组件类型更新

**文件**: `components/gallery/types.ts`

```typescript
import { WeaponId, EnemyId, BossId, FighterId } from '@/engine/types/ids';
import { GalleryEntry } from '@/engine/configs/base';

export interface BaseItem {
  name: string;
  chineseName: string;
  description: string;
}

export interface FighterItem extends BaseItem {
  id: FighterId;
  entry: GalleryEntry;
  isUnlocked: boolean;
}

export interface WeaponItem extends BaseItem {
  id: WeaponId;
  entry: GalleryEntry;
  isUnlocked: boolean;
}

export interface EnemyItem extends BaseItem {
  id: EnemyId;
  entry: GalleryEntry;
  isUnlocked: boolean;
}

export interface BossItem extends BaseItem {
  id: BossId;
  entry: GalleryEntry;
  isUnlocked: boolean;
}
```

### 3.6 Gallery 主组件更新

**文件**: `components/Gallery.tsx`

**导入变更**:
```typescript
// 移除老版本导入
// import { WeaponConfig, EnemyConfig, BossConfig, PlayerConfig, ASSETS_BASE_PATH } from '@/game/config';
// import { isWeaponUnlocked, isEnemyUnlocked, isBossUnlocked } from '@/game/unlockedItems';

// 新版本导入
import { GALLERY_WEAPONS, GALLERY_ENEMIES, GALLERY_BOSSES, GALLERY_FIGHTERS } from '@/engine/configs/gallery';
import { isWeaponUnlocked, isEnemyUnlocked, isBossUnlocked, isFighterUnlocked } from '@/engine/configs/gallery/unlock';
import { getSpritePath } from '@/engine/configs/sprites/base';
import { WeaponId, EnemyId, BossId, FighterId } from '@/engine/types/ids';
```

**数据源重构**:
```typescript
// 武器数据
const weapons: WeaponItem[] = Object.values(GALLERY_WEAPONS).map((entry) => ({
  id: entry.id as WeaponId,
  entry: {
    name: entry.name,
    chineseName: entry.chineseName,
    description: entry.description,
  },
  isUnlocked: isWeaponUnlocked(entry.id as WeaponId)
}));

// 敌人数据
const enemies: EnemyItem[] = Object.values(GALLERY_ENEMIES).map((entry) => ({
  id: entry.id as EnemyId,
  entry: {
    name: entry.name,
    chineseName: entry.chineseName,
    description: entry.description,
  },
  isUnlocked: isEnemyUnlocked(entry.id as EnemyId)
}));

// Boss 数据
const bosses: BossItem[] = Object.values(GALLERY_BOSSES).map((entry) => ({
  id: entry.id as BossId,
  entry: {
    name: entry.name,
    chineseName: entry.chineseName,
    description: entry.description,
  },
  isUnlocked: isBossUnlocked(entry.id as BossId)
}));

// 战机数据
const fighters: FighterItem[] = Object.values(GALLERY_FIGHTERS).map((entry) => ({
  id: entry.id as FighterId,
  entry: {
    name: entry.name,
    chineseName: entry.chineseName,
    description: entry.description,
  },
  isUnlocked: isFighterUnlocked(entry.id as FighterId)
}));
```

**Sprite 获取重构**:
```typescript
// 旧代码
const getSpriteSrc = (item: any, tab: Tab): string => {
    if (tab === 'FIGHTERS') return `${ASSETS_BASE_PATH}fighters/${item.config.sprite}.svg`;
    if (tab === 'ARMORY') return `${ASSETS_BASE_PATH}bullets/${item.config.sprite}.svg`;
    // ...
};

// 新代码
const getSpriteSrc = (item: FighterItem | WeaponItem | EnemyItem | BossItem): string => {
    return getSpritePath(item.entry.sprite);
};
```

---

## 4. 颜色值参考

### 4.1 武器颜色

| 武器 | color |
|------|-------|
| vulcan | `#ebdd17ff` |
| laser | `#3fc4f0ff` |
| missile | `#ec6f73` |
| wave | `#1e8de7ff` |
| plasma | `#ed64a6` |
| tesla | `#1053d9ff` |
| magma | `#f60` |
| shuriken | `#ccccccff` |

### 4.2 敌人颜色

| 敌人 | color |
|------|-------|
| normal | `#ff4444` |
| fast | `#aa44ff` |
| tank | `#44ff44` |
| kamikaze | `#ffaa44` |
| elite_gunboat | `#4444ff` |
| laser_interceptor | `#44ffff` |
| mine_layer | `#aaaa44` |
| pulsar | `#ff44ff` |
| fortress | `#666666` |
| stalker | `#ff8844` |
| barrage | `#8844ff` |

### 4.3 Boss 颜色

| Boss | color |
|------|-------|
| guardian | `#4488ff` |
| interceptor | `#ff4488` |
| destroyer | `#44ff88` |
| annihilator | `#ff8844` |
| dominator | `#8844ff` |
| overlord | `#ff44ff` |
| titan | `#44ff44` |
| colossus | `#ffff44` |
| leviathan | `#44ffff` |
| apocalypse | `#ff0000` |

### 4.4 战机颜色

| 战机 | color |
|------|-------|
| neon_7 | `#00ffff` |

---

## 5. Sprite 映射关系

### 5.1 武器

| WeaponId | SpriteKey |
|----------|-----------|
| vulcan | `BULLET_VULCAN` |
| laser | `BULLET_LASER` |
| missile | `BULLET_MISSILE` |
| wave | `BULLET_WAVE` |
| plasma | `BULLET_PLASMA` |
| tesla | `BULLET_TESLA` |
| magma | `BULLET_MAGMA` |
| shuriken | `BULLET_SHURIKEN` |

### 5.2 敌人

| EnemyId | SpriteKey |
|---------|-----------|
| normal | `ENEMY_NORMAL` |
| fast | `ENEMY_FAST` |
| tank | `ENEMY_TANK` |
| kamikaze | `ENEMY_KAMIKAZE` |
| elite_gunboat | `ENEMY_GUNBOAT` |
| laser_interceptor | `ENEMY_INTERCEPTOR` |
| mine_layer | `ENEMY_LAYER` |
| pulsar | `ENEMY_PULSAR` |
| fortress | `ENEMY_FORTRESS` |
| stalker | `ENEMY_STALKER` |
| barrage | `ENEMY_BARRAGE` |

### 5.3 Boss

| BossId | SpriteKey |
|--------|-----------|
| guardian | `BOSS_GUARDIAN` |
| interceptor | `BOSS_INTERCEPTOR` |
| destroyer | `BOSS_DESTROYER` |
| annihilator | `BOSS_ANNIHILATOR` |
| dominator | `BOSS_DOMINATOR` |
| overlord | `BOSS_OVERLORD` |
| titan | `BOSS_TITAN` |
| colossus | `BOSS_COLOSSUS` |
| leviathan | `BOSS_LEVIATHAN` |
| apocalypse | `BOSS_APOCALYPSE` |

### 5.4 战机

| FighterId | SpriteKey |
|-----------|-----------|
| neon_7 | `FIGHTER_NEON` (原 `PLAYER`) |

---

## 6. 实施步骤

1. **修改类型定义**
   - 更新 `src/engine/configs/base.ts` 中的 `GalleryEntry`
   - 修改 `src/engine/configs/sprites/base.ts` 中的 `SpriteKey.PLAYER`

2. **更新图鉴配置**
   - 更新 `weapons.ts` 添加 sprite 和 color
   - 更新 `enemies.ts` 添加 sprite 和 color
   - 更新 `bosses.ts` 添加 sprite 和 color
   - 更新 `fighters.ts` 添加 sprite 和 color

3. **创建解锁模块**
   - 新建 `src/engine/configs/gallery/unlock.ts`
   - 更新 `src/engine/configs/gallery/index.ts` 导出

4. **更新组件类型**
   - 修改 `components/gallery/types.ts`

5. **更新 Gallery 主组件**
   - 修改 `components/Gallery.tsx`

6. **更新子组件**
   - 更新各个 `*ListItem.tsx` 和 `*Detail.tsx` 组件

7. **测试验证**
   - 运行 `pnpm lint`
   - 运行 `pnpm build`
   - 运行 `pnpm test`

---

## 7. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 新旧存储格式不兼容 | 存档丢失 | 保留老版本解锁逻辑作为降级方案 |
| Sprite 路径变更 | 图片无法显示 | 使用 `getSpritePath()` 统一处理 |
| 组件引用变更 | 编译错误 | 逐步替换，确保每步可编译 |
