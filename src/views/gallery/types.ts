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
