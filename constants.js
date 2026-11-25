export const EXTENSION_KEY = 'st_favorites';
export const EXTENSION_VERSION = '0.1.0';
export const SCHEMA_VERSION = 1;
export const CSS_PREFIX = 'st-fav-';

export const DEFAULT_PREFERENCES = Object.freeze({
    renderMode: 'plain',
    snapshotMode: 'snapshot',
    preserveThinking: false,
    theme: 'native',
    entryPoints: {
        floatingButton: true,
        extensionMenu: true,
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
