/**
 * 设置面板组件
 *
 * 以 SillyTavern 原生的 inline-drawer 结构挂载到扩展设置页，
 * 默认折叠，避免长表单占满整个设置区。
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { saveData } from '../../core/storage.js';
import { el, parseTagList } from '../utils/dom.js';
import { notify } from './toast.js';
import { askConfirm } from './dialogs.js';
import { openTagManager } from './editors/tag-manager.js';

/**
 * 创建一行开关设置
 * @param {string} label - 标题
 * @param {boolean} checked - 初始状态
 * @param {Function} onChange - 变更回调
 * @param {string} [hint] - 辅助说明
 * @returns {HTMLElement}
 */
function addToggle(label, checked, onChange, hint) {
    const input = el('input', { type: 'checkbox' });
    input.checked = Boolean(checked);
    input.addEventListener('change', () => onChange(input.checked));

    const text = el('span', { class: `${CSS_PREFIX}setting-label` }, [
        el('span', { text: label }),
    ]);
    if (hint) {
        text.append(el('small', { class: `${CSS_PREFIX}setting-hint`, text: hint }));
    }

    return el('label', { class: `${CSS_PREFIX}setting-row` }, [text, input]);
}

/**
 * 创建一行下拉设置
 * @param {string} label - 标题
 * @param {Array<[string, string]>} options - [值, 文案] 列表
 * @param {string} value - 当前值
 * @param {Function} onChange - 变更回调
 * @returns {HTMLElement}
 */
function addSelect(label, options, value, onChange) {
    const select = el('select', { class: 'text_pole' },
        options.map(([optionValue, optionText]) => el('option', { value: optionValue, text: optionText })),
    );
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));

    return el('label', { class: `${CSS_PREFIX}setting-row` }, [
        el('span', { class: `${CSS_PREFIX}setting-label`, text: label }),
        select,
    ]);
}

/**
 * 初始化设置面板
 * @param {Object} context - SillyTavern 上下文
 * @param {Function} getData - 获取数据函数
 * @param {Function} updateEntries - 更新入口点函数
 * @param {Function} onDataChange - 数据变化回调
 * @returns {{updateStorageInfo: Function, mountSettings: Function}}
 */
