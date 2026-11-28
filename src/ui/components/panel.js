/**
 * 主面板组件 - 协调器
 * 整合所有子组件，管理状态和布局
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { saveData, getActiveTagFilters } from '../../core/storage.js';
import { cleanContent } from '../../core/cleaner.js';
import { el } from '../utils/dom.js';
import { notify } from './toast.js';
import { askConfirm } from './dialogs.js';
import { renderCard } from './card.js';
import { openItemEditor } from './editors/item-editor.js';
import { openBatchTagEditor } from './editors/batch-editor.js';
import { createFilters } from './filters.js';
import { createBatchToolbar, generateMarkdownExport, downloadMarkdown, generateTxtExport, downloadTxt } from './toolbar.js';
import { createFloatingButton, removeFloatingButton } from './floating-button.js';
import { initializeSettings } from './settings.js';

const ID = `${EXTENSION_KEY}-panel`;
const PAGE_SIZE = 20;

export function createFavoritesUI(context, getData) {
    let root = null;
    let listHost = null;
    let filtersApi = null;
    let toolbarHost = null;
    let query = '';
    let tagFilter = '';
    let groupFilter = '';
    const expanded = new Set();
    const selected = new Set();
    let page = PAGE_SIZE;
    let updateStorageInfo = null;
    let mountTimer = null;

    /** 筛选条件变化时需要回到列表顶部 */
    let resetScroll = false;

    // 筛选逻辑
    const filtered = () => {
        const data = getData();
        const tagsToStrip = getActiveTagFilters(data.preferences);
        const keyword = query.trim().toLocaleLowerCase();

        return data.items.filter(item => {
            if (groupFilter && `${item.source.ownerId}::${item.source.chatId}` !== groupFilter) return false;
            if (tagFilter && !(item.tags ?? []).includes(tagFilter)) return false;
            if (!keyword) return true;

            // 搜索基于过滤后的可见文本，避免命中已被隐藏的 <标签> 内容
            const visibleText = tagsToStrip.length > 0
                ? cleanContent(item.message.rawText, data.preferences.preserveThinking, tagsToStrip)
                : item.message.rawText;

            return [
                visibleText,
                item.note,
                item.source.speakerName,
                item.source.ownerName,
                item.source.chatName,
                ...(item.tags ?? []),
            ].join(' ').toLocaleLowerCase().includes(keyword);
        });
    };

    /** 构建分组信息 */
    const buildGroups = (items) => {
        const groups = new Map();
        for (const item of items) {
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
        return groups;
    };

    /** 仅重绘列表与批量工具栏，保留筛选区 DOM（避免打断输入） */
    const renderList = () => {
        if (!root || !listHost) return;

        const data = getData();
        const items = filtered();

        // 批量操作工具栏
        toolbarHost.replaceChildren();
        if (items.length > 0) {
            toolbarHost.append(createBatchToolbar({
                selected,
                allItems: items,
                onSelectAll: (checked) => {
                    if (checked) items.forEach(item => selected.add(item.id));
                    else selected.clear();
                    renderList();
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
                    downloadMarkdown(generateMarkdownExport(
                        selectedItems,
                        getActiveTagFilters(data.preferences),
                    ));
                },
                onBatchExportTxt: () => {
                    const selectedItems = data.items.filter(item => selected.has(item.id));
                    downloadTxt(generateTxtExport(
                        selectedItems,
                        data.preferences.preserveThinking,
                        getActiveTagFilters(data.preferences),
                    ));
                },
            }));
        }

        // 卡片列表
        listHost.replaceChildren();
        const visible = items.slice(0, page);

        if (items.length === 0) {
            listHost.append(el('p', {
                class: `${CSS_PREFIX}empty`,
                text: data.items.length === 0 ? '还没有收藏' : '没有找到匹配的收藏',
            }));
        } else {
            const tagFilters = getActiveTagFilters(data.preferences);
            for (const item of visible) {
                listHost.append(renderCard(item, {
                    expanded,
                    selected,
                    onToggleExpand: (id) => {
                        if (expanded.has(id)) expanded.delete(id);
                        else expanded.add(id);
                        renderList();
                    },
                    onToggleSelect: (id, checked) => {
                        if (checked) selected.add(id);
                        else selected.delete(id);
                        renderList();
                    },
                    onEdit: (target) => {
                        openItemEditor(target, (patch) => {
                            const current = getData();
                            const index = current.items.findIndex(it => it.id === target.id);
                            if (index >= 0) {
                                current.items[index] = { ...current.items[index], ...patch };
                                saveData(context, current);
                                render();
                                updateStorageInfo?.();
                                notify('已保存', 'success');
                            }
                        });
                    },
                    onDelete: async (target) => {
                        if (!await askConfirm('确认删除这条收藏？')) return;
                        const current = getData();
                        current.items = current.items.filter(it => it.id !== target.id);
                        saveData(context, current);
                        selected.delete(target.id);
                        render();
                        updateStorageInfo?.();
                        notify('已删除', 'success');
                    },
                    context,
                    preferences: data.preferences,
                    tagFilters,
                }));
            }

            // 加载更多按钮
            if (visible.length < items.length) {
                const loadMore = el('button', {
                    type: 'button',
                    class: `${CSS_PREFIX}load-more`,
                    text: `加载更多 (${items.length - visible.length} 条)`,
                });
                loadMore.addEventListener('click', () => {
                    page += PAGE_SIZE;
                    renderList();
                });
                listHost.append(loadMore);
            }
        }

        if (resetScroll) {
            listHost.scrollTop = 0;
            resetScroll = false;
        }

        updateStorageInfo?.();
    };

    // 完整渲染（刷新筛选器选项 + 列表）
    const render = () => {
        if (!root) return;
        const data = getData();
        const allTags = [...new Set(data.items.flatMap(item => item.tags ?? []))].sort();
        filtersApi?.update({
            query,
            tagFilter,
            groupFilter,
            allTags,
            groups: buildGroups(data.items),
        });
        renderList();
    };

    // 构建面板骨架（仅一次）
    const buildPanel = () => {
        root = el('dialog', { id: ID, class: `${CSS_PREFIX}panel` });
        root.setAttribute('data-theme', getData().preferences.theme);

        // 头部
        const header = el('header', { class: `${CSS_PREFIX}panel-header` });
        header.append(el('h2', { class: `${CSS_PREFIX}panel-title`, text: '收藏夹' }));

        const close = el('button', {
            type: 'button',
            class: `${CSS_PREFIX}close`,
            text: '✕',
            'aria-label': '关闭',
        });
        close.addEventListener('click', () => root.close());
        header.append(close);

        // 固定筛选区（不随列表重绘而重建）
        filtersApi = createFilters({
            onQueryChange: (value) => {
                query = value;
                page = PAGE_SIZE;
                resetScroll = true;
                renderList();
            },
            onTagFilterChange: (value) => {
                tagFilter = value;
                page = PAGE_SIZE;
                resetScroll = true;
                renderList();
            },
            onGroupFilterChange: (value) => {
                groupFilter = value;
                page = PAGE_SIZE;
                resetScroll = true;
                renderList();
            },
        });

        toolbarHost = el('div', { class: `${CSS_PREFIX}toolbar-host` });

        const filterBar = el('div', { class: `${CSS_PREFIX}panel-filters` }, [
            filtersApi.element,
            toolbarHost,
        ]);

        // 可滚动列表区
        listHost = el('div', { class: `${CSS_PREFIX}list` });
        const content = el('div', { class: `${CSS_PREFIX}panel-content` }, [listHost]);

        root.append(header, filterBar, content);

        root.addEventListener('close', () => {
            page = PAGE_SIZE;
            selected.clear();
        });
        root.addEventListener('click', event => {
            if (event.target === root) root.close();
        });

        document.body.append(root);
    };

    // 打开面板
    const open = () => {
        if (!root) buildPanel();
        if (root.open) return;
        root.setAttribute('data-theme', getData().preferences.theme);
        resetScroll = true;
        render();
        root.showModal();
    };

    const addMenuEntry = (container, key, label) => {
        if (!container || container.querySelector(`[data-st-fav-entry="${key}"]`)) return;
        const button = el('div', {
            class: 'list-group-item flex-container flexGap5 interactable',
            role: 'button',
            tabindex: '0',
            title: label,
        }, [
            el('i', { class: 'fa-solid fa-star extensionsMenuExtensionButton', 'aria-hidden': 'true' }),
            el('span', { text: label }),
        ]);
        button.dataset.stFavEntry = key;
        button.addEventListener('click', open);
        button.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });
        container.append(button);
    };

    // 更新入口点
    const updateEntries = () => {
        const entryPoints = getData().preferences.entryPoints;
        addMenuEntry(document.querySelector('#extensionsMenu'), 'magic', '收藏夹');
        settingsResult?.mountSettings?.();

        if (entryPoints.floatingButton) {
            if (!document.getElementById(`${EXTENSION_KEY}-floating`)) {
                document.body.append(createFloatingButton(open));
            }
        } else {
            removeFloatingButton();
        }

        document.querySelectorAll('[data-st-fav-entry]').forEach(button => {
            const key = button.dataset.stFavEntry;
            if (key === 'floating') {
                button.hidden = !entryPoints.floatingButton;
            } else if (key === 'magic') {
                button.hidden = !entryPoints.extensionsMenu;
                button.style.display = entryPoints.extensionsMenu ? '' : 'none';
            }
        });
    };

    // 初始化设置面板
    const settingsResult = initializeSettings(context, getData, updateEntries, render);
    updateStorageInfo = settingsResult.updateStorageInfo;

    updateEntries();

    // ST 的菜单容器可能晚于扩展加载，短轮询直到挂载成功
    let mountAttempts = 0;
    mountTimer = globalThis.setInterval(() => {
        mountAttempts += 1;
        updateEntries();
        const hasMagic = Boolean(document.querySelector('#extensionsMenu [data-st-fav-entry="magic"]'));
        const hasSettings = Boolean(document.getElementById(`${EXTENSION_KEY}_settings`));
        if ((hasMagic && hasSettings) || mountAttempts >= 20) {
            globalThis.clearInterval(mountTimer);
            mountTimer = null;
        }
    }, 500);

    const destroy = () => {
        if (mountTimer) {
            globalThis.clearInterval(mountTimer);
            mountTimer = null;
        }
        removeFloatingButton();
        document.querySelectorAll('[data-st-fav-entry="magic"]').forEach(node => node.remove());
        document.getElementById(`${EXTENSION_KEY}_settings`)?.remove();
        root?.remove();
        root = null;
        listHost = null;
        toolbarHost = null;
        filtersApi = null;
    };

    return { open, refresh: render, updateEntries, destroy };
}

