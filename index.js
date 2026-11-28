/**
 * ST Favorites (收藏笔记) — SillyTavern Extension Entry
 *
 * 使用原生 ES Module 与 import.meta.url，兼容任意扩展目录名称，
 * 并自动等待 SillyTavern 上下文与界面就绪后初始化。
 */

import { bootstrapSTFavorites } from './src/entry.js';

const PLUGIN_VERSION = '0.2.0';
const LOADER_STATE_KEY = '__stFavoritesLoaderState';

function ensureStylesheetLoaded(forceReload = false) {
    if (typeof document === 'undefined' || !document.head) return;
    try {
        const cssUrl = new URL('./style.css', import.meta.url);
        const existingLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const matchedLink = existingLinks.find((link) => {
            if (!link.href) return false;
            try {
                const parsed = new URL(link.href, window.location.href);
                return parsed.pathname === cssUrl.pathname;
            } catch {
                return false;
            }
        });

        if (matchedLink) {
            if (forceReload) {
                cssUrl.searchParams.set('v', `${PLUGIN_VERSION}_${Date.now()}`);
                matchedLink.href = cssUrl.toString();
            }
            return;
        }

        cssUrl.searchParams.set('v', forceReload ? `${PLUGIN_VERSION}_${Date.now()}` : PLUGIN_VERSION);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssUrl.toString();
        link.dataset.stFavoritesStyle = 'true';
        document.head.appendChild(link);
    } catch (error) {
        console.warn('[ST-Favorites] Failed to ensure stylesheet:', error);
    }
}

function boot(forceReload = false) {
    ensureStylesheetLoaded(forceReload);
    const instance = bootstrapSTFavorites();
    if (typeof window !== 'undefined') {
        window[LOADER_STATE_KEY] = {
            loaded: Boolean(instance),
            updatedAt: Date.now(),
        };
    }
    return instance;
}

if (typeof window !== 'undefined') {
    window.STFavoritesReload = () => boot(true);
    window[LOADER_STATE_KEY] = { loading: true, updatedAt: Date.now() };

    const start = () => {
        try {
            boot(false);
        } catch (error) {
            window[LOADER_STATE_KEY] = {
                loaded: false,
                error: String(error),
                updatedAt: Date.now(),
            };
            console.error('[ST-Favorites] Failed to initialize extension:', error);
        }
    };

    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}
