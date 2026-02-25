# Tone.js 音效系统重构计划

## 📋 需求概述

将现有的 Web Audio API 音效系统重构为使用 Tone.js，实现以下目标：
1. **简化代码** - 利用 Tone.js 的抽象层减少代码量
2. **配置化** - 将音效参数提取到配置文件，支持热修改
3. **符合 ECS 架构** - 音效作为系统，通过事件驱动
4. **保持音质** - 保留现有音效的特征和质量

## 🔍 现状分析

### 当前实现 ([`AudioEngine.ts`](src/engine/audio/AudioEngine.ts))
- 使用原生 Web Audio API
- 约 610 行代码，包含 14 个音效方法
- 手动创建和管理 OscillatorNode、GainNode、BiquadFilterNode
- 音效参数硬编码在函数中

### Tone.js 优势
- **Synth 类**：内置 ADSR 包络，减少手动 Gain 节点管理
- **MembraneSynth**：专为打击乐设计，适合爆炸/击中音效
- **MetalSynth**：金属质感合成器，适合特斯拉/激光
- **Noise + NoiseSynth**：内置噪声生成，简化爆炸音效
- **PolySynth**：多音支持，适合胜利/失败音阶
- **Envelope**：独立的频率/幅度包络，简化复杂的频率调制
- **LFO**：低频振荡器，简化颤音/调制效果

## 🎯 技术方案

### 1. 目录结构

```
src/engine/
├── audio/
│   ├── AudioEngine.ts           # 音效引擎入口（轻量包装）
│   ├── AudioConfig.ts           # 音效配置定义和类型
│   ├── configs/
│   │   ├── clickSounds.ts       # 点击音效配置
│   │   ├── weaponSounds.ts      # 武器音效配置
│   │   ├── sfxSounds.ts         # 特效音效配置
│   │   └── index.ts             # 配置导出
│   ├── synthesis/
│   │   ├── SynthFactory.ts      # Tone.js 合成器工厂
│   │   ├── EffectBuilder.ts     # 效果链构建器
│   │   └── NoiseFactory.ts      # 噪声生成器
│   └── index.ts
```

### 2. 配置驱动架构

#### 配置类型定义

```typescript
// AudioConfig.ts

/** 音效包络配置 */
interface EnvelopeConfig {
    attack: number;      // 攻击时间（秒）
    decay: number;       // 衰减时间（秒）
    sustain: number;     // 维持电平 (0-1)
    release: number;     // 释放时间（秒）
}

/** 振荡器配置 */
interface OscillatorConfig {
    type: 'sine' | 'square' | 'sawtooth' | 'triangle';
    frequency: {
        start: number;
        end?: number;
        duration?: number;
        curve?: 'linear' | 'exponential';
    };
    detune?: number;
    partials?: number[];
}

/** 噪声层配置（用于爆炸） */
interface NoiseLayerConfig {
    type: 'white' | 'pink' | 'brown';
    filter: {
        type: 'lowpass' | 'highpass' | 'bandpass';
        frequency: {
            start: number;
            end: number;
            duration: number;
        };
        Q?: number;
    };
    envelope: EnvelopeConfig;
    volume: number;
}

/** 单层音效配置 */
interface SingleSoundConfig {
    type: 'synth' | 'membrane' | 'metal' | 'noise';
    oscillator: OscillatorConfig;
    envelope: EnvelopeConfig;
    volume: number;
    effects?: EffectConfig[];
}

/** 多层音效配置（如爆炸） */
interface LayeredSoundConfig {
    layers: SingleSoundConfig[];
}

/** 效果配置 */
interface EffectConfig {
    type: 'filter' | 'distortion' | 'reverb' | 'feedback';
    params: Record<string, number | string>;
}

/** 音效配置类型 */
type SoundConfig = SingleSoundConfig | LayeredSoundConfig;

/** 武器音效配置映射 */
interface WeaponSoundConfigs {
    [weaponId: string]: SoundConfig;
}

/** 点击音效配置映射 */
interface ClickSoundConfigs {
    [clickType: string]: SoundConfig;
}
```

#### 配置示例

