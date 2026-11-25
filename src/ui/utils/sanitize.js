/**
 * HTML 清洗与安全处理
 */

/**
 * 清洗 HTML 快照，移除危险脚本
 * @param {string} html - 原始 HTML
 * @param {Object} context - SillyTavern 上下文
 * @returns {string|null} 清洗后的 HTML 或 null
 */
export function sanitizeSnapshot(html, context) {
    const purifier = globalThis.DOMPurify ?? context.DOMPurify;
    if (!purifier?.sanitize) return null;
    return purifier.sanitize(html, { USE_PROFILES: { html: true } });
}
