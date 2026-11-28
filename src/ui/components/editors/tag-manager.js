/**
 * 标签管理器组件
 */

import { CSS_PREFIX } from '../../../core/constants.js';
import { el } from '../../utils/dom.js';
import { openModal } from '../../utils/modal.js';
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

    const { body, close } = openModal({
        className: `${CSS_PREFIX}tag-manager`,
        label: '标签管理',
    });

    body.append(el('h3', { class: `${CSS_PREFIX}modal-title`, text: '标签管理' }));

    if (sortedTags.length === 0) {
        body.append(el('p', { class: `${CSS_PREFIX}empty`, text: '还没有标签' }));
    } else {
        const list = el('ul', { class: `${CSS_PREFIX}tag-list` });

        for (const [tag, count] of sortedTags) {
            const row = el('li', { class: `${CSS_PREFIX}tag-row` });
            row.append(el('span', {
                class: `${CSS_PREFIX}tag-name`,
                text: `${tag} (${count})`,
            }));

            const actions = el('div', { class: `${CSS_PREFIX}tag-actions` });

            // 重命名按钮
            const rename = el('button', {
                type: 'button',
                class: `${CSS_PREFIX}button`,
                text: '重命名',
            });
            rename.addEventListener('click', async () => {
                const newTag = await askInput(`重命名标签 "${tag}" 为：`, tag);
                if (!newTag || newTag === tag) return;

                const updatedItems = items.map(it => ({
                    ...it,
                    tags: [...new Set((it.tags ?? []).map(t => (t === tag ? newTag : t)))],
                }));

                onUpdate(updatedItems);
                close();
                notify('标签已重命名', 'success');
            });

            // 删除按钮
            const remove = el('button', {
                type: 'button',
                class: `${CSS_PREFIX}button`,
                text: '删除',
            });
            remove.addEventListener('click', async () => {
                if (!await askConfirm(`删除标签 "${tag}"？将从 ${count} 项中移除。`)) return;

                const updatedItems = items.map(it => ({
                    ...it,
                    tags: (it.tags ?? []).filter(t => t !== tag),
                }));

                onUpdate(updatedItems);
                close();
                notify('标签已删除', 'success');
            });

            actions.append(rename, remove);
            row.append(actions);
            list.append(row);
        }

        body.append(list);
    }

    // 关闭按钮
    const actions = el('div', { class: `${CSS_PREFIX}actions` });
    const closeBtn = el('button', {
        type: 'button',
        class: `${CSS_PREFIX}button ${CSS_PREFIX}primary`,
        text: '关闭',
    });
    closeBtn.addEventListener('click', () => close());
    actions.append(closeBtn);
    body.append(actions);
}
