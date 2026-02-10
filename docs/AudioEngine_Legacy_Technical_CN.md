# AudioEngine 老版本技术文档

## 概述

本文档详细记录了老版本 AudioEngine 中每个音效函数的具体实现，包括使用的 Web Audio API 节点类型、参数设置以及实现的音频效果。

---

## 1. playClick() - 点击音效

### ClickType.CONFIRM - 确认音效

**音频节点**：
- `OscillatorNode` - 正弦波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sine'
osc.frequency.setValueAtTime(800, now)           // 起始 800Hz
osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1)  // 指数上升到 1600Hz
gain.gain.setValueAtTime(0.3, now)               // 起始音量 0.3
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)     // 0.1秒淡出
```

**音频能力**：
- 指数频率滑音（exponentialRamp）- 创造上扬的积极感
- 快速 ADSR 包络 - 短促清脆

**效果**：高音上扬，传达成功/开始的积极情绪

---

### ClickType.CANCEL - 取消音效

**音频节点**：
- `OscillatorNode` - 三角波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'triangle'
osc.frequency.setValueAtTime(600, now)           // 起始 600Hz
osc.frequency.exponentialRampToValueAtTime(300, now + 0.1)  // 指数下降到 300Hz
gain.gain.setValueAtTime(0.3, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
```

**音频能力**：
- 三角波 - 比正弦波更柔和，比方波更温暖
- 指数频率下滑 - 创造"后退"感

**效果**：低音下滑，传达返回/关闭的消极情绪

---

### ClickType.MENU - 菜单导航音效

**音频节点**：
- `OscillatorNode` - 正弦波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sine'
osc.frequency.setValueAtTime(1000, now)          // 固定 1000Hz
gain.gain.setValueAtTime(0.15, now)              // 更低音量
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03)  // 仅 0.03 秒
```

**音频能力**：
- 极短时长（30ms）- 轻微的"滴"声
- 更低音量 - 不干扰用户体验

**效果**：柔和短促的导航点击，适合标签切换

---

### ClickType.DEFAULT - 默认点击

**音频节点**：
- `OscillatorNode` - 正弦波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sine'
osc.frequency.setValueAtTime(800, now)
osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05)  // 轻微上扬
gain.gain.setValueAtTime(0.3, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
```

**效果**：标准点击音，轻微上扬增加确认感

---

## 2. playShoot() - 武器射击音效

### WeaponId.VULCAN - 转管机枪

