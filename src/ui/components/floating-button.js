/**
 * 浮动按钮组件
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { el } from '../utils/dom.js';

const FLOATING_POSITION_KEY = `${EXTENSION_KEY}:floating-position`;

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
        
        // 更新位置
        floating.style.left = `${Math.max(8, Math.min(globalThis.innerWidth - 56, event.clientX - 24))}px`;
        floating.style.top = `${Math.max(8, Math.min(globalThis.innerHeight - 56, event.clientY - 24))}px`;
        floating.style.right = 'auto';
        floating.style.bottom = 'auto';
    });
    
    floating.addEventListener('pointerup', event => {
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
    document.getElementById(`${EXTENSION_KEY}-floating`)?.remove();
}
