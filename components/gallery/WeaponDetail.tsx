import React from 'react';
import { WeaponItem } from './types';
import { getRarityClass } from './constants';

interface WeaponDetailProps {
  weapon: WeaponItem;
}

export const WeaponDetail: React.FC<WeaponDetailProps> = ({ weapon }) => {
  const rarityClass = getRarityClass(weapon.entry.rarity);

  return (
    <div className="space-y-3">
      {/* Rarity Display */}
      <div className={`inline-block border-2 px-3 py-1 rounded-lg ${rarityClass}`}>
        <span className="font-bold uppercase text-sm tracking-wider">{weapon.entry.rarity}</span>
      </div>

      {/* Unlock Info */}
      {weapon.entry.unlock !== 'default' && (
        <div className="text-xs text-cyan-500/70 mt-2">
          Unlock: {weapon.entry.unlock === 'level' ? `Level ${weapon.entry.unlockParam}+` : `Achievement ${weapon.entry.unlockParam}`}
        </div>
      )}
    </div>
  );
}
