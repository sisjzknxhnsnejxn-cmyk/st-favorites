import { EXTENSION_KEY, EXTENSION_VERSION } from './core/constants.js';

import { getContext } from './core/context.js';
import { createFavoritesUI, askConfirm } from './ui/index.js';
import { addFavorite, findFavoriteBySource, loadData, removeFavorite } from './core/storage.js';

const BUTTON_CLASS = 'st-fav-star-button';
const CHAT_SELECTOR = '#chat';

function getCurrentSource(context, messageElement) {
    const rawMessageId = messageElement.getAttribute('mesid');
    if (rawMessageId === null || rawMessageId === '') return null;
    const messageId = Number(rawMessageId);
    const message = context.chat?.[messageId];
    if (!message || !Number.isInteger(messageId)) return null;

    const isGroup = Boolean(context.groupId);
    const group = isGroup
        ? context.groups?.find(item => String(item.id) === String(context.groupId))
        : null;
    const ownerName = isGroup ? (group?.name ?? '群聊') : (context.name2 ?? context.name1 ?? '角色');
    const ownerId = isGroup
        ? String(context.groupId)
        : String(context.characterId ?? context.name2 ?? context.name1 ?? 'character');
    const chatId = String(context.getCurrentChatId?.() ?? context.chatId ?? '');
    const swipeId = Number(message.swipe_id ?? 0);

    return {
        chatKind: isGroup ? 'group' : 'character',
        ownerId,
        ownerName,
        chatId,
        chatName: chatId || '当前聊天',
        messageId,
        swipeId: Number.isInteger(swipeId) ? swipeId : 0,
        speakerName: message.is_user ? (context.name1 ?? '用户') : (message.name ?? ownerName),
    };
}

function makeButton(favorite) {
    const button = document.createElement('div');
    // ST 原生消息按钮为单层结构：图标类直接挂在按钮上，避免额外 <i> 造成尺寸/对齐错位
    button.className = `${BUTTON_CLASS} mes_button fa-solid fa-star interactable`;
    button.dataset.stFavAction = 'toggle';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    updateButton(button, favorite);
    return button;
}

function updateButton(button, favorite) {
    const active = Boolean(favorite);
    button.classList.toggle('st-fav-is-active', active);
    // 已收藏时使用 ST 主题的金色变量，保持与原生高亮一致
    button.style.color = active ? 'var(--golden)' : '';
    button.setAttribute('aria-label', active ? '取消收藏' : '收藏消息');
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? '已收藏' : '收藏消息';
}


function syncMessageButton(context, data, messageElement) {
    if (!(messageElement instanceof HTMLElement)) return;
    const target = messageElement.querySelector('.extraMesButtons')
        ?? messageElement.querySelector('.mes_buttons');
    if (!target) return;

    const source = getCurrentSource(context, messageElement);
    if (!source) return;

    let button = messageElement.querySelector(`.${BUTTON_CLASS}`);
    if (!button) {
        button = makeButton(findFavoriteBySource(data.items, source));
        target.append(button);
    }
    updateButton(button, findFavoriteBySource(data.items, source));
}

function syncAllButtons(context, data) {
    document.querySelectorAll(`${CHAT_SELECTOR} .mes`).forEach(element => {
        syncMessageButton(context, data, element);
    });
}

function createFavorite(context, messageElement, source, data) {
    const message = context.chat?.[source.messageId];
    if (!message) return null;
    const textElement = messageElement.querySelector('.mes_text');
    const reasoning = data.preferences.preserveThinking
        ? (message.extra?.reasoning ?? message.reasoning ?? '')
        : '';
    return {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        source,
        message: {
            rawText: typeof message.mes === 'string' ? message.mes : (textElement?.innerText ?? ''),
            snapshotHtml: data.preferences.snapshotMode === 'snapshot'
                ? (textElement?.innerHTML ?? null)
                : null,
            reasoning,
        },
        createdAt: new Date().toISOString(),
        tags: [],
        note: '',
    };
}

