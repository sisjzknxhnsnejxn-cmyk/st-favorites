/**
 * UI 模块统一导出
 */

// 工具函数
export { el } from './utils/dom.js';
export { sanitizeSnapshot } from './utils/sanitize.js';

// UI 组件
export { notify } from './components/toast.js';
export { askConfirm, askInput } from './components/dialogs.js';

// 主面板
export { createFavoritesUI } from './components/panel.js';

// 子组件（供测试或扩展使用）
export { renderCard } from './components/card.js';
export { openItemEditor } from './components/editors/item-editor.js';
export { openBatchTagEditor } from './components/editors/batch-editor.js';
export { openTagManager } from './components/editors/tag-manager.js';
export { createFilters } from './components/filters.js';
export { createBatchToolbar, generateMarkdownExport, downloadMarkdown, generateTxtExport, downloadTxt } from './components/toolbar.js';
export { createFloatingButton, removeFloatingButton } from './components/floating-button.js';
export { initializeSettings } from './components/settings.js';

// 清洗工具（供外部使用）
export { cleanContent, generateTxtExport as generateCleanTxtExport, downloadTxt as downloadCleanTxt } from '../core/cleaner.js';


