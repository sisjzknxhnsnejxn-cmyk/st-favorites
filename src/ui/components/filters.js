/**
 * 筛选与搜索组件
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';

/**
 * 创建筛选工具栏
 *
 * 该工具栏只创建一次，由 panel 持有引用并通过 update() 刷新选项，
 * 避免每次渲染重建搜索框而打断输入法组合输入。
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.onQueryChange - 搜索词变化回调（已防抖）
 * @param {Function} options.onTagFilterChange - 标签筛选变化回调
 * @param {Function} options.onGroupFilterChange - 分组筛选变化回调
 * @returns {{element: HTMLElement, update: Function}}
 */
export function createFilters(options) {
    const { onQueryChange, onTagFilterChange, onGroupFilterChange } = options;

    const toolbar = el('div', { class: `${CSS_PREFIX}toolbar` });

    // 搜索框
    const search = el('input', {
        type: 'search',
        class: `${CSS_PREFIX}search`,
        placeholder: '搜索消息、备注、标签、角色…',
        'aria-label': '搜索',
    });

    let composing = false;
    let debounceTimer = null;

    const emitQuery = () => {
        globalThis.clearTimeout(debounceTimer);
        debounceTimer = globalThis.setTimeout(() => {
            onQueryChange(search.value);
        }, 150);
    };

    search.addEventListener('compositionstart', () => { composing = true; });
    search.addEventListener('compositionend', () => {
        composing = false;
        emitQuery();
    });
    search.addEventListener('input', () => {
        if (composing) return;
        emitQuery();
    });

    toolbar.append(search);

    // 标签筛选
    const tagSelect = el('select', {
        class: `${CSS_PREFIX}select`,
        'aria-label': '按标签筛选',
    });
    tagSelect.addEventListener('change', () => onTagFilterChange(tagSelect.value));
    toolbar.append(tagSelect);

    // 分组筛选
    const groupSelect = el('select', {
        class: `${CSS_PREFIX}select`,
        'aria-label': '按分组筛选',
    });
    groupSelect.addEventListener('change', () => onGroupFilterChange(groupSelect.value));
    toolbar.append(groupSelect);

    /**
     * 刷新筛选器的可选项与当前值
     * @param {Object} state - 当前状态
     * @param {string} state.query - 搜索词
     * @param {string} state.tagFilter - 当前标签
     * @param {string} state.groupFilter - 当前分组
     * @param {Array<string>} state.allTags - 全部标签
     * @param {Map} state.groups - 分组信息
     */
    const update = ({ query, tagFilter, groupFilter, allTags, groups }) => {
        if (document.activeElement !== search && search.value !== query) {
            search.value = query;
        }

        // 标签下拉
        tagSelect.replaceChildren(
            el('option', { value: '', text: '所有标签' }),
            ...allTags.map(tag => el('option', { value: tag, text: `#${tag}` })),
        );
        tagSelect.value = allTags.includes(tagFilter) ? tagFilter : '';
        tagSelect.hidden = allTags.length === 0;

        // 分组下拉
        const groupOptions = [el('option', { value: '', text: '所有分组' })];
        for (const [, owner] of groups) {
            for (const [chatKey, source] of owner.chats) {
                groupOptions.push(el('option', {
                    value: chatKey,
                    text: `${source.ownerName} / ${source.chatName}`,
                }));
            }
        }
        groupSelect.replaceChildren(...groupOptions);
        groupSelect.value = groupOptions.some(option => option.value === groupFilter)
            ? groupFilter
            : '';
        groupSelect.hidden = groups.size === 0;
    };

    return { element: toolbar, update };
}
