/**
 * 筛选与搜索组件
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';

/**
 * 创建筛选工具栏
 * @param {Object} options - 配置选项
 * @param {string} options.query - 当前搜索词
 * @param {string} options.tagFilter - 当前标签筛选
 * @param {string} options.groupFilter - 当前分组筛选
 * @param {Array} options.allTags - 所有可用标签
 * @param {Map} options.groups - 分组信息
 * @param {Function} options.onQueryChange - 搜索词变化回调
 * @param {Function} options.onTagFilterChange - 标签筛选变化回调
 * @param {Function} options.onGroupFilterChange - 分组筛选变化回调
 * @returns {HTMLElement} 筛选工具栏元素
 */
export function createFilters(options) {
    const { 
        query, 
        tagFilter, 
        groupFilter, 
        allTags, 
        groups, 
        onQueryChange, 
        onTagFilterChange, 
        onGroupFilterChange 
    } = options;
    
    const toolbar = el('div', { class: `${CSS_PREFIX}toolbar` });
    
    // 搜索框
    const search = el('input', {
        type: 'search',
        class: `${CSS_PREFIX}search`,
        placeholder: '搜索消息、备注、标签、角色…',
        value: query,
        'aria-label': '搜索'
    });
    search.addEventListener('input', () => onQueryChange(search.value));
    toolbar.append(search);
    
    // 标签筛选
    if (allTags.length > 0) {
        const tagSelect = el('select', { 'aria-label': '按标签筛选' }, [
            el('option', { value: '', text: '所有标签' }),
            ...allTags.map(tag => el('option', { value: tag, text: `#${tag}` }))
        ]);
        tagSelect.value = tagFilter;
        tagSelect.addEventListener('change', () => onTagFilterChange(tagSelect.value));
        toolbar.append(tagSelect);
    }
    
    // 分组筛选
    if (groups.size > 0) {
        const groupSelect = el('select', { 'aria-label': '按分组筛选' }, [
            el('option', { value: '', text: '所有分组' })
        ]);
        
        for (const [ownerKey, owner] of groups) {
            for (const [chatKey, source] of owner.chats) {
                const label = `${source.ownerName} / ${source.chatName}`;
                groupSelect.append(el('option', { value: chatKey, text: label }));
            }
        }
        
        groupSelect.value = groupFilter;
        groupSelect.addEventListener('change', () => onGroupFilterChange(groupSelect.value));
        toolbar.append(groupSelect);
    }
    
    return toolbar;
}

/**
 * 创建分组导航
 * @param {Object} options - 配置选项
 * @param {Map} options.groups - 分组信息
 * @param {string} options.groupFilter - 当前选中的分组
 * @param {number} options.totalCount - 总项目数
 * @param {Function} options.onGroupSelect - 分组选择回调
 * @returns {HTMLElement} 导航元素
 */
export function createGroupNav(options) {
    const { groups, groupFilter, totalCount, onGroupSelect } = options;
    
    const nav = el('nav', { class: `${CSS_PREFIX}groups` });
    
    // "全部"按钮
    const allButton = el('button', { 
        type: 'button', 
        text: `全部 (${totalCount})` 
    });
    allButton.classList.toggle(`${CSS_PREFIX}active`, !groupFilter);
    allButton.addEventListener('click', () => onGroupSelect(''));
    nav.append(allButton);
    
    // 分组按钮
    for (const [ownerKey, owner] of groups) {
        for (const [chatKey, source] of owner.chats) {
            const button = el('button', { 
                type: 'button', 
                text: `${source.ownerName} / ${source.chatName}` 
            });
            button.classList.toggle(`${CSS_PREFIX}active`, chatKey === groupFilter);
            button.addEventListener('click', () => onGroupSelect(chatKey));
            nav.append(button);
        }
    }
    
    return nav;
}
