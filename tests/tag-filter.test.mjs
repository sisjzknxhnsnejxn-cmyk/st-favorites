import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseTagNames, filterCustomTags, cleanContent } from '../src/core/cleaner.js';
import { getActiveTagFilters } from '../src/core/storage.js';

describe('parseTagNames - 标签名解析', () => {
    it('应该按中英文逗号、分号、换行分隔', () => {
        assert.deepStrictEqual(
            parseTagNames('状态栏, status；thinking\nplot'),
            ['状态栏', 'status', 'thinking', 'plot'],
        );
    });

    it('应该去掉包裹的尖括号与斜杠', () => {
        assert.deepStrictEqual(parseTagNames('<状态栏>, </status>, <br/>'), ['状态栏', 'status', 'br']);
    });

    it('应该去重并忽略空项', () => {
        assert.deepStrictEqual(parseTagNames('a, , a,  b ,'), ['a', 'b']);
    });

    it('应该接受数组输入', () => {
        assert.deepStrictEqual(parseTagNames(['状态栏', 'status']), ['状态栏', 'status']);
    });

    it('空值应该返回空数组', () => {
        assert.deepStrictEqual(parseTagNames(null), []);
        assert.deepStrictEqual(parseTagNames(undefined), []);
        assert.deepStrictEqual(parseTagNames(''), []);
    });
});

describe('filterCustomTags - 自定义标签过滤', () => {
    it('应该删除成对标签及其内容', () => {
        const text = '前文<状态栏>HP: 100</状态栏>后文';
        assert.strictEqual(filterCustomTags(text, ['状态栏']), '前文后文');
    });

    it('应该处理嵌套的同名标签', () => {
        const text = 'A<box>1<box>2</box>3</box>B';
        assert.strictEqual(filterCustomTags(text, ['box']), 'AB');
    });

    it('应该删除带属性的开标签', () => {
        const text = 'A<status type="hp">90</status>B';
        assert.strictEqual(filterCustomTags(text, ['status']), 'AB');
    });

    it('落单的标签应该只删标签本身，保留周围文本', () => {
        const text = '开始<status>内容没有闭合';
        assert.strictEqual(filterCustomTags(text, ['status']), '开始内容没有闭合');
    });

    it('应该处理被转义的标签形式', () => {
        const text = 'A&lt;状态栏&gt;隐藏&lt;/状态栏&gt;B';
        assert.strictEqual(filterCustomTags(text, ['状态栏']), 'AB');
    });

    it('标签名匹配应该忽略大小写', () => {
        assert.strictEqual(filterCustomTags('A<Status>x</STATUS>B', ['status']), 'AB');
    });

    it('未列出的标签不应被影响', () => {
        const text = 'A<keep>x</keep>B';
        assert.strictEqual(filterCustomTags(text, ['status']), text);
    });

    it('空标签列表应该原样返回', () => {
        const text = 'A<status>x</status>B';
        assert.strictEqual(filterCustomTags(text, []), text);
    });

    it('非字符串输入应该返回空串', () => {
        assert.strictEqual(filterCustomTags(null, ['a']), '');
        assert.strictEqual(filterCustomTags(undefined, ['a']), '');
    });
});

describe('getActiveTagFilters - 生效的过滤列表', () => {
    it('开关开启时应该返回解析后的标签名', () => {
        const preferences = { filterCustomTags: true, customTagFilters: ['<状态栏>', 'status'] };
        assert.deepStrictEqual(getActiveTagFilters(preferences), ['状态栏', 'status']);
    });

    it('开关关闭时应该返回空数组', () => {
        const preferences = { filterCustomTags: false, customTagFilters: ['状态栏'] };
        assert.deepStrictEqual(getActiveTagFilters(preferences), []);
    });

    it('缺省 preferences 应该返回空数组', () => {
        assert.deepStrictEqual(getActiveTagFilters(null), []);
        assert.deepStrictEqual(getActiveTagFilters(undefined), []);
    });
});

describe('cleanContent - 清洗时应用自定义标签过滤', () => {
    it('应该在输出的纯文本中移除自定义标签块', () => {
        const html = '<p>可见内容</p><p>&lt;状态栏&gt;HP: 100&lt;/状态栏&gt;</p>';
        const result = cleanContent(html, false, ['状态栏']);
        assert.ok(result.includes('可见内容'));
        assert.ok(!result.includes('HP: 100'));
        assert.ok(!result.includes('状态栏'));
    });

    it('不传自定义标签时不应改变原有行为', () => {
        const html = '<p>可见内容</p>';
        assert.strictEqual(cleanContent(html, false), '可见内容');
    });
});
