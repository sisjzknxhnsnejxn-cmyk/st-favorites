/**
 * Toast 通知组件
 *
 * 主面板与弹层使用 showModal() 进入 top layer，普通 body 子元素会被 backdrop 遮住。
 * 因此 toast 容器使用 popover="manual"（同样进入 top layer），并在不支持时降级为普通元素。
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { el } from '../utils/dom.js';

const CONTAINER_ID = `${EXTENSION_KEY}-toast-container`;

/**
 * 获取（或创建）toast 容器
 * @returns {HTMLElement}
 */
function getContainer() {
    let container = document.getElementById(CONTAINER_ID);
    if (container) return container;

    container = el('div', {
        id: CONTAINER_ID,
        class: `${CSS_PREFIX}toast-container`,
    });

    const supportsPopover = typeof container.showPopover === 'function';
    if (supportsPopover) {
        container.setAttribute('popover', 'manual');
    }

    document.body.append(container);

    if (supportsPopover) {
        try {
            container.showPopover();
        } catch {
            // 已显示或不支持时忽略
        }
    }

    return container;
}

/**
 * 显示 Toast 通知
 * @param {string} text - 通知文本
 * @param {string} type - 类型：'info' | 'success' | 'error'
 */
export function notify(text, type = 'info') {
    const container = getContainer();
    const toast = el('div', {
        class: `${CSS_PREFIX}toast ${CSS_PREFIX}toast-${type}`,
        role: 'status',
        text,
    });
    container.append(toast);

    globalThis.requestAnimationFrame?.(() => toast.classList.add(`${CSS_PREFIX}toast-show`))
        ?? globalThis.setTimeout(() => toast.classList.add(`${CSS_PREFIX}toast-show`), 10);

    globalThis.setTimeout(() => {
        toast.classList.remove(`${CSS_PREFIX}toast-show`);
        globalThis.setTimeout(() => {
            toast.remove();
            if (container.childElementCount === 0) {
                try { container.hidePopover?.(); } catch { /* noop */ }
                container.remove();
            }
        }, 300);
    }, 3000);
}

