/**
 * SoundList.tsx
 *
 * 音效测试列表组件
 */

import React from 'react';
import { ClickType } from '../types';
import { AudioEngine, ExplosionSize } from '@/engine/audio/AudioEngine';
import { WeaponId } from '@/engine';

interface SoundListProps {
    playClick?: (type?: ClickType) => void;
}

interface SoundCategory {
    name: string;
    items: SoundItem[];
}

interface SoundItem {
    id: string;
    name: string;
    chineseName: string;
    play: (audio: AudioEngine) => void;
}

// 武器音效列表
const weaponSounds: SoundItem[] = [
    { id: WeaponId.VULCAN, name: 'VULCAN', chineseName: '转管机枪', play: (a) => a.playShoot(WeaponId.VULCAN) },
    { id: WeaponId.LASER, name: 'LASER', chineseName: '激光', play: (a) => a.playShoot(WeaponId.LASER) },
    { id: WeaponId.MISSILE, name: 'MISSILE', chineseName: '导弹', play: (a) => a.playShoot(WeaponId.MISSILE) },
    { id: WeaponId.WAVE, name: 'WAVE', chineseName: '波浪', play: (a) => a.playShoot(WeaponId.WAVE) },
    { id: WeaponId.PLASMA, name: 'PLASMA', chineseName: '等离子', play: (a) => a.playShoot(WeaponId.PLASMA) },
    { id: WeaponId.TESLA, name: 'TESLA', chineseName: '特斯拉', play: (a) => a.playShoot(WeaponId.TESLA) },
    { id: WeaponId.MAGMA, name: 'MAGMA', chineseName: '岩浆', play: (a) => a.playShoot(WeaponId.MAGMA) },
    { id: WeaponId.SHURIKEN, name: 'SHURIKEN', chineseName: '手里剑', play: (a) => a.playShoot(WeaponId.SHURIKEN) },
];

// 特效音效列表
const sfxSounds: SoundItem[] = [
    { id: 'EXPLOSION_SMALL', name: '小爆炸', chineseName: '小爆炸', play: (a) => a.playExplosion(ExplosionSize.SMALL) },
    { id: 'EXPLOSION_LARGE', name: '大爆炸', chineseName: '大爆炸', play: (a) => a.playExplosion(ExplosionSize.LARGE) },
    { id: 'HIT', name: '击中', chineseName: '击中', play: (a) => a.playHit() },
    { id: 'SHIELD_BREAK', name: '护盾破碎', chineseName: '护盾破碎', play: (a) => a.playShieldBreak() },
    { id: 'BOMB', name: '炸弹', chineseName: '炸弹', play: (a) => a.playBomb() },
    { id: 'POWER_UP', name: '升级金币', chineseName: '升级金币', play: (a) => a.playPowerUp() },
    { id: 'SLOW_MOTION', name: '慢动作进入', chineseName: '慢动作进入', play: (a) => a.playSlowMotionEnter() },
];

// UI 音效列表
const uiSounds: SoundItem[] = [
    { id: 'CONFIRM', name: '确认', chineseName: '确认', play: (a) => a.playClick(ClickType.CONFIRM) },
    { id: 'CANCEL', name: '取消', chineseName: '取消', play: (a) => a.playClick(ClickType.CANCEL) },
    { id: 'MENU', name: '菜单', chineseName: '菜单', play: (a) => a.playClick(ClickType.MENU) },
    { id: 'DEFAULT', name: '默认点击', chineseName: '默认点击', play: (a) => a.playClick(ClickType.DEFAULT) },
];

// 游戏状态音效列表
const stateSounds: SoundItem[] = [
    { id: 'VICTORY', name: '胜利', chineseName: '胜利', play: (a) => a.playVictory() },
    { id: 'DEFEAT', name: '失败', chineseName: '失败', play: (a) => a.playDefeat() },
    { id: 'BOSS_DEFEAT', name: 'Boss 击败', chineseName: 'Boss 击败', play: (a) => a.playBossDefeat() },
    { id: 'LEVEL_UP', name: '升级旋律', chineseName: '升级旋律', play: (a) => a.playLevelUp() },
    { id: 'WARNING', name: 'Boss 警告', chineseName: 'Boss 警告', play: (a) => a.playWarning() },
];

// 音效分类
const soundCategories: SoundCategory[] = [
    { name: '🔫 武器', items: weaponSounds },
    { name: '💥 特效', items: sfxSounds },
    { name: '🎵 UI 音效', items: uiSounds },
    { name: '🎶 游戏状态', items: stateSounds },
];

export const SoundList: React.FC<SoundListProps> = ({ playClick }) => {
    const audioEngine = React.useMemo(() => new AudioEngine(), []);
    const [shieldLoopActive, setShieldLoopActive] = React.useState(false);

    const handlePlaySound = (item: SoundItem) => {
        // playClick?.(ClickType.DEFAULT);
        item.play(audioEngine);
    };

    const handleToggleShieldLoop = () => {
        // playClick?.(ClickType.DEFAULT);
        if (shieldLoopActive) {
            audioEngine.stopShieldLoop();
            setShieldLoopActive(false);
        } else {
            audioEngine.playShieldLoop();
            setShieldLoopActive(true);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* 音量控制 */}
                <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-800">
                    <h3 className="text-cyan-400 font-bold mb-3">音量控制</h3>
                    <div className="flex items-center gap-4">
                        <label className="text-gray-300 text-sm">主音量:</label>
                        <input
                            type="range"
                            min="-40"
                            max="0"
                            defaultValue="-10"
                            onChange={(e) => audioEngine.setMasterVolume(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                        <span className="text-gray-400 text-sm w-12">-10 dB</span>
                    </div>
                </div>

                {/* 护盾循环 - 特殊处理 */}
                <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-800">
                    <h3 className="text-cyan-400 font-bold mb-3">循环音效</h3>
                    <button
                        onClick={handleToggleShieldLoop}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all ${
                            shieldLoopActive
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        }`}
                    >
                        {shieldLoopActive ? '⏹ 停止护盾循环' : '▶ 播放护盾循环'}
                    </button>
                </div>

                {/* 音效分类列表 */}
                {soundCategories.map((category) => (
                    <div key={category.name} className="bg-gray-900/40 rounded-lg p-4 border border-gray-800">
                        <h3 className="text-cyan-400 font-bold mb-3">{category.name}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {category.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handlePlaySound(item)}
                                    className="bg-gray-800 hover:bg-cyan-900/30 border border-gray-700 hover:border-cyan-600 rounded-lg p-3 transition-all active:scale-95"
                                >
                                    <div className="text-cyan-300 text-sm font-bold truncate">{item.name}</div>
                                    <div className="text-gray-400 text-xs truncate">{item.chineseName}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
