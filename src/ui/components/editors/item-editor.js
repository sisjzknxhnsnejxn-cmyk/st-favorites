/**
 * 单项编辑器组件
 */

import { CSS_PREFIX } from '../../../core/constants.js';
import { el, parseTagList } from '../../utils/dom.js';
import { openModal } from '../../utils/modal.js';

/**
 * 打开单项编辑对话框
 * @param {Object} item - 要编辑的收藏项
 * @param {Function} onSave - 保存回调 (patch) => void
 */
export function openItemEditor(item, onSave) {
    const { body, close } = openModal({
        className: `${CSS_PREFIX}edit-dialog`,
        label: '编辑收藏标签和备注',
    });

    const form = el('form', { class: `${CSS_PREFIX}form` });
    form.append(el('h3', { class: `${CSS_PREFIX}modal-title`, text: '编辑收藏' }));

    // 标签输入
    const tagsInput = el('input', {
        type: 'text',
        class: `${CSS_PREFIX}input`,
        placeholder: '用逗号分隔多个标签',
        'aria-label': '标签',
    });
    tagsInput.value = (item.tags ?? []).join(', ');
    form.append(el('label', { class: `${CSS_PREFIX}field` }, [
        el('span', { text: '标签' }),
        tagsInput,
    ]));

    // 备注输入
    const noteInput = el('textarea', {
        class: `${CSS_PREFIX}textarea`,
        placeholder: '添加备注（可选）',
        'aria-label': '备注',
        rows: '4',
    });
    noteInput.value = item.note || '';
    form.append(el('label', { class: `${CSS_PREFIX}field` }, [
        el('span', { text: '备注' }),
        noteInput,
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
        onSave({
            tags: parseTagList(tagsInput.value),
            note: noteInput.value.trim(),
        });
        close();
    });

    body.append(form);
    tagsInput.focus();
}
