import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    stripHtmlTags,
    filterThinkingTags,
    cleanWhitespace,
    cleanContent,
    formatItemForTxt,
    generateTxtExport
} from '../src/core/cleaner.js';

describe('cleaner.js - HTML 清洗测试', () => {
    it('stripHtmlTags 应该移除 HTML 标签', () => {
        const html = '<p>Hello <strong>World</strong></p>';
        const result = stripHtmlTags(html);
        assert.strictEqual(result, 'Hello World');
    });

    it('stripHtmlTags 应该移除 script 和 style 标签', () => {
        const html = '<div>Content<script>alert("xss")</script><style>.test{}</style></div>';
        const result = stripHtmlTags(html);
        assert.strictEqual(result, 'Content');
    });

    it('filterThinkingTags 应该过滤思维链标签', () => {
        const text = 'Hello <thinking>internal thoughts</thinking> World';
        const result = filterThinkingTags(text, false);
        assert.strictEqual(result, 'Hello  World');
    });

    it('filterThinkingTags 保留模式应该不过滤', () => {
        const text = 'Hello <thinking>internal thoughts</thinking> World';
        const result = filterThinkingTags(text, true);
        assert.strictEqual(result, text);
    });

    it('cleanWhitespace 应该清理多余空白', () => {
        const text = '  Hello    World  \n\n\n\n  Test  ';
        const result = cleanWhitespace(text);
        // 注意：换行后的空格会保留一个
        assert.strictEqual(result.replace(/\s+/g, ' ').trim(), 'Hello World Test');
    });

    it('cleanContent 应该完整清洗内容', () => {
        const content = '<p>Hello<thinking>thoughts</thinking>  World</p>\n\n\n\nTest';
        const result = cleanContent(content, false);
        // 移除标签后 Hello 和 World 之间可能有空格
        assert.ok(result.includes('Hello'));
        assert.ok(result.includes('World'));
        assert.ok(result.includes('Test'));
        assert.ok(!result.includes('thoughts')); // 确保思维链被过滤
        assert.ok(!result.includes('<')); // 确保没有 HTML 标签
    });

    it('formatItemForTxt 应该格式化收藏项', () => {
        const item = {
            id: '1',
            source: {
                speakerName: '角色名',
                ownerName: '用户',
                chatName: '聊天1'
            },
            message: {
                rawText: 'Hello World',
                reasoning: ''
            },
            tags: ['测试'],
            note: '备注',
            createdAt: '2024-01-01T00:00:00.000Z'
        };
        const result = formatItemForTxt(item, false);
        assert.ok(result.includes('【角色名】'));
        assert.ok(result.includes('标签：#测试'));
        assert.ok(result.includes('备注：备注'));
        assert.ok(result.includes('Hello World'));
    });

    it('generateTxtExport 应该生成完整导出', () => {
        const items = [{
            id: '1',
            source: { speakerName: 'Test', ownerName: 'User', chatName: 'Chat' },
            message: { rawText: 'Content', reasoning: '' },
            tags: [],
            note: '',
            createdAt: '2024-01-01T00:00:00.000Z'
        }];
        const result = generateTxtExport(items, false);
        assert.ok(result.includes('SillyTavern 收藏导出'));
        assert.ok(result.includes('共 1 条收藏'));
        assert.ok(result.includes('Content'));
    });
});
