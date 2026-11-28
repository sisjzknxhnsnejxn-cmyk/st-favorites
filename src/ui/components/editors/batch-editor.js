/**
 * 批量标签编辑器组件
 */

import { CSS_PREFIX } from '../../../core/constants.js';
import { el, parseTagList } from '../../utils/dom.js';
import { openModal } from '../../utils/modal.js';

/**
 * 打开批量标签编辑对话框
 * @param {Array<string>} itemIds - 要编辑的项目 ID 列表
 * @param {Function} onSave - 保存回调 (addTags, removeTags) => void
 */
export function openBatchTagEditor(itemIds, onSave) {
    const { body, close } = openModal({
        className: `${CSS_PREFIX}edit-dialog`,
        label: '批量编辑标签',
    });

    const form = el('form', { class: `${CSS_PREFIX}form` });
    form.append(el('h3', {
        class: `${CSS_PREFIX}modal-title`,
        text: `批量编辑 ${itemIds.length} 项`,
    }));

    // 添加标签输入
    const addInput = el('input', {
        type: 'text',
        class: `${CSS_PREFIX}input`,
        placeholder: '用逗号分隔，留空则不改变',
        'aria-label': '添加标签',
    });
    form.append(el('label', { class: `${CSS_PREFIX}field` }, [
        el('span', { text: '添加标签' }),
        addInput,
    ]));

    // 移除标签输入
    const removeInput = el('input', {
        type: 'text',
        class: `${CSS_PREFIX}input`,
        placeholder: '用逗号分隔，留空则不改变',
        'aria-label': '移除标签',
    });
    form.append(el('label', { class: `${CSS_PREFIX}field` }, [
        el('span', { text: '移除标签' }),
        removeInput,
    ]));

    // 操作按钮
    const actions = el('div', { class: `${CSS_PREFIX}actions` });
    const cancel = el('button', { type: 'button', class: `${CSS_PREFIX}button`, text: '取消' });
    cancel.addEventListener('click', () => close());

    const save = el('button', {
        type: 'submit',
        class: `${CSS_PREFIX}button ${CSS_PREFIX}primary`,
        text: '保存',
    });
    actions.append(cancel, save);
    form.append(actions);

    form.addEventListener('submit', event => {
        event.preventDefault();
        const addTags = parseTagList(addInput.value);
        const removeTags = parseTagList(removeInput.value);

        if (addTags.length === 0 && removeTags.length === 0) {
            close();
            return;
        }

        onSave(addTags, removeTags);
        close();
    });

    body.append(form);
    addInput.focus();
}
