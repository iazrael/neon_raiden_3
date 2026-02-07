import React from 'react';
import { BossItem } from './types';
import { BOSS_LEVEL_MAP, getRarityClass } from './constants';

interface BossDetailProps {
    boss: BossItem;
}

export const BossDetail: React.FC<BossDetailProps> = ({ boss }) => {
    const rarityClass = getRarityClass(boss.entry.rarity);
    const level = BOSS_LEVEL_MAP[boss.id] || 1;

    return (
        <div className="space-y-3">
            {/* Stage Display */}
            <div className="flex items-center gap-3">
                <div className="inline-block border-2 border-purple-500/50 px-3 py-1 rounded-lg">
                    <span className="text-purple-300 font-bold text-sm tracking-wider">Stage {level}</span>
                </div>
                {/* Rarity Display */}
                <div className={`inline-block border-2 px-3 py-1 rounded-lg ${rarityClass}`}>
                    <span className="font-bold uppercase text-sm tracking-wider">{boss.entry.rarity}</span>
                </div>
            </div>

            {/* Unlock Info */}
            {boss.entry.unlock !== 'default' && (
                <div className="text-xs text-cyan-500/70 mt-2">
                    Unlock: Level {boss.entry.unlockParam}+
                </div>
            )}
        </div>
    );
};