function initialize() {
    const context = getContext();
    let data = loadData(context);
    const ui = createFavoritesUI(context, () => data);
    const cleanups = [];

    const registerFavCommand = () => {
        const parser = context.SlashCommandParser;
        const commandFactory = context.SlashCommand;
        if (typeof parser?.addCommandObject !== 'function' || typeof commandFactory?.fromProps !== 'function') return;
        try {
            parser.addCommandObject(commandFactory.fromProps({
                name: 'fav',
                helpString: '打开全局消息收藏夹。',
                callback: () => {
                    ui.open();
                    return '已打开消息收藏夹';
                },
            }));
        } catch (error) {
            console.warn(`[${EXTENSION_KEY}] /fav registration skipped`, error);
        }
    };
    registerFavCommand();

    const onChatClick = async event => {
        const button = event.target.closest('[data-st-fav-action="toggle"]');
        if (!button) return;
        const messageElement = button.closest('.mes');
        const source = messageElement && getCurrentSource(context, messageElement);
        if (!source) return;
        event.preventDefault();
        event.stopPropagation();

        const existing = findFavoriteBySource(data.items, source);
        if (existing) {
            if (!await askConfirm('这条消息已收藏。确认取消收藏？')) return;
            data = removeFavorite(context, data, existing.id);
        } else {
            const favorite = createFavorite(context, messageElement, source, data);
            if (!favorite) return;
            ({ data } = addFavorite(context, data, favorite));
        }
        syncAllButtons(context, data);
        ui.refresh();
    };

    const onChatKeydown = event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const button = event.target.closest('[data-st-fav-action="toggle"]');
        if (button) button.click();
    };

    let boundChat = null;
    const bindChatListeners = () => {
        const chat = document.querySelector(CHAT_SELECTOR);
        if (!chat || chat === boundChat) return;
        if (boundChat) {
            boundChat.removeEventListener('click', onChatClick);
            boundChat.removeEventListener('keydown', onChatKeydown);
        }
        chat.addEventListener('click', onChatClick);
        chat.addEventListener('keydown', onChatKeydown);
        boundChat = chat;
    };
    bindChatListeners();

    const refresh = () => {
        bindChatListeners();
        data = loadData(context);
        syncAllButtons(context, data);
        ui.refresh();
        ui.updateEntries();
    };

    const subscribe = name => {
        if (!name || typeof context.eventSource?.on !== 'function') return;
        context.eventSource.on(name, refresh);
        cleanups.push(() => {
            context.eventSource?.removeListener?.(name, refresh);
            context.eventSource?.off?.(name, refresh);
        });
    };

    const events = context.eventTypes ?? context.event_types ?? {};
    subscribe(events.APP_READY);
    subscribe(events.CHAT_CHANGED);
    subscribe(events.CHARACTER_MESSAGE_RENDERED);
    subscribe(events.USER_MESSAGE_RENDERED);
    subscribe(events.MESSAGE_SWIPED);
    subscribe(events.MORE_MESSAGES_LOADED);

    refresh();

    return {
        open: () => ui.open(),
        refresh,
        destroy: () => {
            if (boundChat) {
                boundChat.removeEventListener('click', onChatClick);
                boundChat.removeEventListener('keydown', onChatKeydown);
                boundChat = null;
            }
            for (const cleanup of cleanups) {
                try { cleanup(); } catch {}
            }
            ui.destroy?.();
        },
    };
}

/**
 * 启动或热重载插件实例
 */
export function bootstrapSTFavorites() {
    try {
        if (
            typeof window !== 'undefined' &&
            window.STFavorites &&
            typeof window.STFavorites.destroy === 'function'
        ) {
            window.STFavorites.destroy();
        }

        const runtime = initialize();

        const instance = {
            version: EXTENSION_VERSION,
            open: runtime.open,
            refresh: runtime.refresh,
            reload: () => {
                if (typeof window !== 'undefined' && typeof window.STFavoritesReload === 'function') {
                    return window.STFavoritesReload();
                }
                return bootstrapSTFavorites();
            },
            destroy: () => {
                runtime.destroy();
                console.log(`[${EXTENSION_KEY}] Plugin destroyed`);
            },
        };

        if (typeof window !== 'undefined') {
            window.STFavorites = instance;
        }

        console.log(`[${EXTENSION_KEY}] Extension initialized successfully`);
        return instance;
    } catch (error) {
        console.error(`[${EXTENSION_KEY}] initialization failed`, error);
        return null;
    }
}
