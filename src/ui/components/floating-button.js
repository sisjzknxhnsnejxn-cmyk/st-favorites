/**
 * 浮动按钮组件
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { el } from '../utils/dom.js';

const FLOATING_POSITION_KEY = `${EXTENSION_KEY}:floating-position`;

/** 当前浮动按钮绑定的 resize 监听器，移除按钮时需一并解绑 */
let resizeHandler = null;


/**
 * 读取保存的浮动按钮位置
 * @returns {Object|null} 位置信息 {left, top} 或 null
 */
function readFloatingPosition() {
    try {
        const value = JSON.parse(globalThis.localStorage?.getItem(FLOATING_POSITION_KEY) ?? 'null');
        if (value && Number.isFinite(value.left) && Number.isFinite(value.top)) {
            return value;
        }
    } catch (error) {
        console.warn(`[${EXTENSION_KEY}] unable to read floating position`, error);
    }
    return null;
}

/**
 * 保存浮动按钮位置
 * @param {number} left - 左侧位置
 * @param {number} top - 顶部位置
 */
function saveFloatingPosition(left, top) {
    try {
        globalThis.localStorage?.setItem(FLOATING_POSITION_KEY, JSON.stringify({ left, top }));
    } catch (error) {
        console.warn(`[${EXTENSION_KEY}] unable to save floating position`, error);
    }
}

/**
 * 创建浮动按钮
 * @param {Function} onClick - 点击回调
 * @returns {HTMLElement} 浮动按钮元素
 */
export function createFloatingButton(onClick) {
    const floating = el('button', {
        id: `${EXTENSION_KEY}-floating`,
        class: `${CSS_PREFIX}floating`,
        type: 'button',
        text: '★',
        title: '打开收藏夹',
        'aria-label': '打开收藏夹',
    });

    floating.dataset.stFavEntry = 'floating';

    // 恢复保存的位置
    const saved = readFloatingPosition();
    if (saved) {
        floating.style.left = `${saved.left}px`;
        floating.style.top = `${saved.top}px`;
        floating.style.right = 'auto';
        floating.style.bottom = 'auto';
    }

    // 拖拽功能
    let moved = false;
    let startX = 0;
    let startY = 0;

    /** 将按钮限制在视口内，并在需要时保存 */
    const clampToViewport = (persist) => {
        const rect = floating.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        const left = Math.max(12, Math.min(globalThis.innerWidth - rect.width - 12, rect.left));
        const top = Math.max(12, Math.min(globalThis.innerHeight - rect.height - 12, rect.top));
        floating.style.left = `${left}px`;
        floating.style.top = `${top}px`;
        floating.style.right = 'auto';
        floating.style.bottom = 'auto';
        if (persist) saveFloatingPosition(left, top);
    };

    floating.addEventListener('pointerdown', event => {
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        floating.setPointerCapture(event.pointerId);
    });

    floating.addEventListener('pointermove', event => {
        if (!floating.hasPointerCapture(event.pointerId)) return;

        // 检测是否移动超过阈值
        if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 8) {
            moved = true;
        }

        if (!moved) return;

        // 拖拽中跟随指针（松手时再贴边）
        const rect = floating.getBoundingClientRect();
        floating.style.left = `${Math.max(8, Math.min(globalThis.innerWidth - rect.width - 8, event.clientX - rect.width / 2))}px`;
        floating.style.top = `${Math.max(8, Math.min(globalThis.innerHeight - rect.height - 8, event.clientY - rect.height / 2))}px`;
        floating.style.right = 'auto';
        floating.style.bottom = 'auto';
    });

    floating.addEventListener('pointerup', event => {
        if (floating.hasPointerCapture(event.pointerId)) {
            floating.releasePointerCapture(event.pointerId);
        }

        if (!moved) {
            // 未移动，触发点击
            onClick();
            return;
        }

        // 移动结束，贴边并保存位置
        const rect = floating.getBoundingClientRect();
        const snappedLeft = rect.left + rect.width / 2 < globalThis.innerWidth / 2
            ? 12
            : Math.max(12, globalThis.innerWidth - rect.width - 12);
        const snappedTop = Math.max(12, Math.min(globalThis.innerHeight - rect.height - 12, rect.top));

        floating.style.left = `${snappedLeft}px`;
        floating.style.top = `${snappedTop}px`;
        floating.style.right = 'auto';
        floating.style.bottom = 'auto';

        saveFloatingPosition(snappedLeft, snappedTop);
    });

    // 指针被系统中断（来电、手势返回等），回正位置避免卡在视口外
    floating.addEventListener('pointercancel', event => {
        if (floating.hasPointerCapture(event.pointerId)) {
            floating.releasePointerCapture(event.pointerId);
        }
        if (moved) clampToViewport(true);
        moved = false;
    });

    // 视口变化（旋转屏幕、窗口缩放）后重新约束位置
    resizeHandler = () => clampToViewport(false);
    globalThis.addEventListener('resize', resizeHandler);

    // 防止键盘触发导致的点击（detail === 0）
    floating.addEventListener('click', event => {
        if (event.detail === 0) onClick();
    });

    return floating;
}

/**
 * 移除浮动按钮
 */
export function removeFloatingButton() {
    if (resizeHandler) {
        globalThis.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    document.getElementById(`${EXTENSION_KEY}-floating`)?.remove();
}