export function initializeSettings(context, getData, updateEntries, onDataChange) {
    const persist = () => saveData(context, getData());

    const root = el('div', {
        id: `${EXTENSION_KEY}_settings`,
        class: `${CSS_PREFIX}settings inline-drawer`,
    });

    // 抽屉标题（点击展开/折叠）
    const toggle = el('div', { class: 'inline-drawer-toggle inline-drawer-header' }, [
        el('b', { text: '全局消息收藏夹' }),
        el('div', { class: 'inline-drawer-icon fa-solid fa-circle-chevron-down down' }),
    ]);

    const content = el('div', { class: 'inline-drawer-content' });
    root.append(toggle, content);

    // ST 对动态插入的节点不一定有事件委托，这里自行绑定一次
    toggle.addEventListener('click', () => {
        const icon = toggle.querySelector('.inline-drawer-icon');
        const open = content.classList.toggle('open');
        icon?.classList.toggle('down', !open);
        icon?.classList.toggle('up', open);
    });

    // --- 入口设置 ---
    content.append(el('h4', { class: `${CSS_PREFIX}settings-title`, text: '入口' }));

    content.append(addToggle('启用悬浮球', getData().preferences.entryPoints.floatingButton, (checked) => {
        getData().preferences.entryPoints.floatingButton = checked;
        persist();
        updateEntries();
    }, '可拖动的星形快捷按钮'));

    content.append(addToggle('启用魔法棒菜单入口', getData().preferences.entryPoints.extensionsMenu, (checked) => {
        getData().preferences.entryPoints.extensionsMenu = checked;
        persist();
        updateEntries();
    }, '在扩展（魔法棒）菜单中显示"收藏夹"'));

    // --- 显示设置 ---
    content.append(el('h4', { class: `${CSS_PREFIX}settings-title`, text: '显示' }));

    content.append(addSelect('回顾显示风格', [
        ['plain', '干净纯文本 / Markdown'],
        ['styled', '保留美化 / 正则'],
    ], getData().preferences.renderMode, (value) => {
        getData().preferences.renderMode = value;
        persist();
        onDataChange();
    }));

    content.append(addSelect('美化内容存储策略', [
        ['snapshot', '定格快照（保留 HTML）'],
        ['live', '轻量实时渲染（仅存原文）'],
    ], getData().preferences.snapshotMode, (value) => {
        getData().preferences.snapshotMode = value;
        persist();
    }));

    content.append(addSelect('主题', [
        ['native', '跟随 SillyTavern'],
        ['light', '明亮'],
        ['dark', '暗色'],
    ], getData().preferences.theme, (value) => {
        getData().preferences.theme = value;
        persist();
        document.getElementById(`${EXTENSION_KEY}-panel`)?.setAttribute('data-theme', value);
    }));

    content.append(addToggle('包含思维链内容', getData().preferences.preserveThinking, (checked) => {
        getData().preferences.preserveThinking = checked;
        persist();
        onDataChange();
    }, '关闭时导出的纯文本会移除 thinking 段落'));

    // --- 自定义标签过滤 ---
    content.append(el('h4', { class: `${CSS_PREFIX}settings-title`, text: '自定义标签过滤' }));

    const tagInput = el('input', {
        type: 'text',
        class: 'text_pole',
        placeholder: '状态栏, status, thinking',
        'aria-label': '需要隐藏的标签名',
    });
    tagInput.value = (getData().preferences.customTagFilters ?? []).join(', ');

    const applyTagFilters = () => {
        const tags = parseTagList(tagInput.value);
        getData().preferences.customTagFilters = tags;
        tagInput.value = tags.join(', ');
        persist();
        onDataChange();
    };
    tagInput.addEventListener('change', applyTagFilters);
    tagInput.addEventListener('blur', applyTagFilters);

    content.append(addToggle('启用 <> 标签过滤', getData().preferences.filterCustomTags, (checked) => {
        getData().preferences.filterCustomTags = checked;
        persist();
        onDataChange();
    }, '隐藏 <标签>…</标签> 包裹的内容，原始数据不受影响'));

    content.append(el('label', { class: `${CSS_PREFIX}setting-row ${CSS_PREFIX}setting-row-block` }, [
        el('span', { class: `${CSS_PREFIX}setting-label` }, [
            el('span', { text: '要隐藏的标签名' }),
            el('small', {
                class: `${CSS_PREFIX}setting-hint`,
                text: '用逗号分隔，无需写尖括号；仅影响查看、搜索与导出',
            }),
        ]),
        tagInput,
    ]));

    // --- 数据管理 ---
    content.append(el('h4', { class: `${CSS_PREFIX}settings-title`, text: '数据管理' }));

    const importFile = el('input', {
        type: 'file',
        accept: 'application/json,.json',
        class: `${CSS_PREFIX}import-input`,
    });
    importFile.hidden = true;

    importFile.addEventListener('change', async () => {
        const file = importFile.files?.[0];
        if (!file) return;

        try {
            const imported = JSON.parse(await file.text());
            if (imported.schemaVersion !== 1 || !Array.isArray(imported.items) || !imported.preferences) {
                throw new Error('格式不匹配');
            }

            const current = getData();
            current.items = [
                ...imported.items,
                ...current.items.filter(item => !imported.items.some(entry => entry.id === item.id)),
            ];
            saveData(context, current);
            onDataChange();
            updateStorageInfo();
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
    tagManagerButton.addEventListener('click', () => {
        openTagManager(getData().items, (updatedItems) => {
            const current = getData();
            current.items = updatedItems;
            saveData(context, current);
            onDataChange();
        });
    });

    // 快照瘦身
    const cleanSnapshotButton = el('button', { type: 'button', class: 'menu_button', text: '清理 HTML 快照' });
    cleanSnapshotButton.addEventListener('click', async () => {
        const data = getData();
        const snapshotCount = data.items.filter(item => item.message.snapshotHtml).length;

        if (snapshotCount === 0) {
            notify('没有需要清理的 HTML 快照', 'info');
            return;
        }

        const confirmed = await askConfirm(
            `确认清理所有 HTML 快照？\n\n找到 ${snapshotCount} 个快照，清理后仅保留原文、标签和备注，可节省大量空间。`,
        );
        if (!confirmed) return;

        const before = new TextEncoder().encode(JSON.stringify(data)).byteLength;

        const current = getData();
        current.items = current.items.map(item => ({
            ...item,
            message: {
                ...item.message,
                snapshotHtml: null, // 清空快照
            },
        }));

        saveData(context, current);
        const after = new TextEncoder().encode(JSON.stringify(current)).byteLength;
        const saved = ((before - after) / 1024).toFixed(1);

        onDataChange();
        updateStorageInfo();
        notify(`已清理 ${snapshotCount} 个快照，节省 ${saved} KB`, 'success');
    });

    content.append(
        el('div', { class: `${CSS_PREFIX}settings-actions` }, [
            importButton,
            exportButton,
            tagManagerButton,
            cleanSnapshotButton,
        ]),
        importFile,
    );

    // 存储信息显示
    const storageInfo = el('div', { class: `${CSS_PREFIX}storage-info` });
    const updateStorageInfo = () => {
        const data = getData();
        const bytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
        storageInfo.textContent = `收藏 ${data.items.length} 条 · 数据约 ${(bytes / 1024).toFixed(1)} KB`;
    };
    updateStorageInfo();
    content.append(storageInfo);

    /**
     * 将设置挂载到 ST 扩展设置区（容器可能晚于本扩展初始化）
     * @returns {boolean} 是否挂载成功
     */
    const mountSettings = () => {
        if (document.getElementById(root.id)) return true;
        const container = document.querySelector('#extensions_settings')
            ?? document.querySelector('#extensions_settings2');
        if (!container) return false;
        container.append(root);
        return true;
    };
    mountSettings();

    return { updateStorageInfo, mountSettings };
}