**音频节点**：
- `OscillatorNode` - 方波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'square'                              // 方波：粗糙有力
osc.frequency.setValueAtTime(400, now)
osc.frequency.exponentialRampToValueAtTime(100, now + 0.1)   // 快速下降
gain.gain.setValueAtTime(0.3, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
```

**音频能力**：
- 方波 - 丰富的奇次谐波，创造"机械"感
- 指数频率滑音 - 模拟投射体的飞逝感

**效果**：粗糙有力的机械射击声

---

### WeaponId.LASER - 激光

**音频节点**：
- `OscillatorNode` - 锯齿波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sawtooth'                            // 锯齿波：尖锐明亮
osc.frequency.setValueAtTime(800, now)
osc.frequency.linearRampToValueAtTime(1200, now + 0.15)  // 线性上升
gain.gain.setValueAtTime(0.2, now)
gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
```

**音频能力**：
- 锯齿波 - 包含所有整数谐波，明亮尖锐
- 线性频率滑音（非指数）- 更平滑的过渡
- 线性音量包络 - 持续音感

**效果**：经典的 "Pew" 激光音效

---

### WeaponId.MISSILE - 导弹

**音频节点**：
- `OscillatorNode` - 三角波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'triangle'                            // 三角波：柔和
osc.frequency.setValueAtTime(150, now)           // 低频
osc.frequency.linearRampToValueAtTime(50, now + 0.3)  // 缓慢下降
gain.gain.setValueAtTime(0.3, now)
gain.gain.linearRampToValueAtTime(0.01, now + 0.3)
```

**音频能力**：
- 三角波 - 柔和温暖
- 低频范围 - 模拟重型武器
- 较长时长（300ms）- 持续感

**效果**：厚重低沉的导弹发射声

---

### WeaponId.WAVE - 波浪武器

**音频节点**：
- `OscillatorNode` - 正弦波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sine'                                // 正弦波：纯净
osc.frequency.setValueAtTime(300, now)
osc.frequency.exponentialRampToValueAtTime(800, now + 0.3)  // 上升扫描
gain.gain.setValueAtTime(0.4, now)               // 更高音量
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
```

**音频能力**：
- 正弦波 - 纯净无谐波
- 指数上升 - 扫频效果

**效果**：扫频式波浪音，类似科幻武器

---

### WeaponId.PLASMA - 等离子

**音频节点**：
- `OscillatorNode` - 方波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'square'                              // 方波：嗡嗡声
osc.frequency.setValueAtTime(100, now)           // 低频嗡嗡
osc.frequency.linearRampToValueAtTime(50, now + 0.5)
gain.gain.setValueAtTime(0.5, now)               // 高音量
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
```

**音频能力**：
- 方波低频 - 电力嗡嗡感
- 混合包络（线性频率+指数音量）- 复杂动态

**效果**：电流嗡嗡的等离子音

---

### WeaponId.TESLA - 特斯拉线圈

**音频节点**：
- `OscillatorNode` - 方波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'square'
osc.frequency.setValueAtTime(1500, now)          // 高频
osc.frequency.linearRampToValueAtTime(2000, now + 0.05)  // 先升
osc.frequency.linearRampToValueAtTime(1500, now + 0.1)   // 后降
gain.gain.setValueAtTime(0.25, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
```

**音频能力**：
- 双段频率包络 - 创造"啾"的动态变化
- 高频范围 - 电流感

**效果**：电击般的"啾"声

---

### WeaponId.MAGMA - 岩浆

**音频节点**：
- `OscillatorNode` - 锯齿波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sawtooth'                            // 锯齿波：粗糙
osc.frequency.setValueAtTime(200, now)           // 低频
osc.frequency.exponentialRampToValueAtTime(80, now + 0.2)
gain.gain.setValueAtTime(0.35, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
```

**音频能力**：
- 锯齿波低频 - 粗糙燃烧感
- 指数衰减 - 火焰熄灭感

**效果**：火焰噼啪的岩浆音

---

### WeaponId.SHURIKEN - 手里剑

**音频节点**：
- `OscillatorNode` - 三角波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'triangle'
osc.frequency.setValueAtTime(1000, now)          // 高频
osc.frequency.linearRampToValueAtTime(600, now + 0.15)  // 下降
gain.gain.setValueAtTime(0.2, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
```

**音频能力**：
- 三角波高频 - 切割感
- 频率下滑 - 投掷飞逝感

**效果**：飞快的切割/呼啸声

---

## 3. playExplosion() - 爆炸音效

**音频节点**：
- `AudioBufferSourceNode` - 白噪声源
- `BiquadFilterNode` - 低通滤波器
- `GainNode` - 噪声音量控制
- `OscillatorNode` - 锯齿波振荡器（低音）
- `BiquadFilterNode` - 低音低通滤波
- `GainNode` - 低音音量控制

**层级结构**：
```
噪声层: NoiseBuffer → LowpassFilter → NoiseGain → MasterGain
低音层: SawtoothOsc → LowpassFilter → OscGain → MasterGain
```

**关键参数 - 噪声层**：
```typescript
// 白噪声生成
const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
const data = noiseBuffer.getChannelData(0);
for (let i = 0; i < noiseBuffer.length; i++) data[i] = Math.random() * 2 - 1;

// 滤波器扫频
noiseFilter.type = 'lowpass'
noiseFilter.frequency.setValueAtTime(1000, now)
noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.3)  // 扫频

// 音量包络
noiseGain.gain.setValueAtTime(size === LARGE ? 1.5 : 0.8, now)
noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
```

**关键参数 - 低音层**：
```typescript
osc.type = 'sawtooth'
osc.frequency.setValueAtTime(100, now)
osc.frequency.exponentialRampToValueAtTime(10, now + (LARGE ? 0.8 : 0.4))

oscFilter.type = 'lowpass'
oscFilter.frequency.value = 200  // 固定低通，加深低音

oscGain.gain.setValueAtTime(size === LARGE ? 1.5 : 0.8, now)
oscGain.gain.exponentialRampToValueAtTime(0.01, now + (LARGE ? 0.8 : 0.4))
```

**音频能力**：
- **双层合成**：噪声层提供高频碎裂感，低音层提供轰鸣感
- **白噪声生成**：程序化生成随机噪声样本
- **滤波器扫频**：模拟爆炸扩散（高频→低频）
- **固定低通滤波**：限制低音层谐波，增强"轰鸣"感
- **尺寸参数**：大爆炸音量更高、持续时间更长

**效果**：完整的爆炸音效，包含冲击碎裂和低频轰鸣

---

## 4. playHit() - 击中音效

**音频节点**：
- `OscillatorNode` - 三角波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'triangle'
osc.frequency.setValueAtTime(200, now)
osc.frequency.exponentialRampToValueAtTime(50, now + 0.05)
gain.gain.setValueAtTime(0.2, now)
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
```

**音频能力**：
- 三角波 - 柔和打击感
- 低频快速下滑 - "咚"的打击效果
- 极短时长（50ms）- 瞬时打击

**效果**：短促的击中/碰撞音

---

## 5. playShieldBreak() - 护盾破碎音效

**音频节点**：三层振荡器合成
- `OscillatorNode` × 3 - 正弦波、三角波、正弦波
- `GainNode` × 3 - 各层独立音量控制

**层级结构**：
```
Layer 1 (Pop): SineOsc → Gain1 → Master
Layer 2 (Crisp): TriangleOsc → Gain2 → Master
Layer 3 (Bubble): SineOsc → Gain3 → Master
```

**Layer 1 - 主体 "Pop"**：
```typescript
osc1.type = 'sine'
osc1.frequency.setValueAtTime(1200, now)
osc1.frequency.exponentialRampToValueAtTime(100, now + 0.15)  // 大幅下滑

gain1.gain.setValueAtTime(0.7, now)  // 主音量最高
gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
```

**Layer 2 - 高频 "Crisp"**：
```typescript
osc2.type = 'triangle'
osc2.frequency.setValueAtTime(3000, now)  // 超高频
osc2.frequency.exponentialRampToValueAtTime(1000, now + 0.05)

gain2.gain.setValueAtTime(0.2, now)  // 辅助音量
gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
```

**Layer 3 - 气泡 "Bubble"**：
```typescript
osc3.type = 'sine'
osc3.frequency.setValueAtTime(400, now)
osc3.frequency.linearRampToValueAtTime(600, now + 0.05)  // 先升
osc3.frequency.exponentialRampToValueAtTime(100, now + 0.2)  // 后降

gain3.gain.setValueAtTime(0.4, now)
gain3.gain.linearRampToValueAtTime(0.2, now + 0.05)  // 先降
gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.2)  // 后淡出
```

**音频能力**：
- **三层合成**：每层负责不同频段和质感
- **复杂频率包络**：Layer 3 实现先升后降的"泡泡"感
- **混合包络类型**：线性与指数结合创造动态变化

**效果**：清脆的"啵"声，类似气泡破裂，有水润感

---

## 6. playBomb() - 炸弹音效

**音频节点**：
- `OscillatorNode` - 锯齿波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sawtooth'
osc.frequency.setValueAtTime(100, now)           // 低频
osc.frequency.exponentialRampToValueAtTime(10, now + 1.5)  // 超长下滑

gain.gain.setValueAtTime(0.8, now)
gain.gain.linearRampToValueAtTime(0, now + 1.5)  // 线性淡出
```

**音频能力**：
- 锯齿波 - 粗糙轰鸣
- 超低频范围（10Hz）- 深度轰鸣
- 超长时长（1.5秒）- 持续感
- 线性音量包络 - 平滑衰减

**效果**：深沉的轰鸣扫频声，类似炸弹下落

---

## 7. playPowerUp() - 升级音效

**音频节点**：
- `OscillatorNode` - 正弦波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sine'
// 音阶跳跃：B5 → E6
osc.frequency.setValueAtTime(987.77, now)        // B5 音符
osc.frequency.setValueAtTime(1318.51, now + 0.08)  // E6 音符

gain.gain.setValueAtTime(0.4, now)
gain.gain.linearRampToValueAtTime(0.4, now + 0.08)  // 保持音量
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)  // 长尾音
```

**音频能力**：
- **音阶跳跃**： setValueAtTime 实现瞬间跳变（非滑音）
- **断点包络**：音量先保持再衰减
- 长尾音（400ms）- 余韵感

**效果**：经典的"金币"音，快速的双音跳跃

---

## 8. playVictory() - 胜利音效

**音频节点**：
- `OscillatorNode` × 4 - 方波振荡器阵列
- `GainNode` × 4 - 各音符独立音量

**关键参数**：
```typescript
// C大调琶音：C E G C
const notes = [523.25, 659.25, 783.99, 1046.50]

