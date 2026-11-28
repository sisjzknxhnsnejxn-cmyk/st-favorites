export const EXTENSION_KEY = 'st_favorites';
export const EXTENSION_VERSION = '0.2.0';
export const SCHEMA_VERSION = 1;
export const CSS_PREFIX = 'st-fav-';

/**
 * 默认的自定义标签过滤列表。
 * 这些标签成对出现时（<状态栏>...</状态栏>）连同内容一起从展示/导出/搜索中剔除，
 * 原始文本 rawText 始终保持不变，过滤只作用于呈现层。
 */
export const DEFAULT_CUSTOM_TAG_FILTERS = Object.freeze([]);

export const DEFAULT_PREFERENCES = Object.freeze({
    renderMode: 'plain',
    snapshotMode: 'snapshot',
    preserveThinking: false,
    theme: 'native',
    /** 是否启用自定义 <标签> 过滤 */
    filterCustomTags: true,
    /** 需要被过滤的标签名列表，例如 ['状态栏', 'status'] */
    customTagFilters: [...DEFAULT_CUSTOM_TAG_FILTERS],
    entryPoints: {
        floatingButton: true,
        extensionsMenu: true,
    },
});

export function createEmptyData() {
    return {
        schemaVersion: SCHEMA_VERSION,
        items: [],
        preferences: structuredClone(DEFAULT_PREFERENCES),
    };
}

