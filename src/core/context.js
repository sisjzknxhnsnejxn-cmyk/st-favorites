/**
 * SillyTavern 上下文获取
 */

/**
 * 获取 SillyTavern 上下文对象
 * @returns {Object} SillyTavern 上下文
 * @throws {Error} 如果 SillyTavern API 不可用
 */
export function getContext() {
    if (!globalThis.SillyTavern?.getContext) {
        throw new Error('SillyTavern context API is unavailable.');
    }
    return globalThis.SillyTavern.getContext();
}