notes.forEach((freq, i) => {
    osc.type = 'square'  // 8-bit 风格
    osc.frequency.value = freq  // 固定频率，无滑音
    gain.gain.setValueAtTime(0.2, now + i * 0.1)  // 依次延迟
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4)
    osc.start(now + i * 0.1)  // 琶音调度
})
```

**音频能力**：
- **琶音调度**：每个振荡器延迟启动（100ms 间隔）
- **方波阵列**：8-bit 复古游戏风格
- 固定频率 - 纯净音符，无音高变化

**效果**：欢快的上升琶音，经典游戏胜利声

---

## 9. playDefeat() - 失败音效

**音频节点**：
- `OscillatorNode` × 4 - 锯齿波振荡器阵列
- `GainNode` × 4 - 各音符独立音量

**关键参数**：
```typescript
// 下行音阶
const notes = [300, 250, 200, 150]

notes.forEach((freq, i) => {
    osc.type = 'sawtooth'  // 更悲伤的音色
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.2, now + i * 0.2)  // 更长间隔（200ms）
    gain.gain.linearRampToValueAtTime(0.01, now + i * 0.2 + 0.3)
    osc.start(now + i * 0.2)
})
```

**音频能力**：
- **下行音阶**：频率逐级下降
- 锯齿波 - 更暗淡、悲伤的音色
- 更慢节奏（200ms 间隔）- 沉重感

**效果**：缓慢下降的悲伤音阶

---

## 10. playWarning() - Boss 警告音效

**音频节点**：
- `OscillatorNode` - 锯齿波振荡器
- `BiquadFilterNode` - 带通滤波器
- `GainNode` - 音量控制

**节点连接**：
```
Oscillator → BandpassFilter → Gain → Master
```

**关键参数**：
```typescript
osc.type = 'sawtooth'
osc.frequency.value = 150  // 低频 drone

