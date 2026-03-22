// ==UserScript==
// @name         Torr9 Chat - Shoutbox 2.0
// @namespace    https://github.com/SaltedButch/torr9-scripting
// @version      2.17
// @description  Blacklist, mise en avant, mentions, stats et réglages live pour la shoutbox Torr9
// @author       Butchered
// @match        https://torr9.net/*
// @grant        none
// @homepageURL  https://github.com/SaltedButch/torr9-scripting/blob/main/src/userscripts/blacklist-shoutbox.user.js
// @supportURL   https://github.com/SaltedButch/torr9-scripting/issues
// @updateURL    https://raw.githubusercontent.com/SaltedButch/torr9-scripting/userscripts/blacklist-shoutbox.meta.js
// @downloadURL  https://raw.githubusercontent.com/SaltedButch/torr9-scripting/userscripts/blacklist-shoutbox.user.js
// ==/UserScript==
(function () {
    'use strict';

    const STORAGE_KEY_USERS = 'tm_hidden_shout_users_torr9';
    const STORAGE_KEY_POS_HOME = 'tm_torr9_stats_box_position_home';
    const STORAGE_KEY_POS_CHAT = 'tm_torr9_stats_box_position_chat';
    const STORAGE_KEY_STATS_COLLAPSED_HOME = 'tm_torr9_stats_box_collapsed_home';
    const STORAGE_KEY_STATS_COLLAPSED_CHAT = 'tm_torr9_stats_box_collapsed_chat';
    const STORAGE_KEY_STATS_HIDDEN_HOME = 'tm_torr9_stats_box_hidden_home';
    const STORAGE_KEY_STATS_HIDDEN_CHAT = 'tm_torr9_stats_box_hidden_chat';
    const STORAGE_KEY_DEBUG = 'tm_torr9_debug_mode';
    const STORAGE_KEY_HOME_COLLAPSED = 'tm_torr9_home_chat_collapsed';
    const STORAGE_KEY_HIGHLIGHTED_USERS = 'tm_highlighted_shout_users_torr9';
    const STORAGE_KEY_MENTION_SETTINGS = 'tm_torr9_mention_highlight_settings';
    const STORAGE_KEY_CHAT_FONT_SCALE = 'tm_torr9_chat_font_scale';
    const PANEL_ID = 'tm-torr9-chat-stats';
    const MODAL_ID = 'tm-torr9-chat-modal';
    const OVERLAY_ID = 'tm-torr9-chat-overlay';
    const TOAST_ID = 'tm-torr9-chat-toast';
    const HOME_COLLAPSE_BUTTON_ID = 'tm-home-chat-collapse-toggle';
    const DEFAULT_HIGHLIGHT_COLOR = '#f59e0b';
    const DEFAULT_MENTION_COLOR = '#22c55e';
    const DEFAULT_MENTION_BLINK_SECONDS = 6;
    const DEFAULT_MENTION_KEEP_HIGHLIGHT = true;
    const DEFAULT_CHAT_FONT_SCALE = 1;
    const MIN_CHAT_FONT_SCALE = 0.85;
    const MAX_CHAT_FONT_SCALE = 1.7;
    const MAX_STATS_RIGHT_PERCENT = 100;
    const MAX_STATS_BOTTOM_PERCENT = 95;
    const MENTION_STYLE_ID = 'tm-torr9-mention-style';

    const DEFAULT_POSITION = {
        rightPercent: 2,
        bottomPercent: 2
    };

    let observer = null;
    let statsBox = null;
    let statsContent = null;
    let routeWatcher = null;
    let modalOpen = false;
    let debugMode = loadDebugMode();
    let homeChatCollapsed = loadHomeChatCollapsed();
    let statsCollapsed = loadStatsCollapsed();
    let statsHidden = loadStatsHidden();
    let statsUpdateFrame = null;
    let toastHideTimer = null;
    let mentionSettings = loadMentionSettings();
    let chatFontScale = loadChatFontScale();

    const hiddenUsers = loadHiddenUsers();
    const highlightedUsers = loadHighlightedUsers();
    const sessionBlockedCounts = {};
    const alreadyCountedMessages = new WeakSet();
    const mentionBlinkStates = new WeakMap();

    function isChatPage() {
        return location.pathname.startsWith('/chat');
    }

    function isHomePage() {
        return location.pathname === '/' || location.pathname === '';
    }

    function isSupportedPage() {
        return isChatPage() || isHomePage();
    }

    function getCurrentPageType() {
        if (isChatPage()) return 'chat';
        if (isHomePage()) return 'home';
        return 'other';
    }

    function getCurrentPageLabel() {
        return isChatPage() ? 'Chat' : 'Accueil';
    }

    function getPositionStorageKey() {
        return isChatPage() ? STORAGE_KEY_POS_CHAT : STORAGE_KEY_POS_HOME;
    }

    function getStatsCollapsedStorageKey() {
        return isChatPage() ? STORAGE_KEY_STATS_COLLAPSED_CHAT : STORAGE_KEY_STATS_COLLAPSED_HOME;
    }

    function getStatsHiddenStorageKey() {
        return isChatPage() ? STORAGE_KEY_STATS_HIDDEN_CHAT : STORAGE_KEY_STATS_HIDDEN_HOME;
    }

    function loadHiddenUsers() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
            if (!Array.isArray(parsed)) return new Set();
            return new Set(parsed.map(normalizeName).filter(Boolean));
        } catch (e) {
            return new Set();
        }
    }

    function saveHiddenUsers() {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify([...hiddenUsers]));
    }

    function loadDebugMode() {
        try {
            return localStorage.getItem(STORAGE_KEY_DEBUG) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveDebugMode(value) {
        debugMode = !!value;
        localStorage.setItem(STORAGE_KEY_DEBUG, debugMode ? '1' : '0');
    }

    function loadHomeChatCollapsed() {
        try {
            return localStorage.getItem(STORAGE_KEY_HOME_COLLAPSED) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveHomeChatCollapsed(value) {
        homeChatCollapsed = !!value;
        localStorage.setItem(STORAGE_KEY_HOME_COLLAPSED, homeChatCollapsed ? '1' : '0');
    }

    function loadStatsCollapsed() {
        try {
            return localStorage.getItem(getStatsCollapsedStorageKey()) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveStatsCollapsed(value) {
        statsCollapsed = !!value;
        localStorage.setItem(getStatsCollapsedStorageKey(), statsCollapsed ? '1' : '0');
    }

    function loadStatsHidden() {
        try {
            return localStorage.getItem(getStatsHiddenStorageKey()) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveStatsHidden(value) {
        statsHidden = !!value;
        localStorage.setItem(getStatsHiddenStorageKey(), statsHidden ? '1' : '0');
    }

    function loadHighlightedUsers() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_HIGHLIGHTED_USERS) || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

            return Object.fromEntries(
                Object.entries(parsed)
                    .map(([username, color]) => [normalizeName(username), normalizeHexColor(color)])
                    .filter(([username]) => !!username)
            );
        } catch (e) {
            return {};
        }
    }

    function saveHighlightedUsers() {
        localStorage.setItem(STORAGE_KEY_HIGHLIGHTED_USERS, JSON.stringify(highlightedUsers));
    }

    function loadMentionSettings() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_MENTION_SETTINGS) || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {
                    username: '',
                    color: DEFAULT_MENTION_COLOR,
                    blinkSeconds: DEFAULT_MENTION_BLINK_SECONDS,
                    keepHighlightAfterBlink: DEFAULT_MENTION_KEEP_HIGHLIGHT
                };
            }

            return {
                username: normalizeName(parsed.username || ''),
                color: normalizeHexColor(parsed.color, DEFAULT_MENTION_COLOR),
                blinkSeconds: clamp(Number(parsed.blinkSeconds) || 0, 0, 30),
                keepHighlightAfterBlink: parsed.keepHighlightAfterBlink !== false
            };
        } catch (e) {
            return {
                username: '',
                color: DEFAULT_MENTION_COLOR,
                blinkSeconds: DEFAULT_MENTION_BLINK_SECONDS,
                keepHighlightAfterBlink: DEFAULT_MENTION_KEEP_HIGHLIGHT
            };
        }
    }

    function saveMentionSettings(nextSettings) {
        mentionSettings = {
            username: normalizeName(nextSettings?.username || ''),
            color: normalizeHexColor(nextSettings?.color, DEFAULT_MENTION_COLOR),
            blinkSeconds: clamp(Number(nextSettings?.blinkSeconds) || 0, 0, 30),
            keepHighlightAfterBlink: nextSettings?.keepHighlightAfterBlink !== false
        };

        localStorage.setItem(STORAGE_KEY_MENTION_SETTINGS, JSON.stringify(mentionSettings));
    }

    function clampChatFontScale(value) {
        return clamp(value, MIN_CHAT_FONT_SCALE, MAX_CHAT_FONT_SCALE);
    }

    function loadChatFontScale() {
        try {
            const rawValue = localStorage.getItem(STORAGE_KEY_CHAT_FONT_SCALE);
            if (!rawValue) return DEFAULT_CHAT_FONT_SCALE;

            const parsed = Number(String(rawValue).trim().replace(',', '.'));
            if (Number.isNaN(parsed)) return DEFAULT_CHAT_FONT_SCALE;
            return clampChatFontScale(parsed);
        } catch (e) {
            return DEFAULT_CHAT_FONT_SCALE;
        }
    }

    function saveChatFontScale(value) {
        chatFontScale = clampChatFontScale(value);
        localStorage.setItem(STORAGE_KEY_CHAT_FONT_SCALE, String(chatFontScale));
    }

    function formatChatFontScalePercent(value = chatFontScale) {
        return String(Math.round(clampChatFontScale(value) * 100));
    }

    function parseChatFontScalePercentInput(value, fallback = DEFAULT_CHAT_FONT_SCALE) {
        const num = Number(String(value).trim().replace(',', '.'));
        if (Number.isNaN(num)) return clampChatFontScale(fallback);
        return clampChatFontScale(num / 100);
    }

    function scalePixels(basePx, scale = chatFontScale) {
        const scaled = Math.round(basePx * clampChatFontScale(scale) * 10) / 10;
        return `${scaled}px`;
    }

    function loadPosition() {
        try {
            const saved = JSON.parse(localStorage.getItem(getPositionStorageKey()) || 'null');
            if (
                saved &&
                typeof saved.rightPercent === 'number' &&
                typeof saved.bottomPercent === 'number'
            ) {
                return {
                    rightPercent: clamp(saved.rightPercent, 0, MAX_STATS_RIGHT_PERCENT),
                    bottomPercent: clamp(saved.bottomPercent, 0, MAX_STATS_BOTTOM_PERCENT)
                };
            }
        } catch (e) {}
        return { ...DEFAULT_POSITION };
    }

    function savePosition(position) {
        localStorage.setItem(getPositionStorageKey(), JSON.stringify({
            rightPercent: clamp(position.rightPercent, 0, MAX_STATS_RIGHT_PERCENT),
            bottomPercent: clamp(position.bottomPercent, 0, MAX_STATS_BOTTOM_PERCENT)
        }));
    }

    function resetPosition() {
        localStorage.setItem(getPositionStorageKey(), JSON.stringify(DEFAULT_POSITION));
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeHexColor(value, fallback = DEFAULT_HIGHLIGHT_COLOR) {
        const raw = String(value || '').trim();

        if (/^#[0-9a-f]{3}$/i.test(raw)) {
            return `#${raw.slice(1).split('').map((char) => char + char).join('').toLowerCase()}`;
        }

        if (/^#[0-9a-f]{6}$/i.test(raw)) {
            return raw.toLowerCase();
        }

        return fallback;
    }

    function hexToRgb(hex) {
        const color = normalizeHexColor(hex);
        return {
            r: parseInt(color.slice(1, 3), 16),
            g: parseInt(color.slice(3, 5), 16),
            b: parseInt(color.slice(5, 7), 16)
        };
    }

    function hexToRgba(hex, alpha) {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
    }

    function normalizeName(name) {
        return (name || '').trim().toLowerCase();
    }

    function formatNumberInputValue(value, max = MAX_STATS_BOTTOM_PERCENT) {
        return String(clamp(Number(value) || 0, 0, max));
    }

    function parsePercentInput(value, fallback, max = MAX_STATS_BOTTOM_PERCENT) {
        const num = Number(String(value).trim().replace(',', '.'));
        if (Number.isNaN(num)) return fallback;
        return clamp(num, 0, max);
    }

    function parseBlinkSecondsInput(value, fallback = DEFAULT_MENTION_BLINK_SECONDS) {
        const num = Number(String(value).trim().replace(',', '.'));
        if (Number.isNaN(num)) return clamp(fallback, 0, 30);
        return clamp(num, 0, 30);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (m) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[m];
        });
    }

    function getHomepageChatContainer() {
        const headers = Array.from(document.querySelectorAll('span.font-medium.text-white.text-sm'));
        for (const span of headers) {
            if (span.textContent.trim() === 'Chat') {
                return span.closest('.bg-zinc-950');
            }
        }
        return null;
    }

    function getActiveChatRoot() {
        if (isChatPage()) return document.body;
        if (isHomePage()) return getHomepageMessagesRoot();
        return null;
    }

    function getHomepageChatHeader(container = null) {
        const chatContainer = container || getHomepageChatContainer();
        if (!(chatContainer instanceof HTMLElement)) return null;
        return chatContainer.firstElementChild instanceof HTMLElement
            ? chatContainer.firstElementChild
            : null;
    }

    function getHomepageMessagesRoot(container = null) {
        const chatContainer = container || getHomepageChatContainer();
        if (!(chatContainer instanceof HTMLElement)) return null;
        return chatContainer.querySelector('.custom-scrollbar');
    }

    function applyMessageTypography(messageEl, scale = chatFontScale) {
        if (!(messageEl instanceof HTMLElement)) return;

        const safeScale = clampChatFontScale(scale);

        if (isChatPage()) {
            const userButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline button[type="button"]');
            const textBlock = messageEl.querySelector(':scope > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words');
            const metaSpans = messageEl.querySelectorAll(':scope > .flex-1.min-w-0 > .flex.items-baseline span');

            if (userButton instanceof HTMLElement) {
                userButton.style.fontSize = scalePixels(14, safeScale);
                userButton.style.lineHeight = '1.35';
            }

            metaSpans.forEach((span) => {
                if (span instanceof HTMLElement) {
                    span.style.fontSize = scalePixels(12, safeScale);
                    span.style.lineHeight = '1.35';
                }
            });

            if (textBlock instanceof HTMLElement) {
                textBlock.style.fontSize = scalePixels(14, safeScale);
                textBlock.style.lineHeight = safeScale >= 1.2 ? '1.6' : '1.5';
            }

            return;
        }

        if (isHomePage()) {
            const userSpan = messageEl.querySelector('span.text-xs.font-bold');
            const textBlock = messageEl.querySelector(':scope > .flex-1.min-w-0 > p.break-words.leading-snug');
            const metaSpans = messageEl.querySelectorAll(':scope > .flex-1.min-w-0 > .flex.items-center span:not(.text-xs.font-bold)');

            if (userSpan instanceof HTMLElement) {
                userSpan.style.fontSize = scalePixels(12, safeScale);
                userSpan.style.lineHeight = '1.35';
            }

            metaSpans.forEach((span) => {
                if (span instanceof HTMLElement) {
                    span.style.fontSize = scalePixels(11, safeScale);
                    span.style.lineHeight = '1.35';
                }
            });

            if (textBlock instanceof HTMLElement) {
                textBlock.style.fontSize = scalePixels(13, safeScale);
                textBlock.style.lineHeight = safeScale >= 1.2 ? '1.6' : '1.5';
            }
        }
    }

    function applyChatFontScale(scale = chatFontScale) {
        const root = getActiveChatRoot();
        if (!root) return;

        root.querySelectorAll('div').forEach((el) => {
            if (isChatMessage(el)) {
                applyMessageTypography(el, scale);
            }
        });
    }

    function getUsernameFromMessage(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return null;

        if (isChatPage()) {
            const userBtn = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline button[type="button"]');
            if (!userBtn) return null;
            return userBtn.textContent.trim();
        }

        if (isHomePage()) {
            const userSpan = messageEl.querySelector('span.text-xs.font-bold');
            if (!userSpan) return null;
            return userSpan.textContent.trim();
        }

        return null;
    }

    function isChatMessage(el) {
        if (!(el instanceof HTMLElement)) return false;

        // On ne veut matcher que le conteneur principal du message,
        // pas les div internes.
        const isMessageContainer =
              el.classList.contains('group') &&
              el.classList.contains('relative') &&
              el.classList.contains('flex') &&
              el.classList.contains('items-start');

        if (!isMessageContainer) return false;

        if (isChatPage()) {
            const hasTextBlock = !!el.querySelector(':scope > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words');
            const hasHeaderWithUser = !!el.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline button[type="button"]');
            const hasAvatarSlot = !!el.querySelector(':scope > .flex-shrink-0.w-7, :scope > .flex-shrink-0.w-7.md\\:w-9');

            // Ici on accepte :
            // - message complet (avatar + pseudo + texte)
            // - message de suite (slot avatar vide + texte)
            return hasTextBlock && hasAvatarSlot;
        }

        if (isHomePage()) {
            const hasTextBlock = !!el.querySelector(':scope > .flex-1.min-w-0 > p.break-words.leading-snug');
            const hasAvatarSlot = !!el.querySelector(':scope > .flex-shrink-0.w-6');

            return hasTextBlock && hasAvatarSlot;
        }

        return false;
    }

    function incrementBlockedCount(username, messageEl) {
        if (alreadyCountedMessages.has(messageEl)) return;
        alreadyCountedMessages.add(messageEl);

        if (!sessionBlockedCounts[username]) {
            sessionBlockedCounts[username] = 0;
        }

        sessionBlockedCounts[username]++;
    }

    function buildStatsHtml() {
        const entries = Object.entries(sessionBlockedCounts)
            .filter(([user]) => hiddenUsers.has(user))
            .sort((a, b) => b[1] - a[1]);

        const total = entries.reduce((sum, [, count]) => sum + count, 0);

        if (statsCollapsed) {
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                    <div style="font-weight:700;font-size:13px;color:#fff;">
                        Messages bloqués
                    </div>
                    <button type="button" data-tm-action="toggle-stats-collapsed" title="Développer la stats box" aria-label="Développer la stats box" style="
                        border:none;
                        background:#27272a;
                        color:#d4d4d8;
                        border-radius:8px;
                        width:24px;
                        height:24px;
                        display:inline-flex;
                        align-items:center;
                        justify-content:center;
                        cursor:pointer;
                        font-size:15px;
                        font-weight:600;
                        line-height:1;
                    ">+</button>
                </div>

                <div style="font-size:12px;color:#cfcfcf;">
                    Total session : <span style="color:#fff;font-weight:700;">${total}</span>
                </div>

                <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#9ca3af;line-height:1.45;">
                    <p>Ctrl+Alt+C : paramètres · Alt+clic pseudo : pour blacklister</p>
                    <p>${debugMode ? 'toggle · Debug ON' : ''}</p>
                </div>
            `;
        }

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;color:#fff;">
                    Messages bloqués
                </div>
                <button type="button" data-tm-action="toggle-stats-collapsed" title="Réduire la stats box" aria-label="Réduire la stats box" style="
                    border:none;
                    background:#27272a;
                    color:#d4d4d8;
                    border-radius:8px;
                    width:24px;
                    height:24px;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    cursor:pointer;
                    font-size:15px;
                    font-weight:600;
                    line-height:1;
                ">-</button>
            </div>

            <div style="font-size:12px;color:#cfcfcf;margin-bottom:8px;">
                Total session : <span style="color:#fff;font-weight:700;">${total}</span>
                <span style="display:block;margin-top:4px;color:#a1a1aa;">Blacklist : ${hiddenUsers.size} pseudo${hiddenUsers.size > 1 ? 's' : ''}</span>
            </div>
        `;

        if (entries.length === 0) {
            html += `
                <div style="font-size:12px;color:#9ca3af;">
                    Aucun message bloqué pour l’instant
                </div>
            `;
        } else {
            html += `<div style="display:flex;flex-direction:column;gap:6px;">`;

            for (const [user, count] of entries) {
                html += `
                    <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;">
                        <span style="color:#93c5fd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(user)}</span>
                        <span style="color:#fff;font-weight:700;">${count}</span>
                    </div>
                `;
            }

            html += `</div>`;
        }

        html += `
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#9ca3af;line-height:1.45;">
                <p>Ctrl+Alt+C : paramètres · Alt+clic pseudo : pour blacklister</p>
                <p>${debugMode ? 'toggle · Debug ON' : ''}</p>
            </div>
        `;

        return html;
    }

    function scheduleStatsBoxUpdate() {
        if (!statsContent || statsUpdateFrame !== null) return;

        statsUpdateFrame = window.requestAnimationFrame(() => {
            statsUpdateFrame = null;
            updateStatsBox();
        });
    }

    function escapeRegExp(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function updateStatsBox() {
        if (!statsContent) return;
        statsContent.innerHTML = buildStatsHtml();
    }

    function getOrCreateToast() {
        let toast = document.getElementById(TOAST_ID);
        if (toast) return toast;
        if (!document.body) return null;

        toast = document.createElement('div');
        toast.id = TOAST_ID;
        toast.style.position = 'fixed';
        toast.style.left = '50%';
        toast.style.bottom = '18px';
        toast.style.transform = 'translate(-50%, 12px)';
        toast.style.zIndex = '1000002';
        toast.style.maxWidth = 'min(420px, calc(100vw - 24px))';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '12px';
        toast.style.background = 'rgba(24,24,27,0.96)';
        toast.style.border = '1px solid rgba(255,255,255,0.08)';
        toast.style.boxShadow = '0 14px 30px rgba(0,0,0,0.35)';
        toast.style.color = '#fff';
        toast.style.font = '600 12px/1.4 Inter, Arial, sans-serif';
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
        toast.style.transition = 'opacity 140ms ease, transform 140ms ease';

        document.body.appendChild(toast);
        return toast;
    }

    function removeToast() {
        if (toastHideTimer) {
            clearTimeout(toastHideTimer);
            toastHideTimer = null;
        }

        const toast = document.getElementById(TOAST_ID);
        if (toast) toast.remove();
    }

    function showToast(message, isError = false) {
        const toast = getOrCreateToast();
        if (!toast) return;

        toast.textContent = message;
        toast.style.color = isError ? '#fecaca' : '#fff';
        toast.style.borderColor = isError ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)';
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 0)';

        if (toastHideTimer) clearTimeout(toastHideTimer);
        toastHideTimer = window.setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 12px)';
            toastHideTimer = null;
        }, 2200);
    }

    function ensureMentionAnimationStyle() {
        if (document.getElementById(MENTION_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = MENTION_STYLE_ID;
        style.textContent = `
            @keyframes tm-torr9-mention-pulse {
                0%, 100% {
                    background: var(--tm-mention-bg-soft);
                    box-shadow:
                        inset 3px 0 0 var(--tm-mention-color),
                        0 0 0 0 var(--tm-mention-glow-soft);
                    filter: brightness(1) saturate(1);
                }
                50% {
                    background: var(--tm-mention-bg-strong);
                    box-shadow:
                        inset 3px 0 0 var(--tm-mention-color),
                        0 0 0 3px var(--tm-mention-glow-strong),
                        0 0 24px -4px var(--tm-mention-glow-strong);
                    filter: brightness(1.18) saturate(1.45);
                }
            }
        `;

        document.head.appendChild(style);
    }

    function updateHomeCollapseButton() {
        const button = document.getElementById(HOME_COLLAPSE_BUTTON_ID);
        if (!(button instanceof HTMLButtonElement)) return;

        button.textContent = homeChatCollapsed ? 'Afficher' : 'Cacher';
        button.title = homeChatCollapsed
            ? 'Réafficher la shoutbox d’accueil'
            : 'Masquer la shoutbox d’accueil';
        button.setAttribute('aria-pressed', homeChatCollapsed ? 'true' : 'false');
    }

    function ensureHomepageCollapseButton() {
        if (!isHomePage()) return;

        const header = getHomepageChatHeader();
        if (!header) return;

        const rightArea = header.lastElementChild;
        if (!(rightArea instanceof HTMLElement)) return;

        rightArea.style.display = 'flex';
        rightArea.style.alignItems = 'center';
        rightArea.style.gap = '8px';

        let button = document.getElementById(HOME_COLLAPSE_BUTTON_ID);
        if (!(button instanceof HTMLButtonElement)) {
            button = document.createElement('button');
            button.id = HOME_COLLAPSE_BUTTON_ID;
            button.type = 'button';
            button.style.border = '1px solid rgba(255,255,255,0.08)';
            button.style.background = 'rgba(39,39,42,0.95)';
            button.style.color = '#e4e4e7';
            button.style.borderRadius = '999px';
            button.style.padding = '4px 10px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '11px';
            button.style.fontWeight = '600';
            button.style.lineHeight = '1.2';

            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleHomepageChatCollapsed();
            });
        }

        if (button.parentElement !== rightArea) {
            rightArea.appendChild(button);
        }

        updateHomeCollapseButton();
    }

    function applyHomepageChatCollapsedState() {
        if (!isHomePage()) return;

        const container = getHomepageChatContainer();
        if (!(container instanceof HTMLElement)) return;

        ensureHomepageCollapseButton();

        const sections = Array.from(container.children).slice(1);

        if (homeChatCollapsed) {
            container.dataset.tmHomeCollapsed = '1';
            container.style.height = 'auto';
            container.style.minHeight = '0';
            container.style.maxHeight = 'none';
            container.style.overflow = 'hidden';

            sections.forEach((section) => {
                if (section instanceof HTMLElement) {
                    section.style.display = 'none';
                }
            });
        } else {
            container.dataset.tmHomeCollapsed = '0';
            container.style.removeProperty('height');
            container.style.removeProperty('min-height');
            container.style.removeProperty('max-height');
            container.style.removeProperty('overflow');

            sections.forEach((section) => {
                if (section instanceof HTMLElement) {
                    section.style.removeProperty('display');
                }
            });
        }

        updateHomeCollapseButton();
    }

    function toggleHomepageChatCollapsed(forceValue = !homeChatCollapsed) {
        saveHomeChatCollapsed(forceValue);
        applyHomepageChatCollapsedState();

        if (isHomePage()) {
            if (homeChatCollapsed) {
                stopObserver();
            } else {
                processAllMessages();
                startObserver();
            }
        }

        showToast(homeChatCollapsed ? 'Shoutbox d’accueil repliée.' : 'Shoutbox d’accueil réaffichée.');
    }

    function applyBoxPosition(position = null) {
        if (!statsBox) return;
        const pos = position || loadPosition();
        statsBox.style.right = `${clamp(pos.rightPercent, 0, MAX_STATS_RIGHT_PERCENT)}%`;
        statsBox.style.bottom = `${clamp(pos.bottomPercent, 0, MAX_STATS_BOTTOM_PERCENT)}%`;
    }

    function applyStatsBoxCollapsedState() {
        if (!statsBox) return;
        statsBox.style.width = statsCollapsed ? '220px' : '240px';
    }

    function applyStatsBoxVisibilityState() {
        if (!statsBox) return;
        statsBox.style.display = statsHidden ? 'none' : 'block';
    }

    function createStatsBox() {
        if (!isSupportedPage()) return;

        const existing = document.getElementById(PANEL_ID);
        if (existing) {
            statsBox = existing;
            statsContent = existing.firstElementChild;
            bindStatsBoxEvents();
            applyStatsBoxCollapsedState();
            applyStatsBoxVisibilityState();
            applyBoxPosition();
            updateStatsBox();
            return;
        }

        statsBox = document.createElement('div');
        statsBox.id = PANEL_ID;
        statsBox.style.position = 'fixed';
        statsBox.style.zIndex = '999999';
        statsBox.style.width = '240px';
        statsBox.style.maxWidth = 'calc(100vw - 24px)';
        statsBox.style.maxHeight = '50vh';
        statsBox.style.overflowY = 'auto';
        statsBox.style.padding = '12px';
        statsBox.style.borderRadius = '14px';
        statsBox.style.background = 'rgba(24, 24, 27, 0.92)';
        statsBox.style.backdropFilter = 'blur(8px)';
        statsBox.style.border = '1px solid rgba(255,255,255,0.08)';
        statsBox.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
        statsBox.style.fontFamily = 'Inter, Arial, sans-serif';

        statsContent = document.createElement('div');
        statsBox.appendChild(statsContent);

        document.body.appendChild(statsBox);

        bindStatsBoxEvents();
        applyStatsBoxCollapsedState();
        applyStatsBoxVisibilityState();
        applyBoxPosition();
        updateStatsBox();
    }

    function removeStatsBox() {
        if (statsUpdateFrame !== null) {
            window.cancelAnimationFrame(statsUpdateFrame);
            statsUpdateFrame = null;
        }

        const existing = document.getElementById(PANEL_ID);
        if (existing) existing.remove();
        statsBox = null;
        statsContent = null;
    }

    function bindStatsBoxEvents() {
        if (!statsBox || statsBox.dataset.tmBound === '1') return;

        statsBox.dataset.tmBound = '1';
        statsBox.addEventListener('click', handleStatsBoxActionClick);
    }

    function getLogicalUsername(messageEl) {
        const direct = getUsernameFromMessage(messageEl);
        if (direct) return direct;

        let prev = messageEl.previousElementSibling;
        while (prev) {
            if (isChatMessage(prev)) {
                const prevUser = getUsernameFromMessage(prev);
                if (prevUser) return prevUser;
            }
            prev = prev.previousElementSibling;
        }

        return null;
    }

    function clearDebugStyle(messageEl) {
        messageEl.style.removeProperty('background');
        messageEl.style.removeProperty('outline');
        messageEl.style.removeProperty('box-shadow');
        messageEl.style.removeProperty('animation');
        messageEl.style.removeProperty('filter');
        messageEl.style.removeProperty('--tm-mention-color');
        messageEl.style.removeProperty('--tm-mention-glow-soft');
        messageEl.style.removeProperty('--tm-mention-glow-strong');
        messageEl.style.removeProperty('--tm-mention-bg-soft');
        messageEl.style.removeProperty('--tm-mention-bg-strong');
        messageEl.removeAttribute('title');
        messageEl.removeAttribute('data-tm-debug-user');
        messageEl.removeAttribute('data-tm-highlight-user');
        messageEl.removeAttribute('data-tm-mention-highlight');

        const blinkState = mentionBlinkStates.get(messageEl);
        if (blinkState?.timeoutId) {
            clearTimeout(blinkState.timeoutId);
            mentionBlinkStates.delete(messageEl);
        }
    }

    function applyHighlightStyle(messageEl, username, color) {
        messageEl.style.removeProperty('display');
        messageEl.style.background = hexToRgba(color, 0.14);
        messageEl.style.outline = `1px solid ${hexToRgba(color, 0.72)}`;
        messageEl.style.boxShadow = `inset 3px 0 0 ${color}`;
        messageEl.setAttribute('data-tm-highlight-user', username);
        messageEl.title = `Mis en avant : ${username}`;
    }

    function applyMentionHighlightStyle(messageEl) {
        const color = normalizeHexColor(mentionSettings.color, DEFAULT_MENTION_COLOR);
        const blinkSeconds = parseBlinkSecondsInput(mentionSettings.blinkSeconds, DEFAULT_MENTION_BLINK_SECONDS);
        const keepHighlightAfterBlink = mentionSettings.keepHighlightAfterBlink !== false;
        const signature = `${color}|${blinkSeconds}|${keepHighlightAfterBlink ? 'keep' : 'off'}`;
        const existingState = mentionBlinkStates.get(messageEl);

        ensureMentionAnimationStyle();

        messageEl.style.removeProperty('display');
        messageEl.style.background = hexToRgba(color, 0.18);
        messageEl.style.outline = `1px solid ${hexToRgba(color, 0.82)}`;
        messageEl.style.boxShadow = `inset 3px 0 0 ${color}`;
        messageEl.style.setProperty('--tm-mention-color', color);
        messageEl.style.setProperty('--tm-mention-glow-soft', hexToRgba(color, 0.22));
        messageEl.style.setProperty('--tm-mention-glow-strong', hexToRgba(color, 0.58));
        messageEl.style.setProperty('--tm-mention-bg-soft', hexToRgba(color, 0.06));
        messageEl.style.setProperty('--tm-mention-bg-strong', hexToRgba(color, 0.32));
        messageEl.setAttribute('data-tm-mention-highlight', mentionSettings.username);
        messageEl.title = `Mention @${mentionSettings.username}`;

        if (blinkSeconds <= 0) {
            messageEl.style.removeProperty('animation');
            if (existingState?.timeoutId) clearTimeout(existingState.timeoutId);
            mentionBlinkStates.set(messageEl, { signature, timeoutId: null });
            return;
        }

        if (existingState?.signature === signature) return;
        if (existingState?.timeoutId) clearTimeout(existingState.timeoutId);

        messageEl.style.animation = 'tm-torr9-mention-pulse 0.9s ease-in-out infinite';

        const timeoutId = window.setTimeout(() => {
            messageEl.style.removeProperty('animation');

            if (keepHighlightAfterBlink) {
                messageEl.style.background = hexToRgba(color, 0.18);
                messageEl.style.outline = `1px solid ${hexToRgba(color, 0.82)}`;
                messageEl.style.boxShadow = `inset 3px 0 0 ${color}`;
                messageEl.style.removeProperty('filter');
                mentionBlinkStates.set(messageEl, { signature, timeoutId: null });
                return;
            }

            messageEl.style.removeProperty('background');
            messageEl.style.removeProperty('outline');
            messageEl.style.removeProperty('box-shadow');
            messageEl.style.removeProperty('filter');
            messageEl.style.removeProperty('--tm-mention-color');
            messageEl.style.removeProperty('--tm-mention-glow-soft');
            messageEl.style.removeProperty('--tm-mention-glow-strong');
            messageEl.style.removeProperty('--tm-mention-bg-soft');
            messageEl.style.removeProperty('--tm-mention-bg-strong');
            messageEl.removeAttribute('title');
            messageEl.removeAttribute('data-tm-mention-highlight');
            mentionBlinkStates.set(messageEl, { signature, timeoutId: null });
        }, blinkSeconds * 1000);

        mentionBlinkStates.set(messageEl, { signature, timeoutId });
    }

    function hideOrShowMessage(messageEl) {
        applyMessageTypography(messageEl);

        const username = getLogicalUsername(messageEl);

        if (!username) {
            messageEl.style.removeProperty('display');
            clearDebugStyle(messageEl);
            return;
        }

        const normalized = normalizeName(username);
        const highlightColor = highlightedUsers[normalized];
        const mentionsWatchedUser = messageMentionsWatchedUser(messageEl);

        if (hiddenUsers.has(normalized)) {
            incrementBlockedCount(normalized, messageEl);

            if (debugMode) {
                messageEl.style.removeProperty('display');
                messageEl.style.background = 'rgba(255, 0, 0, 0.14)';
                messageEl.style.outline = '1px solid rgba(255, 80, 80, 0.65)';
                messageEl.setAttribute('data-tm-debug-user', normalized);
                messageEl.title = `Bloqué détecté : ${normalized}`;
            } else {
                clearDebugStyle(messageEl);
                messageEl.style.display = 'none';
            }
        } else if (mentionsWatchedUser) {
            clearDebugStyle(messageEl);
            applyMentionHighlightStyle(messageEl);
        } else if (highlightColor) {
            clearDebugStyle(messageEl);
            applyHighlightStyle(messageEl, normalized, highlightColor);
        } else {
            messageEl.style.removeProperty('display');
            clearDebugStyle(messageEl);
        }
    }

    function processAllMessages() {
        if (isHomePage() && homeChatCollapsed) return;

        const root = getActiveChatRoot();
        if (!root) return;

        const allDivs = root.querySelectorAll('div');
        allDivs.forEach(el => {
            if (isChatMessage(el)) {
                hideOrShowMessage(el);
            }
        });

        scheduleStatsBoxUpdate();
    }

    function processNode(node) {
        if (isHomePage() && homeChatCollapsed) return;

        const root = getActiveChatRoot();
        if (!root) return;
        if (!(node instanceof HTMLElement)) return;
        if (node !== root && !root.contains(node) && node !== document.body) return;
        if (node.closest(`#${PANEL_ID}, #${MODAL_ID}, #${OVERLAY_ID}, #${TOAST_ID}`)) return;

        if (isChatMessage(node)) {
            hideOrShowMessage(node);
        }

        node.querySelectorAll?.('div').forEach(el => {
            if (isChatMessage(el)) {
                hideOrShowMessage(el);
            }
        });

        scheduleStatsBoxUpdate();
    }

    function addOrToggleUser(usernameRaw) {
        const username = normalizeName(usernameRaw);
        if (!username) return { ok: false, message: 'Pseudo vide.' };

        if (hiddenUsers.has(username)) {
            hiddenUsers.delete(username);
            saveHiddenUsers();
            processAllMessages();
            updateStatsBox();
            return { ok: true, message: `Utilisateur réaffiché : ${usernameRaw}` };
        } else {
            hiddenUsers.add(username);
            saveHiddenUsers();
            processAllMessages();
            updateStatsBox();
            return { ok: true, message: `Utilisateur masqué : ${usernameRaw}` };
        }
    }

    function addOrUpdateHighlightedUser(usernameRaw, colorRaw) {
        const username = normalizeName(usernameRaw);
        if (!username) return { ok: false, message: 'Pseudo vide.' };

        const color = normalizeHexColor(colorRaw);
        const hadHighlight = !!highlightedUsers[username];

        highlightedUsers[username] = color;
        saveHighlightedUsers();
        processAllMessages();
        updateStatsBox();

        return {
            ok: true,
            message: hadHighlight
                ? `Couleur mise a jour pour ${usernameRaw}`
                : `Utilisateur mis en avant : ${usernameRaw}`
        };
    }

    function removeHighlightedUser(usernameRaw) {
        const username = normalizeName(usernameRaw);
        if (!username) return { ok: false, message: 'Pseudo vide.' };
        if (!highlightedUsers[username]) return { ok: false, message: 'Pseudo non mis en avant.' };

        delete highlightedUsers[username];
        saveHighlightedUsers();
        processAllMessages();
        updateStatsBox();

        return { ok: true, message: `Mise en avant retiree : ${usernameRaw}` };
    }

    function updateMentionSettings(usernameRaw, colorRaw, blinkSecondsRaw, keepHighlightAfterBlinkRaw) {
        const username = normalizeName(usernameRaw);
        const color = normalizeHexColor(colorRaw, DEFAULT_MENTION_COLOR);
        const blinkSeconds = parseBlinkSecondsInput(blinkSecondsRaw, DEFAULT_MENTION_BLINK_SECONDS);
        const keepHighlightAfterBlink = !!keepHighlightAfterBlinkRaw;

        saveMentionSettings({ username, color, blinkSeconds, keepHighlightAfterBlink });
        processAllMessages();
        updateStatsBox();

        if (!mentionSettings.username) {
            return { ok: true, message: 'Surveillance des mentions desactivee.' };
        }

        return {
            ok: true,
            message: `Mentions surveillees pour @${mentionSettings.username}`
        };
    }

    function closeSettingsModal() {
        const modal = document.getElementById(MODAL_ID);
        const overlay = document.getElementById(OVERLAY_ID);
        if (modal) modal.remove();
        if (overlay) overlay.remove();
        modalOpen = false;
        applyChatFontScale(loadChatFontScale());
        applyStatsBoxVisibilityState();
        applyHomepageChatCollapsedState();
        applyBoxPosition(loadPosition());
        updateStatsBox();
    }

    function toggleStatsCollapsed(forceValue = !statsCollapsed) {
        saveStatsCollapsed(forceValue);
        applyStatsBoxCollapsedState();
        updateStatsBox();
        showToast(statsCollapsed ? 'Stats box réduite.' : 'Stats box développée.');
    }

    function handleStatsBoxActionClick(event) {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const actionEl = target.closest('[data-tm-action]');
        if (!actionEl) return;
        if (!actionEl.closest(`#${PANEL_ID}`)) return;

        const action = actionEl.getAttribute('data-tm-action');

        if (action === 'toggle-stats-collapsed') {
            event.preventDefault();
            event.stopPropagation();
            toggleStatsCollapsed();
            return;
        }

    }

    function openSettingsModal() {
        if (!isSupportedPage()) return;
        if (modalOpen) return;

        modalOpen = true;

        const currentPos = loadPosition();
        const currentPageLabel = getCurrentPageLabel();
        const homeView = isHomePage();
        const settingsGridColumns = window.innerWidth >= 780
            ? 'repeat(2, minmax(0, 1fr))'
            : 'minmax(0, 1fr)';

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '1000000';
        overlay.style.background = 'rgba(0,0,0,0.45)';
        overlay.style.backdropFilter = 'blur(3px)';

        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.zIndex = '1000001';
        modal.style.width = 'min(860px, calc(100vw - 24px))';
        modal.style.maxHeight = 'min(88vh, 900px)';
        modal.style.overflowY = 'auto';
        modal.style.background = 'rgba(24,24,27,0.98)';
        modal.style.border = '1px solid rgba(255,255,255,0.08)';
        modal.style.borderRadius = '18px';
        modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.45)';
        modal.style.padding = '18px';
        modal.style.fontFamily = 'Inter, Arial, sans-serif';
        modal.style.color = '#fff';

        modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
            <div>
                <div style="font-size:16px;font-weight:700;">Paramètres chat</div>
                <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">Vue actuelle : ${currentPageLabel}</div>
            </div>
            <button id="tm-close-modal" style="
                border:none;
                background:#27272a;
                color:#fff;
                width:34px;
                height:34px;
                border-radius:10px;
                cursor:pointer;
                font-size:18px;
                line-height:1;
            ">×</button>
        </div>

        <div style="
            display:grid;
            grid-template-columns:${settingsGridColumns};
            gap:14px;
            align-items:start;
        ">
            ${homeView ? `
            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Page d’accueil</div>

                <label style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    cursor:pointer;
                    font-size:13px;
                    color:#e4e4e7;
                ">
                    <input id="tm-home-collapse-toggle-setting" type="checkbox" ${homeChatCollapsed ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#22c55e;
                        cursor:pointer;
                    ">
                    <span>Masquer la shoutbox</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Permet de masquer la shoutbox sur la page d’accueil.
                </div>
            </div>
            ` : ''}

            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Position de la stats box (${currentPageLabel})</div>

                <div style="display:grid;gap:12px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#c4c4c8;">
                            <span>Position (0 Gauche; 100 Droite)</span>
                            <span id="tm-right-value">${formatNumberInputValue(currentPos.rightPercent, MAX_STATS_RIGHT_PERCENT)}%</span>
                        </span>
                        <input id="tm-right-input" type="range" min="0" max="${MAX_STATS_RIGHT_PERCENT}" step="0.5" value="${formatNumberInputValue(currentPos.rightPercent, MAX_STATS_RIGHT_PERCENT)}"
                            style="
                                width:100%;
                                accent-color:#38bdf8;
                                cursor:pointer;
                            ">
                    </label>

                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#c4c4c8;">
                            <span>Bas</span>
                            <span id="tm-bottom-value">${formatNumberInputValue(currentPos.bottomPercent, MAX_STATS_BOTTOM_PERCENT)}%</span>
                        </span>
                        <input id="tm-bottom-input" type="range" min="0" max="${MAX_STATS_BOTTOM_PERCENT}" step="0.5" value="${formatNumberInputValue(currentPos.bottomPercent, MAX_STATS_BOTTOM_PERCENT)}"
                            style="
                                width:100%;
                                accent-color:#38bdf8;
                                cursor:pointer;
                            ">
                    </label>
                </div>

                <label style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    cursor:pointer;
                    font-size:12px;
                    color:#d4d4d8;
                    margin-top:12px;
                ">
                    <input id="tm-hide-stats-toggle" type="checkbox" ${statsHidden ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#f59e0b;
                        cursor:pointer;
                    ">
                    <span>Masquer complètement la stats box</span>
                </label>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                    <button id="tm-save-position" style="
                        border:none;
                        background:#16a34a;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Enregistrer</button>

                    <button id="tm-reset-position" style="
                        border:none;
                        background:#3f3f46;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Reset position</button>
                </div>
            </div>

            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Accessibilité</div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <div style="font-size:12px;color:#c4c4c8;">
                        Taille de police shoutbox
                    </div>
                    <div id="tm-font-size-value" style="
                        min-width:52px;
                        text-align:right;
                        font-size:12px;
                        color:#f4f4f5;
                        font-weight:700;
                    ">${formatChatFontScalePercent()}%</div>
                </div>

                <input id="tm-font-size-range" type="range" min="${MIN_CHAT_FONT_SCALE * 100}" max="${MAX_CHAT_FONT_SCALE * 100}" step="5" value="${formatChatFontScalePercent()}"
                    style="
                        width:100%;
                        margin-top:12px;
                        accent-color:#38bdf8;
                        cursor:pointer;
                    ">

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                    <button id="tm-font-size-decrease" style="
                        border:none;
                        background:#3f3f46;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">A-</button>

                    <button id="tm-font-size-increase" style="
                        border:none;
                        background:#0f766e;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">A+</button>

                    <button id="tm-font-size-save" style="
                        border:none;
                        background:#2563eb;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Enregistrer</button>

                    <button id="tm-font-size-reset" style="
                        border:none;
                        background:#3f3f46;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Reset police</button>
                </div>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Agrandit ou réduit les pseudos et les messages dans la shoutbox. L’aperçu est immédiat sur la vue courante.
                </div>
            </div>

            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Blacklist</div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <input id="tm-user-input" type="text" placeholder="Pseudo"
                        style="
                            flex:1 1 180px;
                            min-width:0;
                            background:#18181b;
                            color:#fff;
                            border:1px solid rgba(255,255,255,0.10);
                            border-radius:10px;
                            padding:10px 12px;
                            outline:none;
                        ">
                    <button id="tm-user-toggle" style="
                        border:none;
                        background:#2563eb;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Ajouter / retirer</button>
                </div>

                <div style="margin-top:10px;font-size:12px;color:#a1a1aa;line-height:1.5;">
                    Bloqués :
                </div>

                <div id="tm-hidden-users-list" style="
                    margin-top:8px;
                    display:flex;
                    flex-wrap:wrap;
                    gap:8px;
                "></div>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.4;">
                    Clique sur un pseudo pour le charger dans le champ. Alt+clic directement sur un pseudo du chat permet de le blacklister.
                </div>
            </div>

            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Mettre en avant</div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input id="tm-highlight-user-input" type="text" placeholder="Pseudo"
                        style="
                            flex:1 1 160px;
                            min-width:0;
                            background:#18181b;
                            color:#fff;
                            border:1px solid rgba(255,255,255,0.10);
                            border-radius:10px;
                            padding:10px 12px;
                            outline:none;
                        ">

                    <input id="tm-highlight-color-input" type="color" value="${DEFAULT_HIGHLIGHT_COLOR}"
                        style="
                            width:48px;
                            height:40px;
                            padding:4px;
                            background:#18181b;
                            border:1px solid rgba(255,255,255,0.10);
                            border-radius:10px;
                            cursor:pointer;
                        ">

                    <button id="tm-highlight-save" style="
                        border:none;
                        background:#d97706;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Ajouter / MAJ</button>

                    <button id="tm-highlight-remove" style="
                        border:none;
                        background:#3f3f46;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Retirer</button>

                </div>

                <div style="margin-top:10px;font-size:12px;color:#a1a1aa;line-height:1.5;">
                    Mis en avant :
                </div>

                <div id="tm-highlight-users-list" style="
                    margin-top:8px;
                    display:flex;
                    flex-wrap:wrap;
                    gap:8px;
                "></div>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.4;">
                    Clique sur un pseudo pour charger sa couleur. Les messages restents visibles mais sont surlignes avec la couleur choisie.
                </div>
            </div>

            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Mentions @moi</div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input id="tm-mention-user-input" type="text" placeholder="Mon pseudo" value="${escapeHtml(mentionSettings.username)}"
                        style="
                            flex:1 1 180px;
                            min-width:0;
                            background:#18181b;
                            color:#fff;
                            border:1px solid rgba(255,255,255,0.10);
                            border-radius:10px;
                            padding:10px 12px;
                            outline:none;
                        ">

                    <input id="tm-mention-color-input" type="color" value="${mentionSettings.color}"
                        style="
                            width:48px;
                            height:40px;
                            padding:4px;
                            background:#18181b;
                            border:1px solid rgba(255,255,255,0.10);
                            border-radius:10px;
                            cursor:pointer;
                        ">

                    <input id="tm-mention-blink-input" type="number" min="0" max="30" step="0.5" value="${mentionSettings.blinkSeconds}"
                        style="
                            width:90px;
                            background:#18181b;
                            color:#fff;
                            border:1px solid rgba(255,255,255,0.10);
                            border-radius:10px;
                            padding:10px 12px;
                            outline:none;
                        ">

                    <button id="tm-mention-save" style="
                        border:none;
                        background:#059669;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Enregistrer</button>
                </div>

                <label style="
                    display:flex;
                    align-items:center;
                    flex-wrap:wrap;
                    gap:10px;
                    cursor:pointer;
                    font-size:12px;
                    color:#d4d4d8;
                    margin-top:10px;
                ">
                    <input id="tm-mention-keep-highlight-toggle" type="checkbox" ${mentionSettings.keepHighlightAfterBlink ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#22c55e;
                        cursor:pointer;
                    ">
                    <span>Garder la couleur après le clignotement</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Quand un message contient @tonpseudo, il est surligne avec cette couleur. Mets 0 seconde pour desactiver le clignotement et laisse le pseudo vide pour couper la surveillance.
                </div>
            </div>

            <div style="
                padding:12px;
                border-radius:14px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
            ">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Debug</div>

                <label style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    cursor:pointer;
                    font-size:13px;
                    color:#e4e4e7;
                ">
                    <input id="tm-debug-toggle" type="checkbox" ${debugMode ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#ef4444;
                        cursor:pointer;
                    ">
                    <span>Mode debug</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Ajuste la position sur cette vue et masque complètement la stats box si besoin.
                </div>
            </div>

            <div id="tm-feedback" style="
                min-height:20px;
                font-size:12px;
                color:#93c5fd;
            "></div>
        </div>
    `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#tm-close-modal');
        const userInput = modal.querySelector('#tm-user-input');
        const toggleBtn = modal.querySelector('#tm-user-toggle');
        const hiddenUsersList = modal.querySelector('#tm-hidden-users-list');
        const highlightUserInput = modal.querySelector('#tm-highlight-user-input');
        const highlightColorInput = modal.querySelector('#tm-highlight-color-input');
        const highlightSaveBtn = modal.querySelector('#tm-highlight-save');
        const highlightRemoveBtn = modal.querySelector('#tm-highlight-remove');
        const highlightUsersList = modal.querySelector('#tm-highlight-users-list');
        const mentionUserInput = modal.querySelector('#tm-mention-user-input');
        const mentionColorInput = modal.querySelector('#tm-mention-color-input');
        const mentionBlinkInput = modal.querySelector('#tm-mention-blink-input');
        const mentionKeepHighlightToggle = modal.querySelector('#tm-mention-keep-highlight-toggle');
        const mentionSaveBtn = modal.querySelector('#tm-mention-save');
        const fontSizeRange = modal.querySelector('#tm-font-size-range');
        const fontSizeValue = modal.querySelector('#tm-font-size-value');
        const fontSizeDecreaseBtn = modal.querySelector('#tm-font-size-decrease');
        const fontSizeIncreaseBtn = modal.querySelector('#tm-font-size-increase');
        const fontSizeSaveBtn = modal.querySelector('#tm-font-size-save');
        const fontSizeResetBtn = modal.querySelector('#tm-font-size-reset');
        const rightInput = modal.querySelector('#tm-right-input');
        const rightValue = modal.querySelector('#tm-right-value');
        const bottomInput = modal.querySelector('#tm-bottom-input');
        const bottomValue = modal.querySelector('#tm-bottom-value');
        const savePositionBtn = modal.querySelector('#tm-save-position');
        const resetPositionBtn = modal.querySelector('#tm-reset-position');
        const hideStatsToggle = modal.querySelector('#tm-hide-stats-toggle');
        const debugToggle = modal.querySelector('#tm-debug-toggle');
        const homeCollapseToggle = modal.querySelector('#tm-home-collapse-toggle-setting');
        const feedback = modal.querySelector('#tm-feedback');

        function setFeedback(message, isError = false) {
            feedback.textContent = message;
            feedback.style.color = isError ? '#fca5a5' : '#93c5fd';
        }

        function refreshHiddenUsersList() {
            const users = [...hiddenUsers].sort((a, b) => a.localeCompare(b, 'fr'));
            hiddenUsersList.innerHTML = '';

            if (users.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '(aucun)';
                empty.style.fontSize = '12px';
                empty.style.color = '#a1a1aa';
                hiddenUsersList.appendChild(empty);
                return;
            }

            for (const user of users) {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.textContent = user;
                chip.style.border = '1px solid rgba(59,130,246,0.25)';
                chip.style.background = 'rgba(59,130,246,0.10)';
                chip.style.color = '#93c5fd';
                chip.style.borderRadius = '999px';
                chip.style.padding = '6px 10px';
                chip.style.fontSize = '12px';
                chip.style.cursor = 'pointer';
                chip.style.lineHeight = '1.2';

                chip.addEventListener('click', () => {
                    userInput.value = user;
                    userInput.focus();
                    userInput.select();
                    setFeedback(`Pseudo chargé : ${user}`);
                });

                hiddenUsersList.appendChild(chip);
            }
        }

        function refreshHighlightedUsersList() {
            const users = Object.entries(highlightedUsers)
                .sort((a, b) => a[0].localeCompare(b[0], 'fr'));

            highlightUsersList.innerHTML = '';

            if (users.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '(aucun)';
                empty.style.fontSize = '12px';
                empty.style.color = '#a1a1aa';
                highlightUsersList.appendChild(empty);
                return;
            }

            for (const [user, color] of users) {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.textContent = user;
                chip.style.border = `1px solid ${hexToRgba(color, 0.38)}`;
                chip.style.background = hexToRgba(color, 0.12);
                chip.style.color = color;
                chip.style.borderRadius = '999px';
                chip.style.padding = '6px 10px';
                chip.style.fontSize = '12px';
                chip.style.cursor = 'pointer';
                chip.style.lineHeight = '1.2';

                chip.addEventListener('click', () => {
                    highlightUserInput.value = user;
                    highlightColorInput.value = normalizeHexColor(color);
                    highlightUserInput.focus();
                    highlightUserInput.select();
                    setFeedback(`Mise en avant chargee : ${user}`);
                });

                highlightUsersList.appendChild(chip);
            }
        }

        function previewPosition() {
            const fallback = loadPosition();
            const preview = {
                rightPercent: parsePercentInput(rightInput.value, fallback.rightPercent, MAX_STATS_RIGHT_PERCENT),
                bottomPercent: parsePercentInput(bottomInput.value, fallback.bottomPercent, MAX_STATS_BOTTOM_PERCENT)
            };

            if (rightValue) rightValue.textContent = `${formatNumberInputValue(preview.rightPercent, MAX_STATS_RIGHT_PERCENT)}%`;
            if (bottomValue) bottomValue.textContent = `${formatNumberInputValue(preview.bottomPercent, MAX_STATS_BOTTOM_PERCENT)}%`;
            applyBoxPosition(preview);
        }

        function syncFontSizeValueLabel() {
            if (fontSizeValue && fontSizeRange) {
                fontSizeValue.textContent = `${fontSizeRange.value}%`;
            }
        }

        function setPreviewFontScale(scale) {
            if (!fontSizeRange) return;
            fontSizeRange.value = formatChatFontScalePercent(scale);
            syncFontSizeValueLabel();
            applyChatFontScale(scale);
        }

        closeBtn.addEventListener('click', closeSettingsModal);
        overlay.addEventListener('click', closeSettingsModal);

        toggleBtn.addEventListener('click', () => {
            const result = addOrToggleUser(userInput.value);
            setFeedback(result.message, !result.ok);
            refreshHiddenUsersList();
            userInput.focus();
            userInput.select();
        });

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                toggleBtn.click();
            }
        });

        highlightSaveBtn.addEventListener('click', () => {
            const result = addOrUpdateHighlightedUser(highlightUserInput.value, highlightColorInput.value);
            setFeedback(result.message, !result.ok);
            refreshHighlightedUsersList();
            highlightUserInput.focus();
            highlightUserInput.select();
        });

        highlightRemoveBtn.addEventListener('click', () => {
            const result = removeHighlightedUser(highlightUserInput.value);
            setFeedback(result.message, !result.ok);
            refreshHighlightedUsersList();
            highlightUserInput.focus();
            highlightUserInput.select();
        });

        highlightUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                highlightSaveBtn.click();
            }
        });

        mentionSaveBtn.addEventListener('click', () => {
            const result = updateMentionSettings(
                mentionUserInput.value,
                mentionColorInput.value,
                mentionBlinkInput.value,
                mentionKeepHighlightToggle?.checked
            );

            mentionUserInput.value = mentionSettings.username;
            mentionColorInput.value = mentionSettings.color;
            mentionBlinkInput.value = String(mentionSettings.blinkSeconds);
            if (mentionKeepHighlightToggle) {
                mentionKeepHighlightToggle.checked = mentionSettings.keepHighlightAfterBlink;
            }
            setFeedback(result.message, !result.ok);
        });

        mentionUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mentionSaveBtn.click();
            }
        });

        mentionBlinkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mentionSaveBtn.click();
            }
        });

        fontSizeRange?.addEventListener('input', () => {
            syncFontSizeValueLabel();
            applyChatFontScale(parseChatFontScalePercentInput(fontSizeRange.value, chatFontScale));
        });

        fontSizeDecreaseBtn?.addEventListener('click', () => {
            const nextScale = parseChatFontScalePercentInput((Number(fontSizeRange?.value || formatChatFontScalePercent()) - 5), chatFontScale);
            setPreviewFontScale(nextScale);
        });

        fontSizeIncreaseBtn?.addEventListener('click', () => {
            const nextScale = parseChatFontScalePercentInput((Number(fontSizeRange?.value || formatChatFontScalePercent()) + 5), chatFontScale);
            setPreviewFontScale(nextScale);
        });

        fontSizeSaveBtn?.addEventListener('click', () => {
            const nextScale = parseChatFontScalePercentInput(fontSizeRange?.value || formatChatFontScalePercent(), chatFontScale);
            saveChatFontScale(nextScale);
            applyChatFontScale();
            setPreviewFontScale(chatFontScale);
            setFeedback(`Taille de police enregistrée : ${formatChatFontScalePercent()}%.`);
        });

        fontSizeResetBtn?.addEventListener('click', () => {
            saveChatFontScale(DEFAULT_CHAT_FONT_SCALE);
            applyChatFontScale();
            setPreviewFontScale(chatFontScale);
            setFeedback('Taille de police réinitialisée.');
        });

        rightInput.addEventListener('input', previewPosition);
        bottomInput.addEventListener('input', previewPosition);

        hideStatsToggle?.addEventListener('change', () => {
            saveStatsHidden(hideStatsToggle.checked);
            applyStatsBoxVisibilityState();
            setFeedback(statsHidden ? `Stats box masquée pour ${currentPageLabel}.` : `Stats box affichée pour ${currentPageLabel}.`);
        });

        savePositionBtn.addEventListener('click', () => {
            const newPos = {
                rightPercent: parsePercentInput(rightInput.value, DEFAULT_POSITION.rightPercent, MAX_STATS_RIGHT_PERCENT),
                bottomPercent: parsePercentInput(bottomInput.value, DEFAULT_POSITION.bottomPercent, MAX_STATS_BOTTOM_PERCENT)
            };

            rightInput.value = formatNumberInputValue(newPos.rightPercent, MAX_STATS_RIGHT_PERCENT);
            bottomInput.value = formatNumberInputValue(newPos.bottomPercent, MAX_STATS_BOTTOM_PERCENT);

            savePosition(newPos);
            applyBoxPosition(newPos);
            updateStatsBox();
            setFeedback(`Position enregistrée pour ${currentPageLabel}.`);
        });

        resetPositionBtn.addEventListener('click', () => {
            resetPosition();
            const pos = loadPosition();
            rightInput.value = formatNumberInputValue(pos.rightPercent, MAX_STATS_RIGHT_PERCENT);
            bottomInput.value = formatNumberInputValue(pos.bottomPercent, MAX_STATS_BOTTOM_PERCENT);
            applyBoxPosition(pos);
            updateStatsBox();
            setFeedback(`Position réinitialisée pour ${currentPageLabel}.`);
        });

        debugToggle.addEventListener('change', () => {
            saveDebugMode(debugToggle.checked);
            processAllMessages();
            updateStatsBox();
            setFeedback(debugMode ? 'Mode debug activé.' : 'Mode debug désactivé.');
        });

        homeCollapseToggle?.addEventListener('change', () => {
            toggleHomepageChatCollapsed(homeCollapseToggle.checked);
            setFeedback(homeChatCollapsed ? 'Shoutbox d’accueil repliée.' : 'Shoutbox d’accueil réaffichée.');
        });

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSettingsModal();
            }
        });

        refreshHiddenUsersList();
        refreshHighlightedUsersList();
        userInput.focus();
        syncFontSizeValueLabel();
        previewPosition();
    }

    function startObserver() {
        if (observer) observer.disconnect();

        const target = getActiveChatRoot();
        if (!target) return;

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(processNode);
            }
        });

        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }

    function findMessageElementFromTarget(target) {
        let current = target instanceof HTMLElement ? target : null;

        while (current && current !== document.body) {
            if (isChatMessage(current)) return current;
            current = current.parentElement;
        }

        return null;
    }

    function getMessageTextContent(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return '';

        if (isChatPage()) {
            const textBlock = messageEl.querySelector(':scope > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words');
            return (textBlock?.textContent || '').trim();
        }

        if (isHomePage()) {
            const textBlock = messageEl.querySelector(':scope > .flex-1.min-w-0 > p.break-words.leading-snug');
            return (textBlock?.textContent || '').trim();
        }

        return '';
    }

    function messageMentionsWatchedUser(messageEl) {
        const watchedUsername = mentionSettings.username;
        if (!watchedUsername) return false;

        const messageText = getMessageTextContent(messageEl);
        if (!messageText) return false;

        const mentionRegex = new RegExp(`(^|[^\\w])@${escapeRegExp(watchedUsername)}(?=$|[^\\w])`, 'i');
        return mentionRegex.test(messageText);
    }

    function findUsernameTrigger(target) {
        if (!(target instanceof Element)) return null;

        if (isChatPage()) {
            return target.closest('button[type="button"]');
        }

        if (isHomePage()) {
            return target.closest('span.text-xs.font-bold');
        }

        return null;
    }

    function installQuickToggleHandler() {
        document.addEventListener('click', (event) => {
            if (!event.altKey || event.button !== 0 || modalOpen || !isSupportedPage()) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            const trigger = findUsernameTrigger(target);
            if (!trigger) return;

            const messageEl = findMessageElementFromTarget(trigger);
            if (!messageEl || !messageEl.contains(trigger)) return;

            const username = getUsernameFromMessage(messageEl);
            if (!username) return;

            event.preventDefault();
            event.stopPropagation();

            const result = addOrToggleUser(username);
            showToast(result.message, !result.ok);
        }, true);
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function refreshForRoute() {
        if (isSupportedPage()) {
            statsCollapsed = loadStatsCollapsed();
            statsHidden = loadStatsHidden();

            if (isHomePage() && !getHomepageChatContainer()) {
                stopObserver();
                return;
            }

            createStatsBox();
            applyHomepageChatCollapsedState();
            applyBoxPosition();

            if (isHomePage() && homeChatCollapsed) {
                stopObserver();
            } else {
                processAllMessages();
                startObserver();
            }
        } else {
            stopObserver();
            removeStatsBox();
            closeSettingsModal();
            removeToast();
        }
    }

    function installRouteWatcher() {
        if (routeWatcher) return;

        let lastUrl = location.href;
        let lastPageType = getCurrentPageType();

        routeWatcher = setInterval(() => {
            const currentPageType = getCurrentPageType();

            if (location.href !== lastUrl || currentPageType !== lastPageType) {
                lastUrl = location.href;
                lastPageType = currentPageType;
                refreshForRoute();
            } else if (isHomePage() && !getHomepageChatContainer()) {
                stopObserver();
            } else if (isHomePage() && getHomepageChatContainer() && !observer) {
                refreshForRoute();
            }
        }, 500);

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            const result = originalPushState.apply(this, arguments);
            setTimeout(refreshForRoute, 50);
            return result;
        };

        history.replaceState = function () {
            const result = originalReplaceState.apply(this, arguments);
            setTimeout(refreshForRoute, 50);
            return result;
        };

        window.addEventListener('popstate', () => {
            setTimeout(refreshForRoute, 50);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c') {
            if (!isSupportedPage()) return;
            e.preventDefault();
            openSettingsModal();
        }
    });

    function init() {
        installQuickToggleHandler();
        installRouteWatcher();
        document.addEventListener('click', handleStatsBoxActionClick, true);
        refreshForRoute();
        console.log('[Torr9 Chat] Script actif. Raccourci : Ctrl+Alt+C');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
