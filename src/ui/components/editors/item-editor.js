/**
 * 单项编辑器组件
 */

import { CSS_PREFIX } from '../../../core/constants.js';
import { el } from '../../utils/dom.js';

/**
 * 打开单项编辑对话框
 * @param {Object} item - 要编辑的收藏项
 * @param {Function} onSave - 保存回调 (patch) => void
 */
export function openItemEditor(item, onSave) {
    const overlay = el('div', { class: `${CSS_PREFIX}edit-overlay` });
    const form = el('form', { 
        class: `${CSS_PREFIX}edit-dialog`, 
        'aria-label': '编辑收藏标签和备注' 
    });
    
    form.append(el('h3', { text: '编辑收藏' }));
    
    // 标签输入
    const tagsInput = el('input', { 
        type: 'text', 
        value: (item.tags ?? []).join(', '),
        placeholder: '用逗号分隔多个标签',
        'aria-label': '标签'
    });
    form.append(el('label', {}, [
        el('span', { text: '标签' }), 
        tagsInput
    ]));
    
    // 备注输入
    const noteInput = el('textarea', { 
        placeholder: '添加备注（可选）',
        'aria-label': '备注'
    });
    noteInput.value = item.note || '';
    form.append(el('label', {}, [
        el('span', { text: '备注' }), 
        noteInput
    ]));
    
    // 操作按钮
    const actions = el('div', { class: `${CSS_PREFIX}actions` });
    const cancel = el('button', { type: 'button', text: '取消' });
    cancel.addEventListener('click', () => overlay.remove());
    
    const save = el('button', { 
        type: 'submit', 
        class: `${CSS_PREFIX}primary`,
        text: '保存' 
    });
    
    actions.append(cancel, save);
    form.append(actions);
    
    // 提交处理
    form.addEventListener('submit', event => {
        event.preventDefault();
        const tags = tagsInput.value.split(',').map(v => v.trim()).filter(Boolean);
        const note = noteInput.value.trim();
        onSave({ tags, note });
        overlay.remove();
    });
    
    overlay.append(form);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove();
    });
    
    document.body.append(overlay);
    tagsInput.focus();
}