// 带通滤波器
filter.type = 'bandpass'
filter.Q.value = 5  // 高 Q 值 = 窄频带 = "人声"质感

// 双段"Wang"效果
// 第一段
filter.frequency.setValueAtTime(200, now)
filter.frequency.exponentialRampToValueAtTime(800, now + 0.3)  // Wah-up
filter.frequency.exponentialRampToValueAtTime(200, now + 0.6)  // Wah-down

// 第二段
filter.frequency.setValueAtTime(200, now + 0.8)
filter.frequency.exponentialRampToValueAtTime(800, now + 1.1)  // Wah-up
filter.frequency.exponentialRampToValueAtTime(200, now + 1.4)  // Wah-down

// 复杂音量包络（分段）
gain.gain.setValueAtTime(0, now)
gain.gain.linearRampToValueAtTime(0.5, now + 0.1)   // Attack
gain.gain.linearRampToValueAtTime(0.3, now + 0.6)   // Dip
gain.gain.linearRampToValueAtTime(0.5, now + 0.9)   // Second attack
gain.gain.linearRampToValueAtTime(0, now + 1.5)     // Release
```

**音频能力**：
- **带通滤波扫频**：创造"Wah-Wah"人声质感
- **高 Q 值**：使滤波器响应更尖锐，类似人声元音
- **分段音量包络**：模拟两次"Wang"的力度变化
- **低频 Drone**：提供基础音源

**效果**："Wang~Wang"警告声，类似游戏 Boss 出现

---

## 11. playBossDefeat() - Boss 击败音效

**音频节点**：
- `OscillatorNode` × 6 - 方波振荡器阵列
- `GainNode` × 6 - 各音符独立音量

**关键参数**：
```typescript
// Mario 风格上升琶音：C E G C E G
const notes = [
    { f: 523.25, t: 0.0 },   // C5
    { f: 659.25, t: 0.1 },   // E5
    { f: 783.99, t: 0.2 },   // G5
    { f: 1046.50, t: 0.3 },  // C6
    { f: 1318.51, t: 0.4 },  // E6
    { f: 1567.98, t: 0.5 },  // G6 (长音)
]

