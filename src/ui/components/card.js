/**
 * 收藏卡片渲染组件
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';
import { sanitizeSnapshot } from '../utils/sanitize.js';

/**
 * 渲染单个收藏卡片
 * @param {Object} item - 收藏项
 * @param {Object} options - 渲染选项
 * @param {Set} options.expanded - 展开的项目 ID 集合
 * @param {Set} options.selected - 选中的项目 ID 集合
 * @param {Function} options.onToggleExpand - 展开/折叠回调
 * @param {Function} options.onToggleSelect - 选中/取消选中回调
 * @param {Function} options.onEdit - 编辑回调
 * @param {Function} options.onDelete - 删除回调
 * @param {Object} options.context - SillyTavern 上下文
 * @param {Object} options.preferences - 偏好设置
 * @returns {HTMLElement} 卡片元素
 */
export function renderCard(item, options) {
    const { expanded, selected, onToggleExpand, onToggleSelect, onEdit, onDelete, context, preferences } = options;
    
    const card = el('article', { class: `${CSS_PREFIX}card` });
    
    // 复选框
    const checkbox = el('input', { 
        type: 'checkbox', 
        class: `${CSS_PREFIX}card-checkbox`, 
        'aria-label': '选择此项' 
    });
    checkbox.checked = selected.has(item.id);
    checkbox.addEventListener('change', () => onToggleSelect(item.id, checkbox.checked));
    
    // 卡片头部
    const date = new Date(item.createdAt);
    card.append(el('header', { class: `${CSS_PREFIX}card-head` }, [
        checkbox,
        el('strong', { text: item.source.speakerName || item.source.ownerName }),
        el('time', { text: Number.isNaN(date.valueOf()) ? '' : date.toLocaleString() }),
    ]));
    
    // 元信息
    card.append(el('div', {
        class: `${CSS_PREFIX}meta`,
        text: `${item.source.ownerName} / ${item.source.chatName}`,
    }));
    
    // 消息正文
    const body = el('div', {
        class: `${CSS_PREFIX}body${expanded.has(item.id) ? ` ${CSS_PREFIX}expanded` : ''}`,
    });
    
    if (preferences.renderMode === 'styled' && item.message.snapshotHtml) {
        const safeHtml = sanitizeSnapshot(item.message.snapshotHtml, context);
        if (safeHtml === null) {
            body.textContent = item.message.rawText;
        } else {
            const snapshot = el('div', { class: `${CSS_PREFIX}snapshot` });
            snapshot.innerHTML = safeHtml;
            body.append(snapshot);
        }
    } else {
        body.textContent = item.message.rawText;
    }
    
    body.addEventListener('click', () => onToggleExpand(item.id));
    card.append(body);
    
    // 思维链
    if (item.message.reasoning) {
        const details = el('details', { class: `${CSS_PREFIX}reasoning` });
        const summary = el('summary', { text: '💭 思维链' });
        const reasoning = el('pre', { 
            class: `${CSS_PREFIX}reasoning-content`, 
            text: item.message.reasoning 
        });
        details.append(summary, reasoning);
        card.append(details);
    }
    
    // 标签
    if (item.tags && item.tags.length > 0) {
        card.append(el('div', {
            class: `${CSS_PREFIX}tags`,
            text: item.tags.map(tag => `#${tag}`).join('  '),
        }));
    }
    
    // 备注
    if (item.note) {
        card.append(el('p', { class: `${CSS_PREFIX}note`, text: item.note }));
    }
    
    // 操作按钮
    const actions = el('div', { class: `${CSS_PREFIX}card-actions` });
    const editBtn = el('button', { type: 'button', text: '编辑' });
    editBtn.addEventListener('click', () => onEdit(item));
    const deleteBtn = el('button', { type: 'button', text: '删除' });
    deleteBtn.addEventListener('click', () => onDelete(item));
    actions.append(editBtn, deleteBtn);
    card.append(actions);
    
    return card;
}
