import { WeaponId, EnemyId, BossId, FighterId } from '../../types';
import { GameStorage } from '../../storage/GameStorage';

/**
 * 图鉴解锁检查模块
 * 提供统一的接口检查各类实体是否已解锁
 */

/**
 * 获取存储实例（确保已初始化）
 */
function getStorage(): GameStorage {
    return GameStorage.getInstance();
}

/**
 * 检查武器是否已解锁
 * @param weaponId 武器ID
 * @returns 是否已解锁
 */
export function isWeaponUnlocked(weaponId: WeaponId): boolean {
    try {
        const storage = getStorage();
        const stats = storage.getWeaponStats(weaponId);
        return stats?.unlocked ?? false;
    } catch {
        // 存储未初始化，返回默认值
        return false;
    }
}

/**
 * 检查敌人是否已解锁
 * @param enemyId 敌人ID
 * @returns 是否已解锁
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
 * @param bossId Boss ID
 * @returns 是否已解锁
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
 * @param fighterId 战机ID
 * @returns 是否已解锁
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
