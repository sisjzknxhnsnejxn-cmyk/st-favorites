import { createEmptyData, EXTENSION_KEY, SCHEMA_VERSION } from './constants.js';

/**
 * Normalize raw data from storage, ensuring all required fields exist with correct types.
 * @param {unknown} value - Raw data from localStorage
 * @returns {object} Normalized data structure matching SCHEMA_VERSION
 */
function normalizeData(value) {
    const data = value && typeof value === 'object' ? value : {};
    const normalized = createEmptyData();

    if (Array.isArray(data.items)) {
        normalized.items = data.items.filter(isFavoriteItem).map(item => ({
            ...item,
            tags: Array.isArray(item.tags) ? item.tags : [],
            note: typeof item.note === 'string' ? item.note : '',
            message: {
                ...item.message,
                reasoning: typeof item.message?.reasoning === 'string' ? item.message.reasoning : '',
            },
        }));
    }

    if (data.preferences && typeof data.preferences === 'object') {
        normalized.preferences = {
            ...normalized.preferences,
            ...data.preferences,
            entryPoints: {
                ...normalized.preferences.entryPoints,
                ...(data.preferences.entryPoints ?? {}),
            },
        };
    }

    normalized.schemaVersion = SCHEMA_VERSION;
    return normalized;
}

/**
 * Validate a favorite item structure.
 * @param {unknown} item - Item to validate
 * @returns {boolean} True if item has required fields
 */
function isFavoriteItem(item) {
    return Boolean(
        item &&
        typeof item.id === 'string' &&
        item.source &&
        typeof item.source === 'object' &&
        item.message &&
        typeof item.message.rawText === 'string',
    );
}

/**
 * Load favorites data from SillyTavern extension storage.
 * @param {object} context - SillyTavern context object
 * @returns {object} Normalized favorites data
 */
export function loadData(context) {
    const settings = context.extensionSettings;
    const existing = settings[EXTENSION_KEY];
    const data = normalizeData(existing);

    if (!existing || existing.schemaVersion !== SCHEMA_VERSION) {
        settings[EXTENSION_KEY] = data;
        context.saveSettingsDebounced();
    }
    return data;
}

/**
 * Save favorites data to SillyTavern extension storage.
 * @param {object} context - SillyTavern context object
 * @param {object} data - Data to save
 */
export function saveData(context, data) {
    const normalized = normalizeData(data);
    if (data && data !== normalized && typeof data === 'object') {
        data.schemaVersion = normalized.schemaVersion;
        data.items = normalized.items;
        data.preferences = normalized.preferences;
        context.extensionSettings[EXTENSION_KEY] = data;
        context.saveSettingsDebounced();
        return data;
    }
    context.extensionSettings[EXTENSION_KEY] = normalized;
    context.saveSettingsDebounced();
    return normalized;
}

/**
 * Create a unique key identifying a message source.
 * @param {object} source - Source object with chatKind, ownerId, chatId, messageId, swipeId
 * @returns {string} Composite key string
 */
export function createSourceKey(source) {
    return [
        source.chatKind,
        source.ownerId,
        source.chatId,
        source.messageId,
        source.swipeId,
    ].map(value => String(value ?? '')).join('::');
}

/**
 * Find a favorite item matching the given source.
 * @param {Array} items - Array of favorite items
 * @param {object} source - Source object to match
 * @returns {object|null} Matching item or null
 */
export function findFavoriteBySource(items, source) {
    const sourceKey = createSourceKey(source);
    return items.find(item => createSourceKey(item.source) === sourceKey) ?? null;
}

/**
 * Add a favorite item to the data store, avoiding duplicates.
 * @param {object} context - SillyTavern context object
 * @param {object} data - Current favorites data
 * @param {object} item - Favorite item to add
 * @returns {{data: object, item: object, added: boolean}} Result with updated data and status
 */
export function addFavorite(context, data, item) {
    const duplicate = findFavoriteBySource(data.items, item.source);
    if (duplicate) {
        return { data, item: duplicate, added: false };
    }

    data.items.unshift(item);
    saveData(context, data);
    return { data, item, added: true };
}

/**
 * Remove a favorite item by ID.
 * @param {object} context - SillyTavern context object
 * @param {object} data - Current favorites data
 * @param {string} id - ID of the item to remove
 * @returns {object} Updated data with the item removed
 */
export function removeFavorite(context, data, id) {
    const next = { ...data, items: data.items.filter(item => item.id !== id) };
    saveData(context, next);
    return next;
}

/**
 * Calculate the byte size of serialized data.
 * @param {object} data - Data to serialize
 * @returns {number} Byte length of JSON representation
 */
export function getSerializedSize(data) {
    return new TextEncoder().encode(JSON.stringify(data)).byteLength;
}

export { normalizeData, isFavoriteItem };
