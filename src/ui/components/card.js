/**
 * 收藏卡片渲染组件
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';
import { sanitizeSnapshot } from '../utils/sanitize.js';
import { filterCustomTags } from '../../core/cleaner.js';

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
 * @param {Array<string>} [options.tagFilters] - 需要隐藏的自定义标签
 * @returns {HTMLElement} 卡片元素
 */
export function renderCard(item, options) {
    const {
        expanded,
        selected,
        onToggleExpand,
        onToggleSelect,
        onEdit,
        onDelete,
        context,
        preferences,
        tagFilters = [],
    } = options;

    const isExpanded = expanded.has(item.id);
    const card = el('article', { class: `${CSS_PREFIX}card` });

    // 复选框
    const checkbox = el('input', {
        type: 'checkbox',
        class: `${CSS_PREFIX}card-checkbox`,
        'aria-label': '选择此项',
    });
    checkbox.checked = selected.has(item.id);
    checkbox.addEventListener('change', () => onToggleSelect(item.id, checkbox.checked));

    // 卡片头部
    const date = new Date(item.createdAt);
    card.append(el('header', { class: `${CSS_PREFIX}card-head` }, [
        checkbox,
        el('strong', {
            class: `${CSS_PREFIX}card-speaker`,
            text: item.source.speakerName || item.source.ownerName,
        }),
        el('time', {
            class: `${CSS_PREFIX}card-time`,
            text: Number.isNaN(date.valueOf()) ? '' : date.toLocaleString(),
        }),
    ]));

    // 元信息
    card.append(el('div', {
        class: `${CSS_PREFIX}meta`,
        text: `${item.source.ownerName} / ${item.source.chatName}`,
    }));

    // 消息正文
    const body = el('div', {
        class: `${CSS_PREFIX}body${isExpanded ? ` ${CSS_PREFIX}expanded` : ''}`,
    });

    if (preferences.renderMode === 'styled' && item.message.snapshotHtml) {
        const safeHtml = sanitizeSnapshot(item.message.snapshotHtml, context);
        if (safeHtml === null) {
            body.textContent = filterCustomTags(item.message.rawText, tagFilters);
        } else {
            const snapshot = el('div', { class: `${CSS_PREFIX}snapshot` });
            // 快照中的自定义标签可能以转义形式出现，filterCustomTags 同时处理两种写法
            snapshot.innerHTML = filterCustomTags(safeHtml, tagFilters);
            body.append(snapshot);
        }
    } else {
        body.textContent = filterCustomTags(item.message.rawText, tagFilters);
    }

    card.append(body);

    // 展开/折叠按钮（与正文点击分离，避免误触选中文本）
    const toggle = el('button', {
        type: 'button',
        class: `${CSS_PREFIX}expand-toggle`,
        text: isExpanded ? '收起' : '展开全文',
    });
    toggle.setAttribute('aria-expanded', String(isExpanded));
    toggle.addEventListener('click', () => onToggleExpand(item.id));
    card.append(toggle);


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

    // 标签（chip 形式）
    if (item.tags && item.tags.length > 0) {
        const tags = el('div', { class: `${CSS_PREFIX}tags` });
        for (const tag of item.tags) {
            tags.append(el('span', { class: `${CSS_PREFIX}tag`, text: `#${tag}` }));
        }
        card.append(tags);
    }

    // 备注
    if (item.note) {
        card.append(el('p', { class: `${CSS_PREFIX}note`, text: item.note }));
    }

    // 操作按钮
    const actions = el('div', { class: `${CSS_PREFIX}card-actions` });
    const editBtn = el('button', { type: 'button', class: `${CSS_PREFIX}button`, text: '编辑' });
    editBtn.addEventListener('click', () => onEdit(item));
    const deleteBtn = el('button', { type: 'button', class: `${CSS_PREFIX}button`, text: '删除' });
    deleteBtn.addEventListener('click', () => onDelete(item));
    actions.append(editBtn, deleteBtn);
    card.append(actions);

    return card;
}