notes.forEach((note, i) => {
    osc.type = 'square'  // 8-bit 风格
    osc.frequency.value = note.f

    const duration = i === notes.length - 1 ? 1.0 : 0.08  // 最后一音长

    // 平台包络：保持音量后突然切断
    gain.gain.setValueAtTime(0.3, startTime)
    gain.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.02)  // 保持
    gain.gain.linearRampToValueAtTime(0.01, startTime + duration)  // 切断
})
```

**音频能力**：
- **大音程琶音**：跨越两个八度（C5-G6）
- **平台包络**：音量保持后突然切断，8-bit 风格特征
- **最后一个音符延长**：创造胜利感

**效果**：Mario 风格的快速上升琶音，"Deng deng deng de deng~"

---

## 12. playLevelUp() - 升级音效

**音频节点**：
- `OscillatorNode` - 方波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'square'

// 三次音符跳跃：C5 → E5 → G5
osc.frequency.setValueAtTime(523.25, now)        // C5
osc.frequency.setValueAtTime(659.25, now + 0.12)  // E5
osc.frequency.setValueAtTime(783.99, now + 0.24)  // G5

// 三段式包络（每个音符一个 Attack-Decay）
gain.gain.setValueAtTime(0, now)
gain.gain.linearRampToValueAtTime(0.5, now + 0.02)   // C5 Attack
gain.gain.exponentialRampToValueAtTime(0.3, now + 0.12)  // C5 Decay
gain.gain.linearRampToValueAtTime(0.5, now + 0.14)  // E5 Attack
gain.gain.exponentialRampToValueAtTime(0.3, now + 0.24)  // E5 Decay
gain.gain.linearRampToValueAtTime(0.5, now + 0.26)  // G5 Attack
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)  // G5 long Release
```

**音频能力**：
- **单振荡器多音符**：一个振荡器实现多个音符（通过频率跳变）
- **三段包络**：每个音符独立的 Attack-Decay
- **快速 Attack**：2ms 上升时间创造敲击感

**效果**：Mario 蘑菇音效，"Wong~wong~wong"三声上升

---

## 13. playShieldLoop() / stopShieldLoop() - 护盾循环音效

**音频节点**：
- `OscillatorNode` - 正弦波振荡器
- `GainNode` - 音量控制
- `OscillatorNode` (LFO) - 低频振荡器
- `GainNode` (LFO Gain) - LFO 深度控制

**节点连接**：
```
LFO → LFO-Gain → MainOsc.frequency
MainOsc → MainGain → Master
```

