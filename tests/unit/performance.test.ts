/**
 * PerformanceMonitor 单元测试
 */

import { PerformanceMonitor, type PerformanceConfig, type FrameSnapshot } from '../../src/engine/utils/performance';

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        const config: PerformanceConfig = {
            enabled: true,
            frameTimeThreshold: 16.67,
            reportToConsole: true,
        };
        monitor = new PerformanceMonitor(config);

        // Mock console 方法 - logger.info 使用 console.info，logger.warn 使用 console.warn
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('基础功能', () => {
        it('应该正确初始化', () => {
            const config = monitor.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.frameTimeThreshold).toBe(16.67);
            expect(config.reportToConsole).toBe(true);
        });

        it('应该提供性能数据流', () => {
            const stream = monitor.stream;
            expect(stream).toBeInstanceOf(Object);
            expect(stream.getValue()).toBeNull();
        });
    });

    describe('帧监控', () => {
        it('应该在 enabled=false 时不记录数据', () => {
            monitor.updateConfig({ enabled: false });

            monitor.startFrame();
            monitor.recordSystem('TestSystem', 'P1', 5.0);
            monitor.endFrame(20);

            // 流中没有数据
            expect(monitor.stream.getValue()).toBeNull();
        });

        it('应该记录单个系统的耗时', () => {
            monitor.startFrame();
            monitor.recordSystem('TestSystem', 'P1', 5.0);
            monitor.endFrame(10);

            const snapshot = monitor.stream.getValue();
            expect(snapshot).not.toBeNull();
            expect(snapshot?.frameTime).toBe(10);
            expect(snapshot?.thresholdExceeded).toBe(false);
            expect(snapshot?.layers['P1']).toBeDefined();
            expect(snapshot?.layers['P1'].totalMs).toBe(5.0);
            expect(snapshot?.layers['P1'].systems).toHaveLength(1);
            expect(snapshot?.layers['P1'].systems[0].name).toBe('TestSystem');
        });

        it('应该记录多个系统的耗时', () => {
            monitor.startFrame();
            monitor.recordSystem('System1', 'P1', 3.0);
            monitor.recordSystem('System2', 'P1', 2.0);
            monitor.recordSystem('System3', 'P2', 4.0);
            monitor.endFrame(10);

            const snapshot = monitor.stream.getValue();
            expect(snapshot?.layers['P1'].totalMs).toBe(5.0);
            expect(snapshot?.layers['P1'].systems).toHaveLength(2);
            expect(snapshot?.layers['P2'].totalMs).toBe(4.0);
            expect(snapshot?.layers['P2'].systems).toHaveLength(1);
        });

        it('应该正确判断是否超过阈值', () => {
            monitor.startFrame();
            monitor.recordSystem('System1', 'P1', 5.0);
            monitor.endFrame(20);

            const snapshot = monitor.stream.getValue();
            expect(snapshot?.thresholdExceeded).toBe(true);
        });

        it('应该在超过阈值时输出警告', () => {
            monitor.startFrame();
            monitor.recordSystem('SlowSystem', 'P1', 15.0);
            monitor.endFrame(20);

            // logger.warn 使用 console.warn，第一个参数包含格式化字符串
            expect(consoleWarnSpy).toHaveBeenCalled();
            const firstCallArgs = consoleWarnSpy.mock.calls[0];
            expect(firstCallArgs[0]).toContain('帧耗时超标');
            expect(firstCallArgs[0]).toContain('20.00ms');
        });

        it('应该在未超过阈值时不输出警告', () => {
            monitor.startFrame();
            monitor.recordSystem('FastSystem', 'P1', 5.0);
            monitor.endFrame(10);

            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('应该在 reportToConsole=false 时不输出警告', () => {
            monitor.updateConfig({ reportToConsole: false });

            monitor.startFrame();
            monitor.recordSystem('SlowSystem', 'P1', 15.0);
            monitor.endFrame(20);

            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });

    describe('层级聚合', () => {
        it('应该按层级聚合系统耗时', () => {
            monitor.startFrame();
            monitor.recordSystem('InputSystem', 'P1', 1.0);
            monitor.recordSystem('SpawnSystem', 'P1', 2.0);
            monitor.recordSystem('WeaponSystem', 'P2', 3.0);
            monitor.recordSystem('MovementSystem', 'P3', 4.0);
            monitor.endFrame(15);

            const snapshot = monitor.stream.getValue();
            expect(snapshot?.layers['P1'].totalMs).toBe(3.0);
            expect(snapshot?.layers['P2'].totalMs).toBe(3.0);
            expect(snapshot?.layers['P3'].totalMs).toBe(4.0);
        });

        it('应该按耗时排序层级', () => {
            monitor.startFrame();
            monitor.recordSystem('MovementSystem', 'P3', 4.0);
            monitor.recordSystem('InputSystem', 'P1', 1.0);
            monitor.recordSystem('WeaponSystem', 'P2', 3.0);
            monitor.endFrame(20);

            // 触发警告输出，验证层级被记录
            const allInfoCalls = consoleInfoSpy.mock.calls.map((call) => call[0] as string);
            const hasP3 = allInfoCalls.some((msg) => msg.includes('P3:'));
            const hasP2 = allInfoCalls.some((msg) => msg.includes('P2:'));
            const hasP1 = allInfoCalls.some((msg) => msg.includes('P1:'));

            expect(hasP3).toBe(true);
            expect(hasP2).toBe(true);
            expect(hasP1).toBe(true);
        });
    });

    describe('配置更新', () => {
        it('应该支持运行时更新配置', () => {
            monitor.updateConfig({ enabled: false });
            expect(monitor.getConfig().enabled).toBe(false);

            monitor.updateConfig({ frameTimeThreshold: 20 });
            expect(monitor.getConfig().frameTimeThreshold).toBe(20);

            monitor.updateConfig({ reportToConsole: false });
            expect(monitor.getConfig().reportToConsole).toBe(false);
        });

        it('应该支持部分更新配置', () => {
            const originalThreshold = monitor.getConfig().frameTimeThreshold;
            const originalReport = monitor.getConfig().reportToConsole;

            monitor.updateConfig({ enabled: false });

            expect(monitor.getConfig().enabled).toBe(false);
            expect(monitor.getConfig().frameTimeThreshold).toBe(originalThreshold);
            expect(monitor.getConfig().reportToConsole).toBe(originalReport);
        });
    });

    describe('边界情况', () => {
        it('应该处理空帧（没有系统）', () => {
            monitor.startFrame();
            monitor.endFrame(5);

            const snapshot = monitor.stream.getValue();
            expect(snapshot).not.toBeNull();
            expect(snapshot?.frameTime).toBe(5);
            expect(Object.keys(snapshot?.layers ?? {})).toHaveLength(0);
        });

        it('应该处理零耗时系统', () => {
            monitor.startFrame();
            monitor.recordSystem('ZeroSystem', 'P1', 0);
            monitor.endFrame(10);

            const snapshot = monitor.stream.getValue();
            expect(snapshot?.layers['P1'].totalMs).toBe(0);
        });

        it('应该连续监控多帧', () => {
            // 第一帧
            monitor.startFrame();
            monitor.recordSystem('System1', 'P1', 5.0);
            monitor.endFrame(10);

            // 第二帧
            monitor.startFrame();
            monitor.recordSystem('System2', 'P2', 8.0);
            monitor.endFrame(15);

            const snapshot = monitor.stream.getValue();
            expect(snapshot?.frameTime).toBe(15);
            expect(snapshot?.layers['P2'].totalMs).toBe(8.0);
            expect(snapshot?.layers['P1']).toBeUndefined();
        });

        it('应该正确显示 FPS', () => {
            monitor.startFrame();
            monitor.recordSystem('System1', 'P1', 5.0);
            monitor.endFrame(20);

            expect(consoleWarnSpy).toHaveBeenCalled();
            const firstCallArgs = consoleWarnSpy.mock.calls[0];
            expect(firstCallArgs[0]).toContain('(50.0 FPS)');
        });
    });

    describe('警告输出格式', () => {
        it('应该输出层级信息', () => {
            monitor.startFrame();
            monitor.recordSystem('SlowSystem', 'P1', 3.0);
            monitor.endFrame(20);

            // logger.info 用于层级信息
            expect(consoleInfoSpy).toHaveBeenCalled();
            const infoMessages = consoleInfoSpy.mock.calls.map((call) => call[0] as string);
            const hasP1 = infoMessages.some((msg) => msg.includes('P1:'));
            expect(hasP1).toBe(true);
        });

        it('应该只显示耗时 > 0.5ms 的系统', () => {
            monitor.startFrame();
            monitor.recordSystem('SlowSystem', 'P1', 1.0);
            monitor.recordSystem('FastSystem', 'P1', 0.3);
            monitor.endFrame(20);

            // 验证日志输出包含系统信息
            const allCalls = [...consoleInfoSpy.mock.calls, ...consoleWarnSpy.mock.calls];
            const allMessages = allCalls.map((call) => call[0] as string);

            const hasSlowSystem = allMessages.some((msg) => msg.includes('SlowSystem'));
            expect(hasSlowSystem).toBe(true);

            // FastSystem 不应该出现在日志中（< 0.5ms）
            const hasFastSystem = allMessages.some((msg) => msg.includes('FastSystem'));
            expect(hasFastSystem).toBe(false);
        });

        it('应该为慢速系统标记严重级别', () => {
            monitor.startFrame();
            monitor.recordSystem('SlowSystem', 'P1', 3.0);
            monitor.endFrame(20);

            // 验证包含严重级别标记
            const allCalls = [...consoleInfoSpy.mock.calls, ...consoleWarnSpy.mock.calls];
            const allMessages = allCalls.map((call) => call[0] as string);
            const hasSeverity = allMessages.some((msg) => msg.includes('[SLOW]'));
            expect(hasSeverity).toBe(true);
        });

        it('应该为中等速度系统标记警告级别', () => {
            monitor.startFrame();
            monitor.recordSystem('MediumSystem', 'P1', 1.0);
            monitor.endFrame(20);

            // 验证包含警告级别标记
            const allCalls = [...consoleInfoSpy.mock.calls, ...consoleWarnSpy.mock.calls];
            const allMessages = allCalls.map((call) => call[0] as string);
            const hasMediumSystem = allMessages.some((msg) => msg.includes('MediumSystem'));
            expect(hasMediumSystem).toBe(true);

            // 耗时 1.0ms（0.5-2ms 范围）应该标记为 WARNING
            const hasWarning = allMessages.some((msg) => msg.includes('[WARNING]'));
            expect(hasWarning).toBe(true);
        });
    });
});
