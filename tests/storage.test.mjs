import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeData, isFavoriteItem, createSourceKey, addFavorite, removeFavorite, saveData } from '../src/core/storage.js';
import { SCHEMA_VERSION, createEmptyData } from '../src/core/constants.js';

// Mock SillyTavern context
const mockContext = () => ({
    extensionSettings: {},
    saveSettingsDebounced: () => {},
});

test('normalizeData handles empty input', () => {
    const result = normalizeData(null);
    assert.equal(result.schemaVersion, SCHEMA_VERSION);
    assert.ok(Array.isArray(result.items));
    assert.equal(result.items.length, 0);
    assert.ok(result.preferences);
});

test('normalizeData preserves valid items', () => {
    const input = {
        items: [{
            id: 'test-1',
            source: { chatKind: 'character', ownerId: '1', chatId: '1' },
            message: { rawText: 'hello' },
        }],
    };
    const result = normalizeData(input);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'test-1');
    assert.ok(Array.isArray(result.items[0].tags));
    assert.equal(typeof result.items[0].note, 'string');
});

test('normalizeData filters invalid items', () => {
    const input = {
        items: [
            { id: 'valid', source: {}, message: { rawText: 'test' } },
            { id: 'missing-message' },
            { source: {}, message: { rawText: 'missing-id' } },
        ],
    };
    const result = normalizeData(input);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'valid');
});

test('normalizeData ensures reasoning field', () => {
    const input = {
        items: [{
            id: 'test-1',
            source: {},
            message: { rawText: 'hello', reasoning: 'thinking' },
        }],
    };
    const result = normalizeData(input);
    assert.equal(result.items[0].message.reasoning, 'thinking');
});

test('normalizeData defaults missing reasoning', () => {
    const input = {
        items: [{
            id: 'test-1',
            source: {},
            message: { rawText: 'hello' },
        }],
    };
    const result = normalizeData(input);
    assert.equal(result.items[0].message.reasoning, '');
});

test('createSourceKey generates consistent keys', () => {
    const source = {
        chatKind: 'character',
        ownerId: 'char1',
        chatId: 'chat1',
        messageId: 42,
        swipeId: 1,
    };
    const key = createSourceKey(source);
    assert.equal(key, 'character::char1::chat1::42::1');
    assert.equal(createSourceKey(source), key); // idempotent
});

test('addFavorite prevents duplicates', () => {
    const context = mockContext();
    const data = createEmptyData();
    const item = {
        id: 'item-1',
        source: { chatKind: 'character', ownerId: '1', chatId: '1', messageId: 0, swipeId: 0 },
        message: { rawText: 'test' },
    };
    
    const result1 = addFavorite(context, data, item);
    assert.equal(result1.added, true);
    assert.equal(result1.data.items.length, 1);
    
    const result2 = addFavorite(context, result1.data, item);
    assert.equal(result2.added, false);
    assert.equal(result2.data.items.length, 1);
});

test('removeFavorite removes item by ID', () => {
    const context = mockContext();
    const data = createEmptyData();
    data.items = [
        { id: 'keep', source: {}, message: { rawText: 'a' } },
        { id: 'remove', source: {}, message: { rawText: 'b' } },
    ];
    
    const result = removeFavorite(context, data, 'remove');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'keep');
});

test('saveData normalizes and persists', () => {
    const context = mockContext();
    const data = { items: [{ id: '1', source: {}, message: { rawText: 'test' } }] };
    
    const result = saveData(context, data);
    assert.equal(result.schemaVersion, SCHEMA_VERSION);
    assert.ok(Array.isArray(result.items));
    assert.equal(result.items[0].tags.length, 0);
    assert.equal(result.items[0].note, '');
});
