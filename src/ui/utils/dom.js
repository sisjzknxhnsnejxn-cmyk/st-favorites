/**
 * DOM 操作辅助函数
 */

/**
 * 创建 DOM 元素的辅助函数
 * @param {string} tag - 标签名
 * @param {Object} attrs - 属性对象
 * @param {Array} children - 子元素数组
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
}

/**
 * 解析用逗号分隔的标签输入（支持中英文逗号、分号、换行）
 * @param {string} value - 原始输入
 * @returns {Array<string>} 去重后的标签数组
 */
export function parseTagList(value) {
    return [...new Set(
        String(value ?? '')
            .split(/[,，;；\r\n]+/)
            .map(part => part.trim())
            .filter(Boolean),
    )];
}

