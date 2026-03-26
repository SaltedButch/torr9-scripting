// ==UserScript==
// @name         Torr9 Chat - Shoutbox 2.0
// @namespace    http://tampermonkey.net/
// @version      2.32
// @description  Blacklist, mise en avant, mentions, stats et réglages live pour la shoutbox Torr9
// @author       Butchered
// @match        https://torr9.net/*
// @grant        none
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
    const STORAGE_KEY_LAST_MENTION_SOUND_NOTIFICATION = 'tm_torr9_last_mention_sound_notification';
    const STORAGE_KEY_RECENT_MENTION_SOUND_NOTIFICATIONS = 'tm_torr9_recent_mention_sound_notifications';
    const STORAGE_KEY_CHAT_FONT_SCALE = 'tm_torr9_chat_font_scale';
    const STORAGE_KEY_LIGHT_THEME_HOME = 'tm_torr9_light_theme_home';
    const STORAGE_KEY_LIGHT_THEME_CHAT = 'tm_torr9_light_theme_chat';
    const STORAGE_KEY_LINKIFY_URLS = 'tm_torr9_linkify_urls';
    const STORAGE_KEY_EMBED_URL_IMAGES = 'tm_torr9_embed_url_images';
    const PANEL_ID = 'tm-torr9-chat-stats';
    const MODAL_ID = 'tm-torr9-chat-modal';
    const OVERLAY_ID = 'tm-torr9-chat-overlay';
    const TOAST_ID = 'tm-torr9-chat-toast';
    const IMAGE_PREVIEW_ID = 'tm-torr9-image-preview';
    const HOME_COLLAPSE_BUTTON_ID = 'tm-home-chat-collapse-toggle';
    const DEFAULT_HIGHLIGHT_COLOR = '#f59e0b';
    const DEFAULT_HIGHLIGHT_OPACITY = 14;
    const DEFAULT_MENTION_COLOR = '#22c55e';
    const DEFAULT_MENTION_OPACITY = 18;
    const DEFAULT_MENTION_BLINK_SECONDS = 6;
    const DEFAULT_MENTION_KEEP_HIGHLIGHT = true;
    const DEFAULT_MENTION_INCLUDE_REPLY_CONTEXT = false;
    const DEFAULT_MENTION_SOUND_ENABLED = false;
    const DEFAULT_MENTION_SOUND_STYLE = 'ping';
    const DEFAULT_MENTION_SOUND_CUSTOM_URL = '';
    const DEFAULT_MENTION_SOUND_COOLDOWN_SECONDS = 8;
    const ALLOWED_CHAT_CHANNELS = new Set(['general', 'aide', 'bug report', 'bug reports']);
    const DEFAULT_CHAT_FONT_SCALE = 1;
    const MIN_CHAT_FONT_SCALE = 0.85;
    const MAX_CHAT_FONT_SCALE = 1.7;
    const MAX_STATS_RIGHT_PERCENT = 100;
    const MAX_STATS_BOTTOM_PERCENT = 95;
    const MAX_RECENT_MENTION_SOUND_RECORDS = 40;
    const LONG_PRESS_REACTION_DELAY_MS = 420;
    const LONG_PRESS_REACTION_MOVE_THRESHOLD_PX = 10;
    const LONG_PRESS_REACTION_PICKER_OFFSET_X = 18;
    const LONG_PRESS_REACTION_PICKER_OFFSET_Y = 0;
    const MENTION_STYLE_ID = 'tm-torr9-mention-style';
    const LIGHT_THEME_STYLE_ID = 'tm-torr9-light-theme-style';
    const LINKIFIED_URL_STYLE_ID = 'tm-torr9-linkified-url-style';
    const EMBEDDED_IMAGE_STYLE_ID = 'tm-torr9-embedded-image-style';
    const URL_CANDIDATE_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/i;
    const URL_MATCH_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
    const DIRECT_IMAGE_PATH_RE = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;

    const DEFAULT_POSITION = {
        rightPercent: 2,
        bottomPercent: 2
    };

    let observer = null;
    let statsBox = null;
    let statsContent = null;
    let routeWatcher = null;
    let modalOpen = false;
    let hoveredMessageImage = null;
    let debugMode = loadDebugMode();
    let homeChatCollapsed = loadHomeChatCollapsed();
    let statsCollapsed = loadStatsCollapsed();
    let statsHidden = loadStatsHidden();
    let statsUpdateFrame = null;
    let toastHideTimer = null;
    let mentionSettings = loadMentionSettings();
    let chatFontScale = loadChatFontScale();
    let lightThemeEnabled = loadLightThemeEnabled();
    let linkifyUrlsEnabled = loadLinkifyUrlsEnabled();
    let embedUrlImagesEnabled = loadEmbedUrlImagesEnabled();
    let mentionSoundContext = null;
    let mentionSoundElement = null;
    let lastMentionSoundRecord = loadLastMentionSoundRecord();
    let recentMentionSoundRecords = loadRecentMentionSoundRecords(lastMentionSoundRecord);
    let lastMentionSoundAt = lastMentionSoundRecord?.notifiedAt || 0;
    let lastChatContextKey = 'other';
    let longPressReactionState = null;

    const hiddenUsers = loadHiddenUsers();
    const highlightedUsers = loadHighlightedUsers();
    const sessionBlockedCounts = {};
    const alreadyCountedMessages = new WeakSet();
    const mentionBlinkStates = new WeakMap();
    const mentionSoundNotifiedMessages = new WeakSet();

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

    function getLightThemeStorageKey() {
        return isChatPage() ? STORAGE_KEY_LIGHT_THEME_CHAT : STORAGE_KEY_LIGHT_THEME_HOME;
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
                    .map(([username, value]) => [normalizeName(username), normalizeHighlightUserConfig(value)])
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
                    opacityPercent: DEFAULT_MENTION_OPACITY,
                    blinkSeconds: DEFAULT_MENTION_BLINK_SECONDS,
                    keepHighlightAfterBlink: DEFAULT_MENTION_KEEP_HIGHLIGHT,
                    includeReplyContext: DEFAULT_MENTION_INCLUDE_REPLY_CONTEXT,
                    soundEnabled: DEFAULT_MENTION_SOUND_ENABLED,
                    soundStyle: DEFAULT_MENTION_SOUND_STYLE,
                    soundCustomUrl: DEFAULT_MENTION_SOUND_CUSTOM_URL,
                    soundCooldownSeconds: DEFAULT_MENTION_SOUND_COOLDOWN_SECONDS
                };
            }

            return {
                username: normalizeName(parsed.username || ''),
                color: normalizeHexColor(parsed.color, DEFAULT_MENTION_COLOR),
                opacityPercent: parseOpacityPercentInput(parsed.opacityPercent, DEFAULT_MENTION_OPACITY),
                blinkSeconds: clamp(Number(parsed.blinkSeconds) || 0, 0, 30),
                keepHighlightAfterBlink: parsed.keepHighlightAfterBlink !== false,
                includeReplyContext: parsed.includeReplyContext === true,
                soundEnabled: parsed.soundEnabled === true,
                soundStyle: normalizeMentionSoundStyle(parsed.soundStyle),
                soundCustomUrl: normalizeMentionSoundCustomUrl(parsed.soundCustomUrl),
                soundCooldownSeconds: clamp(Number(parsed.soundCooldownSeconds) || 0, 0, 300)
            };
        } catch (e) {
            return {
                username: '',
                color: DEFAULT_MENTION_COLOR,
                opacityPercent: DEFAULT_MENTION_OPACITY,
                blinkSeconds: DEFAULT_MENTION_BLINK_SECONDS,
                keepHighlightAfterBlink: DEFAULT_MENTION_KEEP_HIGHLIGHT,
                includeReplyContext: DEFAULT_MENTION_INCLUDE_REPLY_CONTEXT,
                soundEnabled: DEFAULT_MENTION_SOUND_ENABLED,
                soundStyle: DEFAULT_MENTION_SOUND_STYLE,
                soundCustomUrl: DEFAULT_MENTION_SOUND_CUSTOM_URL,
                soundCooldownSeconds: DEFAULT_MENTION_SOUND_COOLDOWN_SECONDS
            };
        }
    }

    function saveMentionSettings(nextSettings) {
        mentionSettings = {
            username: normalizeName(nextSettings?.username || ''),
            color: normalizeHexColor(nextSettings?.color, DEFAULT_MENTION_COLOR),
            opacityPercent: parseOpacityPercentInput(nextSettings?.opacityPercent, DEFAULT_MENTION_OPACITY),
            blinkSeconds: clamp(Number(nextSettings?.blinkSeconds) || 0, 0, 30),
            keepHighlightAfterBlink: nextSettings?.keepHighlightAfterBlink !== false,
            includeReplyContext: nextSettings?.includeReplyContext === true,
            soundEnabled: nextSettings?.soundEnabled === true,
            soundStyle: normalizeMentionSoundStyle(nextSettings?.soundStyle),
            soundCustomUrl: normalizeMentionSoundCustomUrl(nextSettings?.soundCustomUrl),
            soundCooldownSeconds: clamp(Number(nextSettings?.soundCooldownSeconds) || 0, 0, 300)
        };

        localStorage.setItem(STORAGE_KEY_MENTION_SETTINGS, JSON.stringify(mentionSettings));
    }

    function loadLastMentionSoundRecord() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_MENTION_SOUND_NOTIFICATION) || 'null');
            return normalizeMentionSoundRecord(parsed);
        } catch (e) {
            return null;
        }
    }

    function normalizeMentionSoundRecord(record) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return null;

        const hash = String(record.hash || '').trim();
        const messageTimestamp = String(record.messageTimestamp || '').trim();
        const messageTimestampKey = Number(record.messageTimestampKey) || 0;
        const notifiedAt = Number(record.notifiedAt) || 0;

        if (!hash || messageTimestampKey < 0 || notifiedAt < 0) return null;

        return {
            hash,
            messageTimestamp,
            messageTimestampKey,
            notifiedAt
        };
    }

    function loadRecentMentionSoundRecords(fallbackRecord = null) {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_RECENT_MENTION_SOUND_NOTIFICATIONS) || '[]');
            const records = Array.isArray(parsed)
                ? parsed.map(normalizeMentionSoundRecord).filter(Boolean)
                : [];

            if (records.length > 0) {
                return records.slice(-MAX_RECENT_MENTION_SOUND_RECORDS);
            }
        } catch (e) {}

        return fallbackRecord ? [fallbackRecord] : [];
    }

    function saveLastMentionSoundRecord(record) {
        const normalizedRecord = normalizeMentionSoundRecord(record);

        if (!normalizedRecord) {
            lastMentionSoundRecord = null;
            localStorage.removeItem(STORAGE_KEY_LAST_MENTION_SOUND_NOTIFICATION);
            return;
        }

        lastMentionSoundRecord = normalizedRecord;
        localStorage.setItem(STORAGE_KEY_LAST_MENTION_SOUND_NOTIFICATION, JSON.stringify(lastMentionSoundRecord));
    }

    function saveRecentMentionSoundRecords() {
        localStorage.setItem(
            STORAGE_KEY_RECENT_MENTION_SOUND_NOTIFICATIONS,
            JSON.stringify(recentMentionSoundRecords.slice(-MAX_RECENT_MENTION_SOUND_RECORDS))
        );
    }

    function rememberMentionSoundRecord(record) {
        const normalizedRecord = normalizeMentionSoundRecord(record);
        if (!normalizedRecord) return;

        recentMentionSoundRecords = recentMentionSoundRecords
            .filter((entry) => !(entry.hash === normalizedRecord.hash && entry.messageTimestampKey === normalizedRecord.messageTimestampKey));
        recentMentionSoundRecords.push(normalizedRecord);

        if (recentMentionSoundRecords.length > MAX_RECENT_MENTION_SOUND_RECORDS) {
            recentMentionSoundRecords = recentMentionSoundRecords.slice(-MAX_RECENT_MENTION_SOUND_RECORDS);
        }

        saveRecentMentionSoundRecords();
    }

    function hasRememberedMentionSoundRecord(signature) {
        if (!signature) return false;

        return recentMentionSoundRecords.some((record) =>
            record.hash === signature.hash &&
            record.messageTimestampKey === signature.messageTimestampKey
        );
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

    function loadLightThemeEnabled() {
        try {
            return localStorage.getItem(getLightThemeStorageKey()) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveLightThemeEnabled(value) {
        lightThemeEnabled = !!value;
        localStorage.setItem(getLightThemeStorageKey(), lightThemeEnabled ? '1' : '0');
    }

    function loadLinkifyUrlsEnabled() {
        try {
            const rawValue = localStorage.getItem(STORAGE_KEY_LINKIFY_URLS);
            if (rawValue === null) return true;
            return rawValue === '1';
        } catch (e) {
            return true;
        }
    }

    function saveLinkifyUrlsEnabled(value) {
        linkifyUrlsEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_LINKIFY_URLS, linkifyUrlsEnabled ? '1' : '0');
    }

    function loadEmbedUrlImagesEnabled() {
        try {
            const rawValue = localStorage.getItem(STORAGE_KEY_EMBED_URL_IMAGES);
            if (rawValue === null) return true;
            return rawValue === '1';
        } catch (e) {
            return true;
        }
    }

    function saveEmbedUrlImagesEnabled(value) {
        embedUrlImagesEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_EMBED_URL_IMAGES, embedUrlImagesEnabled ? '1' : '0');
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

    function ensureLightThemeStyle() {
        if (document.getElementById(LIGHT_THEME_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = LIGHT_THEME_STYLE_ID;
        style.textContent = `
            :root[data-tm-torr9-theme="light"] #${PANEL_ID} {
                background: rgba(255,255,255,0.96) !important;
                border-color: rgba(148,163,184,0.35) !important;
                box-shadow: 0 14px 30px rgba(15,23,42,0.12) !important;
                color: #0f172a !important;
            }

            :root[data-tm-torr9-theme="light"] #${PANEL_ID} div,
            :root[data-tm-torr9-theme="light"] #${PANEL_ID} span,
            :root[data-tm-torr9-theme="light"] #${PANEL_ID} p {
                color: #0f172a !important;
            }

            :root[data-tm-torr9-theme="light"] #${PANEL_ID} button,
            :root[data-tm-torr9-theme="light"] #${HOME_COLLAPSE_BUTTON_ID} {
                background: #e2e8f0 !important;
                border-color: rgba(148,163,184,0.35) !important;
                color: #0f172a !important;
            }

            :root[data-tm-torr9-theme="light"] #${TOAST_ID} {
                background: rgba(255,255,255,0.98) !important;
                border-color: rgba(148,163,184,0.3) !important;
                box-shadow: 0 14px 30px rgba(15,23,42,0.12) !important;
                color: #0f172a !important;
            }

            [data-tm-chat-surface="light"] {
                background: linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.96));
                border-radius: 16px;
                box-shadow: inset 0 0 0 1px rgba(148,163,184,0.18);
                padding: 10px;
            }

            [data-tm-chat-surface="light"] .group.relative.flex.items-start {
                background: rgba(255,255,255,0.92);
                border: 1px solid rgba(226,232,240,0.98);
                border-radius: 14px;
                box-shadow: 0 8px 18px rgba(15,23,42,0.05);
                margin-bottom: 6px;
                padding: 8px 10px;
            }

            [data-tm-chat-surface="light"] .group.relative.flex.items-start > .flex-1.min-w-0 > .flex.items-baseline button[type="button"],
            [data-tm-chat-surface="light"] .group.relative.flex.items-start span.text-xs.font-bold {
                color: #0f172a !important;
            }

            [data-tm-chat-surface="light"] .group.relative.flex.items-start > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words,
            [data-tm-chat-surface="light"] .group.relative.flex.items-start > .flex-1.min-w-0 > p.break-words.leading-snug {
                color: #1f2937 !important;
            }

            [data-tm-chat-surface="light"] .group.relative.flex.items-start > .flex-1.min-w-0 > .flex.items-baseline span,
            [data-tm-chat-surface="light"] .group.relative.flex.items-start > .flex-1.min-w-0 > .flex.items-center span:not(.text-xs.font-bold),
            [data-tm-chat-surface="light"] .group.relative.flex.items-start > .flex-1.min-w-0 > .flex.items-center.gap-2.mb-1.text-xs button[type="button"] {
                color: #64748b !important;
            }
        `;

        document.head.appendChild(style);
    }

    function ensureLinkifiedUrlStyle() {
        if (document.getElementById(LINKIFIED_URL_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = LINKIFIED_URL_STYLE_ID;
        style.textContent = `
            a[data-tm-linkified-url="1"] {
                color: #67e8f9 !important;
                text-decoration: underline !important;
                text-underline-offset: 2px;
                text-decoration-thickness: 1px;
                word-break: break-word;
                cursor: pointer;
            }

            a[data-tm-linkified-url="1"]:hover {
                color: #a5f3fc !important;
            }

            :root[data-tm-torr9-theme="light"] a[data-tm-linkified-url="1"],
            [data-tm-chat-surface="light"] a[data-tm-linkified-url="1"] {
                color: #0369a1 !important;
            }

            :root[data-tm-torr9-theme="light"] a[data-tm-linkified-url="1"]:hover,
            [data-tm-chat-surface="light"] a[data-tm-linkified-url="1"]:hover {
                color: #075985 !important;
            }
        `;

        document.head.appendChild(style);
    }

    function ensureEmbeddedImageStyle() {
        if (document.getElementById(EMBEDDED_IMAGE_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = EMBEDDED_IMAGE_STYLE_ID;
        style.textContent = `
            a[data-tm-linkified-image="1"] {
                cursor: zoom-in;
            }
        `;

        document.head.appendChild(style);
    }

    function applyLightThemeState() {
        ensureLightThemeStyle();

        if (lightThemeEnabled) {
            document.documentElement.setAttribute('data-tm-torr9-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-tm-torr9-theme');
        }

        const activeRoot = getActiveChatRoot();
        if (activeRoot instanceof HTMLElement) {
            if (lightThemeEnabled) {
                activeRoot.setAttribute('data-tm-chat-surface', 'light');
            } else {
                activeRoot.removeAttribute('data-tm-chat-surface');
            }
        }

        const homeContainer = getHomepageChatContainer();
        if (homeContainer instanceof HTMLElement) {
            if (lightThemeEnabled && isHomePage()) {
                homeContainer.setAttribute('data-tm-chat-surface', 'light');
            } else {
                homeContainer.removeAttribute('data-tm-chat-surface');
            }
        }
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

    function parseOpacityPercentInput(value, fallback = DEFAULT_MENTION_OPACITY) {
        const num = Number(String(value).trim().replace(',', '.'));
        if (Number.isNaN(num)) return clamp(fallback, 0, 100);
        return clamp(num, 0, 100);
    }

    function parseMentionSoundCooldownInput(value, fallback = DEFAULT_MENTION_SOUND_COOLDOWN_SECONDS) {
        const num = Number(String(value).trim().replace(',', '.'));
        if (Number.isNaN(num)) return clamp(fallback, 0, 300);
        return clamp(num, 0, 300);
    }

    function normalizeMentionSoundStyle(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'bell' || raw === 'soft' || raw === 'double' || raw === 'custom') return raw;
        return DEFAULT_MENTION_SOUND_STYLE;
    }

    function normalizeMentionSoundCustomUrl(value) {
        const raw = String(value || '').trim();
        if (!raw) return DEFAULT_MENTION_SOUND_CUSTOM_URL;
        if (/^https?:\/\//i.test(raw)) return raw;
        if (/^data:audio\//i.test(raw)) return raw;
        return DEFAULT_MENTION_SOUND_CUSTOM_URL;
    }

    function normalizeHighlightUserConfig(value) {
        if (typeof value === 'string') {
            return {
                color: normalizeHexColor(value, DEFAULT_HIGHLIGHT_COLOR),
                opacityPercent: DEFAULT_HIGHLIGHT_OPACITY
            };
        }

        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {
                color: DEFAULT_HIGHLIGHT_COLOR,
                opacityPercent: DEFAULT_HIGHLIGHT_OPACITY
            };
        }

        return {
            color: normalizeHexColor(value.color, DEFAULT_HIGHLIGHT_COLOR),
            opacityPercent: parseOpacityPercentInput(value.opacityPercent, DEFAULT_HIGHLIGHT_OPACITY)
        };
    }

    function hashString(value) {
        let hash = 5381;
        const input = String(value || '');

        for (let i = 0; i < input.length; i += 1) {
            hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
        }

        return (hash >>> 0).toString(36);
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
        if (isChatPage()) return getChatPageMessagesRoot() || document.body;
        if (isHomePage()) return getHomepageMessagesRoot();
        return null;
    }

    function normalizeChatContextLabel(label) {
        return String(label || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    function getChatPageHeaderTitle() {
        if (!isChatPage()) return '';

        const titles = Array.from(document.querySelectorAll('h2.text-sm.font-semibold.text-white.truncate'));
        for (const title of titles) {
            const value = String(title.textContent || '').trim();
            if (!value) continue;
            if (normalizeChatContextLabel(value) === 'chat') continue;
            return value;
        }

        return '';
    }

    function getChatPageHeaderElement() {
        if (!isChatPage()) return null;

        const titles = Array.from(document.querySelectorAll('h2.text-sm.font-semibold.text-white.truncate'));
        for (const title of titles) {
            const value = String(title.textContent || '').trim();
            if (!value) continue;
            if (normalizeChatContextLabel(value) === 'chat') continue;

            const header = title.closest('div');
            if (header instanceof HTMLElement) {
                return header;
            }
        }

        return null;
    }

    function getChatPageMessagesRoot() {
        if (!isChatPage()) return null;

        const header = getChatPageHeaderElement();
        if (!(header instanceof HTMLElement)) return null;

        const container = header.parentElement;
        if (!(container instanceof HTMLElement)) return null;

        const scrollers = Array.from(container.querySelectorAll('.custom-scrollbar'));
        for (const scroller of scrollers) {
            if (
                scroller instanceof HTMLElement &&
                scroller.querySelector('.group.relative.flex.items-start')
            ) {
                return scroller;
            }
        }

        return null;
    }

    function logMentionDebug(message, details = null) {
        if (!debugMode) return;

        if (details === null) {
            console.debug('[Torr9 Chat][Mention]', message);
            return;
        }

        console.debug('[Torr9 Chat][Mention]', message, details);
    }

    function normalizeMentionComparableText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .trim()
            .toLowerCase();
    }

    function getCurrentChatContext() {
        if (!isChatPage()) return null;

        const headerTitle = getChatPageHeaderTitle();
        if (headerTitle) {
            if (headerTitle.startsWith('#')) {
                return {
                    type: 'channel',
                    name: headerTitle.slice(1).trim()
                };
            }

            return {
                type: 'private',
                name: headerTitle
            };
        }

        return null;
    }

    function getCurrentChatContextKey() {
        if (isHomePage()) return 'home';
        if (!isChatPage()) return 'other';

        const context = getCurrentChatContext();
        if (!context) return 'chat:unknown';

        return `${context.type}:${normalizeChatContextLabel(context.name)}`;
    }

    function isMentionAndHighlightContextAllowed() {
        if (isHomePage()) return true;
        if (!isChatPage()) return false;

        const context = getCurrentChatContext();
        if (!context) return true;

        return context.type === 'channel' && ALLOWED_CHAT_CHANNELS.has(normalizeChatContextLabel(context.name));
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
        const settingsButtonHtml = `
            <button type="button" data-tm-action="open-settings" title="Ouvrir les paramètres" aria-label="Ouvrir les paramètres" style="
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
                font-size:14px;
                font-weight:600;
                line-height:1;
            ">⚙</button>
        `;

        if (statsCollapsed) {
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                    <div style="font-weight:700;font-size:13px;color:#fff;">
                        Messages bloqués
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        ${settingsButtonHtml}
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
                </div>

                <div style="font-size:12px;color:#cfcfcf;">
                    Total session : <span style="color:#fff;font-weight:700;">${total}</span>
                </div>

                <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#9ca3af;line-height:1.45;">
                    <p>Ctrl+Alt+C ou Ctrl+Cmd+C : paramètres · Alt+clic pseudo : pour blacklister</p>
                    <p>${debugMode ? 'toggle · Debug ON' : ''}</p>
                </div>
            `;
        }

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;color:#fff;">
                    Messages bloqués
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    ${settingsButtonHtml}
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
                <p>Ctrl+Alt+C ou Ctrl+Cmd+C : paramètres · Alt+clic pseudo : pour blacklister</p>
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

    function applyHighlightStyle(messageEl, username, highlightConfig) {
        const color = normalizeHexColor(highlightConfig?.color, DEFAULT_HIGHLIGHT_COLOR);
        const opacityPercent = parseOpacityPercentInput(highlightConfig?.opacityPercent, DEFAULT_HIGHLIGHT_OPACITY);
        const baseAlpha = opacityPercent / 100;
        const accentColor = hexToRgba(color, Math.min(1, baseAlpha * 5.15));
        const edgeColor = hexToRgba(color, Math.min(1, baseAlpha * 7));

        messageEl.style.removeProperty('display');
        messageEl.style.background = hexToRgba(color, baseAlpha);
        messageEl.style.outline = `1px solid ${accentColor}`;
        messageEl.style.boxShadow = `inset 3px 0 0 ${edgeColor}`;
        messageEl.setAttribute('data-tm-highlight-user', username);
        messageEl.title = `Mis en avant : ${username}`;
    }

    function applyMentionHighlightStyle(messageEl) {
        const color = normalizeHexColor(mentionSettings.color, DEFAULT_MENTION_COLOR);
        const opacityPercent = parseOpacityPercentInput(mentionSettings.opacityPercent, DEFAULT_MENTION_OPACITY);
        const baseAlpha = opacityPercent / 100;
        const accentColor = hexToRgba(color, Math.min(1, baseAlpha * 4.55));
        const blinkSeconds = parseBlinkSecondsInput(mentionSettings.blinkSeconds, DEFAULT_MENTION_BLINK_SECONDS);
        const keepHighlightAfterBlink = mentionSettings.keepHighlightAfterBlink !== false;
        const highlightedUsername = normalizeName(getLogicalUsername(messageEl) || '');
        const fallbackHighlightConfig = highlightedUsername ? highlightedUsers[highlightedUsername] : null;
        const signature = `${color}|${opacityPercent}|${blinkSeconds}|${keepHighlightAfterBlink ? 'keep' : 'off'}`;
        const existingState = mentionBlinkStates.get(messageEl);

        ensureMentionAnimationStyle();

        messageEl.style.removeProperty('display');
        messageEl.style.background = hexToRgba(color, baseAlpha);
        messageEl.style.outline = `1px solid ${accentColor}`;
        messageEl.style.boxShadow = `inset 3px 0 0 ${accentColor}`;
        messageEl.style.setProperty('--tm-mention-color', accentColor);
        messageEl.style.setProperty('--tm-mention-glow-soft', hexToRgba(color, Math.min(1, baseAlpha * 1.22)));
        messageEl.style.setProperty('--tm-mention-glow-strong', hexToRgba(color, Math.min(1, baseAlpha * 3.22)));
        messageEl.style.setProperty('--tm-mention-bg-soft', hexToRgba(color, Math.min(1, baseAlpha * 0.33)));
        messageEl.style.setProperty('--tm-mention-bg-strong', hexToRgba(color, Math.min(1, baseAlpha * 1.78)));
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
                messageEl.style.background = hexToRgba(color, baseAlpha);
                messageEl.style.outline = `1px solid ${accentColor}`;
                messageEl.style.boxShadow = `inset 3px 0 0 ${accentColor}`;
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

            if (fallbackHighlightConfig && highlightedUsername) {
                applyHighlightStyle(messageEl, highlightedUsername, fallbackHighlightConfig);
            }

            mentionBlinkStates.set(messageEl, { signature, timeoutId: null });
        }, blinkSeconds * 1000);

        mentionBlinkStates.set(messageEl, { signature, timeoutId });
    }

    async function playMentionNotificationSound(
        soundStyle = mentionSettings.soundStyle,
        customSoundUrl = mentionSettings.soundCustomUrl
    ) {
        const normalizedStyle = normalizeMentionSoundStyle(soundStyle);
        const normalizedCustomUrl = normalizeMentionSoundCustomUrl(customSoundUrl);

        if (normalizedStyle === 'custom') {
            if (!normalizedCustomUrl) return false;

            try {
                if (!mentionSoundElement) {
                    mentionSoundElement = new Audio();
                    mentionSoundElement.preload = 'auto';
                }

                mentionSoundElement.pause();
                mentionSoundElement.currentTime = 0;
                mentionSoundElement.src = normalizedCustomUrl;
                mentionSoundElement.volume = 1;
                await mentionSoundElement.play();
                return true;
            } catch (e) {
                return false;
            }
        }

        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return false;

        if (!mentionSoundContext) {
            mentionSoundContext = new AudioContextCtor();
        }

        if (mentionSoundContext.state === 'suspended') {
            try {
                await mentionSoundContext.resume();
            } catch (e) {
                return false;
            }
        }

        const now = mentionSoundContext.currentTime;

        function scheduleTone({
            type = 'sine',
            startOffset = 0,
            duration = 0.24,
            fromFrequency = 880,
            toFrequency = 1320,
            peakGain = 0.1,
            attack = 0.015,
            releaseOffset = null
        }) {
            const startTime = now + Math.max(0, startOffset);
            const stopTime = startTime + Math.max(0.05, duration);
            const oscillator = mentionSoundContext.createOscillator();
            const gainNode = mentionSoundContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(fromFrequency, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                Math.max(40, toFrequency),
                stopTime
            );

            gainNode.gain.setValueAtTime(0.0001, startTime);
            gainNode.gain.exponentialRampToValueAtTime(
                Math.max(0.0002, peakGain),
                startTime + Math.min(attack, duration / 2)
            );
            gainNode.gain.exponentialRampToValueAtTime(
                0.0001,
                releaseOffset === null ? stopTime : startTime + Math.min(duration, releaseOffset)
            );

            oscillator.connect(gainNode);
            gainNode.connect(mentionSoundContext.destination);
            oscillator.start(startTime);
            oscillator.stop(stopTime);
        }

        if (normalizedStyle === 'soft') {
            scheduleTone({
                type: 'triangle',
                duration: 0.34,
                fromFrequency: 440,
                toFrequency: 700,
                peakGain: 0.075,
                attack: 0.018,
                releaseOffset: 0.3
            });
        } else if (normalizedStyle === 'bell') {
            scheduleTone({
                type: 'triangle',
                duration: 0.48,
                fromFrequency: 1040,
                toFrequency: 1680,
                peakGain: 0.095,
                attack: 0.01,
                releaseOffset: 0.4
            });
            scheduleTone({
                type: 'sine',
                startOffset: 0.025,
                duration: 0.42,
                fromFrequency: 1560,
                toFrequency: 2280,
                peakGain: 0.048,
                attack: 0.008,
                releaseOffset: 0.32
            });
        } else if (normalizedStyle === 'double') {
            scheduleTone({
                type: 'square',
                duration: 0.16,
                fromFrequency: 620,
                toFrequency: 980,
                peakGain: 0.07,
                attack: 0.01,
                releaseOffset: 0.12
            });
            scheduleTone({
                type: 'square',
                startOffset: 0.2,
                duration: 0.17,
                fromFrequency: 760,
                toFrequency: 1180,
                peakGain: 0.082,
                attack: 0.01,
                releaseOffset: 0.12
            });
        } else {
            scheduleTone({
                type: 'sine',
                duration: 0.26,
                fromFrequency: 920,
                toFrequency: 1560,
                peakGain: 0.09,
                attack: 0.012,
                releaseOffset: 0.22
            });
        }

        return true;
    }

    function maybeNotifyMention(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return;
        if (!mentionSettings.soundEnabled) {
            logMentionDebug('skip: sound disabled');
            return;
        }
        if (mentionSoundNotifiedMessages.has(messageEl)) {
            logMentionDebug('skip: message element already handled for this session');
            return;
        }

        const signature = getMentionNotificationSignature(messageEl);
        logMentionDebug('candidate', {
            signature,
            lastMentionSoundRecord,
            recentMentionSoundRecordsCount: recentMentionSoundRecords.length,
            lastMentionSoundAt,
            messageText: getMessageTextContent(messageEl),
            messageTimestamp: getMessageTimestampText(messageEl)
        });

        if (signature && hasRememberedMentionSoundRecord(signature)) {
            logMentionDebug('skip: already covered by recent history', {
                signature,
                recentMentionSoundRecordsCount: recentMentionSoundRecords.length
            });
            mentionSoundNotifiedMessages.add(messageEl);
            return;
        }

        if (
            signature &&
            lastMentionSoundRecord &&
            (
                (
                    signature.messageTimestampKey > 0 &&
                    lastMentionSoundRecord.messageTimestampKey > 0 &&
                    signature.messageTimestampKey < lastMentionSoundRecord.messageTimestampKey
                ) ||
                (
                    signature.messageTimestampKey === lastMentionSoundRecord.messageTimestampKey &&
                    signature.hash === lastMentionSoundRecord.hash
                ) ||
                (
                    (
                        signature.messageTimestampKey <= 0 ||
                        lastMentionSoundRecord.messageTimestampKey <= 0
                    ) &&
                    signature.hash === lastMentionSoundRecord.hash
                )
            )
        ) {
            logMentionDebug('skip: already covered by last record', {
                signature,
                lastMentionSoundRecord
            });
            rememberMentionSoundRecord({
                hash: signature.hash,
                messageTimestamp: signature.messageTimestamp,
                messageTimestampKey: signature.messageTimestampKey,
                notifiedAt: lastMentionSoundRecord.notifiedAt
            });
            mentionSoundNotifiedMessages.add(messageEl);
            return;
        }

        mentionSoundNotifiedMessages.add(messageEl);

        const cooldownSeconds = parseMentionSoundCooldownInput(
            mentionSettings.soundCooldownSeconds,
            DEFAULT_MENTION_SOUND_COOLDOWN_SECONDS
        );
        const now = Date.now();

        if (cooldownSeconds > 0 && now - lastMentionSoundAt < cooldownSeconds * 1000) {
            logMentionDebug('skip: cooldown active', {
                signature,
                cooldownSeconds,
                now,
                lastMentionSoundAt,
                remainingMs: Math.max(0, cooldownSeconds * 1000 - (now - lastMentionSoundAt))
            });
            if (signature) {
                saveLastMentionSoundRecord({
                    hash: signature.hash,
                    messageTimestamp: signature.messageTimestamp,
                    messageTimestampKey: signature.messageTimestampKey,
                    notifiedAt: lastMentionSoundAt
                });
                rememberMentionSoundRecord({
                    hash: signature.hash,
                    messageTimestamp: signature.messageTimestamp,
                    messageTimestampKey: signature.messageTimestampKey,
                    notifiedAt: lastMentionSoundAt
                });
            }
            return;
        }

        const previousLastMentionSoundAt = lastMentionSoundAt;
        if (signature) {
            logMentionDebug('record: pre-play', {
                signature,
                previousLastMentionSoundAt,
                attemptAt: now
            });
            saveLastMentionSoundRecord({
                hash: signature.hash,
                messageTimestamp: signature.messageTimestamp,
                messageTimestampKey: signature.messageTimestampKey,
                notifiedAt: previousLastMentionSoundAt
            });
            rememberMentionSoundRecord({
                hash: signature.hash,
                messageTimestamp: signature.messageTimestamp,
                messageTimestampKey: signature.messageTimestampKey,
                notifiedAt: previousLastMentionSoundAt
            });
        }

        lastMentionSoundAt = now;
        void playMentionNotificationSound(mentionSettings.soundStyle, mentionSettings.soundCustomUrl).then((played) => {
            if (!played) {
                logMentionDebug('play result: failed', {
                    signature,
                    attemptedAt: now,
                    previousLastMentionSoundAt
                });
                if (lastMentionSoundAt === now) {
                    lastMentionSoundAt = previousLastMentionSoundAt;
                }
                return;
            }
            if (!signature) return;
            logMentionDebug('play result: success', {
                signature,
                notifiedAt: now
            });
            saveLastMentionSoundRecord({
                hash: signature.hash,
                messageTimestamp: signature.messageTimestamp,
                messageTimestampKey: signature.messageTimestampKey,
                notifiedAt: now
            });
            rememberMentionSoundRecord({
                hash: signature.hash,
                messageTimestamp: signature.messageTimestamp,
                messageTimestampKey: signature.messageTimestampKey,
                notifiedAt: now
            });
        });
    }

    function hideOrShowMessage(messageEl, options = {}) {
        const allowMentionSound = options.allowMentionSound === true;
        const allowMentionAndHighlight = options.allowMentionAndHighlight !== false;
        applyMessageTypography(messageEl);
        updateMessageTextBlockUrls(messageEl);

        const username = getLogicalUsername(messageEl);

        if (!username) {
            messageEl.style.removeProperty('display');
            clearDebugStyle(messageEl);
            return;
        }

        const normalized = normalizeName(username);
        const highlightConfig = highlightedUsers[normalized];
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
        } else if (allowMentionAndHighlight && mentionsWatchedUser) {
            clearDebugStyle(messageEl);
            applyMentionHighlightStyle(messageEl);
            if (allowMentionSound) {
                maybeNotifyMention(messageEl);
            }
        } else if (allowMentionAndHighlight && highlightConfig) {
            clearDebugStyle(messageEl);
            applyHighlightStyle(messageEl, normalized, highlightConfig);
        } else {
            messageEl.style.removeProperty('display');
            clearDebugStyle(messageEl);
        }
    }

    function processAllMessages() {
        if (isHomePage() && homeChatCollapsed) return;

        const root = getActiveChatRoot();
        if (!root) return;
        const allowMentionAndHighlight = isMentionAndHighlightContextAllowed();

        const allDivs = root.querySelectorAll('div');
        allDivs.forEach(el => {
            if (isChatMessage(el)) {
                hideOrShowMessage(el, {
                    allowMentionSound: false,
                    allowMentionAndHighlight
                });
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
        const allowMentionAndHighlight = isMentionAndHighlightContextAllowed();

        if (isChatMessage(node)) {
            hideOrShowMessage(node, {
                allowMentionSound: true,
                allowMentionAndHighlight
            });
        }

        node.querySelectorAll?.('div').forEach(el => {
            if (isChatMessage(el)) {
                hideOrShowMessage(el, {
                    allowMentionSound: true,
                    allowMentionAndHighlight
                });
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

    function addOrUpdateHighlightedUser(usernameRaw, colorRaw, opacityPercentRaw) {
        const username = normalizeName(usernameRaw);
        if (!username) return { ok: false, message: 'Pseudo vide.' };

        const color = normalizeHexColor(colorRaw);
        const opacityPercent = parseOpacityPercentInput(opacityPercentRaw, DEFAULT_HIGHLIGHT_OPACITY);
        const hadHighlight = !!highlightedUsers[username];

        highlightedUsers[username] = { color, opacityPercent };
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

    function updateMentionSettings(
        usernameRaw,
        colorRaw,
        opacityPercentRaw,
        blinkSecondsRaw,
        keepHighlightAfterBlinkRaw,
        includeReplyContextRaw,
        soundEnabledRaw,
        soundStyleRaw,
        soundCustomUrlRaw,
        soundCooldownSecondsRaw
    ) {
        const username = normalizeName(usernameRaw);
        const color = normalizeHexColor(colorRaw, DEFAULT_MENTION_COLOR);
        const opacityPercent = parseOpacityPercentInput(opacityPercentRaw, DEFAULT_MENTION_OPACITY);
        const blinkSeconds = parseBlinkSecondsInput(blinkSecondsRaw, DEFAULT_MENTION_BLINK_SECONDS);
        const keepHighlightAfterBlink = !!keepHighlightAfterBlinkRaw;
        const includeReplyContext = !!includeReplyContextRaw;
        const soundEnabled = !!soundEnabledRaw;
        const soundStyle = normalizeMentionSoundStyle(soundStyleRaw);
        const soundCustomUrl = normalizeMentionSoundCustomUrl(soundCustomUrlRaw);
        const soundCooldownSeconds = parseMentionSoundCooldownInput(
            soundCooldownSecondsRaw,
            DEFAULT_MENTION_SOUND_COOLDOWN_SECONDS
        );

        saveMentionSettings({
            username,
            color,
            opacityPercent,
            blinkSeconds,
            keepHighlightAfterBlink,
            includeReplyContext,
            soundEnabled,
            soundStyle,
            soundCustomUrl,
            soundCooldownSeconds
        });
        processAllMessages();
        updateStatsBox();

        if (!mentionSettings.username) {
            return { ok: true, message: 'Surveillance des mentions desactivee.' };
        }

        return {
            ok: true,
            message: mentionSettings.soundEnabled
                ? `Mentions surveillees pour @${mentionSettings.username} avec son`
                : `Mentions surveillees pour @${mentionSettings.username}`
        };
    }

    function closeSettingsModal() {
        const modal = document.getElementById(MODAL_ID);
        const overlay = document.getElementById(OVERLAY_ID);
        if (modal) modal.remove();
        if (overlay) overlay.remove();
        modalOpen = false;
        hideImagePreview();
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

        if (action === 'open-settings') {
            event.preventDefault();
            event.stopPropagation();
            openSettingsModal();
            return;
        }

    }

    function openSettingsModal() {
        if (!isSupportedPage()) return;
        if (modalOpen) return;

        modalOpen = true;
        hideImagePreview();

        const currentPos = loadPosition();
        const currentPageLabel = getCurrentPageLabel();
        const homeView = isHomePage();
        const settingsColumnCount = window.innerWidth >= 780 ? 2 : 1;
        const settingsCardStyle = `
            display:inline-block;
            width:100%;
            padding:12px;
            margin:0 0 14px 0;
            border-radius:14px;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.06);
            box-sizing:border-box;
            break-inside:avoid;
            vertical-align:top;
        `;

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '1000000';
        overlay.style.background = 'rgba(0,0,0,0.45)';

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
            column-count:${settingsColumnCount};
            column-gap:14px;
        ">
            ${homeView ? `
            <div style="${settingsCardStyle}">
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

            <div style="${settingsCardStyle}">
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

            <div style="${settingsCardStyle}">
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

                <label style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    cursor:pointer;
                    font-size:12px;
                    color:#d4d4d8;
                    margin-top:12px;
                ">
                    <input id="tm-linkify-urls-toggle" type="checkbox" ${linkifyUrlsEnabled ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#06b6d4;
                        cursor:pointer;
                    ">
                    <span>Rendre les URLs cliquables</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Détecte les liens dans les messages et les transforme en liens cliquables.
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
                    <input id="tm-embed-url-images-toggle" type="checkbox" ${embedUrlImagesEnabled ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#22c55e;
                        cursor:pointer;
                    ">
                    <span>Prévisualiser les liens directs d'images au survol</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Affiche un aperçu flottant uniquement pour les URLs qui pointent directement vers un fichier image.
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
                    <input id="tm-light-theme-toggle" type="checkbox" ${lightThemeEnabled ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#f59e0b;
                        cursor:pointer;
                    ">
                    <span>Theme clair <span style="font-weight:700;text-decoration:underline;">BETA</span> pour la shoutbox</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Eclaircit la zone de chat, les messages, la stats box et les toasts du script. Reglage enregistre separement pour ${currentPageLabel}.
                </div>
            </div>

            <div style="${settingsCardStyle}">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Astuces</div>

                <div style="display:grid;gap:10px;">
                    <div style="padding:10px 12px;border-radius:12px;background:rgba(37,99,235,0.12);border:1px solid rgba(37,99,235,0.24);">
                        <div style="font-size:12px;font-weight:700;color:#dbeafe;">Ctrl+Alt+C ou Ctrl+Cmd+C</div>
                        <div style="margin-top:4px;font-size:11px;color:#93c5fd;line-height:1.45;">
                            Ouvre directement cette page de paramètres.
                        </div>
                    </div>

                    <div style="padding:10px 12px;border-radius:12px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.24);">
                        <div style="font-size:12px;font-weight:700;color:#fde68a;">Alt+clic sur un pseudo</div>
                        <div style="margin-top:4px;font-size:11px;color:#fcd34d;line-height:1.45;">
                            Ajoute ou retire rapidement un utilisateur de la blacklist.
                        </div>
                    </div>

                    ${isChatPage() ? `
                    <div style="padding:10px 12px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.24);">
                        <div style="font-size:12px;font-weight:700;color:#bbf7d0;">Double-clic sur un message</div>
                        <div style="margin-top:4px;font-size:11px;color:#86efac;line-height:1.45;">
                            Lance la réponse au message sans passer par le bouton d’action.
                        </div>
                    </div>

                    <div style="padding:10px 12px;border-radius:12px;background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.24);">
                        <div style="font-size:12px;font-weight:700;color:#a5f3fc;">Click long sur un message</div>
                        <div style="margin-top:4px;font-size:11px;color:#67e8f9;line-height:1.45;">
                            Ouvre les réactions, avec le picker repositionné à droite du pointeur.
                        </div>
                    </div>
                    ` : `
                    <div style="padding:10px 12px;border-radius:12px;background:rgba(63,63,70,0.6);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:12px;font-weight:700;color:#f4f4f5;">Raccourcis du chat dédié</div>
                        <div style="margin-top:4px;font-size:11px;color:#a1a1aa;line-height:1.45;">
                            Les gestes double-clic pour répondre et click long pour réagir ne sont actifs que sur la page Chat, pas sur la shout de l’accueil.
                        </div>
                    </div>
                    `}
                </div>
            </div>

            <div style="${settingsCardStyle}">
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

            <div style="${settingsCardStyle}">
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

                <div style="display:grid;gap:8px;margin-top:12px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#c4c4c8;">
                            <span>Opacité</span>
                            <span id="tm-highlight-opacity-value">${DEFAULT_HIGHLIGHT_OPACITY}%</span>
                        </span>
                        <input id="tm-highlight-opacity-input" type="range" min="0" max="100" step="1" value="${DEFAULT_HIGHLIGHT_OPACITY}"
                            title="Opacité %"
                            style="
                                width:100%;
                                accent-color:#f59e0b;
                                cursor:pointer;
                            ">
                    </label>

                    <div>
                        <div style="font-size:12px;color:#c4c4c8;margin-bottom:6px;">Aperçu</div>
                        <div id="tm-highlight-preview" style="
                            padding:10px 12px;
                            border-radius:12px;
                            background:rgba(245,158,11,0.14);
                            border:1px solid rgba(245,158,11,0.42);
                            box-shadow:inset 3px 0 0 rgba(245,158,11,0.75);
                        ">
                            <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#d4d4d8;margin-bottom:4px;">
                                <span style="font-weight:700;color:#fff;">Pseudo</span>
                                <span id="tm-highlight-preview-meta">Mise en avant</span>
                            </div>
                            <div id="tm-highlight-preview-text" style="font-size:12px;color:#f4f4f5;line-height:1.45;">
                                Exemple de message mis en avant.
                            </div>
                        </div>
                    </div>
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

            <div style="${settingsCardStyle}">
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
                </div>

                <div style="display:grid;gap:10px;margin-top:12px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#c4c4c8;">
                            <span>Opacité</span>
                            <span id="tm-mention-opacity-value">${mentionSettings.opacityPercent}%</span>
                        </span>
                        <input id="tm-mention-opacity-input" type="range" min="0" max="100" step="1" value="${mentionSettings.opacityPercent}"
                            title="Opacité %"
                            style="
                                width:100%;
                                accent-color:#22c55e;
                                cursor:pointer;
                            ">
                    </label>

                    <div style="font-size:11px;color:#71717a;line-height:1.4;">
                        Ajuste la transparence de la surbrillance.
                    </div>

                    <div>
                        <div style="font-size:12px;color:#c4c4c8;margin-bottom:6px;">Aperçu</div>
                        <div id="tm-mention-preview" style="
                            padding:10px 12px;
                            border-radius:12px;
                            background:rgba(34,197,94,0.18);
                            border:1px solid rgba(34,197,94,0.45);
                            box-shadow:inset 3px 0 0 rgba(34,197,94,0.7);
                        ">
                            <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#d4d4d8;margin-bottom:4px;">
                                <span style="font-weight:700;color:#fff;">Pseudo</span>
                                <span id="tm-mention-preview-meta">Mention @moi</span>
                            </div>
                            <div id="tm-mention-preview-text" style="font-size:12px;color:#f4f4f5;line-height:1.45;">
                                Exemple de message contenant une mention.
                            </div>
                        </div>
                    </div>
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
                    <input id="tm-mention-include-reply-toggle" type="checkbox" ${mentionSettings.includeReplyContext ? 'checked' : ''} style="
                        width:16px;
                        height:16px;
                        accent-color:#06b6d4;
                        cursor:pointer;
                    ">
                    <span>Considérer aussi les réponses citées vers @moi</span>
                </label>

                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px;">
                    <label style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        cursor:pointer;
                        font-size:12px;
                        color:#d4d4d8;
                    ">
                        <input id="tm-mention-sound-toggle" type="checkbox" ${mentionSettings.soundEnabled ? 'checked' : ''} style="
                            width:16px;
                            height:16px;
                            accent-color:#38bdf8;
                            cursor:pointer;
                        ">
                        <span>Son de notification</span>
                    </label>
                </div>

                <div id="tm-mention-sound-options" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px;">
                    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#c4c4c8;">
                        <span>Son</span>
                        <select id="tm-mention-sound-style-select"
                            style="
                                min-width:120px;
                                background:#18181b;
                                color:#fff;
                                border:1px solid rgba(255,255,255,0.10);
                                border-radius:10px;
                                padding:10px 12px;
                                outline:none;
                            ">
                            <option value="ping" ${mentionSettings.soundStyle === 'ping' ? 'selected' : ''}>Ping</option>
                            <option value="soft" ${mentionSettings.soundStyle === 'soft' ? 'selected' : ''}>Doux</option>
                            <option value="bell" ${mentionSettings.soundStyle === 'bell' ? 'selected' : ''}>Cloche</option>
                            <option value="double" ${mentionSettings.soundStyle === 'double' ? 'selected' : ''}>Double</option>
                            <option value="custom" ${mentionSettings.soundStyle === 'custom' ? 'selected' : ''}>Personnalisé</option>
                        </select>
                    </label>

                    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#c4c4c8;flex:1 1 240px;min-width:0;">
                        <span>URL audio</span>
                        <input id="tm-mention-sound-custom-url-input" type="text" placeholder="https://.../son.mp3" value="${escapeHtml(mentionSettings.soundCustomUrl || '')}"
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
                    </label>

                    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#c4c4c8;">
                        <span>Délai mini</span>
                        <input id="tm-mention-sound-cooldown-input" type="number" min="0" max="300" step="0.5" value="${mentionSettings.soundCooldownSeconds}"
                            style="
                                width:90px;
                                background:#18181b;
                                color:#fff;
                                border:1px solid rgba(255,255,255,0.10);
                                border-radius:10px;
                                padding:10px 12px;
                                outline:none;
                            ">
                        <span>s</span>
                    </label>

                    <button id="tm-mention-sound-test" type="button" style="
                        border:none;
                        background:#2563eb;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Tester le son</button>
                </div>

                <div style="display:flex;justify-content:flex-start;gap:8px;flex-wrap:wrap;margin-top:12px;">
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

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Quand un message contient @tonpseudo, il est surligne avec cette couleur. Tu peux aussi inclure les réponses citées, régler l'opacité, mettre 0 seconde pour desactiver le clignotement, choisir un son si besoin et laisser le pseudo vide pour couper la surveillance.
                </div>
            </div>

            <div style="${settingsCardStyle}">
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
                    En mode debug, les messages blacklistés ne sont pas cachés : ils sont surlignés en rouge.
                </div>

            </div>
        </div>

        <div id="tm-feedback" style="
            min-height:20px;
            margin-top:4px;
            font-size:12px;
            color:#93c5fd;
        "></div>
    `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#tm-close-modal');
        const userInput = modal.querySelector('#tm-user-input');
        const toggleBtn = modal.querySelector('#tm-user-toggle');
        const hiddenUsersList = modal.querySelector('#tm-hidden-users-list');
        const highlightUserInput = modal.querySelector('#tm-highlight-user-input');
        const highlightColorInput = modal.querySelector('#tm-highlight-color-input');
        const highlightOpacityInput = modal.querySelector('#tm-highlight-opacity-input');
        const highlightOpacityValue = modal.querySelector('#tm-highlight-opacity-value');
        const highlightPreview = modal.querySelector('#tm-highlight-preview');
        const highlightPreviewMeta = modal.querySelector('#tm-highlight-preview-meta');
        const highlightPreviewText = modal.querySelector('#tm-highlight-preview-text');
        const highlightSaveBtn = modal.querySelector('#tm-highlight-save');
        const highlightRemoveBtn = modal.querySelector('#tm-highlight-remove');
        const highlightUsersList = modal.querySelector('#tm-highlight-users-list');
        const mentionUserInput = modal.querySelector('#tm-mention-user-input');
        const mentionColorInput = modal.querySelector('#tm-mention-color-input');
        const mentionOpacityInput = modal.querySelector('#tm-mention-opacity-input');
        const mentionOpacityValue = modal.querySelector('#tm-mention-opacity-value');
        const mentionBlinkInput = modal.querySelector('#tm-mention-blink-input');
        const mentionPreview = modal.querySelector('#tm-mention-preview');
        const mentionPreviewMeta = modal.querySelector('#tm-mention-preview-meta');
        const mentionPreviewText = modal.querySelector('#tm-mention-preview-text');
        const mentionKeepHighlightToggle = modal.querySelector('#tm-mention-keep-highlight-toggle');
        const mentionIncludeReplyToggle = modal.querySelector('#tm-mention-include-reply-toggle');
        const mentionSoundToggle = modal.querySelector('#tm-mention-sound-toggle');
        const mentionSoundOptions = modal.querySelector('#tm-mention-sound-options');
        const mentionSoundStyleSelect = modal.querySelector('#tm-mention-sound-style-select');
        const mentionSoundCustomUrlInput = modal.querySelector('#tm-mention-sound-custom-url-input');
        const mentionSoundCooldownInput = modal.querySelector('#tm-mention-sound-cooldown-input');
        const mentionSoundTestBtn = modal.querySelector('#tm-mention-sound-test');
        const mentionSaveBtn = modal.querySelector('#tm-mention-save');
        const fontSizeRange = modal.querySelector('#tm-font-size-range');
        const fontSizeValue = modal.querySelector('#tm-font-size-value');
        const fontSizeDecreaseBtn = modal.querySelector('#tm-font-size-decrease');
        const fontSizeIncreaseBtn = modal.querySelector('#tm-font-size-increase');
        const fontSizeSaveBtn = modal.querySelector('#tm-font-size-save');
        const fontSizeResetBtn = modal.querySelector('#tm-font-size-reset');
        const linkifyUrlsToggle = modal.querySelector('#tm-linkify-urls-toggle');
        const embedUrlImagesToggle = modal.querySelector('#tm-embed-url-images-toggle');
        const lightThemeToggle = modal.querySelector('#tm-light-theme-toggle');
        const rightInput = modal.querySelector('#tm-right-input');
        const rightValue = modal.querySelector('#tm-right-value');
        const bottomInput = modal.querySelector('#tm-bottom-input');
        const bottomValue = modal.querySelector('#tm-bottom-value');
        const resetPositionBtn = modal.querySelector('#tm-reset-position');
        const hideStatsToggle = modal.querySelector('#tm-hide-stats-toggle');
        const debugToggle = modal.querySelector('#tm-debug-toggle');
        const homeCollapseToggle = modal.querySelector('#tm-home-collapse-toggle-setting');
        const feedback = modal.querySelector('#tm-feedback');

        function setFeedback(message, isError = false) {
            feedback.textContent = message;
            feedback.style.color = isError ? '#fca5a5' : '#93c5fd';
        }

        function syncMentionSoundControlsState() {
            const soundEnabled = mentionSoundToggle?.checked === true;
            const customSoundSelected = mentionSoundStyleSelect?.value === 'custom';

            if (mentionSoundOptions) {
                mentionSoundOptions.style.display = soundEnabled ? 'flex' : 'none';
            }

            if (mentionSoundStyleSelect) {
                mentionSoundStyleSelect.disabled = !soundEnabled;
            }

            if (mentionSoundCooldownInput) {
                mentionSoundCooldownInput.disabled = !soundEnabled;
            }

            if (mentionSoundCustomUrlInput) {
                mentionSoundCustomUrlInput.disabled = !soundEnabled || !customSoundSelected;
            }

            if (mentionSoundTestBtn) {
                mentionSoundTestBtn.disabled = !soundEnabled;
                mentionSoundTestBtn.style.cursor = soundEnabled ? 'pointer' : 'not-allowed';
            }
        }

        function syncHighlightOpacityValue() {
            const opacityPercent = parseOpacityPercentInput(
                highlightOpacityInput?.value,
                DEFAULT_HIGHLIGHT_OPACITY
            );
            const previewColor = normalizeHexColor(highlightColorInput?.value, DEFAULT_HIGHLIGHT_COLOR);
            const previewAlpha = opacityPercent / 100;
            const previewAccent = hexToRgba(previewColor, Math.min(1, previewAlpha * 5.15));
            const previewUsername = normalizeName(highlightUserInput?.value || '') || 'pseudo';

            if (highlightOpacityInput) {
                highlightOpacityInput.value = String(opacityPercent);
            }

            if (highlightOpacityValue) {
                highlightOpacityValue.textContent = `${opacityPercent}%`;
            }

            if (highlightPreview instanceof HTMLElement) {
                highlightPreview.style.background = hexToRgba(previewColor, previewAlpha);
                highlightPreview.style.border = `1px solid ${previewAccent}`;
                highlightPreview.style.boxShadow = `inset 3px 0 0 ${previewAccent}`;
            }

            if (highlightPreviewMeta) {
                highlightPreviewMeta.textContent = `Mise en avant : ${previewUsername}`;
            }

            if (highlightPreviewText) {
                highlightPreviewText.textContent = `Exemple de message de ${previewUsername} mis en avant.`;
            }
        }

        function syncMentionOpacityPreview() {
            const previewColor = normalizeHexColor(mentionColorInput?.value, DEFAULT_MENTION_COLOR);
            const previewOpacity = parseOpacityPercentInput(mentionOpacityInput?.value, mentionSettings.opacityPercent);
            const previewAlpha = previewOpacity / 100;
            const previewAccent = hexToRgba(previewColor, Math.min(1, previewAlpha * 4.55));
            const previewUsername = normalizeName(mentionUserInput?.value || '') || 'moi';

            if (mentionOpacityInput) {
                mentionOpacityInput.value = String(previewOpacity);
            }

            if (mentionOpacityValue) {
                mentionOpacityValue.textContent = `${previewOpacity}%`;
            }

            if (mentionPreview instanceof HTMLElement) {
                mentionPreview.style.background = hexToRgba(previewColor, previewAlpha);
                mentionPreview.style.border = `1px solid ${previewAccent}`;
                mentionPreview.style.boxShadow = `inset 3px 0 0 ${previewAccent}`;
            }

            if (mentionPreviewMeta) {
                mentionPreviewMeta.textContent = `Mention @${previewUsername}`;
            }

            if (mentionPreviewText) {
                mentionPreviewText.textContent = `Exemple de message contenant @${previewUsername}.`;
            }
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

            for (const [user, config] of users) {
                const color = normalizeHexColor(config?.color, DEFAULT_HIGHLIGHT_COLOR);
                const opacityPercent = parseOpacityPercentInput(config?.opacityPercent, DEFAULT_HIGHLIGHT_OPACITY);
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.textContent = user;
                chip.style.border = `1px solid ${hexToRgba(color, 0.38)}`;
                chip.style.background = hexToRgba(color, opacityPercent / 100);
                chip.style.color = color;
                chip.style.borderRadius = '999px';
                chip.style.padding = '6px 10px';
                chip.style.fontSize = '12px';
                chip.style.cursor = 'pointer';
                chip.style.lineHeight = '1.2';

                chip.addEventListener('click', () => {
                    highlightUserInput.value = user;
                    highlightColorInput.value = normalizeHexColor(color);
                    if (highlightOpacityInput) {
                        highlightOpacityInput.value = String(opacityPercent);
                    }
                    syncHighlightOpacityValue();
                    highlightUserInput.focus();
                    highlightUserInput.select();
                    setFeedback(`Mise en avant chargee : ${user}`);
                });

                highlightUsersList.appendChild(chip);
            }
        }

        function getPreviewPosition() {
            const fallback = loadPosition();
            return {
                rightPercent: parsePercentInput(rightInput.value, fallback.rightPercent, MAX_STATS_RIGHT_PERCENT),
                bottomPercent: parsePercentInput(bottomInput.value, fallback.bottomPercent, MAX_STATS_BOTTOM_PERCENT)
            };
        }

        function syncPositionValueLabels(position) {
            if (rightValue) rightValue.textContent = `${formatNumberInputValue(position.rightPercent, MAX_STATS_RIGHT_PERCENT)}%`;
            if (bottomValue) bottomValue.textContent = `${formatNumberInputValue(position.bottomPercent, MAX_STATS_BOTTOM_PERCENT)}%`;
        }

        function previewPosition() {
            const preview = getPreviewPosition();
            syncPositionValueLabels(preview);
            applyBoxPosition(preview);
        }

        function commitPreviewPosition(showMessage = true) {
            const newPos = getPreviewPosition();

            rightInput.value = formatNumberInputValue(newPos.rightPercent, MAX_STATS_RIGHT_PERCENT);
            bottomInput.value = formatNumberInputValue(newPos.bottomPercent, MAX_STATS_BOTTOM_PERCENT);
            syncPositionValueLabels(newPos);

            savePosition(newPos);
            applyBoxPosition(newPos);
            updateStatsBox();

            if (showMessage) {
                setFeedback(`Position enregistrée pour ${currentPageLabel}.`);
            }
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
            const result = addOrUpdateHighlightedUser(
                highlightUserInput.value,
                highlightColorInput.value,
                highlightOpacityInput?.value
            );
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

        highlightUserInput.addEventListener('input', syncHighlightOpacityValue);
        highlightColorInput?.addEventListener('input', syncHighlightOpacityValue);
        highlightOpacityInput?.addEventListener('input', syncHighlightOpacityValue);

        mentionSaveBtn.addEventListener('click', () => {
            const result = updateMentionSettings(
                mentionUserInput.value,
                mentionColorInput.value,
                mentionOpacityInput?.value,
                mentionBlinkInput.value,
                mentionKeepHighlightToggle?.checked,
                mentionIncludeReplyToggle?.checked,
                mentionSoundToggle?.checked,
                mentionSoundStyleSelect?.value,
                mentionSoundCustomUrlInput?.value,
                mentionSoundCooldownInput?.value
            );

            mentionUserInput.value = mentionSettings.username;
            mentionColorInput.value = mentionSettings.color;
            if (mentionOpacityInput) {
                mentionOpacityInput.value = String(mentionSettings.opacityPercent);
            }
            syncMentionOpacityPreview();
            mentionBlinkInput.value = String(mentionSettings.blinkSeconds);
            if (mentionKeepHighlightToggle) {
                mentionKeepHighlightToggle.checked = mentionSettings.keepHighlightAfterBlink;
            }
            if (mentionIncludeReplyToggle) {
                mentionIncludeReplyToggle.checked = mentionSettings.includeReplyContext;
            }
            if (mentionSoundToggle) {
                mentionSoundToggle.checked = mentionSettings.soundEnabled;
            }
            if (mentionSoundStyleSelect) {
                mentionSoundStyleSelect.value = mentionSettings.soundStyle;
            }
            if (mentionSoundCustomUrlInput) {
                mentionSoundCustomUrlInput.value = mentionSettings.soundCustomUrl || '';
            }
            if (mentionSoundCooldownInput) {
                mentionSoundCooldownInput.value = String(mentionSettings.soundCooldownSeconds);
            }
            syncMentionSoundControlsState();
            setFeedback(result.message, !result.ok);
        });

        mentionUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mentionSaveBtn.click();
            }
        });

        mentionUserInput.addEventListener('input', syncMentionOpacityPreview);

        mentionColorInput?.addEventListener('input', syncMentionOpacityPreview);

        mentionBlinkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mentionSaveBtn.click();
            }
        });

        mentionOpacityInput?.addEventListener('input', syncMentionOpacityPreview);

        mentionSoundCooldownInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mentionSaveBtn.click();
            }
        });

        mentionSoundToggle?.addEventListener('change', syncMentionSoundControlsState);
        mentionSoundStyleSelect?.addEventListener('change', syncMentionSoundControlsState);

        mentionSoundCustomUrlInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mentionSaveBtn.click();
            }
        });

        mentionSoundTestBtn?.addEventListener('click', async () => {
            if (mentionSoundToggle?.checked !== true) return;

            const played = await playMentionNotificationSound(
                mentionSoundStyleSelect?.value,
                mentionSoundCustomUrlInput?.value
            );
            setFeedback(
                played ? 'Son de notification testé.' : 'Impossible de jouer le son pour le moment.',
                !played
            );
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

        linkifyUrlsToggle?.addEventListener('change', () => {
            saveLinkifyUrlsEnabled(linkifyUrlsToggle.checked);
            processAllMessages();
            setFeedback(
                linkifyUrlsEnabled
                    ? 'URLs cliquables activées.'
                    : 'URLs cliquables désactivées.'
            );
        });

        embedUrlImagesToggle?.addEventListener('change', () => {
            saveEmbedUrlImagesEnabled(embedUrlImagesToggle.checked);
            processAllMessages();
            setFeedback(
                embedUrlImagesEnabled
                    ? 'Prévisualisation des images au survol activée.'
                    : 'Prévisualisation des images au survol désactivée.'
            );
        });

        lightThemeToggle?.addEventListener('change', () => {
            saveLightThemeEnabled(lightThemeToggle.checked);
            applyLightThemeState();
            processAllMessages();
            if (lightThemeEnabled) {
                showToast(`Theme clair BETA active pour ${currentPageLabel}. Feature tout juste commencee, rendu encore evolutif.`);
            }
            setFeedback(lightThemeEnabled ? `Theme clair active pour ${currentPageLabel}.` : `Theme clair desactive pour ${currentPageLabel}.`);
        });

        rightInput.addEventListener('input', previewPosition);
        bottomInput.addEventListener('input', previewPosition);
        rightInput.addEventListener('change', () => commitPreviewPosition(false));
        bottomInput.addEventListener('change', () => commitPreviewPosition(false));

        hideStatsToggle?.addEventListener('change', () => {
            saveStatsHidden(hideStatsToggle.checked);
            applyStatsBoxVisibilityState();
            setFeedback(statsHidden ? `Stats box masquée pour ${currentPageLabel}.` : `Stats box affichée pour ${currentPageLabel}.`);
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
        syncHighlightOpacityValue();
        syncMentionSoundControlsState();
        syncMentionOpacityPreview();
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

    function getMessageTimestampText(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return '';

        if (isChatPage()) {
            const metaSpans = Array.from(messageEl.querySelectorAll(':scope > .flex-1.min-w-0 > .flex.items-baseline span'));
            const parsedCandidate = metaSpans
                .map((span) => (span.textContent || '').trim())
                .find((text) => parseMessageTimestampKey(text) > 0);

            if (parsedCandidate) return parsedCandidate;

            return metaSpans
                .map((span) => (span.textContent || '').trim())
                .filter(Boolean)
                .pop() || '';
        }

        if (isHomePage()) {
            const metaSpans = messageEl.querySelectorAll(':scope > .flex-1.min-w-0 > .flex.items-center span:not(.text-xs.font-bold)');
            return Array.from(metaSpans)
                .map((span) => span.textContent.trim())
                .filter(Boolean)
                .join(' | ');
        }

        return '';
    }

    function parseMessageTimestampKey(timestampText) {
        const raw = String(timestampText || '').trim();
        if (!raw) return 0;

        const match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*[aà]\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
        if (!match) return 0;

        const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, secondRaw = '0'] = match;
        const day = Number(dayRaw);
        const monthIndex = Number(monthRaw) - 1;
        const year = Number(yearRaw);
        const hour = Number(hourRaw);
        const minute = Number(minuteRaw);
        const second = Number(secondRaw);

        const timestamp = new Date(year, monthIndex, day, hour, minute, second).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function getMentionNotificationSignature(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return null;

        const username = normalizeName(getLogicalUsername(messageEl) || '');
        const messageText = getMessageTextContent(messageEl);
        const replyContextText = getMessageReplyContextText(messageEl);
        const messageTimestamp = getMessageTimestampText(messageEl);
        const messageTimestampKey = parseMessageTimestampKey(messageTimestamp);

        if (!username || (!messageText && !replyContextText)) {
            logMentionDebug('signature: invalid message data', {
                username,
                messageText,
                replyContextText,
                messageTimestamp,
                messageTimestampKey
            });
            return null;
        }

        if (messageTimestamp && messageTimestampKey <= 0) {
            logMentionDebug('signature: timestamp not parsed, using hash fallback only', {
                username,
                messageTimestamp,
                messageText,
                replyContextText
            });
        }

        return {
            hash: hashString(`${location.pathname}|${username}|${messageTimestamp}|${replyContextText}|${messageText}`),
            messageTimestamp,
            messageTimestampKey
        };
    }

    function getMessageReplyContextText(messageEl) {
        if (!(messageEl instanceof HTMLElement) || !isChatPage()) return '';

        const replyButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-center.gap-2.mb-1.text-xs button[type="button"]');
        return String(replyButton?.textContent || '').trim();
    }

    function getButtonSearchLabel(button) {
        if (!(button instanceof HTMLButtonElement)) return '';

        return normalizeMentionComparableText(
            [
                button.getAttribute('aria-label'),
                button.getAttribute('title'),
                button.textContent
            ]
                .filter(Boolean)
                .join(' ')
        );
    }

    function getMessageActionButtonsContainer(messageEl) {
        if (!(messageEl instanceof HTMLElement) || !isChatPage()) return null;

        return messageEl.querySelector(
            ':scope > .absolute.right-2.-top-3.flex.items-center.gap-0\\.5.bg-zinc-900.border.border-zinc-700.rounded-lg.shadow-lg.px-1.py-0\\.5.z-10'
        );
    }

    function getMessageReplyActionButton(messageEl) {
        if (!(messageEl instanceof HTMLElement) || !isChatPage()) return null;

        const actionButtonsContainer = getMessageActionButtonsContainer(messageEl);
        const directReplyButton = actionButtonsContainer?.querySelector('button[title="Repondre"]');
        if (directReplyButton instanceof HTMLButtonElement) {
            return directReplyButton;
        }

        const usernameButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline button[type="button"]');
        const replyContextButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-center.gap-2.mb-1.text-xs button[type="button"]');
        const buttons = Array.from(
            (actionButtonsContainer || messageEl).querySelectorAll('button')
        );

        const labeledReplyButton = buttons.find((button) => {
            if (!(button instanceof HTMLButtonElement)) return false;
            if (button === usernameButton || button === replyContextButton) return false;

            const label = getButtonSearchLabel(button);

            return /\b(repondre|reponse|reply)\b/.test(label);
        });

        if (labeledReplyButton instanceof HTMLButtonElement) {
            return labeledReplyButton;
        }

        const iconOnlyButtons = buttons.filter((button) => {
            if (!(button instanceof HTMLButtonElement)) return false;
            if (button === usernameButton || button === replyContextButton) return false;

            const label = getButtonSearchLabel(button);
            if (label) return false;
            return !!button.querySelector('svg');
        });

        return iconOnlyButtons.length === 1 ? iconOnlyButtons[0] : null;
    }

    function getMessageReactionActionButton(messageEl) {
        if (!(messageEl instanceof HTMLElement) || !isChatPage()) return null;

        const actionButtonsContainer = getMessageActionButtonsContainer(messageEl);
        const directReactionButton = actionButtonsContainer?.querySelector('button[title="Reagir"]');
        if (directReactionButton instanceof HTMLButtonElement) {
            return directReactionButton;
        }

        const usernameButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline button[type="button"]');
        const replyContextButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-center.gap-2.mb-1.text-xs button[type="button"]');
        const replyActionButton = getMessageReplyActionButton(messageEl);
        const buttons = Array.from(
            (actionButtonsContainer || messageEl).querySelectorAll('button')
        );

        const labeledReactionButton = buttons.find((button) => {
            if (!(button instanceof HTMLButtonElement)) return false;
            if (button === usernameButton || button === replyContextButton || button === replyActionButton) return false;

            const label = getButtonSearchLabel(button);
            return /\b(reaction|reactions|reagir|react|emoji|emojis|emote)\b/.test(label);
        });

        if (labeledReactionButton instanceof HTMLButtonElement) {
            return labeledReactionButton;
        }

        const iconOnlyButtons = buttons.filter((button) => {
            if (!(button instanceof HTMLButtonElement)) return false;
            if (button === usernameButton || button === replyContextButton || button === replyActionButton) return false;

            const label = getButtonSearchLabel(button);
            if (label) return false;
            return !!button.querySelector('svg');
        });

        return iconOnlyButtons.length === 1 ? iconOnlyButtons[0] : null;
    }

    function isReactionPickerElement(element) {
        if (!(element instanceof HTMLDivElement)) return false;
        if (!element.classList.contains('absolute')) return false;
        if (!element.classList.contains('bg-zinc-900')) return false;
        if (!element.classList.contains('border-zinc-700')) return false;
        if (!element.classList.contains('rounded-xl')) return false;
        if (!element.classList.contains('shadow-2xl')) return false;
        if (!element.classList.contains('z-50')) return false;

        const quickReactionsGrid = element.querySelector(':scope > div.grid.grid-cols-8');
        const customReactionsGrid = element.querySelector(':scope > div > div.grid.grid-cols-7');
        return !!quickReactionsGrid && !!customReactionsGrid;
    }

    function findVisibleReactionPicker() {
        const candidates = Array.from(document.querySelectorAll('div')).filter(isReactionPickerElement);
        return candidates.find((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }) || null;
    }

    function positionReactionPickerNearPointer(clientX, clientY, attempt = 0) {
        const picker = findVisibleReactionPicker();
        if (!(picker instanceof HTMLElement)) {
            if (attempt >= 8) return;
            window.setTimeout(() => {
                positionReactionPickerNearPointer(clientX, clientY, attempt + 1);
            }, 24);
            return;
        }

        picker.style.position = 'fixed';
        picker.style.right = 'auto';
        picker.style.left = '-9999px';
        picker.style.top = '-9999px';

        const rect = picker.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        const nextLeft = clamp(clientX + LONG_PRESS_REACTION_PICKER_OFFSET_X, 8, maxLeft);
        const nextTop = clamp(clientY + LONG_PRESS_REACTION_PICKER_OFFSET_Y, 8, maxTop);

        picker.style.left = `${nextLeft}px`;
        picker.style.top = `${nextTop}px`;
    }

    function splitTrailingUrlSuffix(rawUrl) {
        let url = String(rawUrl || '');
        let suffix = '';

        while (url) {
            const lastChar = url.slice(-1);

            if (/[.,!?;:]/.test(lastChar)) {
                suffix = lastChar + suffix;
                url = url.slice(0, -1);
                continue;
            }

            if (lastChar === ')') {
                const opens = (url.match(/\(/g) || []).length;
                const closes = (url.match(/\)/g) || []).length;
                if (closes > opens) {
                    suffix = lastChar + suffix;
                    url = url.slice(0, -1);
                    continue;
                }
            }

            if (lastChar === ']') {
                const opens = (url.match(/\[/g) || []).length;
                const closes = (url.match(/\]/g) || []).length;
                if (closes > opens) {
                    suffix = lastChar + suffix;
                    url = url.slice(0, -1);
                    continue;
                }
            }

            if (lastChar === '}') {
                const opens = (url.match(/\{/g) || []).length;
                const closes = (url.match(/\}/g) || []).length;
                if (closes > opens) {
                    suffix = lastChar + suffix;
                    url = url.slice(0, -1);
                    continue;
                }
            }

            break;
        }

        return { url, suffix };
    }

    function createLinkifiedUrlElement(urlText) {
        const normalizedUrl = String(urlText || '').trim();
        if (!normalizedUrl) return null;

        const link = document.createElement('a');
        link.href = /^https?:\/\//i.test(normalizedUrl) ? normalizedUrl : `https://${normalizedUrl}`;
        link.textContent = normalizedUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-tm-linkified-url', '1');
        return link;
    }

    function getEmbeddableImageCandidates(rawUrl) {
        const normalizedUrl = String(rawUrl || '').trim();
        if (!normalizedUrl) return [];

        let parsedUrl;
        try {
            parsedUrl = new URL(normalizedUrl, location.origin);
        } catch (e) {
            return [];
        }

        if (!/^https?:$/i.test(parsedUrl.protocol)) return [];
        return DIRECT_IMAGE_PATH_RE.test(parsedUrl.pathname) ? [parsedUrl.href] : [];
    }

    function linkifyTextNodeUrls(textNode) {
        if (!(textNode instanceof Text)) return;

        const sourceText = textNode.nodeValue || '';
        if (!URL_CANDIDATE_RE.test(sourceText)) return;

        URL_MATCH_RE.lastIndex = 0;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let didReplace = false;
        let match;

        while ((match = URL_MATCH_RE.exec(sourceText)) !== null) {
            const rawUrl = match[0];
            const startIndex = match.index;
            const leadingText = sourceText.slice(lastIndex, startIndex);
            const { url, suffix } = splitTrailingUrlSuffix(rawUrl);

            if (leadingText) {
                fragment.appendChild(document.createTextNode(leadingText));
            }

            if (url) {
                const link = createLinkifiedUrlElement(url);
                if (link) {
                    fragment.appendChild(link);
                    didReplace = true;
                } else {
                    fragment.appendChild(document.createTextNode(rawUrl));
                }
            } else {
                fragment.appendChild(document.createTextNode(rawUrl));
            }

            if (suffix) {
                fragment.appendChild(document.createTextNode(suffix));
            }

            lastIndex = startIndex + rawUrl.length;
        }

        if (!didReplace) return;

        const trailingText = sourceText.slice(lastIndex);
        if (trailingText) {
            fragment.appendChild(document.createTextNode(trailingText));
        }

        textNode.replaceWith(fragment);
    }

    function linkifyMessageTextBlock(messageEl) {
        const textBlock = getMessageTextBlock(messageEl);
        if (!(textBlock instanceof HTMLElement)) return;

        ensureLinkifiedUrlStyle();

        const walker = document.createTreeWalker(
            textBlock,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
                    if (!URL_CANDIDATE_RE.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;

                    const parent = node.parentElement;
                    if (!(parent instanceof HTMLElement)) return NodeFilter.FILTER_REJECT;
                    if (parent.closest('a, button, textarea, script, style')) return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let currentNode = walker.nextNode();

        while (currentNode) {
            textNodes.push(currentNode);
            currentNode = walker.nextNode();
        }

        textNodes.forEach((node) => {
            linkifyTextNodeUrls(node);
        });
    }

    function syncEmbeddedImagePreviews(messageEl) {
        const textBlock = getMessageTextBlock(messageEl);
        if (!(textBlock instanceof HTMLElement)) return;

        const staleInlinePreviews = Array.from(textBlock.querySelectorAll('span[data-tm-embedded-image-preview="1"]'));
        staleInlinePreviews.forEach((preview) => {
            preview.remove();
        });

        const linkifiedLinks = Array.from(textBlock.querySelectorAll('a[data-tm-linkified-url="1"]'));

        if (!embedUrlImagesEnabled) {
            linkifiedLinks.forEach((link) => {
                link.removeAttribute('data-tm-linkified-image');
            });
            return;
        }

        ensureEmbeddedImageStyle();

        linkifiedLinks.forEach((link) => {
            if (!(link instanceof HTMLAnchorElement)) return;

            const candidateUrls = getEmbeddableImageCandidates(link.href);
            if (candidateUrls.length > 0) {
                link.setAttribute('data-tm-linkified-image', '1');
            } else {
                link.removeAttribute('data-tm-linkified-image');
            }
        });
    }

    function unlinkifyMessageTextBlock(messageEl) {
        const textBlock = getMessageTextBlock(messageEl);
        if (!(textBlock instanceof HTMLElement)) return;

        const previews = Array.from(textBlock.querySelectorAll('span[data-tm-embedded-image-preview="1"]'));
        previews.forEach((preview) => {
            preview.remove();
        });

        const links = Array.from(textBlock.querySelectorAll('a[data-tm-linkified-url="1"]'));
        links.forEach((link) => {
            link.replaceWith(document.createTextNode(link.textContent || ''));
        });

        textBlock.normalize();
    }

    function updateMessageTextBlockUrls(messageEl) {
        if (linkifyUrlsEnabled) {
            linkifyMessageTextBlock(messageEl);
            syncEmbeddedImagePreviews(messageEl);
            return;
        }

        unlinkifyMessageTextBlock(messageEl);
    }

    function getMessageTextBlock(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return null;

        if (isChatPage()) {
            return messageEl.querySelector(':scope > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words');
        }

        if (isHomePage()) {
            return messageEl.querySelector(':scope > .flex-1.min-w-0 > p.break-words.leading-snug');
        }

        return null;
    }

    function getMessageContentImageFromTarget(target) {
        if (!(target instanceof Element)) return null;

        const image = target.closest('img');
        if (!(image instanceof HTMLImageElement)) return null;
        if (image.closest(`#${PANEL_ID}, #${MODAL_ID}, #${OVERLAY_ID}, #${TOAST_ID}`)) return null;

        const messageEl = findMessageElementFromTarget(image);
        if (!messageEl || !messageEl.contains(image)) return null;

        const textBlock = getMessageTextBlock(messageEl);
        if (!(textBlock instanceof HTMLElement) || !textBlock.contains(image)) return null;
        if (!image.currentSrc && !image.src) return null;
        if ((image.naturalWidth && image.naturalWidth <= 32) || (image.naturalHeight && image.naturalHeight <= 32)) {
            return null;
        }

        return image;
    }

    function getMessageLinkImagePreviewCandidatesFromTarget(target) {
        if (!(target instanceof Element) || !embedUrlImagesEnabled) return null;

        const link = target.closest('a[data-tm-linkified-url="1"][data-tm-linkified-image="1"]');
        if (!(link instanceof HTMLAnchorElement)) return null;
        if (link.closest(`#${PANEL_ID}, #${MODAL_ID}, #${OVERLAY_ID}, #${TOAST_ID}`)) return null;

        const messageEl = findMessageElementFromTarget(link);
        if (!messageEl || !messageEl.contains(link)) return null;

        const textBlock = getMessageTextBlock(messageEl);
        if (!(textBlock instanceof HTMLElement) || !textBlock.contains(link)) return null;

        const candidateUrls = getEmbeddableImageCandidates(link.href);
        if (candidateUrls.length === 0) return null;

        return {
            hoverTarget: link,
            candidateUrls
        };
    }

    function getOrCreateImagePreview() {
        let preview = document.getElementById(IMAGE_PREVIEW_ID);
        if (preview) return preview;
        if (!document.body) return null;

        preview = document.createElement('div');
        preview.id = IMAGE_PREVIEW_ID;
        preview.style.position = 'fixed';
        preview.style.zIndex = '1000003';
        preview.style.display = 'none';
        preview.style.pointerEvents = 'none';
        preview.style.padding = '8px';
        preview.style.borderRadius = '14px';
        preview.style.background = 'rgba(24,24,27,0.96)';
        preview.style.border = '1px solid rgba(255,255,255,0.08)';
        preview.style.boxShadow = '0 18px 38px rgba(0,0,0,0.42)';
        preview.style.backdropFilter = 'blur(8px)';

        const img = document.createElement('img');
        img.alt = '';
        img.style.display = 'block';
        img.style.maxWidth = 'min(520px, calc(100vw - 40px))';
        img.style.maxHeight = 'min(70vh, 560px)';
        img.style.borderRadius = '10px';
        img.style.objectFit = 'contain';

        preview.appendChild(img);
        document.body.appendChild(preview);
        return preview;
    }

    function positionImagePreview(clientX, clientY) {
        const preview = document.getElementById(IMAGE_PREVIEW_ID);
        if (!(preview instanceof HTMLElement) || preview.style.display === 'none') return;

        const offset = 18;
        const rect = preview.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width - 12;
        const maxTop = window.innerHeight - rect.height - 12;
        const left = clamp(clientX + offset, 12, Math.max(12, maxLeft));
        const top = clamp(clientY + offset, 12, Math.max(12, maxTop));

        preview.style.left = `${left}px`;
        preview.style.top = `${top}px`;
    }

    function hideImagePreview() {
        hoveredMessageImage = null;

        const preview = document.getElementById(IMAGE_PREVIEW_ID);
        if (!(preview instanceof HTMLElement)) return;

        preview.style.display = 'none';
        preview.style.left = '-9999px';
        preview.style.top = '-9999px';

        const image = preview.firstElementChild;
        if (image instanceof HTMLImageElement) {
            image.onload = null;
            image.onerror = null;
            image.removeAttribute('src');
        }

        preview.removeAttribute('data-tm-preview-signature');
    }

    function showImagePreviewFromCandidates(hoverTarget, candidateUrls, clientX, clientY) {
        const preview = getOrCreateImagePreview();
        if (!(preview instanceof HTMLElement)) return;
        if (!(hoverTarget instanceof Element)) return;
        if (!Array.isArray(candidateUrls) || candidateUrls.length === 0) {
            hideImagePreview();
            return;
        }

        const previewImage = preview.firstElementChild;
        if (!(previewImage instanceof HTMLImageElement)) return;

        const candidateSignature = hashString(candidateUrls.join('|'));
        const alreadyLoaded = preview.getAttribute('data-tm-preview-signature') === candidateSignature;

        hoveredMessageImage = hoverTarget;

        if (alreadyLoaded && previewImage.currentSrc) {
            preview.style.display = 'block';
            positionImagePreview(clientX, clientY);
            return;
        }

        let candidateIndex = 0;

        preview.style.display = 'none';
        preview.style.left = '-9999px';
        preview.style.top = '-9999px';
        preview.setAttribute('data-tm-preview-signature', candidateSignature);

        function tryNextCandidate() {
            if (preview.getAttribute('data-tm-preview-signature') !== candidateSignature) return;

            if (candidateIndex >= candidateUrls.length) {
                if (hoveredMessageImage === hoverTarget) {
                    hideImagePreview();
                }
                return;
            }

            previewImage.src = candidateUrls[candidateIndex];
            candidateIndex += 1;
        }

        previewImage.onload = () => {
            if (preview.getAttribute('data-tm-preview-signature') !== candidateSignature) return;

            preview.style.display = 'block';
            positionImagePreview(clientX, clientY);
        };

        previewImage.onerror = () => {
            if (preview.getAttribute('data-tm-preview-signature') !== candidateSignature) return;
            tryNextCandidate();
        };

        tryNextCandidate();
    }

    function showImagePreview(imageEl, clientX, clientY) {
        const source = imageEl.currentSrc || imageEl.src;
        if (!source) {
            hideImagePreview();
            return;
        }

        showImagePreviewFromCandidates(imageEl, [source], clientX, clientY);
    }

    function messageMentionsWatchedUser(messageEl) {
        const watchedUsername = mentionSettings.username;
        if (!watchedUsername) return false;

        const messageText = getMessageTextContent(messageEl);
        const normalizedWatchedUsername = normalizeMentionComparableText(watchedUsername);
        const normalizedMessageText = normalizeMentionComparableText(messageText);
        const mentionRegex = new RegExp(
            `(^|[^\\p{L}\\p{N}_])@${escapeRegExp(normalizedWatchedUsername)}(?=$|[^\\p{L}\\p{N}_])`,
            'u'
        );
        const directMentionMatched = !!normalizedWatchedUsername && !!normalizedMessageText && mentionRegex.test(normalizedMessageText);

        let replyContextText = '';
        let normalizedReplyContextText = '';
        let replyMentionMatched = false;

        if (mentionSettings.includeReplyContext === true && isChatPage()) {
            replyContextText = getMessageReplyContextText(messageEl);
            normalizedReplyContextText = normalizeMentionComparableText(replyContextText).replace(/^@+/, '');
            replyMentionMatched = !!normalizedWatchedUsername && normalizedReplyContextText === normalizedWatchedUsername;
        }

        const matched = directMentionMatched || replyMentionMatched;

        logMentionDebug('mention check', {
            watchedUsername,
            normalizedWatchedUsername,
            messageText,
            normalizedMessageText,
            replyContextText,
            normalizedReplyContextText,
            directMentionMatched,
            replyMentionMatched,
            matched
        });

        return matched;
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

    function isExcludedMessageShortcutTarget(target) {
        if (!(target instanceof Element)) return true;

        return !!target.closest(
            [
                `#${PANEL_ID}`,
                `#${MODAL_ID}`,
                `#${OVERLAY_ID}`,
                `#${TOAST_ID}`,
                'button',
                'a',
                'textarea',
                'input',
                'select',
                'option',
                'label',
                'img'
            ].join(', ')
        );
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

    function installNativeReplyShortcutHandler() {
        document.addEventListener('dblclick', (event) => {
            if (modalOpen || !isChatPage()) return;
            if (event.button !== 0) return;

            const target = event.target;
            if (!(target instanceof Element)) return;
            if (isExcludedMessageShortcutTarget(target)) return;

            const messageEl = findMessageElementFromTarget(target);
            if (!messageEl || !messageEl.contains(target)) return;

            const replyButton = getMessageReplyActionButton(messageEl);
            if (!(replyButton instanceof HTMLButtonElement) || replyButton.disabled) return;

            event.preventDefault();
            event.stopPropagation();
            replyButton.click();
        }, true);
    }

    function clearLongPressReactionState() {
        if (!longPressReactionState) return;

        if (longPressReactionState.timerId) {
            clearTimeout(longPressReactionState.timerId);
        }

        longPressReactionState = null;
    }

    function installNativeReactionShortcutHandler() {
        document.addEventListener('pointerdown', (event) => {
            clearLongPressReactionState();

            if (modalOpen || !isChatPage()) return;
            if (!event.isPrimary || event.button !== 0) return;

            const target = event.target;
            if (!(target instanceof Element)) return;
            if (isExcludedMessageShortcutTarget(target)) return;

            const messageEl = findMessageElementFromTarget(target);
            if (!messageEl || !messageEl.contains(target)) return;

            const reactionButton = getMessageReactionActionButton(messageEl);
            if (!(reactionButton instanceof HTMLButtonElement) || reactionButton.disabled) return;

            const state = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                reactionButton,
                triggered: false,
                timerId: window.setTimeout(() => {
                    if (!longPressReactionState || longPressReactionState.pointerId !== event.pointerId) return;

                    longPressReactionState.triggered = true;
                    reactionButton.click();
                    positionReactionPickerNearPointer(event.clientX, event.clientY);
                }, LONG_PRESS_REACTION_DELAY_MS)
            };

            longPressReactionState = state;
        }, true);

        document.addEventListener('pointermove', (event) => {
            if (!longPressReactionState || longPressReactionState.pointerId !== event.pointerId) return;

            const movedX = Math.abs(event.clientX - longPressReactionState.startX);
            const movedY = Math.abs(event.clientY - longPressReactionState.startY);
            if (movedX > LONG_PRESS_REACTION_MOVE_THRESHOLD_PX || movedY > LONG_PRESS_REACTION_MOVE_THRESHOLD_PX) {
                clearLongPressReactionState();
            }
        }, true);

        document.addEventListener('pointerup', (event) => {
            if (!longPressReactionState || longPressReactionState.pointerId !== event.pointerId) return;
            clearLongPressReactionState();
        }, true);

        document.addEventListener('pointercancel', (event) => {
            if (!longPressReactionState || longPressReactionState.pointerId !== event.pointerId) return;
            clearLongPressReactionState();
        }, true);

        document.addEventListener('contextmenu', () => {
            clearLongPressReactionState();
        }, true);

        window.addEventListener('blur', () => {
            clearLongPressReactionState();
        });
    }

    function installImagePreviewHandler() {
        document.addEventListener('mousemove', (event) => {
            if (modalOpen || !isSupportedPage()) {
                if (hoveredMessageImage) hideImagePreview();
                return;
            }

            const linkPreview = getMessageLinkImagePreviewCandidatesFromTarget(event.target);
            if (linkPreview) {
                if (hoveredMessageImage !== linkPreview.hoverTarget) {
                    showImagePreviewFromCandidates(
                        linkPreview.hoverTarget,
                        linkPreview.candidateUrls,
                        event.clientX,
                        event.clientY
                    );
                    return;
                }

                positionImagePreview(event.clientX, event.clientY);
                return;
            }

            const image = getMessageContentImageFromTarget(event.target);
            if (!image) {
                if (hoveredMessageImage) hideImagePreview();
                return;
            }

            if (hoveredMessageImage !== image) {
                showImagePreview(image, event.clientX, event.clientY);
                return;
            }

            positionImagePreview(event.clientX, event.clientY);
        }, true);

        document.addEventListener('scroll', () => {
            if (hoveredMessageImage) hideImagePreview();
        }, true);
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function refreshForRoute() {
        lastChatContextKey = getCurrentChatContextKey();

        if (isSupportedPage()) {
            statsCollapsed = loadStatsCollapsed();
            statsHidden = loadStatsHidden();
            lightThemeEnabled = loadLightThemeEnabled();

            if (isHomePage() && !getHomepageChatContainer()) {
                stopObserver();
                return;
            }

            createStatsBox();
            applyHomepageChatCollapsedState();
            applyBoxPosition();
            applyLightThemeState();

            if (isHomePage() && homeChatCollapsed) {
                stopObserver();
            } else {
                processAllMessages();
                startObserver();
            }
        } else {
            lightThemeEnabled = false;
            applyLightThemeState();
            stopObserver();
            removeStatsBox();
            closeSettingsModal();
            hideImagePreview();
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
            } else if (isChatPage() && getCurrentChatContextKey() !== lastChatContextKey) {
                lastChatContextKey = getCurrentChatContextKey();
                processAllMessages();
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
        const key = String(e.key || '').toLowerCase();
        const isClassicShortcut = e.ctrlKey && e.altKey && !e.metaKey && key === 'c';
        const isMacShortcut = e.ctrlKey && e.metaKey && !e.altKey && key === 'c';

        if (isClassicShortcut || isMacShortcut) {
            if (!isSupportedPage()) return;
            e.preventDefault();
            openSettingsModal();
        }
    });

    function init() {
        installQuickToggleHandler();
        installNativeReplyShortcutHandler();
        installNativeReactionShortcutHandler();
        installImagePreviewHandler();
        installRouteWatcher();
        document.addEventListener('click', handleStatsBoxActionClick, true);
        refreshForRoute();
        console.log('[Torr9 Chat] Script actif. Raccourcis : Ctrl+Alt+C / Ctrl+Cmd+C');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
