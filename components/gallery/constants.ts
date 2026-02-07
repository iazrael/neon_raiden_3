/**
 * 图鉴组件共享常量
 */

/**
 * Boss ID 到关卡的映射
 */
export const BOSS_LEVEL_MAP: Record<string, number> = {
    guardian: 1,
    interceptor: 2,
    destroyer: 3,
    annihilator: 4,
    dominator: 5,
    overlord: 6,
    titan: 7,
    colossus: 8,
    leviathan: 9,
    apocalypse: 10,
};

/**
 * 稀有度对应的 Tailwind CSS 类名
 */
export const RARITY_COLORS: Record<string, string> = {
    common: 'text-gray-300 border-gray-500/30',
    uncommon: 'text-green-300 border-green-500/30',
    rare: 'text-blue-300 border-blue-500/30',
    epic: 'text-purple-300 border-purple-500/30',
    legendary: 'text-orange-300 border-orange-500/30',
    mythic: 'text-red-300 border-red-500/30',
};

/**
 * 获取稀有度对应的 CSS 类名，默认使用 common 样式
 */
export function getRarityClass(rarity: string): string {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}
