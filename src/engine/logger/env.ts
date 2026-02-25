/**
 * 环境变量辅助模块
 * 提供统一的环境变量访问接口，便于测试
 */

/**
 * 全局类型声明：测试环境变量
 */
declare global {
  var __IS_DEV__: boolean | undefined;
}

/**
 * Vite DEV 环境变量标志
 * 这个值会在构建时被 Vite 替换为 true 或 false
 */
declare const __DEV__: boolean;

/**
 * 获取当前是否为开发环境
 * @returns 是否为开发环境
 */
export function isDev(): boolean {
  // 在 Jest 测试环境中，使用全局变量
  if (typeof globalThis.__IS_DEV__ !== "undefined") {
    return globalThis.__IS_DEV__;
  }
  // 使用 Vite 定义的全局常量
  return typeof __DEV__ !== "undefined" ? __DEV__ : true;
}

/**
 * 设置开发环境标志（仅用于测试）
 * @param value 是否为开发环境
 */
export function setDevMode(value: boolean): void {
  globalThis.__IS_DEV__ = value;
}
