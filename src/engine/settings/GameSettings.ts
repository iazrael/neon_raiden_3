// src/engine/settings/GameSettings.ts

import { BehaviorSubject } from 'rxjs';
import type { IStorageBackend } from '../storage/base/IStorageBackend';
import { LocalStorageBackend } from '../storage/base/LocalStorageBackend';
import type { GameSettingsData, SystemToggleState } from './types';
import {
    GAME_SETTINGS_KEY,
    GAME_SETTINGS_VERSION,
    KNOWN_SYSTEMS,
} from './types';

/**
 * GameSettings 配置选项
 */
export interface GameSettingsOptions {
    /** 存储后端，默认使用 LocalStorage */
    backend?: IStorageBackend;
    /** 存储键名 */
    storageKey?: string;
    /** 版本不兼容时的回调 */
    onVersionMismatch?: (currentVersion: number, savedVersion: number) => void;
}

/**
 * 游戏设置管理器（单例）
 *
 * 职责：
 * - 管理系统开关状态
 * - 持久化到 LocalStorage
 * - 提供状态变更通知
 */
export class GameSettings {
    private static instance: GameSettings | null = null;
    private backend: IStorageBackend;
    private storageKey: string;
    private version: number;
    private onVersionMismatch?: (currentVersion: number, savedVersion: number) => void;

    /** 当前设置数据 */
    private data: GameSettingsData;

    /** 状态变更通知流 */
    public readonly changes$ = new BehaviorSubject<SystemToggleState>({});

    private constructor(options: GameSettingsOptions = {}) {
        this.backend = options.backend ?? new LocalStorageBackend('neon_raiden_');
        this.storageKey = options.storageKey ?? GAME_SETTINGS_KEY;
        this.version = GAME_SETTINGS_VERSION;
        this.onVersionMismatch = options.onVersionMismatch;

        // 初始化默认数据
        this.data = this.createDefaultData();
    }

    /**
     * 初始化单例
     */
    static async initialize(options: GameSettingsOptions = {}): Promise<GameSettings> {
        if (!GameSettings.instance) {
            const instance = new GameSettings(options);
            await instance.load();
            GameSettings.instance = instance;
        }
        return GameSettings.instance;
    }

    /**
     * 获取单例实例
     */
    static getInstance(): GameSettings {
        if (!GameSettings.instance) {
            throw new Error('GameSettings not initialized. Call initialize() first.');
        }
        return GameSettings.instance;
    }

    /**
     * 重置单例（主要用于测试）
     */
    static resetInstance(): void {
        if (GameSettings.instance) {
            GameSettings.instance.changes$.complete();
            GameSettings.instance = null;
        }
    }

    /**
     * 从存储加载设置
     */
    private async load(): Promise<void> {
        const result = await this.backend.get<GameSettingsData>(this.storageKey);

        if (result.success && result.data) {
            // 版本检测
            if (result.data.version !== this.version) {
                this.onVersionMismatch?.(this.version, result.data.version);
                // 版本不匹配，使用默认值
                this.data = this.createDefaultData();
                await this.save();
            } else {
                // 合并加载的数据与默认值（处理新增系统）
                this.data = this.mergeWithDefaults(result.data);
            }
        } else {
            // 首次加载，保存默认值
            await this.save();
        }

        // 发布初始状态
        this.publishState();
    }

    /**
     * 保存设置到存储
     */
    private async save(): Promise<void> {
        this.data.updatedAt = Date.now();
        await this.backend.set(this.storageKey, this.data);
        this.publishState();
    }

    /**
     * 发布状态变更
     */
    private publishState(): void {
        this.changes$.next(this.getAllSystemStates());
    }

    /**
     * 检查系统是否启用
     * @param name 系统名称
     * @returns true 表示启用，false 表示禁用。未配置时默认返回 true
     */
    isSystemEnabled(name: string): boolean {
        // Map 中不存在的系统默认启用
        const value = this.data.systems[name];
        return value ?? true;
    }

    /**
     * 设置系统启用状态
     * @param name 系统名称
     * @param enabled true 启用，false 禁用
     */
    async setSystemEnabled(name: string, enabled: boolean): Promise<void> {
        // 如果是启用状态且与默认值一致，可以删除该条目以节省空间
        if (enabled) {
            delete this.data.systems[name];
        } else {
            this.data.systems[name] = false;
        }
        await this.save();
    }

    /**
     * 获取所有系统状态（用于 UI 显示）
     */
    getAllSystemStates(): SystemToggleState {
        const states: SystemToggleState = {};
        for (const system of KNOWN_SYSTEMS) {
            states[system] = this.isSystemEnabled(system);
        }
        return states;
    }

    /**
     * 重置所有设置为默认（全部启用）
     */
    async resetToDefaults(): Promise<void> {
        this.data.systems = {};
        await this.save();
    }

    /**
     * 创建默认设置数据
     */
    private createDefaultData(): GameSettingsData {
        return {
            version: this.version,
            systems: {}, // 空表示全部启用
            updatedAt: Date.now(),
        };
    }

    /**
     * 将加载的数据与默认值合并（处理新增系统）
     */
    private mergeWithDefaults(loaded: GameSettingsData): GameSettingsData {
        return {
            version: loaded.version,
            systems: { ...loaded.systems }, // 保留用户自定义配置
            updatedAt: loaded.updatedAt,
        };
    }
}
