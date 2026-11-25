/**
 * 对话框组件（确认框、输入框）
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';

/**
 * 显示确认对话框
 * @param {string} text - 提示文本
 * @returns {Promise<boolean>} 用户是否确认
 */
export function askConfirm(text) {
    return new Promise(resolve => {
        const overlay = el('div', { class: `${CSS_PREFIX}confirm-overlay` });
        const dialog = el('div', { class: `${CSS_PREFIX}confirm-dialog` });
        dialog.append(el('p', { text }));
        
        const actions = el('div', { class: `${CSS_PREFIX}actions` });
        const cancel = el('button', { type: 'button', text: '取消' });
        cancel.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        
        const confirm = el('button', { 
            type: 'button', 
            class: `${CSS_PREFIX}primary`, 
            text: '确认' 
        });
        confirm.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        
        actions.append(cancel, confirm);
        dialog.append(actions);
        overlay.append(dialog);
        
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
        
        document.body.append(overlay);
        confirm.focus();
    });
}

/**
 * 显示输入对话框
 * @param {string} text - 提示文本
 * @param {string} defaultValue - 默认值
 * @returns {Promise<string|null>} 用户输入的文本或 null（取消时）
 */
export function askInput(text, defaultValue = '') {
    return new Promise(resolve => {
        const overlay = el('div', { class: `${CSS_PREFIX}confirm-overlay` });
        const dialog = el('div', { class: `${CSS_PREFIX}confirm-dialog` });
        dialog.append(el('p', { text }));
        
        const input = el('input', { type: 'text', value: defaultValue });
        dialog.append(input);
        
        const actions = el('div', { class: `${CSS_PREFIX}actions` });
        const cancel = el('button', { type: 'button', text: '取消' });
        cancel.addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });
        
        const confirm = el('button', { 
            type: 'button', 
            class: `${CSS_PREFIX}primary`, 
            text: '确认' 
        });
        confirm.addEventListener('click', () => {
            overlay.remove();
            resolve(input.value.trim());
        });
        
        actions.append(cancel, confirm);
        dialog.append(actions);
        overlay.append(dialog);
        
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });
        
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') confirm.click();
            if (event.key === 'Escape') cancel.click();
        });
        
        document.body.append(overlay);
        input.focus();
        input.select();
    });
}