```typescript
// configs/weaponSounds.ts
import { SoundConfig, SingleSoundConfig } from '../AudioConfig';

export const weaponSounds: WeaponSoundConfigs = {
    VULCAN: {
        type: 'synth',
        oscillator: {
            type: 'square',
            frequency: {
                start: 400,
                end: 100,
                duration: 0.1,
                curve: 'exponential'
            }
        },
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.01
        },
        volume: -10
    },

    LASER: {
        type: 'metal',
        oscillator: {
            type: 'sawtooth',
            frequency: {
                start: 800,
                end: 1200,
                duration: 0.15,
                curve: 'linear'
            }
        },
        envelope: {
            attack: 0.01,
            decay: 0.15,
            sustain: 0,
            release: 0.01
        },
        volume: -14
    },

    MISSILE: {
        type: 'membrane',
        oscillator: {
            type: 'triangle',
            frequency: {
                start: 150,
                end: 50,
                duration: 0.3,
                curve: 'linear'
            }
        },
        envelope: {
            attack: 0.01,
            decay: 0.3,
            sustain: 0,
            release: 0.01
        },
        volume: -10,
        pitchDecay: 0.05,
        octaves: 1.5
    },

    // ... 其他武器配置
};

// configs/sfxSounds.ts
export const sfxSounds = {
    EXPLOSION_SMALL: {
        layers: [
            {
                type: 'noise',
                filter: {
                    type: 'lowpass',
                    frequency: {
                        start: 1000,
                        end: 100,
                        duration: 0.3
                    }
                },
                envelope: {
                    attack: 0.001,
                    decay: 0.3,
                    sustain: 0,
                    release: 0.01
                },
                volume: -2
            },
            {
                type: 'membrane',
                oscillator: {
                    type: 'sawtooth',
                    frequency: {
                        start: 100,
                        end: 10,
                        duration: 0.4,
                        curve: 'exponential'
                    }
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.4,
                    sustain: 0,
                    release: 0.01
                },
                volume: -2
            }
        ]
    },

    EXPLOSION_LARGE: {
        layers: [
            // 同上但 volume 更高，duration 更长
        ]
    },

    SHIELD_BREAK: {
        layers: [
            {
                type: 'synth',
                oscillator: {
                    type: 'sine',
                    frequency: { start: 1200, end: 100, duration: 0.15, curve: 'exponential' }
                },
                envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.01 },
                volume: -3
            },
            {
                type: 'synth',
                oscillator: {
                    type: 'triangle',
                    frequency: { start: 3000, end: 1000, duration: 0.05, curve: 'exponential' }
                },
                envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
                volume: -14
            },
            {
                type: 'synth',
                oscillator: {
                    type: 'sine',
                    frequency: { start: 400, end: 600, duration: 0.05, curve: 'linear' }
                },
                envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
                volume: -8
            }
        ]
    },

    WARNING: {
        type: 'synth',
        oscillator: {
            type: 'sawtooth',
            frequency: { start: 150 }
        },
        envelope: {
            attack: 0.1,
            decay: 1.4,
            sustain: 0.5,
            release: 0.1
        },
        volume: -6,
        effects: [
            {
                type: 'filter',
                params: {
                    filterType: 'bandpass',
                    Q: 5,
                    frequency: [
                        { time: 0, value: 200 },
                        { time: 0.3, value: 800 },
                        { time: 0.6, value: 200 },
                        { time: 0.8, value: 200 },
                        { time: 1.1, value: 800 },
                        { time: 1.4, value: 200 }
                    ]
                }
            }
        ]
    }
};
```

### 3. 合成器工厂

