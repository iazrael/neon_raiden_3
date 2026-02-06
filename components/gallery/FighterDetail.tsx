import React from 'react';
import { FighterItem } from './types';
import { getRarityClass } from './constants';

interface FighterDetailProps {
  fighter: FighterItem;
}

export const FighterDetail: React.FC<FighterDetailProps> = ({ fighter }) => {
  const rarityClass = getRarityClass(fighter.entry.rarity);

  return (
    <div className="space-y-3">
      {/* Rarity Display */}
      <div className={`inline-block border-2 px-3 py-1 rounded-lg ${rarityClass}`}>
        <span className="font-bold uppercase text-sm tracking-wider">{fighter.entry.rarity}</span>
      </div>

      {/* Unlock Info */}
      {fighter.entry.unlock !== 'default' && (
        <div className="text-xs text-cyan-500/70 mt-2">
          Unlock: Level {fighter.entry.unlockParam}+
        </div>
      )}
    </div>
  );
}
