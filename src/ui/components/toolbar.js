/**
 * 批量操作工具栏组件
 */

import { CSS_PREFIX } from '../../core/constants.js';
import { el } from '../utils/dom.js';
import { askConfirm } from './dialogs.js';
import { notify } from './toast.js';
import { generateTxtExport, downloadTxt } from '../../core/cleaner.js';

/**
 * 创建批量操作工具栏
 * @param {Object} options - 配置选项
 * @param {Set} options.selected - 选中的项目 ID 集合
 * @param {Array} options.allItems - 所有可见项目
 * @param {Function} options.onSelectAll - 全选回调
 * @param {Function} options.onBatchDelete - 批量删除回调
 * @param {Function} options.onBatchEditTags - 批量编辑标签回调
 * @param {Function} options.onBatchExport - 批量导出 Markdown 回调
 * @param {Function} options.onBatchExportTxt - 批量导出 TXT 回调
 * @returns {HTMLElement} 工具栏元素
 */
export function createBatchToolbar(options) {
    const { 
        selected, 
        allItems, 
        onSelectAll, 
        onBatchDelete, 
        onBatchEditTags,
        onBatchExport,
        onBatchExportTxt
    } = options;
    
    const toolbar = el('div', { class: `${CSS_PREFIX}batch-toolbar` });
    
    // 全选复选框
    const selectAll = el('input', { 
        type: 'checkbox', 
        'aria-label': '全选' 
    });
    selectAll.checked = selected.size > 0 && selected.size === allItems.length;
    selectAll.indeterminate = selected.size > 0 && selected.size < allItems.length;
    selectAll.addEventListener('change', () => {
        onSelectAll(selectAll.checked);
    });
    
    const selectLabel = el('label', { 
        class: `${CSS_PREFIX}select-all`, 
        text: `全选 (${selected.size})` 
    });
    selectLabel.prepend(selectAll);
    toolbar.append(selectLabel);
    
    // 批量操作按钮（仅在有选中项时显示）
    if (selected.size > 0) {
        // 批量删除
        const batchDelete = el('button', { 
            type: 'button', 
            text: `删除 ${selected.size} 项` 
        });
        batchDelete.addEventListener('click', async () => {
            const count = selected.size;
            if (!await askConfirm(`确认删除 ${count} 条收藏？`)) return;
            onBatchDelete();
            notify(`已删除 ${count} 条`, 'success');
        });
        
        // 批量编辑标签
        const batchTag = el('button', { 
            type: 'button', 
            text: '批量编辑标签' 
        });
        batchTag.addEventListener('click', onBatchEditTags);
        
        // 批量导出 Markdown
        const batchExport = el('button', { 
            type: 'button', 
            text: '导出为 Markdown' 
        });
        batchExport.addEventListener('click', () => {
            onBatchExport();
            notify(`已导出 ${selected.size} 条`, 'success');
        });
        
        // 批量导出 TXT
        const batchExportTxt = el('button', { 
            type: 'button', 
            text: '导出为 TXT' 
        });
        batchExportTxt.addEventListener('click', () => {
            onBatchExportTxt();
            notify(`已导出 ${selected.size} 条为 TXT`, 'success');
        });
        
        toolbar.append(batchDelete, batchTag, batchExport, batchExportTxt);
    }
    
    return toolbar;
}

/**
 * 生成 Markdown 导出内容
 * @param {Array} items - 要导出的收藏项
 * @returns {string} Markdown 格式的文本
 */
export function generateMarkdownExport(items) {
    return items.map(item => {
        const date = new Date(item.createdAt);
        const header = `## ${item.source.speakerName || item.source.ownerName}`;
        const meta = `**来源:** ${item.source.ownerName} / ${item.source.chatName}  \n**时间:** ${date.toLocaleString()}`;
        const tags = item.tags?.length > 0 
            ? `  \n**标签:** ${item.tags.map(t => `#${t}`).join(' ')}` 
            : '';
        const note = item.note ? `  \n**备注:** ${item.note}` : '';
        const content = `\n\n${item.message.rawText}`;
        return `${header}\n\n${meta}${tags}${note}${content}\n\n---\n`;
    }).join('\n');
}

/**
 * 下载 Markdown 文件
 * @param {string} content - Markdown 内容
 * @param {string} filename - 文件名（可选）
 */
export function downloadMarkdown(content, filename = `favorites-${Date.now()}.md`) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: filename });
    link.click();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 导出 TXT 相关函数（从 cleaner.js 导入）
export { generateTxtExport, downloadTxt };

