// src/engine/settings/index.ts

export { GameSettings, type GameSettingsOptions } from './GameSettings';
export { type GameSettingsData, type SystemToggleState, KNOWN_SYSTEMS, type SystemName, GAME_SETTINGS_KEY, GAME_SETTINGS_VERSION } from './types';

/**
 * 初始化 GameSettings 单例的便捷函数
 */
import { GameSettings } from './GameSettings';

export async function initGameSettings(options?: import('./GameSettings').GameSettingsOptions): Promise<GameSettings> {
    return await GameSettings.initialize(options);
}
