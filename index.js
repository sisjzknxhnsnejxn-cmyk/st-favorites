/**
 * ST Favorites (收藏笔记) — SillyTavern Extension Universal Entry
 *
 * 兼容 SillyTavern 的插件加载机制：
 * 1. 通过传统 <script src="index.js"> 标签加载
 * 2. 使用动态 import() 加载 ES6 模块
 * 3. 支持热重载和版本更新
 */

(function loadSTFavoritesExtension() {
    const PLUGIN_FOLDER = 'third-party';
    const PLUGIN_NAME = 'ST-收藏笔记';
    const PLUGIN_VERSION = '0.1.0';
    const LOADER_STATE_KEY = '__stFavoritesLoaderState';

    function resolveExtensionRootUrl() {
        try {
            if (typeof document !== 'undefined') {
                if (document.currentScript && document.currentScript.src) {
                    return new URL('./', document.currentScript.src).toString();
                }

                const scripts = Array.from(document.scripts || []);
                const matchedScript = scripts.find((script) => {
                    const src = script && script.src ? script.src : '';
                    return (
                        src.includes(`/${PLUGIN_NAME}/index.js`) ||
                        src.includes('/ST-收藏笔记/index.js') ||
                        src.includes('/st-favorites/index.js') ||
                        (src.includes('收藏笔记') && src.includes('index.js'))
                    );
                });
                if (matchedScript && matchedScript.src) {
                    return new URL('./', matchedScript.src).toString();
                }

                const stScript = scripts.find((script) => {
                    const src = script && script.src ? script.src : '';
                    return src.includes('/scripts/extensions.js') || src.includes('/scripts/extensions/');
                });
                if (stScript && stScript.src) {
                    const appRoot = new URL('../', stScript.src).toString();
                    return new URL(`scripts/extensions/${PLUGIN_FOLDER}/${PLUGIN_NAME}/`, appRoot).toString();
                }
            }
        } catch (error) {
            console.warn('[ST-Favorites] Failed to resolve extension root URL:', error);
        }

        if (typeof window !== 'undefined' && window.location && window.location.origin) {
            return `${window.location.origin}/scripts/extensions/${PLUGIN_FOLDER}/${PLUGIN_NAME}/`;
        }
        return './';
    }

    function ensureStylesheetLoaded(rootUrl, cacheBust) {
        if (typeof document === 'undefined' || !document.head) return;
        try {
            const hrefUrl = new URL('style.css', rootUrl);
            hrefUrl.searchParams.set('v', cacheBust || PLUGIN_VERSION);
            const existingLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(
                (link) => link.href && (
                    link.href.includes('/ST-收藏笔记/style.css') ||
                    link.href.includes('/st-favorites/style.css')
                )
            );
            if (existingLink) {
                existingLink.href = hrefUrl.toString();
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = hrefUrl.toString();
            link.dataset.stFavoritesStyle = 'true';
            document.head.appendChild(link);
        } catch (error) {
            console.warn('[ST-Favorites] Failed to load stylesheet:', error);
        }
    }

    async function bootSTFavoritesModule(forceReload = false) {
        const rootUrl = resolveExtensionRootUrl();
        const cacheBust = forceReload ? `${PLUGIN_VERSION}_${Date.now()}` : PLUGIN_VERSION;
        ensureStylesheetLoaded(rootUrl, cacheBust);

        const entryUrl = new URL('src/entry.js', rootUrl);
        entryUrl.searchParams.set('v', cacheBust);

        const mod = await import(entryUrl.toString());
        if (mod && typeof mod.bootstrapSTFavorites === 'function') {
            return mod.bootstrapSTFavorites();
        }
        return null;
    }

    if (typeof window !== 'undefined') {
        const prevState = window[LOADER_STATE_KEY];
        window.STFavoritesReload = () => bootSTFavoritesModule(true);

        const isHotReload = Boolean(prevState && prevState.loaded);
        window[LOADER_STATE_KEY] = { loading: true, updatedAt: Date.now() };

        bootSTFavoritesModule(isHotReload)
            .then(() => {
                window[LOADER_STATE_KEY] = { loaded: true, updatedAt: Date.now() };
            })
            .catch((error) => {
                window[LOADER_STATE_KEY] = { loaded: false, error: String(error), updatedAt: Date.now() };
                console.error('[ST-Favorites] Failed to load ES module entry:', error);
            });
    }
})();