```typescript
// synthesis/SynthFactory.ts
import * as Tone from 'tone';
import { SingleSoundConfig } from '../AudioConfig';

export class SynthFactory {
    private static synthPool = new Map<string, Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth>();

    /**
     * 根据配置创建合成器
     */
    static create(config: SingleSoundConfig, id: string): Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth {
        // 检查池中是否有可复用的合成器
        if (this.synthPool.has(id)) {
            return this.synthPool.get(id)!;
        }

        let synth: Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth;

        const commonOptions = {
            envelope: config.envelope,
            oscillator: config.oscillator.type,
            volume: config.volume
        };

        switch (config.type) {
            case 'membrane':
                synth = new Tone.MembraneSynth({
                    ...commonOptions,
                    pitchDecay: (config as any).pitchDecay || 0.01,
                    octaves: (config as any).octaves || 4
                });
                break;

            case 'metal':
                synth = new Tone.MetalSynth({
                    ...commonOptions,
                    harmonicity: (config as any).harmonicity || 5,
                    resonance: (config as any).resonance || 400,
                    modulationIndex: (config as any).modulationIndex || 10
                });
                break;

            default:
                synth = new Tone.Synth(commonOptions);
        }

        this.synthPool.set(id, synth);
        synth.toDestination();
        return synth;
    }

    /**
     * 播放单音效
     */
    static play(synth: Tone.Synth, config: SingleSoundConfig, time?: number): void {
        const freq = config.oscillator.frequency;
        const duration = config.envelope.decay;

        if (freq.end && freq.duration) {
            // 频率滑音
            if (config.oscillator.frequency.curve === 'exponential') {
                synth.setNote(freq.start, time);
                // 使用 Tone.js 的频率滑音
            } else {
                synth.triggerAttackRelease(
                    Tone.Frequency(freq.start).toNote(),
                    duration,
                    time
                );
            }
        } else {
            synth.triggerAttackRelease(
                Tone.Frequency(freq.start).toNote(),
                duration,
                time
            );
        }
    }

    /**
     * 清理资源
     */
    static dispose(): void {
        this.synthPool.forEach(synth => synth.dispose());
        this.synthPool.clear();
    }
}
```

### 4. 主音效引擎

```typescript
// AudioEngine.ts (重构后)
import * as Tone from 'tone';
import { weaponSounds } from './configs/weaponSounds';
import { clickSounds } from './configs/clickSounds';
import { sfxSounds } from './configs/sfxSounds';
import { SynthFactory } from './synthesis/SynthFactory';
import { NoiseFactory } from './synthesis/NoiseFactory';

export class AudioEngine {
    private initialized = false;

    async init(): Promise<void> {
        if (this.initialized) return;

        await Tone.start();
        this.initialized = true;

        // 设置主音量
        Tone.Destination.volume.value = -10;
    }

    /**
     * 播放点击音效
     */
    playClick(type: ClickType): void {
        const config = clickSounds[type];
        if (!config) return;

        const synth = SynthFactory.create(config, `click_${type}`);
        SynthFactory.play(synth, config);
    }

    /**
     * 播放武器射击音效
     */
    playShoot(weaponId: WeaponId): void {
        const config = weaponSounds[weaponId];
        if (!config) return;

        const synth = SynthFactory.create(config, `weapon_${weaponId}`);
        SynthFactory.play(synth, config);
    }

    /**
     * 播放爆炸音效（多层合成）
     */
    playExplosion(size: ExplosionSize): void {
        const configKey = size === ExplosionSize.LARGE
            ? 'EXPLOSION_LARGE'
            : 'EXPLOSION_SMALL';

        const config = sfxSounds[configKey] as LayeredSoundConfig;
        if (!config || !config.layers) return;

        const now = Tone.now();

        config.layers.forEach((layer, i) => {
            if (layer.type === 'noise') {
                NoiseFactory.play(layer as NoiseLayerConfig, now);
            } else {
                const synth = SynthFactory.create(
                    layer as SingleSoundConfig,
                    `explosion_${configKey}_${i}`
                );
                SynthFactory.play(synth, layer as SingleSoundConfig, now);
            }
        });
    }

    /**
     * 播放 Boss 警告音效（带滤波器扫频）
     */
    playWarning(): void {
        const config = sfxSounds.WARNING;
        // 特殊处理，需要手动控制滤波器
        // ...
    }

    /**
     * 播放胜利音效（琶音）
     */
    playVictory(): void {
        const notes = ['C5', 'E5', 'G5', 'C6'];
        const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'square' },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.01 }
        }).toDestination();

        notes.forEach((note, i) => {
            synth.triggerAttackRelease(note, '8n', Tone.now() + i * 0.1);
        });

        // 自动清理
        setTimeout(() => synth.dispose(), 1000);
    }

    /**
     * 护盾循环音效（LFO 调制）
     */
    private shieldLoop: Tone.Loop | null = null;

    playShieldLoop(): void {
        if (this.shieldLoop) return;

        const synth = new Tone.Synth({
            oscillator: { type: 'sine', frequency: 880 },
            envelope: { attack: 0.5, decay: 0.1, sustain: 0.5, release: 0.5 }
        }).toDestination();

        // LFO 颤音
        const lfo = new Tone.LFO(8, 860, 900).start();
        lfo.connect(synth.oscillator.frequency);

        synth.triggerAttack('A5');
        this.shieldLoop = synth as any;
        (this.shieldLoop as any)._lfo = lfo;
    }

    stopShieldLoop(): void {
        if (!this.shieldLoop) return;

        const synth = this.shieldLoop as Tone.Synth;
        const lfo = (synth as any)._lfo;

        synth.triggerRelease();
        setTimeout(() => {
            lfo.dispose();
            synth.dispose();
        }, 500);

        this.shieldLoop = null;
    }
}
```

