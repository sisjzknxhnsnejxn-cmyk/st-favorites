/**
 * 主面板组件 - 协调器
 * 整合所有子组件，管理状态和布局
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { saveData } from '../../core/storage.js';
import { el } from '../utils/dom.js';
import { notify } from './toast.js';
import { askConfirm } from './dialogs.js';
import { renderCard } from './card.js';
import { openItemEditor } from './editors/item-editor.js';
import { openBatchTagEditor } from './editors/batch-editor.js';
import { createFilters, createGroupNav } from './filters.js';
import { createBatchToolbar, generateMarkdownExport, downloadMarkdown, generateTxtExport, downloadTxt } from './toolbar.js';
import { createFloatingButton, removeFloatingButton } from './floating-button.js';
import { initializeSettings } from './settings.js';

const ID = `${EXTENSION_KEY}-panel`;
const PAGE_SIZE = 20;

export function createFavoritesUI(context, getData) {
    let root = null;
    let query = '';
    let tagFilter = '';
    let groupFilter = '';
    let expanded = new Set();
    let selected = new Set();
    let page = PAGE_SIZE;
    let observer;
    let updateStorageInfo = null;

    // 筛选逻辑
    const filtered = () => getData().items.filter(item => {
        if (groupFilter && `${item.source.ownerId}::${item.source.chatId}` !== groupFilter) return false;
        if (tagFilter && !(item.tags ?? []).includes(tagFilter)) return false;
        if (!query.trim()) return true;
        return [item.message.rawText, item.note, item.source.speakerName,
            item.source.ownerName, item.source.chatName, ...(item.tags ?? [])]
            .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    });

    // 渲染主函数
    const render = () => {
        if (!root) return;
        observer?.disconnect();
        
        const data = getData();
        const content = root.querySelector(`.${CSS_PREFIX}content`);
        content.replaceChildren();
        
        const items = filtered();
        
        // 构建分组信息
        const groups = new Map();
        for (const item of data.items) {
            const ownerKey = String(item.source.ownerId ?? item.source.ownerName ?? '');
            const chatKey = `${ownerKey}::${item.source.chatId}`;
            if (!groups.has(ownerKey)) {
                groups.set(ownerKey, { name: item.source.ownerName, chats: new Map() });
            }
            const owner = groups.get(ownerKey);
            if (!owner.chats.has(chatKey)) {
                owner.chats.set(chatKey, item.source);
            }
        }
        
        // 收集所有标签
        const allTags = [...new Set(data.items.flatMap(item => item.tags ?? []))].sort();
        
        // 渲染筛选器
        const filters = createFilters({
            query,
            tagFilter,
            groupFilter,
            allTags,
            groups,
            onQueryChange: (value) => { query = value; render(); },
            onTagFilterChange: (value) => { tagFilter = value; render(); },
            onGroupFilterChange: (value) => { groupFilter = value; render(); },
        });
        content.append(filters);
        
        // 渲染分组导航
        if (groups.size > 0) {
            const nav = createGroupNav({
                groups,
                groupFilter,
                totalCount: items.length,
                onGroupSelect: (value) => { groupFilter = value; render(); },
            });
            content.append(nav);
        }
        
        // 渲染批量操作工具栏
        if (selected.size > 0 || items.length > 0) {
            const toolbar = createBatchToolbar({
                selected,
                allItems: items,
                onSelectAll: (checked) => {
                    if (checked) {
                        items.forEach(item => selected.add(item.id));
                    } else {
                        selected.clear();
                    }
                    render();
                },
                onBatchDelete: () => {
                    const current = getData();
                    current.items = current.items.filter(item => !selected.has(item.id));
                    saveData(context, current);
                    selected.clear();
                    render();
                },
                onBatchEditTags: () => {
                    openBatchTagEditor(Array.from(selected), (addTags, removeTags) => {
                        const current = getData();
                        current.items = current.items.map(item => {
                            if (!selected.has(item.id)) return item;
                            let tags = [...(item.tags ?? [])];
                            tags = tags.filter(t => !removeTags.includes(t));
                            tags = [...new Set([...tags, ...addTags])];
                            return { ...item, tags };
                        });
                        saveData(context, current);
                        selected.clear();
                        render();
                        notify('已批量编辑标签', 'success');
                    });
                },
                onBatchExport: () => {
                    const selectedItems = data.items.filter(item => selected.has(item.id));
                    const markdown = generateMarkdownExport(selectedItems);
                    downloadMarkdown(markdown);
                },
                onBatchExportTxt: () => {
                    const selectedItems = data.items.filter(item => selected.has(item.id));
                    const preserveThinking = data.preferences.preserveThinking;
                    const txt = generateTxtExport(selectedItems, preserveThinking);
                    downloadTxt(txt);
                },
            });
            content.append(toolbar);
        }

        // 渲染卡片列表
        const list = el('div', { class: `${CSS_PREFIX}list` });
        const visible = items.slice(0, page);
        
        if (items.length === 0) {
            list.append(el('p', { 
                class: `${CSS_PREFIX}empty`, 
                text: data.items.length === 0 ? '还没有收藏' : '没有找到匹配的收藏' 
            }));
        } else {
            for (const item of visible) {
                const card = renderCard(item, {
                    expanded,
                    selected,
                    onToggleExpand: (id) => {
                        expanded.has(id) ? expanded.delete(id) : expanded.add(id);
                        render();
                    },
                    onToggleSelect: (id, checked) => {
                        checked ? selected.add(id) : selected.delete(id);
                        render();
                    },
                    onEdit: (item) => {
                        openItemEditor(item, (patch) => {
                            const current = getData();
                            const index = current.items.findIndex(it => it.id === item.id);
                            if (index >= 0) {
                                current.items[index] = { ...current.items[index], ...patch };
                                saveData(context, current);
                                render();
                                updateStorageInfo?.();
                                notify('已保存', 'success');
                            }
                        });
                    },
                    onDelete: async (item) => {
                        if (!await askConfirm('确认删除这条收藏？')) return;
                        const current = getData();
                        current.items = current.items.filter(it => it.id !== item.id);
                        saveData(context, current);
                        selected.delete(item.id);
                        render();
                        updateStorageInfo?.();
                        notify('已删除', 'success');
                    },
                    context,
                    preferences: data.preferences,
                });
                list.append(card);
            }
            
            // 加载更多按钮
            if (visible.length < items.length) {
                const loadMore = el('button', { 
                    type: 'button', 
                    class: `${CSS_PREFIX}load-more`, 
                    text: `加载更多 (${items.length - visible.length} 条)` 
                });
                loadMore.addEventListener('click', () => {
                    page += PAGE_SIZE;
                    render();
                });
                list.append(loadMore);
            }
        }
        
        content.append(list);
        content.scrollTop = 0;
        updateStorageInfo?.();
    };

    // 打开面板
    const open = () => {
        if (root) {
            root.showModal();
            return;
        }
        
        root = el('dialog', { id: ID, class: `${CSS_PREFIX}panel` });
        root.setAttribute('data-theme', getData().preferences.theme);
        
        const header = el('header', { class: `${CSS_PREFIX}header` });
        header.append(el('h2', { text: '收藏夹' }));
        
        const close = el('button', { type: 'button', text: '✕', 'aria-label': '关闭' });
        close.addEventListener('click', () => root.close());
        header.append(close);
        
        const content = el('div', { class: `${CSS_PREFIX}content` });
        
        root.append(header, content);
        root.addEventListener('close', () => { page = PAGE_SIZE; selected.clear(); });
        root.addEventListener('click', event => {
            if (event.target === root) root.close();
        });
        
        document.body.append(root);
        render();
        root.showModal();
    };

    // 更新入口点
    const updateEntries = () => {
        const preferences = getData().preferences;
        
        if (preferences.entryPoints.floatingButton) {
            if (!document.getElementById(`${EXTENSION_KEY}-floating`)) {
                const floating = createFloatingButton(open);
                document.body.append(floating);
            }
        } else {
            removeFloatingButton();
        }
    };

    // 初始化设置面板
    const settingsResult = initializeSettings(context, getData, updateEntries, render);
    updateStorageInfo = settingsResult.updateStorageInfo;
    
    updateEntries();
    
    return { open, refresh: render, updateEntries };
}


