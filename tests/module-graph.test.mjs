import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

/**
 * 模块图完整性测试
 *
 * 作用：ES Module 只要有一个导出名对不上，整条加载链都不会执行。
 * v0.2.0 曾因 src/ui/index.js 仍导出已删除的 createGroupNav，
 * 导致插件在模块加载阶段就抛 SyntaxError，整个扩展无任何表现。
 * 这里直接导入入口模块，使导出名不匹配在 `node --test` 阶段即暴露。
 */

describe('模块图完整性 - 入口可加载', () => {
    it('src/ui/index.js 应该可以被导入（所有再导出名都存在）', async () => {
        const uiModule = await import('../src/ui/index.js');
        assert.ok(uiModule, 'src/ui/index.js 导入失败');
    });

    it('src/entry.js 应该可以被导入', async () => {
        const entryModule = await import('../src/entry.js');
        assert.strictEqual(typeof entryModule.bootstrapSTFavorites, 'function');
    });

    it('根 index.js 应该可以被导入', async () => {
        const rootModule = await import('../index.js');
        assert.ok(rootModule, '根 index.js 导入失败');
    });
});

describe('模块图完整性 - 关键导出名', () => {
    const EXPECTED_UI_EXPORTS = [
        'el',
        'sanitizeSnapshot',
        'notify',
        'askConfirm',
        'askInput',
        'createFavoritesUI',
        'renderCard',
        'openItemEditor',
        'openBatchTagEditor',
        'openTagManager',
        'createFilters',
        'createBatchToolbar',
        'generateMarkdownExport',
        'downloadMarkdown',
        'generateTxtExport',
        'downloadTxt',
        'createFloatingButton',
        'removeFloatingButton',
        'initializeSettings',
        'cleanContent',
        'generateCleanTxtExport',
        'downloadCleanTxt',
    ];

    it('src/ui/index.js 应该导出全部约定的成员且均为函数', async () => {
        const uiModule = await import('../src/ui/index.js');
        for (const name of EXPECTED_UI_EXPORTS) {
            assert.strictEqual(
                typeof uiModule[name],
                'function',
                `src/ui/index.js 缺少导出或类型不符: ${name}`,
            );
        }
    });

    it('不应再导出已删除的 createGroupNav', async () => {
        const uiModule = await import('../src/ui/index.js');
        assert.strictEqual(uiModule.createGroupNav, undefined);
    });
});

describe('版本号一致性', () => {
    it('manifest.json、constants.js、index.js 的版本号应该一致', async () => {
        const manifestUrl = new URL('../manifest.json', import.meta.url);
        const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

        const { EXTENSION_VERSION } = await import('../src/core/constants.js');

        const rootSource = await readFile(new URL('../index.js', import.meta.url), 'utf8');
        const matched = rootSource.match(/const PLUGIN_VERSION = '([^']+)'/);
        assert.ok(matched, '未能在 index.js 中找到 PLUGIN_VERSION');

        assert.strictEqual(EXTENSION_VERSION, manifest.version, 'constants.js 与 manifest.json 版本不一致');
        assert.strictEqual(matched[1], manifest.version, 'index.js 与 manifest.json 版本不一致');
    });
});
