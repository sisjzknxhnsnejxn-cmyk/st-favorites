/**
 * 统一的弹层工具
 *
 * 所有次级弹层（确认框、编辑器、标签管理）都通过原生 <dialog>.showModal() 打开，
 * 从而进入浏览器 top layer。这样它们始终显示在同样使用 showModal() 的主面板之上，
 * 不再依赖 z-index，也不会被主面板的 backdrop 遮挡。
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from './dom.js';

/**
 * 创建并打开一个模态弹层
 * @param {Object} options - 配置
 * @param {string} [options.className] - 附加到 dialog 上的类名
 * @param {string} [options.label] - aria-label
 * @param {boolean} [options.dismissible=true] - 点击背景/Esc 是否可关闭
 * @param {Function} [options.onDismiss] - 通过背景点击或 Esc 关闭时触发
 * @returns {{dialog: HTMLDialogElement, body: HTMLElement, close: Function}}
 */
export function openModal(options = {}) {
    const {
        className = '',
        label = '',
        dismissible = true,
        onDismiss,
    } = options;

    const dialog = el('dialog', {
        class: `${CSS_PREFIX}modal ${className}`.trim(),
    });
    if (label) dialog.setAttribute('aria-label', label);

    const body = el('div', { class: `${CSS_PREFIX}modal-body` });
    dialog.append(body);

    let dismissed = true;

    const close = (silent = true) => {
        dismissed = !silent;
        if (dialog.open) dialog.close();
        else cleanup();
    };

    const cleanup = () => {
        dialog.remove();
    };

    dialog.addEventListener('cancel', event => {
        if (!dismissible) {
            event.preventDefault();
            return;
        }
        dismissed = true;
    });

    dialog.addEventListener('click', event => {
        if (!dismissible) return;
        // 点击 dialog 自身（即 backdrop 区域）才关闭
        if (event.target === dialog) {
            dismissed = true;
            dialog.close();
        }
    });

    dialog.addEventListener('close', () => {
        cleanup();
        if (dismissed) onDismiss?.();
    });

    document.body.append(dialog);
    dialog.showModal();

    return {
        dialog,
        body,
        /** 以“已处理”的方式关闭，不会触发 onDismiss */
        close: () => close(true),
    };
}
