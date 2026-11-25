import { CSS_PREFIX, EXTENSION_KEY } from './constants.js';
import { saveData } from './storage.js';

const ID = `${EXTENSION_KEY}-panel`;
const PAGE_SIZE = 20;
const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
};

const notify = (text, type = 'info') => {
    const toast = el('div', { class: `${CSS_PREFIX}toast ${CSS_PREFIX}toast-${type}`, text });
    document.body.append(toast);
    globalThis.setTimeout(() => toast.classList.add(`${CSS_PREFIX}toast-show`), 10);
    globalThis.setTimeout(() => {
        toast.classList.remove(`${CSS_PREFIX}toast-show`);
        globalThis.setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const askConfirm = text => {
    return new Promise(resolve => {
        const overlay = el('div', { class: `${CSS_PREFIX}confirm-overlay` });
        const dialog = el('div', { class: `${CSS_PREFIX}confirm-dialog` });
        dialog.append(el('p', { text }));
        const actions = el('div', { class: `${CSS_PREFIX}actions` });
        const cancel = el('button', { type: 'button', text: '取消' });
        cancel.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        const confirm = el('button', { type: 'button', class: `${CSS_PREFIX}primary`, text: '确认' });
        confirm.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        actions.append(cancel, confirm);
        dialog.append(actions);
        overlay.append(dialog);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
        document.body.append(overlay);
        confirm.focus();
    });
};

const askInput = (text, defaultValue = '') => {
    return new Promise(resolve => {
        const overlay = el('div', { class: `${CSS_PREFIX}confirm-overlay` });
        const dialog = el('div', { class: `${CSS_PREFIX}confirm-dialog` });
        dialog.append(el('p', { text }));
        const input = el('input', { type: 'text', value: defaultValue });
        dialog.append(input);
        const actions = el('div', { class: `${CSS_PREFIX}actions` });
        const cancel = el('button', { type: 'button', text: '取消' });
        cancel.addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });
        const confirm = el('button', { type: 'button', class: `${CSS_PREFIX}primary`, text: '确认' });
        confirm.addEventListener('click', () => {
            overlay.remove();
            resolve(input.value.trim());
        });
        actions.append(cancel, confirm);
        dialog.append(actions);
        overlay.append(dialog);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') confirm.click();
            if (event.key === 'Escape') cancel.click();
        });
        document.body.append(overlay);
        input.focus();
        input.select();
    });
};

export { askConfirm };

const sanitizeSnapshot = (html, context) => {
    const purifier = globalThis.DOMPurify ?? context.DOMPurify;
    if (!purifier?.sanitize) return null;
    return purifier.sanitize(html, { USE_PROFILES: { html: true } });
};

