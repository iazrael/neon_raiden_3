/**
 * formatter 单元测试
 */
import { formatTimestamp, formatNamespace, getColorForLevel, formatLevel } from "../../src/engine/logger/formatter";
import { LogLevel } from "../../src/engine/logger/types";

describe("formatter", () => {
    describe("formatTimestamp", () => {
        it("应格式化时间戳为 HH:MM:SS.mmm", () => {
            const date = new Date("2026-02-25T14:32:05.123Z");
            const result = formatTimestamp(date);
            expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
        });
    });

    describe("formatNamespace", () => {
        it("应格式化命名空间为 [Namespace]", () => {
            expect(formatNamespace("MovementSystem")).toBe("[MovementSystem]");
        });

        it("应处理嵌套命名空间", () => {
            expect(formatNamespace("Global:MovementSystem")).toBe("[Global:MovementSystem]");
        });
    });

    describe("getColorForLevel", () => {
        it("应为每个级别返回正确的颜色", () => {
            expect(getColorForLevel(LogLevel.DEBUG).style).toBe("color: gray");
            expect(getColorForLevel(LogLevel.INFO).style).toBe("color: blue");
            expect(getColorForLevel(LogLevel.WARN).style).toBe("color: orange");
            expect(getColorForLevel(LogLevel.ERROR).style).toBe("color: red");
        });
    });

    describe("formatLevel", () => {
        it("应返回大写的级别字符串", () => {
            expect(formatLevel(LogLevel.DEBUG)).toBe("DEBUG");
            expect(formatLevel(LogLevel.INFO)).toBe("INFO");
            expect(formatLevel(LogLevel.WARN)).toBe("WARN");
            expect(formatLevel(LogLevel.ERROR)).toBe("ERROR");
        });
    });
});
