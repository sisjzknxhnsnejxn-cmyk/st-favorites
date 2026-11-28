/**
 * 设置面板组件
 */

import { CSS_PREFIX, EXTENSION_KEY } from '../../core/constants.js';
import { saveData } from '../../core/storage.js';
import { el } from '../utils/dom.js';
import { notify } from './toast.js';
import { askConfirm } from './dialogs.js';
import { openTagManager } from './editors/tag-manager.js';

/**
 * 初始化设置面板
 * @param {Object} context - SillyTavern 上下文
 * @param {Function} getData - 获取数据函数
 * @param {Function} updateEntries - 更新入口点函数
 * @param {Function} onDataChange - 数据变化回调
 */
export function initializeSettings(context, getData, updateEntries, onDataChange) {
    const settings = el('div', { 
        id: `${EXTENSION_KEY}_settings`, 
        class: `${CSS_PREFIX}settings` 
    });
    
    settings.append(el('h3', { text: '全局消息收藏夹' }));
    
    // 入口点配置
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
        settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [
            el('span', { text: label }), 
            input
        ]));
    }
    
    // 渲染模式
    const renderSelect = el('select', {}, [
        el('option', { value: 'plain', text: '干净纯文本 / Markdown' }),
        el('option', { value: 'styled', text: '保留美化 / 正则' }),
    ]);
    renderSelect.value = getData().preferences.renderMode;
    renderSelect.addEventListener('change', () => {
        getData().preferences.renderMode = renderSelect.value;
        saveData(context, getData());
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [
        el('span', { text: '回顾显示风格' }), 
        renderSelect
    ]));
    
    // 快照模式
    const snapshotSelect = el('select', {}, [
        el('option', { value: 'snapshot', text: '定格快照（保留 HTML）' }),
        el('option', { value: 'live', text: '轻量实时渲染（仅存原文）' }),
    ]);
    snapshotSelect.value = getData().preferences.snapshotMode;
    snapshotSelect.addEventListener('change', () => {
        getData().preferences.snapshotMode = snapshotSelect.value;
        saveData(context, getData());
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [
        el('span', { text: '美化内容存储策略' }), 
        snapshotSelect
    ]));
    
    // 思维链选项
    const thinking = el('input', { type: 'checkbox' });
    thinking.checked = Boolean(getData().preferences.preserveThinking);
    thinking.addEventListener('change', () => {
        getData().preferences.preserveThinking = thinking.checked;
        saveData(context, getData());
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [
        el('span', { text: '包含思维链内容' }), 
        thinking
    ]));
    
    // 主题选择
    const theme = el('select', {}, [
        el('option', { value: 'native', text: '跟随 SillyTavern' }),
        el('option', { value: 'light', text: '明亮' }),
        el('option', { value: 'dark', text: '暗色' }),
    ]);
    theme.value = getData().preferences.theme;
    theme.addEventListener('change', () => {
        getData().preferences.theme = theme.value;
        saveData(context, getData());
        document.getElementById(`${EXTENSION_KEY}-panel`)?.setAttribute('data-theme', theme.value);
    });
    settings.append(el('label', { class: `${CSS_PREFIX}setting-row` }, [
        el('span', { text: '主题' }), 
        theme
    ]));
    
    // 导入/导出按钮
    const importFile = el('input', { 
        type: 'file', 
        accept: 'application/json,.json', 
        class: `${CSS_PREFIX}import-input` 
    });
    
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
                ...current.items.filter(item => !imported.items.some(entry => entry.id === item.id))
            ];
            saveData(context, current);
            onDataChange();
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
    
    // 快照瘦身按钮
    const cleanSnapshotButton = el('button', { type: 'button', class: 'menu_button', text: '清理 HTML 快照' });
    cleanSnapshotButton.addEventListener('click', async () => {
        const data = getData();
        const snapshotCount = data.items.filter(item => item.message.snapshotHtml).length;
        
        if (snapshotCount === 0) {
            notify('没有需要清理的 HTML 快照', 'info');
            return;
        }
        
        if (!await askConfirm(`确认清理所有 HTML 快照？\n\n找到 ${snapshotCount} 个快照，清理后仅保留原文、标签和备注，可节省大量空间。`)) return;
        
        const before = new TextEncoder().encode(JSON.stringify(data)).byteLength;
        
        const current = getData();
        current.items = current.items.map(item => ({
            ...item,
            message: {
                ...item.message,
                snapshotHtml: null, // 清空快照
            }
        }));
        
        saveData(context, current);
        const after = new TextEncoder().encode(JSON.stringify(current)).byteLength;
        const saved = ((before - after) / 1024).toFixed(1);
        
        onDataChange();
        updateStorageInfo();
        notify(`已清理 ${snapshotCount} 个快照，节省 ${saved} KB`, 'success');
    });
    
    settings.append(
        el('div', { class: `${CSS_PREFIX}settings-actions` }, [importButton, exportButton, tagManagerButton, cleanSnapshotButton]), 
        importFile
    );
    
    // 存储信息显示
    const storageInfo = el('div', { class: `${CSS_PREFIX}storage-info` });
    const updateStorageInfo = () => {
        const bytes = new TextEncoder().encode(JSON.stringify(getData())).byteLength;
        storageInfo.textContent = `收藏 ${getData().items.length} 条 · 数据约 ${(bytes / 1024).toFixed(1)} KB`;
    };
    updateStorageInfo();
    settings.append(storageInfo);
    
    const mountSettings = () => {
        const container = document.querySelector('#extensions_settings')
            ?? document.querySelector('#extensions_settings2');
        if (!container) return false;
        if (!document.getElementById(settings.id)) {
            container.append(settings);
        }
        return true;
    };
    mountSettings();

    return { updateStorageInfo, mountSettings };
}