export function createFavoritesUI(context, getData) {
    let root = null;
    let query = '';
    let tagFilter = '';
    let groupFilter = '';
    let expanded = new Set();
    let selected = new Set();
    let page = PAGE_SIZE;
    let observer;

    const filtered = () => getData().items.filter(item => {
        if (groupFilter && `${item.source.ownerId}::${item.source.chatId}` !== groupFilter) return false;
        if (tagFilter && !(item.tags ?? []).includes(tagFilter)) return false;
        if (!query.trim()) return true;
        return [item.message.rawText, item.note, item.source.speakerName,
            item.source.ownerName, item.source.chatName, ...(item.tags ?? [])]
            .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    });

    const updateItem = (id, patch) => {
        const data = getData();
        const item = data.items.find(entry => entry.id === id);
        if (!item) return;
        Object.assign(item, patch);
        saveData(context, data);
        render();
    };

    const openBatchTagEditor = itemIds => {
        const overlay = el('div', { class: `${CSS_PREFIX}edit-overlay` });
        const form = el('form', { class: `${CSS_PREFIX}edit-dialog`, 'aria-label': '批量编辑标签' });
        form.append(el('h3', { text: `批量编辑 ${itemIds.length} 项` }));
        const addInput = el('input', { type: 'text', placeholder: '用逗号分隔，留空则不改变', 'aria-label': '添加标签' });
        form.append(el('label', {}, [el('span', { text: '添加标签' }), addInput]));
        const removeInput = el('input', { type: 'text', placeholder: '用逗号分隔，留空则不改变', 'aria-label': '移除标签' });
        form.append(el('label', {}, [el('span', { text: '移除标签' }), removeInput]));
        const actions = el('div', { class: `${CSS_PREFIX}actions` });
        const cancel = el('button', { type: 'button', text: '取消' });
        cancel.addEventListener('click', () => overlay.remove());
        const save = el('button', { type: 'submit', text: '保存' });
        actions.append(cancel, save);
        form.append(actions);
        form.addEventListener('submit', event => {
            event.preventDefault();
            const addTags = addInput.value.split(',').map(v => v.trim()).filter(Boolean);
            const removeTags = removeInput.value.split(',').map(v => v.trim()).filter(Boolean);
            if (addTags.length === 0 && removeTags.length === 0) {
                overlay.remove();
                return;
            }
            const current = getData();
            current.items = current.items.map(item => {
                if (!itemIds.includes(item.id)) return item;
                let tags = [...(item.tags ?? [])];
                tags = tags.filter(t => !removeTags.includes(t));
                tags = [...new Set([...tags, ...addTags])];
                return { ...item, tags };
            });
            saveData(context, current);
            overlay.remove();
            selected.clear();
            render();
            const changes = [];
            if (addTags.length > 0) changes.push(`添加了 ${addTags.length} 个标签`);
            if (removeTags.length > 0) changes.push(`移除了 ${removeTags.length} 个标签`);
            notify(`已为 ${itemIds.length} 项${changes.join('，')}`, 'success');
        });
        overlay.append(form);
        overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
        document.body.append(overlay);
        addInput.focus();
    };

    const openTagManager = () => {
        const data = getData();
        const tagCounts = new Map();
        for (const item of data.items) {
            for (const tag of item.tags ?? []) {
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }
        const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

        const overlay = el('div', { class: `${CSS_PREFIX}edit-overlay` });
        const dialog = el('div', { class: `${CSS_PREFIX}tag-manager`, 'aria-label': '标签管理' });
        dialog.append(el('h3', { text: '标签管理' }));
        
        if (sortedTags.length === 0) {
            dialog.append(el('p', { text: '还没有标签' }));
        } else {
            const list = el('ul', { class: `${CSS_PREFIX}tag-list` });
            for (const [tag, count] of sortedTags) {
                const item = el('li', {});
                item.append(el('span', { class: `${CSS_PREFIX}tag-name`, text: `${tag} (${count})` }));
                const actions = el('div', { class: `${CSS_PREFIX}tag-actions` });
                const rename = el('button', { type: 'button', text: '重命名' });
                rename.addEventListener('click', async () => {
                    const newTag = await askInput(`重命名标签 "${tag}" 为：`, tag);
                    if (!newTag || newTag === tag) return;
                    const current = getData();
                    current.items = current.items.map(it => ({
                        ...it,
                        tags: [...new Set((it.tags ?? []).map(t => t === tag ? newTag : t))],
                    }));
                    saveData(context, current);
                    overlay.remove();
                    render();
                    notify(`标签已重命名`, 'success');
                });
                const remove = el('button', { type: 'button', text: '删除' });
                remove.addEventListener('click', async () => {
                    if (!await askConfirm(`删除标签 "${tag}"？将从 ${count} 项中移除。`)) return;
                    const current = getData();
                    current.items = current.items.map(it => ({
                        ...it,
                        tags: (it.tags ?? []).filter(t => t !== tag),
                    }));
                    saveData(context, current);
                    overlay.remove();
                    render();
                    notify(`标签已删除`, 'success');
                });
                actions.append(rename, remove);
                item.append(actions);
                list.append(item);
            }
            dialog.append(list);
        }

        const closeBtn = el('button', { type: 'button', text: '关闭' });
        closeBtn.addEventListener('click', () => overlay.remove());
        dialog.append(closeBtn);
        overlay.append(dialog);
        overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
        document.body.append(overlay);
    };


    const render = () => {
        if (!root) return;
        observer?.disconnect();
        const data = getData();
        const content = root.querySelector(`.${CSS_PREFIX}content`);
        content.replaceChildren();
        const items = filtered();
        const groups = new Map();
        for (const item of data.items) {
            const ownerKey = String(item.source.ownerId ?? item.source.ownerName ?? '');
        const chatKey = `${ownerKey}::${item.source.chatId}`;
            if (!groups.has(ownerKey)) groups.set(ownerKey, { name: item.source.ownerName, chats: new Map() });
            const owner = groups.get(ownerKey);
            if (!owner.chats.has(chatKey)) owner.chats.set(chatKey, item.source);
        }
        const nav = el('nav', { class: `${CSS_PREFIX}groups` });
        const allButton = el('button', { type: 'button', text: `全部 (${items.length})` });
        allButton.classList.toggle(`${CSS_PREFIX}active`, !groupFilter);
        allButton.addEventListener('click', () => { groupFilter = ''; page = PAGE_SIZE; render(); });
        nav.append(allButton);
        for (const [ownerKey, owner] of groups) {
            const ownerRow = el('div', { class: `${CSS_PREFIX}owner-group` });
            const ownerToggle = el('button', { type: 'button', text: owner.name || '角色' });
            ownerToggle.setAttribute('aria-expanded', 'true');
            const chatList = el('div', { class: `${CSS_PREFIX}chat-groups` });
            ownerToggle.addEventListener('click', () => {
                const collapsed = ownerToggle.getAttribute('aria-expanded') === 'true';
                ownerToggle.setAttribute('aria-expanded', String(!collapsed));
                chatList.hidden = collapsed;
            });
            ownerRow.append(ownerToggle);
            for (const [chatKey, source] of owner.chats) {
                const count = data.items.filter(item => `${item.source.ownerId}::${item.source.chatId}` === chatKey).length;
                const chatButton = el('button', { type: 'button', text: `${source.chatName} (${count})` });
                chatButton.classList.toggle(`${CSS_PREFIX}active`, groupFilter === chatKey);
                chatButton.addEventListener('click', () => { groupFilter = chatKey; page = PAGE_SIZE; render(); });
                chatList.append(chatButton);
            }
            ownerRow.append(chatList);
            nav.append(ownerRow);
        }
        content.append(nav);

        const search = el('input', {
            type: 'search',
            class: `${CSS_PREFIX}search`,
            placeholder: '搜索正文、备注、标签或角色名',
            'aria-label': '搜索收藏',
        });
        search.value = query;
        search.addEventListener('input', () => {
            const start = search.selectionStart;
            query = search.value;
            page = PAGE_SIZE;
            render();
            const replacement = root.querySelector(`.${CSS_PREFIX}search`);
            replacement.focus();
            replacement.setSelectionRange(start, start);
        });
        const tagSelect = el('select', { 'aria-label': '按标签筛选' }, [
            el('option', { value: '', text: '所有标签' }),
            ...[...new Set(data.items.flatMap(item => item.tags ?? []))].sort()
                .map(tag => el('option', { value: tag, text: tag })),
        ]);
        tagSelect.value = tagFilter;
        tagSelect.addEventListener('change', () => {
            tagFilter = tagSelect.value;
            page = PAGE_SIZE;
            render();
        });
        const resultCount = el('span', { 
            class: `${CSS_PREFIX}result-count`, 
            text: `共 ${items.length} 条${items.length !== data.items.length ? ` (总计 ${data.items.length} 条)` : ''}` 
        });
        content.append(el('div', { class: `${CSS_PREFIX}filters` }, [search, tagSelect, resultCount]));

        if (items.length > 0) {
            const toolbar = el('div', { class: `${CSS_PREFIX}batch-toolbar` });
            const selectAll = el('input', { type: 'checkbox', id: `${CSS_PREFIX}select-all`, 'aria-label': '全选' });
            selectAll.checked = items.every(item => selected.has(item.id));
            selectAll.indeterminate = selected.size > 0 && !selectAll.checked;
            selectAll.addEventListener('change', () => {
                if (selectAll.checked) items.forEach(item => selected.add(item.id));
                else selected.clear();
                render();
            });
            const selectLabel = el('label', { for: `${CSS_PREFIX}select-all`, text: `全选 (${selected.size})` });
            toolbar.append(selectAll, selectLabel);
            if (selected.size > 0) {
                const batchDelete = el('button', { type: 'button', text: `删除 ${selected.size} 项` });
                batchDelete.addEventListener('click', async () => {
                    const count = selected.size;
                    if (!await askConfirm(`确认删除 ${count} 条收藏？`)) return;
                    const current = getData();
                    current.items = current.items.filter(item => !selected.has(item.id));
                    saveData(context, current);
                    selected.clear();
                    render();
                    notify(`已删除 ${count} 条`, 'success');
                });
                const batchTag = el('button', { type: 'button', text: '批量编辑标签' });
                batchTag.addEventListener('click', () => openBatchTagEditor(Array.from(selected)));
                const batchExport = el('button', { type: 'button', text: '导出为 Markdown' });
                batchExport.addEventListener('click', () => {
                    const selectedItems = data.items.filter(item => selected.has(item.id));
                    const markdown = selectedItems.map(item => {
                        const date = new Date(item.createdAt);
                        const header = `## ${item.source.speakerName || item.source.ownerName}`;
                        const meta = `**来源:** ${item.source.ownerName} / ${item.source.chatName}  \n**时间:** ${date.toLocaleString()}`;
                        const tags = item.tags?.length > 0 ? `  \n**标签:** ${item.tags.map(t => `#${t}`).join(' ')}` : '';
                        const note = item.note ? `  \n**备注:** ${item.note}` : '';
                        const content = `\n\n${item.message.rawText}`;
                        return `${header}\n\n${meta}${tags}${note}${content}\n\n---\n`;
                    }).join('\n');
                    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = el('a', { href: url, download: `favorites-${Date.now()}.md` });
                    link.click();
                    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    notify(`已导出 ${selectedItems.length} 条`, 'success');
                });
                toolbar.append(batchDelete, batchTag, batchExport);
            }
            content.append(toolbar);
        }

        const list = el('div', { class: `${CSS_PREFIX}list` });
        for (const item of items.slice(0, page)) {
            const card = el('article', { class: `${CSS_PREFIX}card` });
            const checkbox = el('input', { type: 'checkbox', class: `${CSS_PREFIX}card-checkbox`, 'aria-label': '选择此项' });
            checkbox.checked = selected.has(item.id);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selected.add(item.id);
                else selected.delete(item.id);
                render();
            });
            const date = new Date(item.createdAt);
            card.append(el('header', { class: `${CSS_PREFIX}card-head` }, [
                checkbox,
                el('strong', { text: item.source.speakerName || item.source.ownerName }),
                el('time', { text: Number.isNaN(date.valueOf()) ? '' : date.toLocaleString() }),
            ]));
            card.append(el('div', {
                class: `${CSS_PREFIX}meta`,
                text: `${item.source.ownerName} / ${item.source.chatName}`,
            }));
            const body = el('div', {
                class: `${CSS_PREFIX}body${expanded.has(item.id) ? ` ${CSS_PREFIX}expanded` : ''}`,
            });
            if (data.preferences.renderMode === 'styled' && item.message.snapshotHtml) {
                const safeHtml = sanitizeSnapshot(item.message.snapshotHtml, context);
                if (safeHtml === null) body.textContent = item.message.rawText;
                else {
                    const snapshot = el('div', { class: `${CSS_PREFIX}snapshot` });
                    snapshot.innerHTML = safeHtml;
                    body.append(snapshot);
                }
            } else {
                body.textContent = item.message.rawText;
            }
            body.addEventListener('click', () => {
                if (expanded.has(item.id)) expanded.delete(item.id);
                else expanded.add(item.id);
                render();
            });
            card.append(body);
            if (item.message.reasoning) {
                const details = el('details', { class: `${CSS_PREFIX}reasoning` });
                const summary = el('summary', { text: '💭 思维链' });
                const reasoning = el('pre', { class: `${CSS_PREFIX}reasoning-content`, text: item.message.reasoning });
                details.append(summary, reasoning);
                card.append(details);
            }
            card.append(el('div', {
                class: `${CSS_PREFIX}tags`,
                text: (item.tags ?? []).map(tag => `#${tag}`).join('  '),
            }));
            card.append(el('p', { class: `${CSS_PREFIX}note`, text: item.note || '无备注' }));
            const actions = el('div', { class: `${CSS_PREFIX}actions` });
            const edit = el('button', { type: 'button', text: '编辑标签 / 备注' });
            edit.addEventListener('click', () => openEditor(item));
            const remove = el('button', { type: 'button', text: '删除' });
            remove.addEventListener('click', async () => {
                if (!await askConfirm('删除这条收藏？')) return;
                const current = getData();
                current.items = current.items.filter(entry => entry.id !== item.id);
                saveData(context, current);
                render();
            });
            actions.append(edit, remove);
            card.append(actions);
            list.append(card);
        }
        content.append(list);
        if (items.length > page) {
            const sentinel = el('div', { class: `${CSS_PREFIX}sentinel`, text: '继续加载…' });
            content.append(sentinel);
            observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    page += PAGE_SIZE;
                    render();
                }
            }, { root: content, rootMargin: '240px' });
            observer.observe(sentinel);
        }
        if (!items.length) {
            const isEmpty = data.items.length === 0;
            const emptyText = isEmpty 
                ? '还没有收藏。在聊天中点击消息旁的星星按钮开始收藏。'
                : '没有匹配的收藏。尝试调整搜索或筛选条件。';
            content.append(el('p', { class: `${CSS_PREFIX}empty`, text: emptyText }));
        }
        updateStorageInfo();
    };

    const openEditor = item => {
        const overlay = el('div', { class: `${CSS_PREFIX}edit-overlay` });
        const form = el('form', { class: `${CSS_PREFIX}edit-dialog`, 'aria-label': '编辑收藏标签和备注' });
        form.append(el('h3', { text: '编辑收藏' }));
        const tagsInput = el('input', { type: 'text', value: (item.tags ?? []).join(', '), placeholder: '用逗号分隔', 'aria-label': '标签' });
        const noteInput = el('textarea', { rows: '5', 'aria-label': '备注' });
        noteInput.value = item.note ?? '';
        form.append(el('label', {}, [el('span', { text: '标签' }), tagsInput]));
        form.append(el('label', {}, [el('span', { text: '备注' }), noteInput]));
        const actions = el('div', { class: `${CSS_PREFIX}actions` });
        const cancel = el('button', { type: 'button', text: '取消' });
        cancel.addEventListener('click', () => overlay.remove());
        const save = el('button', { type: 'submit', text: '保存' });
        actions.append(cancel, save);
        form.append(actions);
        form.addEventListener('submit', event => {
            event.preventDefault();
            const tags = tagsInput.value.split(',').map(value => value.trim()).filter(Boolean);
            overlay.remove();
            updateItem(item.id, { tags: [...new Set(tags)], note: noteInput.value.trim() });
        });
        overlay.append(form);
        overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
        document.body.append(overlay);
        tagsInput.focus();
    };

    const open = () => {
        if (document.getElementById(ID)) return;
        root = el('div', { id: ID, class: `${CSS_PREFIX}overlay` });
        root.setAttribute('data-theme', getData().preferences.theme);
        const dialog = el('section', { class: `${CSS_PREFIX}dialog`, role: 'dialog', 'aria-modal': 'true', 'aria-label': '全局消息收藏夹' });
        const header = el('header', { class: `${CSS_PREFIX}header` });
        header.append(el('h2', { text: '消息收藏夹' }));
        const close = el('button', { type: 'button', class: `${CSS_PREFIX}close`, text: '×', 'aria-label': '关闭收藏夹' });
        const onKeyDown = event => {
            if (event.key === 'Escape') close.click();
        };
        document.addEventListener('keydown', onKeyDown);
        close.addEventListener('click', () => {
            observer?.disconnect();
            document.removeEventListener('keydown', onKeyDown);
            root.remove();
            root = null;
        });
        header.append(close);
        const content = el('div', { class: `${CSS_PREFIX}content` });
        dialog.append(header, content);
        root.append(dialog);
        root.addEventListener('click', event => { if (event.target === root) close.click(); });
        document.body.append(root);
        render();
    };


    const settings = el('section', { id: `${EXTENSION_KEY}-settings`, class: `${CSS_PREFIX}settings` });
    settings.append(el('h3', { text: '全局消息收藏夹' }));
    const openSettings = el('button', { type: 'button', class: 'menu_button', text: '打开收藏夹' });
    openSettings.addEventListener('click', open);
    settings.append(openSettings);
    const entryOptions = [
        ['floatingButton', '启用悬浮球'],
        ['extensionMenu', '启用扩展菜单入口'],
        ['extensionsMenu', '启用魔法棒菜单入口'],
    ];
    for (const [key, label] of entryOptions) {
        const input = el('input', { type: 'checkbox' });
        input.checked = Boolean(getData().preferences.entryPoints[key]);
        input.addEventListener('change', () => {
            getData().preferences.entryPoints[key] = input.checked;
            saveData(context, getData());
            updateEntries();
        });
        settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [el('span', { text: label }), input]));
    }
    const renderSelect = el('select', {}, [
        el('option', { value: 'plain', text: '干净纯文本 / Markdown' }),
        el('option', { value: 'styled', text: '保留美化 / 正则' }),
    ]);
    renderSelect.value = getData().preferences.renderMode;
    renderSelect.addEventListener('change', () => {
        getData().preferences.renderMode = renderSelect.value;
        saveData(context, getData());
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [el('span', { text: '回顾显示风格' }), renderSelect]));
    const snapshotSelect = el('select', {}, [
        el('option', { value: 'snapshot', text: '定格快照（保留 HTML）' }),
        el('option', { value: 'live', text: '轻量实时渲染（仅存原文）' }),
    ]);
    snapshotSelect.value = getData().preferences.snapshotMode;
    snapshotSelect.addEventListener('change', () => {
        getData().preferences.snapshotMode = snapshotSelect.value;
        saveData(context, getData());
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [el('span', { text: '美化内容存储策略' }), snapshotSelect]));

    const thinking = el('input', { type: 'checkbox' });
    thinking.checked = Boolean(getData().preferences.preserveThinking);
    thinking.addEventListener('change', () => {
        getData().preferences.preserveThinking = thinking.checked;
        saveData(context, getData());
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [el('span', { text: '包含思维链内容' }), thinking]));

    const theme = el('select', {}, [
        el('option', { value: 'native', text: '跟随 SillyTavern' }),
        el('option', { value: 'light', text: '明亮' }),
        el('option', { value: 'dark', text: '暗色' }),
    ]);
    theme.value = getData().preferences.theme;
    theme.addEventListener('change', () => {
        getData().preferences.theme = theme.value;
        saveData(context, getData());
        document.getElementById(ID)?.setAttribute('data-theme', theme.value);
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [el('span', { text: '主题' }), theme]));

    const importFile = el('input', { type: 'file', accept: 'application/json,.json', class: `${CSS_PREFIX}import-input` });
    importFile.addEventListener('change', async () => {
        const file = importFile.files?.[0];
        if (!file) return;
        try {
            const imported = JSON.parse(await file.text());
            if (imported.schemaVersion !== 1 || !Array.isArray(imported.items) || !imported.preferences) throw new Error('格式不匹配');
            const current = getData();
            current.items = [...imported.items, ...current.items.filter(item => !imported.items.some(entry => entry.id === item.id))];
            saveData(context, current);
            render();
            notify('收藏数据已导入', 'success');
        } catch (error) {
            notify(`导入失败：${error.message}`, 'error');
        } finally {
            importFile.value = '';
        }
    });
    const importButton = el('button', { type: 'button', class: 'menu_button', text: '导入 JSON' });
    importButton.addEventListener('click', () => importFile.click());
    const exportButton = el('button', { type: 'button', class: 'menu_button', text: '导出 JSON' });
    exportButton.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = el('a', { href: url, download: 'st-favorites.json' });
        link.click();
        globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const tagManagerButton = el('button', { type: 'button', class: 'menu_button', text: '标签管理' });
    tagManagerButton.addEventListener('click', openTagManager);
    settings.append(el('div', { class: `${CSS_PREFIX}settings-actions` }, [importButton, exportButton, tagManagerButton]), importFile);
    const storageInfo = el('div', { class: `${CSS_PREFIX}storage-info` });
    const updateStorageInfo = () => {
        const bytes = new TextEncoder().encode(JSON.stringify(getData())).byteLength;
        storageInfo.textContent = `收藏 ${getData().items.length} 条 · 数据约 ${(bytes / 1024).toFixed(1)} KB`;
    };
    updateStorageInfo();
    settings.append(storageInfo);

    document.querySelector('#extensions_settings')?.append(settings);

    const addEntry = (container, key, label) => {
        if (!container || container.querySelector(`[data-st-fav-entry="${key}"]`)) return;
        const button = el('button', { type: 'button', class: `menu_button menu_button_icon ${CSS_PREFIX}menu-entry`, title: label }, [
            el('i', { class: 'fa-solid fa-star', 'aria-hidden': 'true' }),
            el('span', { text: label }),
        ]);
        button.dataset.stFavEntry = key;
        button.addEventListener('click', open);
        container.append(button);
    };
    addEntry(document.querySelector('#extensions_menu_container'), 'extension', '收藏夹');
    addEntry(document.querySelector('#extensionsMenu'), 'magic', '收藏夹');
    addEntry(document.querySelector('#extensions-settings-button .extensions_block .alignitemscenter'), 'extension', '收藏夹');
    let mountAttempts = 0;
    const mountTimer = globalThis.setInterval(() => {
        const magicMenu = document.querySelector('#extensionsMenu');
        if (magicMenu && !magicMenu.querySelector('[data-st-fav-entry="magic"]')) {
            addEntry(magicMenu, 'magic', '收藏夹');
        }
        if (magicMenu?.querySelector('[data-st-fav-entry="magic"]') || mountAttempts >= 10) {
            globalThis.clearInterval(mountTimer);
            updateEntries();
        }
        mountAttempts += 1;
    }, 500);
    const FLOATING_POSITION_KEY = `${EXTENSION_KEY}:floating-position`;
    const readFloatingPosition = () => {
        try {
            const value = JSON.parse(globalThis.localStorage?.getItem(FLOATING_POSITION_KEY) ?? 'null');
            if (value && Number.isFinite(value.left) && Number.isFinite(value.top)) return value;
        } catch (error) {
            console.warn(`[${EXTENSION_KEY}] unable to read floating position`, error);
        }
        return null;
    };

    function updateEntries() {
        const preferences = getData().preferences.entryPoints;
        updateStorageInfo();
        document.querySelectorAll('[data-st-fav-entry]').forEach(button => {
            const key = button.dataset.stFavEntry;
            button.hidden = key === 'floating' ? !preferences.floatingButton
                : key === 'extension' ? !preferences.extensionMenu : !preferences.extensionsMenu;
        });
        let floating = document.getElementById(`${EXTENSION_KEY}-floating`);
        if (preferences.floatingButton && !floating) {
            floating = el('button', {
                id: `${EXTENSION_KEY}-floating`,
                class: `${CSS_PREFIX}floating`,
                type: 'button',
                text: '★',
                title: '打开收藏夹',
                'aria-label': '打开收藏夹',
            });
            floating.dataset.stFavEntry = 'floating';
            floating.addEventListener('click', event => {
                if (event.detail === 0) open();
            });
            const saved = readFloatingPosition();
            if (saved) {
                floating.style.left = `${saved.left}px`;
                floating.style.top = `${saved.top}px`;
                floating.style.right = 'auto';
                floating.style.bottom = 'auto';
            }
            let moved = false;
            let startX = 0;
            let startY = 0;
            floating.addEventListener('pointerdown', event => {
                moved = false;
                startX = event.clientX;
                startY = event.clientY;
                floating.setPointerCapture(event.pointerId);
            });
            floating.addEventListener('pointermove', event => {
                if (!floating.hasPointerCapture(event.pointerId)) return;
                if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 8) moved = true;
                if (!moved) return;
                floating.style.left = `${Math.max(8, Math.min(globalThis.innerWidth - 56, event.clientX - 24))}px`;
                floating.style.top = `${Math.max(8, Math.min(globalThis.innerHeight - 56, event.clientY - 24))}px`;
                floating.style.right = 'auto';
                floating.style.bottom = 'auto';
            });
            floating.addEventListener('pointerup', event => {
                if (!moved) {
                    open();
                    return;
                }
                const rect = floating.getBoundingClientRect();
                const snappedLeft = rect.left + rect.width / 2 < globalThis.innerWidth / 2 ? 12 : Math.max(12, globalThis.innerWidth - rect.width - 12);
                floating.style.left = `${snappedLeft}px`;
                floating.style.top = `${Math.max(12, Math.min(globalThis.innerHeight - rect.height - 12, rect.top))}px`;
                floating.style.right = 'auto';
                floating.style.bottom = 'auto';
                try {
                    globalThis.localStorage?.setItem(FLOATING_POSITION_KEY, JSON.stringify({
                        left: snappedLeft,
                        top: Math.max(12, Math.min(globalThis.innerHeight - rect.height - 12, rect.top)),
                    }));
                } catch (error) {
                    console.warn(`[${EXTENSION_KEY}] unable to save floating position`, error);
                }
            });
            document.body.append(floating);
        } else if (!preferences.floatingButton) {
            floating?.remove();
        }
    }
    updateEntries();
    return { open, refresh: render, updateEntries };
}

