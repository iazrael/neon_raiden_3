import React from 'react';
import { EnemyItem } from './types';
import { getRarityClass } from './constants';

interface EnemyDetailProps {
  enemy: EnemyItem;
}

export const EnemyDetail: React.FC<EnemyDetailProps> = ({ enemy }) => {
  const rarityClass = getRarityClass(enemy.entry.rarity);

  return (
    <div className="space-y-3">
      {/* Rarity Display */}
      <div className={`inline-block border-2 px-3 py-1 rounded-lg ${rarityClass}`}>
        <span className="font-bold uppercase text-sm tracking-wider">{enemy.entry.rarity}</span>
      </div>

      {/* Unlock Info */}
      {enemy.entry.unlock !== 'default' && (
        <div className="text-xs text-cyan-500/70 mt-2">
          Unlock: Level {enemy.entry.unlockParam}+
        </div>
      )}
    </div>
  );
}