**关键参数**：
```typescript
// 主振荡器
this.shieldOsc.type = 'sine'
this.shieldOsc.frequency.setValueAtTime(880, now)  // A5

// LFO（颤音调制）
lfo.frequency.value = 8  // 8Hz 颤音速度
lfoGain.gain.value = 20  // ±20Hz 颤音深度
lfo.connect(lfoGain)
lfoGain.connect(this.shieldOsc.frequency)  // 调制主振荡器频率

// 淡入
this.shieldGain.gain.setValueAtTime(0, now)
this.shieldGain.gain.linearRampToValueAtTime(0.1, now + 0.5)

// 存储引用以便停止
(this.shieldOsc as any)._lfo = lfo
```

**stopShieldLoop() 淡出逻辑**：
```typescript
this.shieldGain.gain.cancelScheduledValues(now)  // 取消现有调度
this.shieldGain.gain.setValueAtTime(currentValue, now)  // 保持当前值
this.shieldGain.gain.linearRampToValueAtTime(0, now + 0.5)  // 500ms 淡出

setTimeout(() => {
    osc.stop()
    lfo.stop()  // 停止 LFO
    osc.disconnect()
}, 500)
```

**音频能力**：
- **LFO 频率调制**：创造颤音（Vibrato）效果
- **状态管理**：保存振荡器引用，防止重复播放
- **平滑淡入淡出**：避免突然开始/结束的爆音
- **连接图管理**：手动断开连接防止内存泄漏

**效果**：持续的高频颤音，类似护盾的嗡嗡声

---

## 14. playSlowMotionEnter() - 慢动作进入音效

**音频节点**：
- `OscillatorNode` - 锯齿波振荡器
- `GainNode` - 音量控制

**关键参数**：
```typescript
osc.type = 'sawtooth'
osc.frequency.setValueAtTime(400, now)           // 中频
osc.frequency.exponentialRampToValueAtTime(50, now + 1.0)  // 大幅下滑

gain.gain.setValueAtTime(0.5, now)
gain.gain.linearRampToValueAtTime(0, now + 1.0)  // 线性淡出
```

**音频能力**：
- 锯齿波 - 粗糙质感
- 大幅频率滑音（400Hz → 50Hz）- 时间变慢感
- 长时长（1秒）- 持续感
- 线性音量包络 - 平滑

**效果**：深度的"Warp"声，类似时间变慢

---

## 总结：使用的 Web Audio API 能力

### 节点类型
| 节点类型 | 用途 |
|---------|------|
| `AudioContext` | 音频上下文管理 |
| `OscillatorNode` | 生成周期性波形（正弦、方波、锯齿、三角） |
| `GainNode` | 音量控制和包络 |
| `BiquadFilterNode` | 滤波器（低通、带通） |
| `AudioBufferSourceNode` | 播放预生成的音频缓冲（噪声） |

### 音频调度能力
| 能力 | 说明 |
|-----|------|
| `setValueAtTime()` | 在特定时间设置参数值 |
| `linearRampToValueAtTime()` | 线性过渡到目标值 |
| `exponentialRampToValueAtTime()` | 指数过渡到目标值（频率常用） |
| `cancelScheduledValues()` | 取消现有参数调度 |
| `start(time)` / `stop(time)` | 精确时间调度 |

### 音频技术
| 技术 | 用途 |
|-----|------|
| **多层合成** | 多个振荡器叠加创造复杂音色 |
| **频率滑音** | 频率随时间变化创造动态感 |
| **ADSR 包络** | Attack-Decay-Sustain-Release 控制声音形态 |
| **LFO 调制** | 低频振荡器调制参数创造颤音/震动 |
| **滤波器扫频** | 动态改变滤波频率创造 "Wah" 效果 |
| **琶音调度** | 延迟启动多个振荡器创造音阶 |
| **白噪声生成** | 程序化生成随机样本 |

---

## 文档说明

- **频率单位**：Hz（赫兹）
- **时间单位**：秒（second）
- **音量单位**：线性增益（0-1，1 为最大）
- **指数 vs 线性**：频率变化通常使用指数（符合人耳感知），音量可用线性或指数

该文档对应 `_old/AudioEngine.ts` 版本的实现，新版本已迁移为数据驱动的配置化架构。
