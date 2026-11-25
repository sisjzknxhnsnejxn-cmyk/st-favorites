/**
 * 批量标签编辑器组件
 */

import { CSS_PREFIX } from '../../../core/constants.js';
import { el } from '../../utils/dom.js';

/**
 * 打开批量标签编辑对话框
 * @param {Array<string>} itemIds - 要编辑的项目 ID 列表
 * @param {Function} onSave - 保存回调 (addTags, removeTags) => void
 */
export function openBatchTagEditor(itemIds, onSave) {
    const overlay = el('div', { class: `${CSS_PREFIX}edit-overlay` });
    const form = el('form', { 
        class: `${CSS_PREFIX}edit-dialog`, 
        'aria-label': '批量编辑标签' 
    });
    
    form.append(el('h3', { text: `批量编辑 ${itemIds.length} 项` }));
    
    // 添加标签输入
    const addInput = el('input', { 
        type: 'text', 
        placeholder: '用逗号分隔，留空则不改变',
        'aria-label': '添加标签'
    });
    form.append(el('label', {}, [
        el('span', { text: '添加标签' }), 
        addInput
    ]));
    
    // 移除标签输入
    const removeInput = el('input', { 
        type: 'text', 
        placeholder: '用逗号分隔，留空则不改变',
        'aria-label': '移除标签'
    });
    form.append(el('label', {}, [
        el('span', { text: '移除标签' }), 
        removeInput
    ]));
    
    // 操作按钮
    const actions = el('div', { class: `${CSS_PREFIX}actions` });
    const cancel = el('button', { type: 'button', text: '取消' });
    cancel.addEventListener('click', () => overlay.remove());
    
    const save = el('button', { type: 'submit', text: '保存' });
    actions.append(cancel, save);
    form.append(actions);
    
    // 提交处理
    form.addEventListener('submit', event => {
        event.preventDefault();
        const addTags = addInput.value.split(',').map(v => v.trim()).filter(Boolean);
        const removeTags = removeInput.value.split(',').map(v => v.trim()).filter(Boolean);
        
        if (addTags.length === 0 && removeTags.length === 0) {
            overlay.remove();
            return;
        }
        
        onSave(addTags, removeTags);
        overlay.remove();
    });
    
    overlay.append(form);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove();
    });
    
    document.body.append(overlay);
    addInput.focus();
}