## 📁 文件变更清单

### 新增文件
| 文件路径 | 说明 |
|---------|------|
| `src/engine/audio/AudioConfig.ts` | 音效配置类型定义 |
| `src/engine/audio/configs/clickSounds.ts` | 点击音效配置 |
| `src/engine/audio/configs/weaponSounds.ts` | 武器音效配置 |
| `src/engine/audio/configs/sfxSounds.ts` | 特效音效配置 |
| `src/engine/audio/configs/index.ts` | 配置导出 |
| `src/engine/audio/synthesis/SynthFactory.ts` | 合成器工厂 |
| `src/engine/audio/synthesis/NoiseFactory.ts` | 噪声生成器 |
| `src/engine/audio/synthesis/EffectBuilder.ts` | 效果链构建器 |
| `src/engine/audio/synthesis/index.ts` | 合成模块导出 |

### 修改文件
| 文件路径 | 变更说明 |
|---------|----------|
| `src/engine/audio/AudioEngine.ts` | 完全重写，使用配置驱动 |
| `package.json` | 添加 `tone` 依赖 |
| `src/engine/systems/AudioSystem.ts` | 更新以使用新 API |

### 删除文件
无

### 可能废弃
| 文件路径 | 说明 |
|---------|------|
| `docs/AudioEngine_Legacy_Technical_CN.md` | 保留为参考，标记为 legacy |

## 🔧 安装依赖

```bash
pnpm add tone
pnpm add -D @types/tone  # 如果需要
```

## ⚠️ 注意事项

1. **音频上下文**：Tone.js 需要用户交互才能启动 AudioContext
2. **时间单位**：Tone.js 使用秒而非毫秒，配置中需注意转换
3. **资源管理**：使用对象池复用 Synth，避免频繁创建/销毁
4. **向后兼容**：保持 `AudioEngine` 的公共 API 不变
5. **性能**：PolySynth 用于琶音时用后即 `dispose()`

## 📊 预期收益

| 指标 | 改进 |
|-----|------|
| 代码行数 | 610 → ~300 行（配置文件不计入） |
| 音效可维护性 | 硬编码 → 配置驱动 |
| 新增音效成本 | ~50 行/个 → ~10 行配置 |
| 音质 | 保持不变或提升 |

## 🧪 测试计划

1. **单元测试**：每个工厂方法
2. **集成测试**：音效播放完整流程
3. **回归测试**：对比新旧实现音效差异
4. **性能测试**：内存占用和 CPU 使用

## 📝 实施步骤

1. **阶段一**：安装 Tone.js，创建类型和配置结构
2. **阶段二**：实现 SynthFactory 和 NoiseFactory
3. **阶段三**：迁移简单音效（点击、射击）
4. **阶段四**：迁移复杂音效（爆炸、警告）
5. **阶段五**：迁移特殊音效（护盾循环、胜利/失败）
6. **阶段六**：清理旧代码，更新文档

---

**Sources:**
- [Tone.js Documentation](https://tonejs.github.io/docs/14.7.39/)
- [Tone.js GitHub](https://github.com/Tonejs/Tone.js)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
