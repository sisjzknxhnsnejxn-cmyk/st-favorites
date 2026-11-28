/**
 * 对话框组件（确认框、输入框）
 *
 * 统一基于 openModal（原生 <dialog> + showModal），确保始终叠在主面板之上。
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';
import { openModal } from '../utils/modal.js';

/**
 * 通用的提示弹层
 * @param {Object} options - 配置
 * @param {string} options.text - 提示文本
 * @param {boolean} [options.withInput=false] - 是否显示输入框
 * @param {string} [options.defaultValue=''] - 输入框默认值
 * @param {*} options.cancelValue - 取消时返回的值
 * @param {Function} options.resolveValue - 确认时的取值函数
 * @returns {Promise<*>}
 */
function createPrompt({ text, withInput = false, defaultValue = '', cancelValue, resolveValue }) {
    return new Promise(resolve => {
        let settled = false;
        const finish = value => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        const { body, close } = openModal({
            className: `${CSS_PREFIX}confirm-dialog`,
            label: text,
            onDismiss: () => finish(cancelValue),
        });

        body.append(el('p', { class: `${CSS_PREFIX}confirm-text`, text }));

        let input = null;
        if (withInput) {
            input = el('input', { type: 'text', class: `${CSS_PREFIX}input` });
            input.value = defaultValue;
            body.append(input);
        }

        const actions = el('div', { class: `${CSS_PREFIX}actions` });

        const cancel = el('button', {
            type: 'button',
            class: `${CSS_PREFIX}button`,
            text: '取消',
        });
        cancel.addEventListener('click', () => {
            finish(cancelValue);
            close();
        });

        const confirm = el('button', {
            type: 'button',
            class: `${CSS_PREFIX}button ${CSS_PREFIX}primary`,
            text: '确认',
        });
        confirm.addEventListener('click', () => {
            finish(resolveValue(input));
            close();
        });

        actions.append(cancel, confirm);
        body.append(actions);

        if (input) {
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    confirm.click();
                }
            });
            input.focus();
            input.select();
        } else {
            confirm.focus();
        }
    });
}

/**
 * 显示确认对话框
 * @param {string} text - 提示文本
 * @returns {Promise<boolean>} 用户是否确认
 */
export function askConfirm(text) {
    return createPrompt({
        text,
        cancelValue: false,
        resolveValue: () => true,
    });
}

/**
 * 显示输入对话框
 * @param {string} text - 提示文本
 * @param {string} defaultValue - 默认值
 * @returns {Promise<string|null>} 用户输入的文本或 null（取消时）
 */
export function askInput(text, defaultValue = '') {
    return createPrompt({
        text,
        withInput: true,
        defaultValue,
        cancelValue: null,
        resolveValue: input => input.value.trim(),
    });
}
