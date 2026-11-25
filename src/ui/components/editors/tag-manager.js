/**
 * 标签管理器组件
 */

import { CSS_PREFIX } from '../../../core/constants.js';
import { el } from '../../utils/dom.js';
import { askConfirm, askInput } from '../dialogs.js';
import { notify } from '../toast.js';

/**
 * 打开标签管理对话框
 * @param {Array} items - 所有收藏项
 * @param {Function} onUpdate - 更新回调 (updatedItems) => void
 */
export function openTagManager(items, onUpdate) {
    // 统计标签
    const tagCounts = new Map();
    for (const item of items) {
        for (const tag of item.tags ?? []) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
    }
    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
    
    const overlay = el('div', { class: `${CSS_PREFIX}edit-overlay` });
    const dialog = el('div', { 
        class: `${CSS_PREFIX}tag-manager`, 
        'aria-label': '标签管理' 
    });
    
    dialog.append(el('h3', { text: '标签管理' }));
    
    if (sortedTags.length === 0) {
        dialog.append(el('p', { text: '还没有标签' }));
    } else {
        const list = el('ul', { class: `${CSS_PREFIX}tag-list` });
        
        for (const [tag, count] of sortedTags) {
            const item = el('li', {});
            item.append(el('span', { 
                class: `${CSS_PREFIX}tag-name`, 
                text: `${tag} (${count})` 
            }));
            
            const actions = el('div', { class: `${CSS_PREFIX}tag-actions` });
            
            // 重命名按钮
            const rename = el('button', { type: 'button', text: '重命名' });
            rename.addEventListener('click', async () => {
                const newTag = await askInput(`重命名标签 "${tag}" 为：`, tag);
                if (!newTag || newTag === tag) return;
                
                const updatedItems = items.map(it => ({
                    ...it,
                    tags: [...new Set((it.tags ?? []).map(t => t === tag ? newTag : t))],
                }));
                
                onUpdate(updatedItems);
                overlay.remove();
                notify(`标签已重命名`, 'success');
            });
            
            // 删除按钮
            const remove = el('button', { type: 'button', text: '删除' });
            remove.addEventListener('click', async () => {
                if (!await askConfirm(`删除标签 "${tag}"？将从 ${count} 项中移除。`)) return;
                
                const updatedItems = items.map(it => ({
                    ...it,
                    tags: (it.tags ?? []).filter(t => t !== tag),
                }));
                
                onUpdate(updatedItems);
                overlay.remove();
                notify(`标签已删除`, 'success');
            });
            
            actions.append(rename, remove);
            item.append(actions);
            list.append(item);
        }
        
        dialog.append(list);
    }
    
    // 关闭按钮
    const closeBtn = el('button', { type: 'button', text: '关闭' });
    closeBtn.addEventListener('click', () => overlay.remove());
    dialog.append(closeBtn);
    
    overlay.append(dialog);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove();
    });
    
    document.body.append(overlay);
}
