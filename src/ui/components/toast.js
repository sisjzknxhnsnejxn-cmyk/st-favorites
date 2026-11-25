/**
 * Toast 通知组件
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';

/**
 * 显示 Toast 通知
 * @param {string} text - 通知文本
 * @param {string} type - 类型：'info' | 'success' | 'error'
 */
export function notify(text, type = 'info') {
    const toast = el('div', { 
        class: `${CSS_PREFIX}toast ${CSS_PREFIX}toast-${type}`, 
        text 
    });
    document.body.append(toast);
    
    globalThis.setTimeout(() => toast.classList.add(`${CSS_PREFIX}toast-show`), 10);
    
    globalThis.setTimeout(() => {
        toast.classList.remove(`${CSS_PREFIX}toast-show`);
        globalThis.setTimeout(() => toast.remove(), 300);
    }, 3000);
}
