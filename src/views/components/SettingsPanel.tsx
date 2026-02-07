// components/SettingsPanel.tsx

import React, { useState, useEffect } from 'react';
import { Settings, RotateCcw, X } from 'lucide-react';
import type { GameSettings } from '@/engine/settings';

interface SettingsPanelProps {
    gameSettings: GameSettings;
    onClose: () => void;
}

type TabId = 'Systems';

// 系统分组配置
const SYSTEM_GROUPS = [
    { layer: 'P1 决策层', systems: ['InputSystem', 'SpawnSystem', 'BossSystem', 'EnemySystem'] },
    { layer: 'P2 状态层', systems: ['BuffSystem', 'WeaponSystem'] },
    { layer: 'P3 物理层', systems: ['HomingSystem', 'MovementSystem', 'BounceSystem'] },
    { layer: 'P4 交互层', systems: ['BombSystem', 'CollisionSystem'] },
    { layer: 'P5 结算层', systems: ['PickupSystem', 'DamageResolutionSystem', 'ChainSystem', 'LootSystem', 'ComboSystem', 'LevelSystem'] },
    { layer: 'P7 表现层', systems: ['CameraSystem', 'EffectSystem', 'BlinkSystem', 'AudioSystem'] },
    { layer: 'P8 清理层', systems: ['LifetimeSystem', 'CleanupSystem'] },
    { layer: '渲染', systems: ['buildSnapshot', 'RenderSystem'] },
] as const;

/**
 * Switch 开关子组件
 */
const Switch: React.FC<{ checked: boolean; onCheckedChange: () => void; disabled?: boolean }> = ({
    checked,
    onCheckedChange,
    disabled = false,
}) => (
    <button
        onClick={onCheckedChange}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
            checked ? 'bg-[#00ffff]/50' : 'bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        type="button"
    >
        <div
            className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 shadow-md ${
                checked ? 'left-7 bg-[#00ffff]' : 'left-1 bg-gray-400'
            }`}
        />
    </button>
);

/**
 * 设置面板组件
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ gameSettings, onClose }) => {
    const [activeTab] = useState<TabId>('Systems');
    const [systemStates, setSystemStates] = useState<Record<string, boolean>>({});

    // 组件挂载时加载当前状态
    useEffect(() => {
        setSystemStates(gameSettings.getAllSystemStates());
    }, [gameSettings]);

    // 切换系统开关
    const handleToggle = async (systemName: string) => {
        const newState = !systemStates[systemName];
        setSystemStates((prev) => ({ ...prev, [systemName]: newState }));
        await gameSettings.setSystemEnabled(systemName, newState);
    };

    // 重置所有设置
    const handleReset = async () => {
        await gameSettings.resetToDefaults();
        setSystemStates(gameSettings.getAllSystemStates());
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
            <div className="relative w-[90%] max-w-2xl p-1 rounded-lg bg-gradient-to-r from-[#00ffff] via-[#ff00ff] to-[#00ff88]">
                <div className="bg-[#0a0a0a] rounded-lg p-6 border border-[#00ffff]/30 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] to-[#00ff88] flex items-center gap-2">
                            <Settings size={24} className="text-[#00ffff]" />
                            SETTINGS
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            type="button"
                            aria-label="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tab Indicator */}
                    <div className="flex gap-4 mb-6 border-b border-gray-800">
                        <button
                            className={`px-4 py-2 font-mono text-sm transition-colors ${
                                activeTab === 'Systems'
                                    ? 'text-[#00ffff] border-b-2 border-[#00ffff]'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                            type="button"
                        >
                            SYSTEMS
                        </button>
                    </div>

                    {/* Systems Tab Content */}
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {SYSTEM_GROUPS.map((group) => (
                            <div key={group.layer}>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    {group.layer}
                                </div>
                                <div className="space-y-2">
                                    {group.systems.map((system) => (
                                        <div
                                            key={system}
                                            className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-800"
                                        >
                                            <span className="text-sm text-gray-300 font-mono">{system}</span>
                                            <Switch
                                                checked={systemStates[system] ?? true}
                                                onCheckedChange={() => handleToggle(system)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-800 border border-gray-600 text-gray-400 rounded hover:border-gray-400 hover:text-gray-200 transition-all font-mono text-sm flex items-center gap-2"
                            type="button"
                        >
                            <RotateCcw size={16} />
                            Reset All
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-[#00ffff]/10 border border-[#00ffff]/50 text-[#00ffff] rounded hover:bg-[#00ffff]/20 transition-all font-mono text-sm"
                            type="button"
                        >
                            Close (Q)
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1a1a1a;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #00ffff;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #00cccc;
                }
            `}</style>
        </div>
    );
};
