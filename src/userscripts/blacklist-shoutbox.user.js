// ==UserScript==
// @name         Torr9 Chat - Shoutbox 2.0
// @namespace    http://tampermonkey.net/
// @version      2.50
// @description  Blacklist, mise en avant, mentions, réponses rapides contextuelles, Gif et confort avancé pour la shoutbox Torr9
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
    const STORAGE_KEY_CHAT_SCROLLBAR_ENABLED = 'tm_torr9_chat_scrollbar_enabled';
    const STORAGE_KEY_MESSAGE_ACTIONS_LEFT_ENABLED = 'tm_torr9_message_actions_left_enabled';
    const STORAGE_KEY_HIDE_CHAT_FOOTER_ENABLED = 'tm_torr9_hide_chat_footer_enabled';
    const STORAGE_KEY_LIGHT_THEME_HOME = 'tm_torr9_light_theme_home';
    const STORAGE_KEY_LIGHT_THEME_CHAT = 'tm_torr9_light_theme_chat';
    const STORAGE_KEY_LINKIFY_URLS = 'tm_torr9_linkify_urls';
    const STORAGE_KEY_EMBED_URL_IMAGES = 'tm_torr9_embed_url_images';
    const STORAGE_KEY_SAVED_PHRASES = 'tm_torr9_saved_phrases';
    const STORAGE_KEY_SAVED_PHRASES_ENABLED = 'tm_torr9_saved_phrases_enabled';
    const STORAGE_KEY_KLIPY_GIFS_ENABLED = 'tm_torr9_klipy_gifs_enabled';
    const STORAGE_KEY_CHAT_INPUT_TOOLBAR_ALIGN_RIGHT = 'tm_torr9_chat_input_toolbar_align_right';
    const PANEL_ID = 'tm-torr9-chat-stats';
    const MODAL_ID = 'tm-torr9-chat-modal';
    const OVERLAY_ID = 'tm-torr9-chat-overlay';
    const TOAST_ID = 'tm-torr9-chat-toast';
    const IMAGE_PREVIEW_ID = 'tm-torr9-image-preview';
    const HOME_COLLAPSE_BUTTON_ID = 'tm-home-chat-collapse-toggle';
    const PHRASES_MENU_WRAPPER_ID = 'tm-torr9-phrases-menu-wrapper';
    const GIF_MENU_WRAPPER_ID = 'tm-torr9-klipy-gif-wrapper';
    const MODAL_SCROLLBAR_STYLE_ID = 'tm-torr9-modal-scrollbar-style';
    const CHAT_SCROLLBAR_STYLE_ID = 'tm-torr9-chat-scrollbar-style';
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
    const DEFAULT_CHAT_SCROLLBAR_THICKNESS = 18;
    const DEFAULT_CHAT_SCROLLBAR_THUMB_BORDER = 4;
    const MAX_STATS_RIGHT_PERCENT = 100;
    const MAX_STATS_BOTTOM_PERCENT = 95;
    const MAX_RECENT_MENTION_SOUND_RECORDS = 40;
    const MAX_SAVED_PHRASE_LENGTH = 1000;
    const MAX_VISIBLE_SAVED_PHRASES_IN_MENU = 5;
    const SAVED_PHRASES_EXPORT_VERSION = 1;
    const SAVED_PHRASES_REPLY_CONTEXT_MAX_AGE_MS = 5 * 60 * 1000;
    const DEFAULT_KLIPY_GIFS_ENABLED = true;
    const KLIPY_API_BASE_URL = 'https://api.klipy.com/v2';
    // Test key provided locally for development. Replace it before any public rollout.
    const KLIPY_API_KEY = 'msjEFIejxUS9DvPCk5NAvbnF4HK1hfVEz8zpgFAoo5kpjkSGGIqIJYJ4WGx2cRhJ';
    const KLIPY_CLIENT_KEY = 'torr9-shoutbox-userscript';
    const KLIPY_MAX_RESULTS_PER_PAGE = 10;
    const KLIPY_SEARCH_MIN_LENGTH = 2;
    const KLIPY_SEARCH_DEBOUNCE_MS = 280;
    const KLIPY_CACHE_MAX_ENTRIES = 24;
    const LONG_PRESS_REACTION_DELAY_MS = 420;
    const LONG_PRESS_REACTION_MOVE_THRESHOLD_PX = 10;
    const LONG_PRESS_REACTION_PICKER_OFFSET_X = 18;
    const LONG_PRESS_REACTION_PICKER_OFFSET_Y = 0;
    const MENTION_STYLE_ID = 'tm-torr9-mention-style';
    const LIGHT_THEME_STYLE_ID = 'tm-torr9-light-theme-style';
    const LINKIFIED_URL_STYLE_ID = 'tm-torr9-linkified-url-style';
    const EMBEDDED_IMAGE_STYLE_ID = 'tm-torr9-embedded-image-style';
    const MESSAGE_ACTIONS_POSITION_STYLE_ID = 'tm-torr9-message-actions-position-style';
    const HIDE_CHAT_FOOTER_STYLE_ID = 'tm-torr9-hide-chat-footer-style';
    const HOME_CHAT_POPOVER_STYLE_ID = 'tm-torr9-home-chat-popover-style';
    const NATIVE_CHAT_INPUT_POPOVER_STYLE_ID = 'tm-torr9-native-chat-input-popover-style';
    const CHAT_INPUT_TOOLBAR_RAIL_ATTR = 'data-tm-chat-input-toolbar-rail';
    const CHAT_INPUT_TOOLBAR_SPACE_ATTR = 'data-tm-chat-input-toolbar-space';
    const CHAT_INPUT_TOOLBAR_RESERVED_HEIGHT_PX = 46;
    const HOME_CHAT_POPOVER_SURFACE_ATTR = 'data-tm-home-chat-popover-surface';
    const HOME_CHAT_POPOVER_PARENT_ATTR = 'data-tm-home-chat-popover-parent';
    const NATIVE_CHAT_INPUT_ACTION_HOST_ATTR = 'data-tm-native-chat-input-action-host';
    const NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR = 'data-tm-native-chat-input-action-source';
    const NATIVE_CHAT_INPUT_ACTION_PLACEHOLDER_ATTR = 'data-tm-native-chat-input-action-placeholder';
    const NATIVE_CHAT_INPUT_ACTION_POPOVER_SYNC_BOUND_ATTR = 'data-tm-native-chat-input-action-popover-sync-bound';
    const NATIVE_CHAT_INPUT_POPOVER_LIFTED_ATTR = 'data-tm-native-chat-input-popovers-lifted';
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
    let chatScrollbarEnabled = loadChatScrollbarEnabled();
    let messageActionsLeftEnabled = loadMessageActionsLeftEnabled();
    let hideChatFooterEnabled = loadHideChatFooterEnabled();
    let lightThemeEnabled = loadLightThemeEnabled();
    let linkifyUrlsEnabled = loadLinkifyUrlsEnabled();
    let embedUrlImagesEnabled = loadEmbedUrlImagesEnabled();
    let savedPhrasesEnabled = loadSavedPhrasesEnabled();
    let klipyGifsEnabled = loadKlipyGifsEnabled();
    let chatInputToolbarAlignRight = loadChatInputToolbarAlignRight();
    let mentionSoundContext = null;
    let mentionSoundElement = null;
    let lastMentionSoundRecord = loadLastMentionSoundRecord();
    let recentMentionSoundRecords = loadRecentMentionSoundRecords(lastMentionSoundRecord);
    let lastMentionSoundAt = lastMentionSoundRecord?.notifiedAt || 0;
    let lastChatContextKey = 'other';
    let longPressReactionState = null;
    let savedPhrasesToolbarEventsInstalled = false;
    let klipyGifToolbarEventsInstalled = false;
    let klipyGifSearchDebounceTimer = null;
    let klipyGifRequestSerial = 0;
    let savedPhrasesStorageNeedsRepair = false;
    let savedPhrasesReplyContext = null;

    const savedPhrases = loadSavedPhrases();
    if (savedPhrasesStorageNeedsRepair) {
        saveSavedPhrases();
    }
    const hiddenUsers = loadHiddenUsers();
    const highlightedUsers = loadHighlightedUsers();
    const sessionBlockedCounts = {};
    const alreadyCountedMessages = new WeakSet();
    const mentionBlinkStates = new WeakMap();
    const mentionSoundNotifiedMessages = new WeakSet();
    const klipyGifResponseCache = new Map();

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

    function extractSavedPhraseStringValue(value, depth = 0) {
        if (depth > 4 || value === null || value === undefined) return '';

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        if (Array.isArray(value)) {
            for (const entry of value) {
                const extractedEntry = extractSavedPhraseStringValue(entry, depth + 1);
                if (extractedEntry) return extractedEntry;
            }

            return '';
        }

        if (typeof value === 'object') {
            return extractSavedPhraseStringValue(
                value.text ?? value.phrase ?? value.content ?? value.value ?? value.label ?? value.title ?? value.name ?? '',
                depth + 1
            );
        }

        return '';
    }

    function normalizeSavedPhraseText(value, truncate = false) {
        const normalized = extractSavedPhraseStringValue(value).replace(/\r\n?/g, '\n').trim();
        if (!normalized) return '';

        if (truncate) {
            return normalized.slice(0, MAX_SAVED_PHRASE_LENGTH);
        }

        return normalized;
    }

    function normalizeSavedPhraseKeywords(value) {
        const rawKeywords = Array.isArray(value)
            ? value.flatMap((entry) => {
                const extractedEntry = extractSavedPhraseStringValue(entry);
                return extractedEntry ? extractedEntry.split(/[,;\n]+/) : [];
            })
            : normalizeSavedPhraseText(value).split(/[,;\n]+/);

        const seen = new Set();
        const keywords = [];

        for (const rawKeyword of rawKeywords) {
            const keyword = normalizeSavedPhraseText(rawKeyword);
            if (!keyword) continue;

            const normalizedKeyword = keyword.toLocaleLowerCase('fr');
            if (seen.has(normalizedKeyword)) continue;

            seen.add(normalizedKeyword);
            keywords.push(keyword);
        }

        return keywords;
    }

    function mergeSavedPhraseKeywords(...keywordGroups) {
        const mergedKeywords = [];

        for (const group of keywordGroups) {
            if (Array.isArray(group)) {
                mergedKeywords.push(...group);
            } else if (group !== undefined && group !== null) {
                mergedKeywords.push(group);
            }
        }

        return normalizeSavedPhraseKeywords(mergedKeywords);
    }

    function normalizeSavedPhraseRecord(record, truncateText = true) {
        if (typeof record === 'string' || typeof record === 'number' || typeof record === 'boolean') {
            const text = normalizeSavedPhraseText(record, truncateText);
            return text ? { text, keywords: [] } : null;
        }

        if (!record || typeof record !== 'object' || Array.isArray(record)) {
            return null;
        }

        const text = normalizeSavedPhraseText(
            record.text ?? record.phrase ?? record.content ?? record.value ?? record.label ?? '',
            truncateText
        );
        if (!text) return null;

        return {
            text,
            keywords: normalizeSavedPhraseKeywords(record.keywords)
        };
    }

    function loadSavedPhrases() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED_PHRASES) || '[]');
            if (!Array.isArray(parsed)) return [];

            savedPhrasesStorageNeedsRepair = false;

            const normalizedEntries = [];
            const seenTexts = new Set();

            parsed.forEach((entry) => {
                const normalizedEntry = normalizeSavedPhraseRecord(entry, true);
                if (!normalizedEntry) {
                    savedPhrasesStorageNeedsRepair = true;
                    return;
                }

                if (
                    typeof entry !== 'object' ||
                    entry === null ||
                    Array.isArray(entry) ||
                    typeof entry.text !== 'string' ||
                    !Array.isArray(entry.keywords)
                ) {
                    savedPhrasesStorageNeedsRepair = true;
                }

                if (seenTexts.has(normalizedEntry.text)) {
                    savedPhrasesStorageNeedsRepair = true;
                    return;
                }

                seenTexts.add(normalizedEntry.text);
                normalizedEntries.push(normalizedEntry);
            });

            return normalizedEntries;
        } catch (e) {
            savedPhrasesStorageNeedsRepair = false;
            return [];
        }
    }

    function saveSavedPhrases() {
        const normalizedEntries = savedPhrases
            .map((phrase) => normalizeSavedPhraseRecord(phrase, true))
            .filter(Boolean);

        savedPhrases.splice(0, savedPhrases.length, ...normalizedEntries);

        localStorage.setItem(
            STORAGE_KEY_SAVED_PHRASES,
            JSON.stringify(normalizedEntries.map((phrase) => ({
                text: phrase.text,
                keywords: [...phrase.keywords]
            })))
        );

        savedPhrasesStorageNeedsRepair = false;
    }

    function loadSavedPhrasesEnabled() {
        try {
            const rawValue = localStorage.getItem(STORAGE_KEY_SAVED_PHRASES_ENABLED);
            if (rawValue === null) return false;
            return rawValue === '1';
        } catch (e) {
            return false;
        }
    }

    function saveSavedPhrasesEnabled(value) {
        savedPhrasesEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_SAVED_PHRASES_ENABLED, savedPhrasesEnabled ? '1' : '0');
    }

    function loadKlipyGifsEnabled() {
        try {
            const rawValue = localStorage.getItem(STORAGE_KEY_KLIPY_GIFS_ENABLED);
            if (rawValue === null) return DEFAULT_KLIPY_GIFS_ENABLED;
            return rawValue === '1';
        } catch (e) {
            return DEFAULT_KLIPY_GIFS_ENABLED;
        }
    }

    function saveKlipyGifsEnabled(value) {
        klipyGifsEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_KLIPY_GIFS_ENABLED, klipyGifsEnabled ? '1' : '0');
    }

    function loadChatInputToolbarAlignRight() {
        try {
            return localStorage.getItem(STORAGE_KEY_CHAT_INPUT_TOOLBAR_ALIGN_RIGHT) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveChatInputToolbarAlignRight(value) {
        chatInputToolbarAlignRight = !!value;
        localStorage.setItem(STORAGE_KEY_CHAT_INPUT_TOOLBAR_ALIGN_RIGHT, chatInputToolbarAlignRight ? '1' : '0');
    }

    function formatSavedPhrasesCountLabel(count = savedPhrases.length) {
        const safeCount = Math.max(0, Number(count) || 0);
        return `${safeCount} phrase${safeCount > 1 ? 's' : ''}`;
    }

    function formatSavedPhrasesSummaryLabel() {
        return `${savedPhrasesEnabled ? 'Fonction active' : 'Fonction désactivée'} · ${formatSavedPhrasesCountLabel()} enregistrée${savedPhrases.length > 1 ? 's' : ''}`;
    }

    function formatSavedPhraseKeywordsLabel(keywords = []) {
        const safeKeywords = normalizeSavedPhraseKeywords(keywords);
        return safeKeywords.length > 0 ? safeKeywords.join(', ') : 'Aucun mot-clé';
    }

    function formatSavedPhraseLengthLabel(text = '') {
        return `${String(text ?? '').length}/${MAX_SAVED_PHRASE_LENGTH} caractères`;
    }

    function formatSavedPhraseKeywordsInputValue(keywords = []) {
        return normalizeSavedPhraseKeywords(keywords).join(', ');
    }

    function truncateSavedPhrasePreviewText(text = '', maxLength = 250) {
        const safeText = String(text ?? '');
        const safeMaxLength = Math.max(4, Number(maxLength) || 250);

        if (safeText.length <= safeMaxLength) {
            return safeText;
        }

        return `${safeText.slice(0, safeMaxLength - 3).trimEnd()}...`;
    }

    function normalizeSavedPhraseMatchText(value) {
        return normalizeMentionComparableText(value)
            .replace(/[^\p{L}\p{N}@#]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function tokenizeSavedPhraseMatchText(value) {
        const normalizedText = normalizeSavedPhraseMatchText(value);
        if (!normalizedText) return [];

        return Array.from(new Set(
            normalizedText
                .split(' ')
                .map((token) => token.trim())
                .filter((token) => token.length >= 3)
        ));
    }

    function getChatInputCurrentValue(input = getChatInput()) {
        if (!(input instanceof HTMLElement)) return '';

        if (input.isContentEditable) {
            return String(input.textContent || '').trim();
        }

        if ('value' in input) {
            return String(input.value || '').trim();
        }

        return '';
    }

    function clearSavedPhrasesReplyContext() {
        savedPhrasesReplyContext = null;
    }

    function setSavedPhrasesReplyContextFromMessage(messageEl) {
        if (!(messageEl instanceof HTMLElement) || !isChatPage()) return;

        const username = normalizeName(getLogicalUsername(messageEl) || '');
        const messageText = getMessageTextContent(messageEl);
        const replyContextText = getMessageReplyContextText(messageEl);

        if (!username && !messageText && !replyContextText) return;

        savedPhrasesReplyContext = {
            contextKey: getCurrentChatContextKey(),
            username,
            messageText,
            replyContextText,
            capturedAt: Date.now()
        };

        if (savedPhrasesEnabled) {
            injectSavedPhrasesToolbar();
        }
    }

    function getSavedPhrasesRankingContext(input = getChatInput()) {
        const inputText = getChatInputCurrentValue(input);
        const replyContextIsUsable =
            isChatPage() &&
            savedPhrasesReplyContext &&
            savedPhrasesReplyContext.contextKey === getCurrentChatContextKey() &&
            Date.now() - savedPhrasesReplyContext.capturedAt <= SAVED_PHRASES_REPLY_CONTEXT_MAX_AGE_MS;

        const replyText = replyContextIsUsable
            ? [
                savedPhrasesReplyContext.username,
                savedPhrasesReplyContext.replyContextText,
                savedPhrasesReplyContext.messageText
            ]
                .filter(Boolean)
                .join(' ')
            : '';

        return {
            inputText,
            inputNormalizedText: normalizeSavedPhraseMatchText(inputText),
            inputTokens: new Set(tokenizeSavedPhraseMatchText(inputText)),
            replyText,
            replyNormalizedText: normalizeSavedPhraseMatchText(replyText),
            replyTokens: new Set(tokenizeSavedPhraseMatchText(replyText))
        };
    }

    function getSavedPhraseMatchScore(phrase, context) {
        const normalizedPhrase = normalizeSavedPhraseRecord(phrase, true);
        if (!normalizedPhrase) {
            return {
                score: 0,
                matchedKeywords: [],
                matchedPhraseContent: false,
                phraseReplyOverlap: 0,
                phraseInputOverlap: 0
            };
        }

        let score = 0;
        let phraseReplyOverlap = 0;
        let phraseInputOverlap = 0;
        let matchedPhraseContent = false;
        const matchedKeywords = [];
        const inputText = context?.inputNormalizedText || '';
        const replyText = context?.replyNormalizedText || '';
        const inputTokens = context?.inputTokens instanceof Set ? context.inputTokens : new Set();
        const replyTokens = context?.replyTokens instanceof Set ? context.replyTokens : new Set();
        const normalizedPhraseText = normalizeSavedPhraseMatchText(normalizedPhrase.text);
        const phraseTextTokens = tokenizeSavedPhraseMatchText(normalizedPhrase.text);

        normalizedPhrase.keywords.forEach((keyword) => {
            const normalizedKeyword = normalizeSavedPhraseMatchText(keyword);
            if (!normalizedKeyword) return;

            const keywordTokens = tokenizeSavedPhraseMatchText(normalizedKeyword);
            let keywordMatched = false;

            if (replyText) {
                if (replyText.includes(normalizedKeyword)) {
                    score += normalizedKeyword.includes(' ') ? 18 : 14;
                    keywordMatched = true;
                } else if (keywordTokens.length > 0 && keywordTokens.every((token) => replyTokens.has(token))) {
                    score += 11 + keywordTokens.length;
                    keywordMatched = true;
                }
            }

            if (!keywordMatched && inputText) {
                if (inputText.includes(normalizedKeyword)) {
                    score += normalizedKeyword.includes(' ') ? 10 : 8;
                    keywordMatched = true;
                } else if (keywordTokens.length > 0 && keywordTokens.every((token) => inputTokens.has(token))) {
                    score += 6 + keywordTokens.length;
                    keywordMatched = true;
                }
            }

            if (keywordMatched) {
                matchedKeywords.push(keyword);
            }
        });

        if (normalizedPhraseText) {
            if (replyText) {
                if (replyText.includes(normalizedPhraseText)) {
                    score += normalizedPhraseText.includes(' ') ? 16 : 12;
                    matchedPhraseContent = true;
                } else if (phraseTextTokens.length > 1 && phraseTextTokens.every((token) => replyTokens.has(token))) {
                    score += 8 + phraseTextTokens.length;
                    matchedPhraseContent = true;
                }
            }

            if (!matchedPhraseContent && inputText) {
                if (inputText.includes(normalizedPhraseText)) {
                    score += normalizedPhraseText.includes(' ') ? 10 : 7;
                    matchedPhraseContent = true;
                } else if (phraseTextTokens.length > 1 && phraseTextTokens.every((token) => inputTokens.has(token))) {
                    score += 5 + phraseTextTokens.length;
                    matchedPhraseContent = true;
                }
            }
        }

        phraseTextTokens.forEach((token) => {
            if (replyTokens.has(token)) {
                phraseReplyOverlap += 1;
            }
            if (inputTokens.has(token)) {
                phraseInputOverlap += 1;
            }
        });

        score += Math.min(phraseReplyOverlap, 6) * 2;
        score += Math.min(phraseInputOverlap, 6);

        return {
            score,
            matchedKeywords,
            matchedPhraseContent,
            phraseReplyOverlap,
            phraseInputOverlap
        };
    }

    function computeSavedPhraseMatchPercent(score) {
        const numericScore = Number(score) || 0;
        if (numericScore <= 0) return 0;

        return clamp(Math.round((1 - Math.exp(-numericScore / 14)) * 100), 0, 100);
    }

    function getRankedSavedPhrases(input = getChatInput()) {
        const rankingContext = getSavedPhrasesRankingContext(input);
        const rankedPhrases = savedPhrases
            .map((entry, index) => {
                const phrase = normalizeSavedPhraseRecord(entry, true);
                if (!phrase) return null;

                if (phrase !== entry) {
                    savedPhrases[index] = phrase;
                }

                const matchData = getSavedPhraseMatchScore(phrase, rankingContext);
                return {
                    phrase,
                    originalIndex: index,
                    matchPercent: computeSavedPhraseMatchPercent(matchData.score),
                    ...matchData
                };
            })
            .filter(Boolean);

        const bestScore = rankedPhrases.reduce((maxScore, entry) => Math.max(maxScore, entry.score), 0);
        if (bestScore <= 0) {
            return rankedPhrases.sort((a, b) => a.originalIndex - b.originalIndex);
        }

        return rankedPhrases.sort((a, b) =>
            b.score - a.score ||
            Number(b.matchedPhraseContent) - Number(a.matchedPhraseContent) ||
            b.matchedKeywords.length - a.matchedKeywords.length ||
            b.phraseReplyOverlap - a.phraseReplyOverlap ||
            b.phraseInputOverlap - a.phraseInputOverlap ||
            a.originalIndex - b.originalIndex
        );
    }

    function buildSavedPhrasesExportPayload() {
        return {
            version: SAVED_PHRASES_EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            source: 'Torr9 Chat - Shoutbox 2.0',
            phrases: savedPhrases
                .map((phrase) => normalizeSavedPhraseRecord(phrase, true))
                .filter(Boolean)
                .map((phrase) => ({
                    text: phrase.text,
                    keywords: [...phrase.keywords]
                }))
        };
    }

    function downloadSavedPhrasesExport() {
        try {
            const exportPayload = JSON.stringify(buildSavedPhrasesExportPayload(), null, 2);
            const blob = new Blob([exportPayload], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const exportDate = new Date().toISOString().slice(0, 10);

            link.href = url;
            link.download = `torr9-reponses-rapides-${exportDate}.json`;
            link.style.display = 'none';

            document.body?.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 0);

            return { ok: true, message: 'Export JSON téléchargé.' };
        } catch (e) {
            return { ok: false, message: 'Impossible de générer l’export JSON.' };
        }
    }

    function extractSavedPhraseImportEntries(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (!payload || typeof payload !== 'object') {
            return null;
        }

        if (Array.isArray(payload.phrases)) {
            return payload.phrases;
        }

        if (Array.isArray(payload.savedPhrases)) {
            return payload.savedPhrases;
        }

        if (Array.isArray(payload.items)) {
            return payload.items;
        }

        return null;
    }

    function importSavedPhrases(payload) {
        const importedEntries = extractSavedPhraseImportEntries(payload);
        if (!Array.isArray(importedEntries)) {
            return { ok: false, message: 'Format JSON invalide pour les réponses rapides.' };
        }

        const existingEntriesByText = new Map();
        savedPhrases.forEach((entry, index) => {
            const normalizedEntry = normalizeSavedPhraseRecord(entry, true);
            if (!normalizedEntry) return;

            if (normalizedEntry !== entry) {
                savedPhrases[index] = normalizedEntry;
            }

            if (!existingEntriesByText.has(normalizedEntry.text)) {
                existingEntriesByText.set(normalizedEntry.text, savedPhrases[index]);
            }
        });

        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;
        let invalidCount = 0;

        importedEntries.forEach((entry) => {
            const normalizedEntry = normalizeSavedPhraseRecord(entry, true);
            if (!normalizedEntry) {
                invalidCount += 1;
                return;
            }

            const existingEntry = existingEntriesByText.get(normalizedEntry.text);
            if (!existingEntry) {
                const nextEntry = {
                    text: normalizedEntry.text,
                    keywords: [...normalizedEntry.keywords]
                };

                savedPhrases.push(nextEntry);
                existingEntriesByText.set(nextEntry.text, nextEntry);
                addedCount += 1;
                return;
            }

            const mergedKeywords = mergeSavedPhraseKeywords(existingEntry.keywords, normalizedEntry.keywords);
            if (mergedKeywords.length === existingEntry.keywords.length) {
                unchangedCount += 1;
                return;
            }

            existingEntry.keywords = mergedKeywords;
            updatedCount += 1;
        });

        const validCount = addedCount + updatedCount + unchangedCount;
        if (validCount === 0) {
            return { ok: false, message: 'Import impossible : aucune réponse exploitable trouvée.' };
        }

        if (addedCount > 0 || updatedCount > 0) {
            saveSavedPhrases();
            injectSavedPhrasesToolbar();
        }

        const summaryParts = [];
        if (addedCount > 0) {
            summaryParts.push(`${addedCount} ajoutée${addedCount > 1 ? 's' : ''}`);
        }
        if (updatedCount > 0) {
            summaryParts.push(`${updatedCount} enrichie${updatedCount > 1 ? 's' : ''}`);
        }
        if (unchangedCount > 0) {
            summaryParts.push(`${unchangedCount} déjà présente${unchangedCount > 1 ? 's' : ''}`);
        }
        if (invalidCount > 0) {
            summaryParts.push(`${invalidCount} ignorée${invalidCount > 1 ? 's' : ''}`);
        }

        return {
            ok: true,
            message: `Import terminé : ${summaryParts.join(', ')}.`
        };
    }

    function addSavedPhrase(phraseRaw, keywordsRaw = []) {
        const phrase = normalizeSavedPhraseText(phraseRaw);
        if (!phrase) {
            return { ok: false, message: 'Phrase vide.' };
        }

        if (phrase.length > MAX_SAVED_PHRASE_LENGTH) {
            return { ok: false, message: `Phrase trop longue (${phrase.length}/${MAX_SAVED_PHRASE_LENGTH}).` };
        }

        const keywords = normalizeSavedPhraseKeywords(keywordsRaw);
        const existingPhrase = savedPhrases.find((entry) => entry.text === phrase);

        if (existingPhrase) {
            const mergedKeywords = mergeSavedPhraseKeywords(existingPhrase.keywords, keywords);

            if (mergedKeywords.length === existingPhrase.keywords.length) {
                return { ok: false, message: 'Cette phrase existe déjà.' };
            }

            existingPhrase.keywords = mergedKeywords;
            saveSavedPhrases();
            injectSavedPhrasesToolbar();

            return { ok: true, message: 'Mots-clés ajoutés à la phrase existante.' };
        }

        savedPhrases.push({
            text: phrase,
            keywords
        });
        saveSavedPhrases();
        injectSavedPhrasesToolbar();

        return {
            ok: true,
            message: keywords.length > 0 ? 'Phrase et mots-clés ajoutés.' : 'Phrase ajoutée.'
        };
    }

    function removeSavedPhraseAt(index) {
        const numericIndex = Number(index);
        if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= savedPhrases.length) {
            return { ok: false, message: 'Phrase introuvable.' };
        }

        savedPhrases.splice(numericIndex, 1);
        saveSavedPhrases();
        injectSavedPhrasesToolbar();

        return { ok: true, message: 'Phrase supprimée.' };
    }

    function updateSavedPhraseAt(index, phraseRaw, keywordsRaw = []) {
        const numericIndex = Number(index);
        if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= savedPhrases.length) {
            return { ok: false, message: 'Phrase introuvable.' };
        }

        const phrase = normalizeSavedPhraseText(phraseRaw);
        if (!phrase) {
            return { ok: false, message: 'Phrase vide.' };
        }

        if (phrase.length > MAX_SAVED_PHRASE_LENGTH) {
            return { ok: false, message: `Phrase trop longue (${phrase.length}/${MAX_SAVED_PHRASE_LENGTH}).` };
        }

        const keywords = normalizeSavedPhraseKeywords(keywordsRaw);
        const currentEntry = normalizeSavedPhraseRecord(savedPhrases[numericIndex], true);
        if (!currentEntry) {
            return { ok: false, message: 'Phrase introuvable.' };
        }

        const duplicateIndex = savedPhrases.findIndex((entry, entryIndex) => {
            if (entryIndex === numericIndex) return false;

            const normalizedEntry = normalizeSavedPhraseRecord(entry, true);
            return normalizedEntry?.text === phrase;
        });

        if (duplicateIndex !== -1) {
            return { ok: false, message: 'Une autre phrase utilise déjà ce texte.' };
        }

        const currentKeywordsValue = formatSavedPhraseKeywordsInputValue(currentEntry.keywords);
        const nextKeywordsValue = formatSavedPhraseKeywordsInputValue(keywords);
        if (currentEntry.text === phrase && currentKeywordsValue === nextKeywordsValue) {
            return { ok: false, message: 'Aucun changement détecté.' };
        }

        savedPhrases[numericIndex] = {
            text: phrase,
            keywords
        };
        saveSavedPhrases();
        injectSavedPhrasesToolbar();

        return {
            ok: true,
            message: 'Phrase mise à jour.'
        };
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

    function loadChatScrollbarEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY_CHAT_SCROLLBAR_ENABLED) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveChatScrollbarEnabled(value) {
        chatScrollbarEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_CHAT_SCROLLBAR_ENABLED, chatScrollbarEnabled ? '1' : '0');
    }

    function loadMessageActionsLeftEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY_MESSAGE_ACTIONS_LEFT_ENABLED) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveMessageActionsLeftEnabled(value) {
        messageActionsLeftEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_MESSAGE_ACTIONS_LEFT_ENABLED, messageActionsLeftEnabled ? '1' : '0');
    }

    function loadHideChatFooterEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY_HIDE_CHAT_FOOTER_ENABLED) === '1';
        } catch (e) {
            return false;
        }
    }

    function saveHideChatFooterEnabled(value) {
        hideChatFooterEnabled = !!value;
        localStorage.setItem(STORAGE_KEY_HIDE_CHAT_FOOTER_ENABLED, hideChatFooterEnabled ? '1' : '0');
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

    function ensureMessageActionsPositionStyle() {
        if (document.getElementById(MESSAGE_ACTIONS_POSITION_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = MESSAGE_ACTIONS_POSITION_STYLE_ID;
        style.textContent = `
            [data-tm-message-actions-left="1"] .group.relative.flex.items-start > .absolute.right-2.-top-3.flex.items-center.gap-0\\.5.bg-zinc-900.border.border-zinc-700.rounded-lg.shadow-lg.px-1.py-0\\.5.z-10 {
                right: auto !important;
                left: min(var(--tm-message-actions-inline-left, calc(0.5rem + 2.4rem)), calc(100% - 4.75rem)) !important;
                top: var(--tm-message-actions-inline-top, 0px) !important;
            }
        `;

        document.head.appendChild(style);
    }

    function applyMessageActionsPositionState() {
        ensureMessageActionsPositionStyle();

        if (messageActionsLeftEnabled && isChatPage()) {
            document.documentElement.setAttribute('data-tm-message-actions-left', '1');
            return;
        }

        document.documentElement.removeAttribute('data-tm-message-actions-left');
    }

    function ensureHideChatFooterStyle() {
        if (document.getElementById(HIDE_CHAT_FOOTER_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = HIDE_CHAT_FOOTER_STYLE_ID;
        style.textContent = `
            :root[data-tm-hide-chat-footer="1"] footer.bg-black\\/95.border-t.border-zinc-800\\/50.mt-auto {
                display: none !important;
            }
            :root[data-tm-hide-chat-footer="1"] main div[class*="h-[100dvh]"] {
                @media (min-width: 768px) {
                    height: calc(100vh - 20px) !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function applyChatFooterVisibilityState() {
        ensureHideChatFooterStyle();

        if (hideChatFooterEnabled && isChatPage()) {
            document.documentElement.setAttribute('data-tm-hide-chat-footer', '1');
            return;
        }

        document.documentElement.removeAttribute('data-tm-hide-chat-footer');
    }

    function ensureHomeChatPopoverStyle() {
        if (document.getElementById(HOME_CHAT_POPOVER_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = HOME_CHAT_POPOVER_STYLE_ID;
        style.textContent = `
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] {
                position: relative !important;
                overflow: visible !important;
                z-index: 90 !important;
                isolation: isolate;
            }

            [${HOME_CHAT_POPOVER_PARENT_ATTR}="1"] {
                overflow: visible !important;
            }

            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${CHAT_INPUT_TOOLBAR_RAIL_ATTR}="1"] {
                z-index: 180 !important;
                overflow: visible !important;
            }

            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] #${PHRASES_MENU_WRAPPER_ID},
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] #${GIF_MENU_WRAPPER_ID},
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_HOST_ATTR}="1"],
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] {
                z-index: 220 !important;
                overflow: visible !important;
            }

            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] #${PHRASES_MENU_WRAPPER_ID} [data-tm-saved-phrases-menu="1"],
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] #${GIF_MENU_WRAPPER_ID} [data-tm-klipy-gif-menu="1"],
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] > .absolute.bottom-12,
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] > .fixed.bottom-12,
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] > .absolute.bottom-24,
            [${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] > .fixed.bottom-24 {
                z-index: 1400 !important;
            }
        `;

        document.head.appendChild(style);
    }

    function applyHomeChatPopoverState() {
        ensureHomeChatPopoverStyle();

        document.querySelectorAll(`[${HOME_CHAT_POPOVER_SURFACE_ATTR}="1"]`).forEach((element) => {
            if (element instanceof HTMLElement) {
                element.removeAttribute(HOME_CHAT_POPOVER_SURFACE_ATTR);
            }
        });

        document.querySelectorAll(`[${HOME_CHAT_POPOVER_PARENT_ATTR}="1"]`).forEach((element) => {
            if (element instanceof HTMLElement) {
                element.removeAttribute(HOME_CHAT_POPOVER_PARENT_ATTR);
            }
        });

        if (!isHomePage() || homeChatCollapsed) return;

        const homeContainer = getHomepageChatContainer();
        if (!(homeContainer instanceof HTMLElement)) return;

        homeContainer.setAttribute(HOME_CHAT_POPOVER_SURFACE_ATTR, '1');

        let ancestor = homeContainer.parentElement;
        for (let depth = 0; ancestor && depth < 3; depth += 1, ancestor = ancestor.parentElement) {
            ancestor.setAttribute(HOME_CHAT_POPOVER_PARENT_ATTR, '1');
        }
    }

    function ensureNativeChatInputPopoverStyle() {
        if (document.getElementById(NATIVE_CHAT_INPUT_POPOVER_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = NATIVE_CHAT_INPUT_POPOVER_STYLE_ID;
        style.textContent = `
            :root[${NATIVE_CHAT_INPUT_POPOVER_LIFTED_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] .bottom-24 {
                bottom: calc(var(--spacing, 0.25rem) * 24) !important;
            }

            :root[${NATIVE_CHAT_INPUT_POPOVER_LIFTED_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] > .absolute.bottom-24,
            :root[${NATIVE_CHAT_INPUT_POPOVER_LIFTED_ATTR}="1"] [${NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR}="1"] > .fixed.bottom-24 {
                top: auto !important;
                z-index: 120 !important;
            }
        `;

        document.head.appendChild(style);
    }

    function applyNativeChatInputPopoverState() {
        ensureNativeChatInputPopoverStyle();

        if (isChatPage()) {
            document.documentElement.setAttribute(NATIVE_CHAT_INPUT_POPOVER_LIFTED_ATTR, '1');
            return;
        }

        document.documentElement.removeAttribute(NATIVE_CHAT_INPUT_POPOVER_LIFTED_ATTR);
    }

    function ensureChatScrollbarStyle() {
        if (document.getElementById(CHAT_SCROLLBAR_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = CHAT_SCROLLBAR_STYLE_ID;
        style.textContent = `
            [data-tm-chat-scrollbar="1"] {
                scrollbar-width: auto !important;
                scrollbar-color: rgba(255,255,255,0.96) rgba(255,255,255,0.08) !important;
                scrollbar-gutter: stable both-edges !important;
                -ms-overflow-style: auto !important;
            }

            [data-tm-chat-scrollbar="1"]::-webkit-scrollbar {
                display: block !important;
                width: ${DEFAULT_CHAT_SCROLLBAR_THICKNESS}px !important;
                height: ${DEFAULT_CHAT_SCROLLBAR_THICKNESS}px !important;
                background: transparent !important;
            }

            [data-tm-chat-scrollbar="1"]::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.08) !important;
                border-radius: 999px !important;
            }

            [data-tm-chat-scrollbar="1"]::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(226,232,240,0.9)) !important;
                border-radius: 999px !important;
                border: ${DEFAULT_CHAT_SCROLLBAR_THUMB_BORDER}px solid rgba(24,24,27,0.96) !important;
                box-shadow: 0 0 10px rgba(255,255,255,0.22) !important;
            }

            [data-tm-chat-scrollbar="1"]::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.98)) !important;
            }

            :root[data-tm-torr9-theme="light"] [data-tm-chat-scrollbar="1"],
            [data-tm-chat-surface="light"][data-tm-chat-scrollbar="1"] {
                scrollbar-color: rgba(30,41,59,0.82) rgba(226,232,240,0.96) !important;
            }

            :root[data-tm-torr9-theme="light"] [data-tm-chat-scrollbar="1"]::-webkit-scrollbar-track,
            [data-tm-chat-surface="light"][data-tm-chat-scrollbar="1"]::-webkit-scrollbar-track {
                background: rgba(226,232,240,0.96) !important;
            }

            :root[data-tm-torr9-theme="light"] [data-tm-chat-scrollbar="1"]::-webkit-scrollbar-thumb,
            [data-tm-chat-surface="light"][data-tm-chat-scrollbar="1"]::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(51,65,85,0.92), rgba(15,23,42,0.82)) !important;
                border-color: rgba(248,250,252,0.96) !important;
                box-shadow: none !important;
            }
        `;

        document.head.appendChild(style);
    }

    function clearChatPageScrollbarState(scroller) {
        if (!(scroller instanceof HTMLElement)) return;

        scroller.removeAttribute('data-tm-chat-scrollbar');
        scroller.style.removeProperty('overflow-y');
        scroller.style.removeProperty('overflow-x');
        scroller.style.removeProperty('scrollbar-width');
        scroller.style.removeProperty('-ms-overflow-style');
        scroller.style.removeProperty('scrollbar-gutter');
    }

    function applyChatPageScrollbarState() {
        ensureChatScrollbarStyle();

        const currentScroller = isChatPage() ? getChatPageMessagesRoot() : null;
        const activeScrollbars = Array.from(document.querySelectorAll('[data-tm-chat-scrollbar="1"]'));
        activeScrollbars.forEach((element) => {
            if (element !== currentScroller) {
                clearChatPageScrollbarState(element);
            }
        });

        if (!(currentScroller instanceof HTMLElement)) return;

        if (!chatScrollbarEnabled) {
            clearChatPageScrollbarState(currentScroller);
            return;
        }

        currentScroller.setAttribute('data-tm-chat-scrollbar', '1');
        currentScroller.style.setProperty('overflow-y', 'scroll', 'important');
        currentScroller.style.setProperty('overflow-x', 'hidden', 'important');
        currentScroller.style.setProperty('scrollbar-width', 'auto', 'important');
        currentScroller.style.setProperty('-ms-overflow-style', 'auto', 'important');
        currentScroller.style.setProperty('scrollbar-gutter', 'stable both-edges', 'important');
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

    function normalizeUrlForChatInsertion(value) {
        const raw = String(value || '').trim();
        if (!/^https?:\/\/\S+$/i.test(raw)) return '';
        return raw;
    }

    function buildKlipyGifEmbedMarkup(gifUrl) {
        const normalizedGifUrl = normalizeUrlForChatInsertion(gifUrl);
        if (!normalizedGifUrl) return '';
        return `[img]${normalizedGifUrl}[/img]`;
    }

    function getKlipyApiLocale() {
        const rawLocale = String(navigator.language || navigator.userLanguage || 'fr-FR').trim();
        if (!rawLocale) return 'fr_FR';

        const normalizedParts = rawLocale.replace('_', '-').split('-').filter(Boolean);
        const language = String(normalizedParts[0] || 'fr')
            .toLowerCase()
            .replace(/[^a-z]/g, '')
            .slice(0, 2);
        const region = String(normalizedParts[1] || 'FR')
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .slice(0, 2);

        if (!language || !region) {
            return 'fr_FR';
        }

        return `${language}_${region}`;
    }

    function buildKlipyApiUrl(endpoint, params = {}) {
        const url = new URL(`${KLIPY_API_BASE_URL}/${String(endpoint || '').replace(/^\/+/, '')}`);
        url.searchParams.set('key', KLIPY_API_KEY);
        url.searchParams.set('client_key', KLIPY_CLIENT_KEY);

        Object.entries(params).forEach(([paramName, paramValue]) => {
            if (paramValue === undefined || paramValue === null || paramValue === '') return;
            url.searchParams.set(paramName, String(paramValue));
        });

        return url.toString();
    }

    function setKlipyGifCacheEntry(cacheKey, value) {
        if (!cacheKey) return;

        if (klipyGifResponseCache.has(cacheKey)) {
            klipyGifResponseCache.delete(cacheKey);
        }

        klipyGifResponseCache.set(cacheKey, value);

        while (klipyGifResponseCache.size > KLIPY_CACHE_MAX_ENTRIES) {
            const oldestCacheKey = klipyGifResponseCache.keys().next().value;
            if (!oldestCacheKey) break;
            klipyGifResponseCache.delete(oldestCacheKey);
        }
    }

    function normalizeKlipyGifResult(result) {
        const gifUrl = normalizeUrlForChatInsertion(result?.media_formats?.gif?.url || result?.url);
        const previewUrl = normalizeUrlForChatInsertion(result?.media_formats?.tinygif?.url || gifUrl);

        if (!gifUrl || !previewUrl) return null;

        const previewDims = Array.isArray(result?.media_formats?.tinygif?.dims)
            ? result.media_formats.tinygif.dims
            : Array.isArray(result?.media_formats?.gif?.dims)
                ? result.media_formats.gif.dims
                : [];

        return {
            id: String(result?.id || hashString(gifUrl)),
            title: String(result?.title || result?.content_description || result?.tags?.[0] || 'GIF Klipy').trim(),
            gifUrl,
            previewUrl,
            itemUrl: normalizeUrlForChatInsertion(result?.itemurl) || 'https://klipy.com',
            width: Number(previewDims[0]) || 0,
            height: Number(previewDims[1]) || 0,
            tags: Array.isArray(result?.tags)
                ? result.tags.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 3)
                : []
        };
    }

    async function fetchKlipyGifFeed({ query = '', pos = '' } = {}) {
        const normalizedQuery = String(query || '').trim();
        const endpoint = normalizedQuery ? 'search' : 'featured';
        const locale = getKlipyApiLocale();
        const cacheKey = JSON.stringify([endpoint, normalizedQuery.toLocaleLowerCase('fr'), String(pos || ''), locale]);

        if (klipyGifResponseCache.has(cacheKey)) {
            return klipyGifResponseCache.get(cacheKey);
        }

        const response = await fetch(buildKlipyApiUrl(endpoint, {
            q: normalizedQuery,
            pos,
            limit: KLIPY_MAX_RESULTS_PER_PAGE,
            media_filter: 'gif,tinygif',
            locale
        }), {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            credentials: 'omit'
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (e) {}

        if (!response.ok) {
            const errorMessage = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
            throw new Error(errorMessage);
        }

        const normalizedPayload = {
            results: Array.isArray(payload?.results)
                ? payload.results.map(normalizeKlipyGifResult).filter(Boolean)
                : [],
            next: typeof payload?.next === 'string' ? payload.next : ''
        };

        setKlipyGifCacheEntry(cacheKey, normalizedPayload);
        return normalizedPayload;
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
        const getDirectMessageCount = (scroller) => {
            if (!(scroller instanceof HTMLElement)) return 0;
            return scroller.querySelectorAll(':scope > .group.relative.flex.items-start').length;
        };

        const getScrollerCandidates = (scope) => {
            if (!scope || typeof scope.querySelectorAll !== 'function') return [];

            return Array.from(scope.querySelectorAll('div.flex-1.overflow-y-auto.py-2, .overflow-y-auto')).filter((scroller) => {
                if (!(scroller instanceof HTMLElement)) return false;
                if (scroller.closest(`#${PANEL_ID}, #${MODAL_ID}, #${OVERLAY_ID}, #${TOAST_ID}`)) return false;
                if (!scroller.classList.contains('overflow-y-auto')) return false;
                return getDirectMessageCount(scroller) > 0;
            });
        };

        const pickBestScroller = (scrollers) => {
            if (!Array.isArray(scrollers) || scrollers.length === 0) return null;

            return scrollers
                .slice()
                .sort((a, b) =>
                    Number(b.matches('div.flex-1.overflow-y-auto.py-2')) -
                    Number(a.matches('div.flex-1.overflow-y-auto.py-2')) ||
                    getDirectMessageCount(b) - getDirectMessageCount(a)
                )[0] || null;
        };

        if (header instanceof HTMLElement) {
            const directContainer = header.parentElement;
            const directMatch = pickBestScroller(getScrollerCandidates(directContainer));
            if (directMatch) return directMatch;

            const panelContainer = header.closest('.bg-zinc-950');
            const panelMatch = pickBestScroller(getScrollerCandidates(panelContainer));
            if (panelMatch) return panelMatch;

            let ancestor = directContainer?.parentElement || null;
            for (let depth = 0; ancestor && depth < 4; depth += 1, ancestor = ancestor.parentElement) {
                const ancestorMatch = pickBestScroller(getScrollerCandidates(ancestor));
                if (ancestorMatch) return ancestorMatch;
            }
        }

        return pickBestScroller(getScrollerCandidates(document));
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

    function getMessageMetaRow(messageEl) {
        if (!(messageEl instanceof HTMLElement) || !isChatPage()) return null;

        const exactMetaRow = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline.gap-2.mb-0\\.5');
        if (exactMetaRow instanceof HTMLElement) {
            return exactMetaRow;
        }

        const fallbackMetaRow = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline');
        return fallbackMetaRow instanceof HTMLElement ? fallbackMetaRow : null;
    }

    function getMessageMetaAnchorElement(messageEl) {
        const metaRow = getMessageMetaRow(messageEl);
        if (!(metaRow instanceof HTMLElement)) return null;

        const directChildren = Array.from(metaRow.children).filter((child) => child instanceof HTMLElement);
        if (directChildren.length === 0) {
            return metaRow;
        }

        const timestampChild = directChildren.find((child) =>
            parseMessageTimestampKey(child.textContent || '') > 0
        );
        if (timestampChild instanceof HTMLElement) {
            return timestampChild;
        }

        const trailingMetaChild = directChildren
            .slice()
            .reverse()
            .find((child) => {
                const text = String(child.textContent || '').trim();
                return text && child.getClientRects().length > 0;
            });

        return trailingMetaChild instanceof HTMLElement
            ? trailingMetaChild
            : directChildren[directChildren.length - 1];
    }

    function syncMessageActionsAnchorVars(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return;

        if (!isChatPage()) {
            messageEl.style.removeProperty('--tm-message-actions-inline-left');
            messageEl.style.removeProperty('--tm-message-actions-inline-top');
            return;
        }

        const metaRow = getMessageMetaRow(messageEl);
        const anchorEl = getMessageMetaAnchorElement(messageEl);
        if (!(metaRow instanceof HTMLElement) || !(anchorEl instanceof HTMLElement)) {
            messageEl.style.removeProperty('--tm-message-actions-inline-left');
            messageEl.style.removeProperty('--tm-message-actions-inline-top');
            return;
        }

        const messageRect = messageEl.getBoundingClientRect();
        const metaRowRect = metaRow.getBoundingClientRect();
        const anchorRect = anchorEl.getBoundingClientRect();
        if (messageRect.width <= 0 || metaRowRect.width <= 0 || anchorRect.width <= 0) return;

        const inlineLeft = Math.max(8, Math.round(anchorRect.right - messageRect.left + 8));
        const inlineTop = Math.max(0, Math.round(metaRowRect.top - messageRect.top));

        messageEl.style.setProperty('--tm-message-actions-inline-left', `${inlineLeft}px`);
        messageEl.style.setProperty('--tm-message-actions-inline-top', `${inlineTop}px`);
    }

    function applyChatFontScale(scale = chatFontScale) {
        const root = getActiveChatRoot();
        if (!root) return;

        root.querySelectorAll('div').forEach((el) => {
            if (isChatMessage(el)) {
                applyMessageTypography(el, scale);
                syncMessageActionsAnchorVars(el);
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

    function ensureModalScrollbarStyle() {
        if (document.getElementById(MODAL_SCROLLBAR_STYLE_ID)) return;
        if (!document.head) return;

        const style = document.createElement('style');
        style.id = MODAL_SCROLLBAR_STYLE_ID;
        style.textContent = `
            #${MODAL_ID}[data-tm-scrollable-modal="1"] {
                scrollbar-width: thin;
                scrollbar-color: rgba(148,163,184,0.62) rgba(255,255,255,0.06);
                scrollbar-gutter: stable both-edges;
            }

            #${MODAL_ID}[data-tm-scrollable-modal="1"]::-webkit-scrollbar {
                width: 12px;
            }

            #${MODAL_ID}[data-tm-scrollable-modal="1"]::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
                border-radius: 999px;
            }

            #${MODAL_ID}[data-tm-scrollable-modal="1"]::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(96,165,250,0.78), rgba(129,140,248,0.78));
                border-radius: 999px;
                border: 2px solid rgba(24,24,27,0.98);
            }

            #${MODAL_ID}[data-tm-scrollable-modal="1"]::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, rgba(125,211,252,0.88), rgba(167,139,250,0.88));
            }
        `;

        document.head.appendChild(style);
    }

    function applyScrollableModalStyle(modal) {
        if (!(modal instanceof HTMLElement)) return;

        ensureModalScrollbarStyle();
        modal.setAttribute('data-tm-scrollable-modal', '1');
        modal.style.overflowY = 'scroll';
        modal.style.overflowX = 'hidden';
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

    function needsHomepageCollapseUiRefresh(container = getHomepageChatContainer()) {
        if (!isHomePage()) return false;
        if (!(container instanceof HTMLElement)) return false;

        const header = getHomepageChatHeader(container);
        const rightArea = header?.lastElementChild;
        const button = document.getElementById(HOME_COLLAPSE_BUTTON_ID);
        const expectedState = homeChatCollapsed ? '1' : '0';

        return (
            !(button instanceof HTMLButtonElement) ||
            !(rightArea instanceof HTMLElement) ||
            button.parentElement !== rightArea ||
            container.dataset.tmHomeCollapsed !== expectedState
        );
    }

    function syncHomepageCollapseUi(force = false) {
        if (!isHomePage()) return;

        const container = getHomepageChatContainer();
        if (!(container instanceof HTMLElement)) return;

        if (!force && !needsHomepageCollapseUiRefresh(container)) {
            updateHomeCollapseButton();
            return;
        }

        applyHomepageChatCollapsedState();
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
        applyHomeChatPopoverState();
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

        if (existingState?.signature === signature && existingState.timeoutId === null && existingState.persistHighlight !== true) {
            return;
        }

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
            mentionBlinkStates.set(messageEl, { signature, timeoutId: null, persistHighlight: true });
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
                mentionBlinkStates.set(messageEl, { signature, timeoutId: null, persistHighlight: true });
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

            mentionBlinkStates.set(messageEl, { signature, timeoutId: null, persistHighlight: false });
        }, blinkSeconds * 1000);

        mentionBlinkStates.set(messageEl, { signature, timeoutId, persistHighlight: true });
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
        syncMessageActionsAnchorVars(messageEl);
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

        applyChatPageScrollbarState();

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
        syncHomepageCollapseUi(true);
        applyBoxPosition(loadPosition());
        updateStatsBox();
    }

    function openSavedPhraseQuickAddModal(initialText = '', sourceInput = null) {
        if (!isSupportedPage()) return;

        if (modalOpen) {
            closeSettingsModal();
        }

        modalOpen = true;
        hideImagePreview();

        const normalizedInitialText = normalizeSavedPhraseText(initialText, true);

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
        modal.style.width = 'min(620px, calc(100vw - 24px))';
        modal.style.maxHeight = 'min(86vh, 720px)';
        modal.style.overflowY = 'auto';
        modal.style.background = 'rgba(24,24,27,0.98)';
        modal.style.border = '1px solid rgba(255,255,255,0.08)';
        modal.style.borderRadius = '18px';
        modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.45)';
        modal.style.padding = '18px';
        modal.style.fontFamily = 'Inter, Arial, sans-serif';
        modal.style.color = '#fff';
        applyScrollableModalStyle(modal);

        modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
            <div>
                <div style="font-size:16px;font-weight:700;">Ajouter une réponse rapide</div>
                <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">
                    Le texte actuel du champ de chat a été repris ici pour gagner du temps.
                </div>
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
            padding:12px;
            border-radius:14px;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.06);
        ">
            <label for="tm-quick-add-phrase-input" style="display:block;font-size:12px;color:#d4d4d8;margin-bottom:6px;">
                Texte de la réponse
            </label>

            <textarea id="tm-quick-add-phrase-input" rows="5" maxlength="${MAX_SAVED_PHRASE_LENGTH}" placeholder="Exemple : Salut, il me faut le lien exact du torrent pour vérifier."
                style="
                    width:100%;
                    min-height:120px;
                    resize:vertical;
                    background:#18181b;
                    color:#fff;
                    border:1px solid rgba(255,255,255,0.10);
                    border-radius:10px;
                    padding:10px 12px;
                    outline:none;
                    line-height:1.45;
                ">${escapeHtml(normalizedInitialText)}</textarea>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:11px;color:#71717a;">
                <span>Le texte est prérempli depuis le chat, mais reste modifiable.</span>
                <span id="tm-quick-add-phrase-length">${formatSavedPhraseLengthLabel(normalizedInitialText)}</span>
            </div>

            <label for="tm-quick-add-keywords-input" style="display:block;font-size:12px;color:#d4d4d8;margin:12px 0 6px;">
                Mots-clés
            </label>

            <input id="tm-quick-add-keywords-input" type="text" placeholder="ratio, reseed, merci, lien"
                style="
                    width:100%;
                    background:#18181b;
                    color:#fff;
                    border:1px solid rgba(255,255,255,0.10);
                    border-radius:10px;
                    padding:10px 12px;
                    outline:none;
                ">

            <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                Optionnel. Sépare les mots-clés par des virgules pour améliorer les suggestions contextuelles.
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:12px;">
                <button id="tm-quick-add-cancel" type="button" style="
                    border:none;
                    background:#3f3f46;
                    color:#fff;
                    border-radius:10px;
                    padding:10px 12px;
                    cursor:pointer;
                    font-weight:600;
                ">Annuler</button>

                <button id="tm-quick-add-save" type="button" style="
                    border:none;
                    background:#2563eb;
                    color:#fff;
                    border-radius:10px;
                    padding:10px 12px;
                    cursor:pointer;
                    font-weight:600;
                ">Enregistrer</button>
            </div>
        </div>

        <div id="tm-feedback" style="
            min-height:20px;
            margin-top:14px;
            font-size:12px;
            color:#93c5fd;
        "></div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#tm-close-modal');
        const cancelBtn = modal.querySelector('#tm-quick-add-cancel');
        const saveBtn = modal.querySelector('#tm-quick-add-save');
        const phraseInput = modal.querySelector('#tm-quick-add-phrase-input');
        const phraseLength = modal.querySelector('#tm-quick-add-phrase-length');
        const keywordsInput = modal.querySelector('#tm-quick-add-keywords-input');
        const feedback = modal.querySelector('#tm-feedback');

        function restoreSourceInputFocus() {
            const nextInput = sourceInput instanceof HTMLElement && document.contains(sourceInput)
                ? sourceInput
                : getChatInput();

            if (!(nextInput instanceof HTMLElement)) return;

            window.requestAnimationFrame(() => {
                nextInput.focus();
            });
        }

        function setFeedback(message, isError = false) {
            if (!(feedback instanceof HTMLElement)) return;

            feedback.textContent = message;
            feedback.style.color = isError ? '#fca5a5' : '#93c5fd';
        }

        function syncPhraseLengthIndicator() {
            if (!(phraseInput instanceof HTMLTextAreaElement) || !(phraseLength instanceof HTMLElement)) return;

            if (phraseInput.value.length > MAX_SAVED_PHRASE_LENGTH) {
                phraseInput.value = phraseInput.value.slice(0, MAX_SAVED_PHRASE_LENGTH);
            }

            const currentLength = phraseInput.value.length;
            phraseLength.textContent = `${currentLength}/${MAX_SAVED_PHRASE_LENGTH} caractères`;
            phraseLength.style.color = currentLength >= MAX_SAVED_PHRASE_LENGTH
                ? '#fca5a5'
                : (currentLength >= Math.floor(MAX_SAVED_PHRASE_LENGTH * 0.9) ? '#facc15' : '#71717a');
        }

        function submitQuickAdd() {
            const result = addSavedPhrase(phraseInput?.value, keywordsInput?.value);
            setFeedback(result.message, !result.ok);

            if (!result.ok) return;

            closeSettingsModal();
            showToast(result.message);
            restoreSourceInputFocus();
        }

        closeBtn?.addEventListener('click', () => {
            closeSettingsModal();
            restoreSourceInputFocus();
        });

        cancelBtn?.addEventListener('click', () => {
            closeSettingsModal();
            restoreSourceInputFocus();
        });

        overlay.addEventListener('click', () => {
            closeSettingsModal();
            restoreSourceInputFocus();
        });

        saveBtn?.addEventListener('click', submitQuickAdd);

        phraseInput?.addEventListener('input', syncPhraseLengthIndicator);

        phraseInput?.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                submitQuickAdd();
            }
        });

        keywordsInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitQuickAdd();
            }
        });

        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeSettingsModal();
                restoreSourceInputFocus();
            }
        });

        syncPhraseLengthIndicator();

        if (phraseInput instanceof HTMLTextAreaElement) {
            phraseInput.focus();
            phraseInput.setSelectionRange(phraseInput.value.length, phraseInput.value.length);
        }
    }

    function openSavedPhrasesConfigModal() {
        if (!isSupportedPage()) return;

        if (modalOpen) {
            closeSettingsModal();
        }

        modalOpen = true;
        hideImagePreview();

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
        modal.style.width = 'min(720px, calc(100vw - 24px))';
        modal.style.maxHeight = 'min(88vh, 860px)';
        modal.style.overflowY = 'auto';
        modal.style.background = 'rgba(24,24,27,0.98)';
        modal.style.border = '1px solid rgba(255,255,255,0.08)';
        modal.style.borderRadius = '18px';
        modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.45)';
        modal.style.padding = '18px';
        modal.style.fontFamily = 'Inter, Arial, sans-serif';
        modal.style.color = '#fff';
        applyScrollableModalStyle(modal);

        const cardStyle = `
            padding:12px;
            border-radius:14px;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.06);
        `;

        modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
            <div>
                <div style="font-size:16px;font-weight:700;">Configuration des réponses rapides</div>
                <div id="tm-saved-phrases-summary" style="font-size:12px;color:#a1a1aa;margin-top:4px;">
                    ${formatSavedPhrasesSummaryLabel()}
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <button id="tm-saved-phrases-back" style="
                    border:none;
                    background:#3f3f46;
                    color:#fff;
                    border-radius:10px;
                    padding:10px 12px;
                    cursor:pointer;
                    font-weight:600;
                ">Retour</button>
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
        </div>

        <div style="display:grid;gap:14px;">
            <div style="${cardStyle}">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Ajouter une réponse rapide</div>

                <label for="tm-phrase-input" style="display:block;font-size:12px;color:#d4d4d8;margin-bottom:6px;">
                    Texte de la réponse
                </label>

                <textarea id="tm-phrase-input" rows="5" maxlength="${MAX_SAVED_PHRASE_LENGTH}" placeholder="Exemple : Salut, il me faut le lien exact du torrent pour vérifier."
                    style="
                        width:100%;
                        min-height:120px;
                        resize:vertical;
                        background:#18181b;
                        color:#fff;
                        border:1px solid rgba(255,255,255,0.10);
                        border-radius:10px;
                        padding:10px 12px;
                        outline:none;
                        line-height:1.45;
                    "></textarea>

                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:11px;color:#71717a;">
                    <span>Limite alignée sur le champ de chat.</span>
                    <span id="tm-phrase-length">0/${MAX_SAVED_PHRASE_LENGTH}</span>
                </div>

                <label for="tm-phrase-keywords-input" style="display:block;font-size:12px;color:#d4d4d8;margin:12px 0 6px;">
                    Mots-clés
                </label>

                <input id="tm-phrase-keywords-input" type="text" placeholder="ratio, reseed, merci, lien"
                    style="
                        width:100%;
                        background:#18181b;
                        color:#fff;
                        border:1px solid rgba(255,255,255,0.10);
                        border-radius:10px;
                        padding:10px 12px;
                        outline:none;
                    ">

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Optionnel. Sépare les mots-clés par des virgules pour préparer une recherche ou des correspondances automatiques plus tard.
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                    <button id="tm-phrase-add" style="
                        border:none;
                        background:#2563eb;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Enregistrer</button>
                </div>
            </div>

            <div style="${cardStyle}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">
                    <div style="font-size:13px;font-weight:700;">Réponses enregistrées</div>
                    <div id="tm-phrases-count" style="font-size:12px;color:#a1a1aa;">${formatSavedPhrasesCountLabel()}</div>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                    <button id="tm-phrases-export" type="button" style="
                        border:none;
                        background:#0f766e;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Exporter JSON</button>

                    <button id="tm-phrases-import" type="button" style="
                        border:none;
                        background:#7c3aed;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Importer JSON</button>

                    <input id="tm-phrases-import-file" type="file" accept="application/json,.json" style="display:none;">
                </div>

                <div id="tm-phrases-list" style="display:grid;gap:10px;"></div>
            </div>
        </div>

        <div id="tm-feedback" style="
            min-height:20px;
            margin-top:14px;
            font-size:12px;
            color:#93c5fd;
        "></div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#tm-close-modal');
        const backBtn = modal.querySelector('#tm-saved-phrases-back');
        const phraseInput = modal.querySelector('#tm-phrase-input');
        const phraseKeywordsInput = modal.querySelector('#tm-phrase-keywords-input');
        const phraseAddBtn = modal.querySelector('#tm-phrase-add');
        const phraseLength = modal.querySelector('#tm-phrase-length');
        const phrasesList = modal.querySelector('#tm-phrases-list');
        const phrasesCount = modal.querySelector('#tm-phrases-count');
        const phrasesExportBtn = modal.querySelector('#tm-phrases-export');
        const phrasesImportBtn = modal.querySelector('#tm-phrases-import');
        const phrasesImportFileInput = modal.querySelector('#tm-phrases-import-file');
        const summary = modal.querySelector('#tm-saved-phrases-summary');
        const feedback = modal.querySelector('#tm-feedback');
        let editingPhraseIndex = null;

        function setFeedback(message, isError = false) {
            if (!feedback) return;

            feedback.textContent = message;
            feedback.style.color = isError ? '#fca5a5' : '#93c5fd';
        }

        function syncSavedPhrasesHeader() {
            if (phrasesCount) {
                phrasesCount.textContent = formatSavedPhrasesCountLabel();
            }

            if (summary) {
                summary.textContent = formatSavedPhrasesSummaryLabel();
            }
        }

        function syncSavedPhraseLengthIndicator(textarea, lengthLabel) {
            if (!(textarea instanceof HTMLTextAreaElement) || !(lengthLabel instanceof HTMLElement)) return;

            if (textarea.value.length > MAX_SAVED_PHRASE_LENGTH) {
                textarea.value = textarea.value.slice(0, MAX_SAVED_PHRASE_LENGTH);
            }

            const currentLength = textarea.value.length;
            lengthLabel.textContent = `${currentLength}/${MAX_SAVED_PHRASE_LENGTH}`;
            lengthLabel.style.color = currentLength >= MAX_SAVED_PHRASE_LENGTH
                ? '#fca5a5'
                : (currentLength >= Math.floor(MAX_SAVED_PHRASE_LENGTH * 0.9) ? '#facc15' : '#71717a');
        }

        function syncPhraseLengthIndicator() {
            syncSavedPhraseLengthIndicator(phraseInput, phraseLength);
        }

        function createKeywordChip(keyword) {
            const chip = document.createElement('span');
            chip.textContent = keyword;
            chip.style.display = 'inline-flex';
            chip.style.alignItems = 'center';
            chip.style.padding = '4px 8px';
            chip.style.borderRadius = '999px';
            chip.style.background = 'rgba(124,58,237,0.18)';
            chip.style.border = '1px solid rgba(139,92,246,0.22)';
            chip.style.color = '#ddd6fe';
            chip.style.fontSize = '11px';
            chip.style.lineHeight = '1.2';
            return chip;
        }

        function stopEditingSavedPhrase(refresh = true) {
            editingPhraseIndex = null;

            if (refresh) {
                refreshSavedPhrasesList();
            }
        }

        function startEditingSavedPhrase(index) {
            editingPhraseIndex = index;
            refreshSavedPhrasesList();

            window.requestAnimationFrame(() => {
                const editTextarea = modal.querySelector(`[data-tm-saved-phrase-edit-input="${index}"]`);
                if (editTextarea instanceof HTMLTextAreaElement) {
                    editTextarea.focus();
                    editTextarea.setSelectionRange(editTextarea.value.length, editTextarea.value.length);
                }
            });
        }

        function refreshSavedPhrasesList() {
            if (!phrasesList) return;

            phrasesList.innerHTML = '';
            syncSavedPhrasesHeader();

            if (editingPhraseIndex !== null && (editingPhraseIndex < 0 || editingPhraseIndex >= savedPhrases.length)) {
                editingPhraseIndex = null;
            }

            if (savedPhrases.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Aucune réponse rapide enregistrée pour le moment.';
                empty.style.fontSize = '12px';
                empty.style.color = '#a1a1aa';
                empty.style.padding = '6px 2px';
                phrasesList.appendChild(empty);
                return;
            }

            savedPhrases.forEach((entry, index) => {
                const phrase = normalizeSavedPhraseRecord(entry, true);
                if (!phrase) return;
                if (phrase !== entry) {
                    savedPhrases[index] = phrase;
                }

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'flex-start';
                row.style.gap = '10px';
                row.style.padding = '12px';
                row.style.borderRadius = '12px';
                row.style.background = 'rgba(59,130,246,0.08)';
                row.style.border = '1px solid rgba(59,130,246,0.16)';

                const content = document.createElement('div');
                content.style.flex = '1';
                content.style.minWidth = '0';

                if (editingPhraseIndex === index) {
                    const editText = document.createElement('textarea');
                    editText.value = phrase.text;
                    editText.rows = 4;
                    editText.maxLength = MAX_SAVED_PHRASE_LENGTH;
                    editText.setAttribute('data-tm-saved-phrase-edit-input', String(index));
                    editText.style.width = '100%';
                    editText.style.minHeight = '96px';
                    editText.style.resize = 'vertical';
                    editText.style.background = '#18181b';
                    editText.style.color = '#fff';
                    editText.style.border = '1px solid rgba(255,255,255,0.10)';
                    editText.style.borderRadius = '10px';
                    editText.style.padding = '10px 12px';
                    editText.style.outline = 'none';
                    editText.style.lineHeight = '1.45';

                    const editLength = document.createElement('div');
                    editLength.style.marginTop = '8px';
                    editLength.style.fontSize = '11px';
                    editLength.style.textAlign = 'right';

                    const editKeywordsLabel = document.createElement('label');
                    editKeywordsLabel.textContent = 'Mots-clés';
                    editKeywordsLabel.style.display = 'block';
                    editKeywordsLabel.style.fontSize = '12px';
                    editKeywordsLabel.style.color = '#d4d4d8';
                    editKeywordsLabel.style.margin = '12px 0 6px';

                    const editKeywordsInput = document.createElement('input');
                    editKeywordsInput.type = 'text';
                    editKeywordsInput.value = formatSavedPhraseKeywordsInputValue(phrase.keywords);
                    editKeywordsInput.placeholder = 'ratio, reseed, merci, lien';
                    editKeywordsInput.style.width = '100%';
                    editKeywordsInput.style.background = '#18181b';
                    editKeywordsInput.style.color = '#fff';
                    editKeywordsInput.style.border = '1px solid rgba(255,255,255,0.10)';
                    editKeywordsInput.style.borderRadius = '10px';
                    editKeywordsInput.style.padding = '10px 12px';
                    editKeywordsInput.style.outline = 'none';

                    const editHint = document.createElement('div');
                    editHint.textContent = 'Modifie le texte ou les mots-clés, puis enregistre.';
                    editHint.style.marginTop = '8px';
                    editHint.style.fontSize = '11px';
                    editHint.style.color = '#71717a';
                    editHint.style.lineHeight = '1.45';

                    const editActions = document.createElement('div');
                    editActions.style.display = 'flex';
                    editActions.style.justifyContent = 'flex-end';
                    editActions.style.gap = '8px';
                    editActions.style.flexWrap = 'wrap';
                    editActions.style.marginTop = '12px';

                    const cancelEditBtn = document.createElement('button');
                    cancelEditBtn.type = 'button';
                    cancelEditBtn.textContent = 'Annuler';
                    cancelEditBtn.style.border = 'none';
                    cancelEditBtn.style.background = '#3f3f46';
                    cancelEditBtn.style.color = '#fff';
                    cancelEditBtn.style.borderRadius = '10px';
                    cancelEditBtn.style.padding = '8px 10px';
                    cancelEditBtn.style.cursor = 'pointer';
                    cancelEditBtn.style.fontSize = '12px';
                    cancelEditBtn.style.fontWeight = '600';

                    const saveEditBtn = document.createElement('button');
                    saveEditBtn.type = 'button';
                    saveEditBtn.textContent = 'Enregistrer';
                    saveEditBtn.style.border = 'none';
                    saveEditBtn.style.background = '#2563eb';
                    saveEditBtn.style.color = '#fff';
                    saveEditBtn.style.borderRadius = '10px';
                    saveEditBtn.style.padding = '8px 10px';
                    saveEditBtn.style.cursor = 'pointer';
                    saveEditBtn.style.fontSize = '12px';
                    saveEditBtn.style.fontWeight = '600';

                    function submitSavedPhraseEdition() {
                        const result = updateSavedPhraseAt(index, editText.value, editKeywordsInput.value);
                        setFeedback(result.message, !result.ok);

                        if (!result.ok) return;

                        stopEditingSavedPhrase();
                    }

                    cancelEditBtn.addEventListener('click', () => {
                        stopEditingSavedPhrase();
                    });

                    saveEditBtn.addEventListener('click', submitSavedPhraseEdition);

                    editText.addEventListener('input', () => {
                        syncSavedPhraseLengthIndicator(editText, editLength);
                    });

                    editText.addEventListener('keydown', (event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                            event.preventDefault();
                            submitSavedPhraseEdition();
                        }
                    });

                    editKeywordsInput.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submitSavedPhraseEdition();
                        }
                    });

                    syncSavedPhraseLengthIndicator(editText, editLength);

                    editActions.appendChild(cancelEditBtn);
                    editActions.appendChild(saveEditBtn);

                    content.appendChild(editText);
                    content.appendChild(editLength);
                    content.appendChild(editKeywordsLabel);
                    content.appendChild(editKeywordsInput);
                    content.appendChild(editHint);
                    content.appendChild(editActions);

                    row.appendChild(content);
                    phrasesList.appendChild(row);
                    return;
                }

                const text = document.createElement('div');
                text.textContent = phrase.text;
                text.style.fontSize = '12px';
                text.style.lineHeight = '1.5';
                text.style.color = '#e4e4e7';
                text.style.whiteSpace = 'pre-wrap';
                text.style.wordBreak = 'break-word';

                const meta = document.createElement('div');
                meta.style.display = 'flex';
                meta.style.justifyContent = 'space-between';
                meta.style.alignItems = 'center';
                meta.style.gap = '10px';
                meta.style.flexWrap = 'wrap';
                meta.style.marginTop = '8px';

                const keywordsLabel = document.createElement('div');
                keywordsLabel.textContent = phrase.keywords.length > 0 ? 'Mots-clés liés' : 'Aucun mot-clé';
                keywordsLabel.style.fontSize = '11px';
                keywordsLabel.style.color = phrase.keywords.length > 0 ? '#c4b5fd' : '#71717a';

                const length = document.createElement('div');
                length.textContent = formatSavedPhraseLengthLabel(phrase.text);
                length.style.fontSize = '11px';
                length.style.color = '#71717a';

                meta.appendChild(keywordsLabel);
                meta.appendChild(length);

                content.appendChild(text);
                content.appendChild(meta);

                if (phrase.keywords.length > 0) {
                    const keywordsWrap = document.createElement('div');
                    keywordsWrap.style.display = 'flex';
                    keywordsWrap.style.flexWrap = 'wrap';
                    keywordsWrap.style.gap = '6px';
                    keywordsWrap.style.marginTop = '8px';

                    phrase.keywords.forEach((keyword) => {
                        keywordsWrap.appendChild(createKeywordChip(keyword));
                    });

                    content.appendChild(keywordsWrap);
                }

                const actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.flexDirection = 'column';
                actions.style.gap = '8px';
                actions.style.flexShrink = '0';

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.textContent = '✎';
                editBtn.title = 'Modifier cette réponse rapide';
                editBtn.setAttribute('aria-label', 'Modifier cette réponse rapide');
                editBtn.style.border = 'none';
                editBtn.style.background = '#1f2937';
                editBtn.style.color = '#c4b5fd';
                editBtn.style.borderRadius = '10px';
                editBtn.style.padding = '8px 10px';
                editBtn.style.cursor = 'pointer';
                editBtn.style.fontSize = '14px';
                editBtn.style.fontWeight = '700';
                editBtn.style.lineHeight = '1';

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.textContent = 'Supprimer';
                removeBtn.style.border = 'none';
                removeBtn.style.background = '#3f3f46';
                removeBtn.style.color = '#fca5a5';
                removeBtn.style.borderRadius = '10px';
                removeBtn.style.padding = '8px 10px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.fontSize = '12px';
                removeBtn.style.fontWeight = '600';
                removeBtn.style.flexShrink = '0';

                editBtn.addEventListener('click', () => {
                    startEditingSavedPhrase(index);
                });

                removeBtn.addEventListener('click', () => {
                    const result = removeSavedPhraseAt(index);
                    setFeedback(result.message, !result.ok);

                    if (editingPhraseIndex !== null) {
                        if (editingPhraseIndex === index) {
                            editingPhraseIndex = null;
                        } else if (index < editingPhraseIndex) {
                            editingPhraseIndex -= 1;
                        }
                    }

                    refreshSavedPhrasesList();
                });

                actions.appendChild(editBtn);
                actions.appendChild(removeBtn);

                row.appendChild(content);
                row.appendChild(actions);
                phrasesList.appendChild(row);
            });
        }

        closeBtn?.addEventListener('click', closeSettingsModal);
        overlay.addEventListener('click', closeSettingsModal);

        backBtn?.addEventListener('click', () => {
            closeSettingsModal();
            openSettingsModal();
        });

        phraseAddBtn?.addEventListener('click', () => {
            const result = addSavedPhrase(phraseInput?.value, phraseKeywordsInput?.value);
            setFeedback(result.message, !result.ok);

            if (!result.ok) return;

            refreshSavedPhrasesList();

            if (phraseInput instanceof HTMLTextAreaElement) {
                phraseInput.value = '';
                phraseInput.focus();
            }

            if (phraseKeywordsInput instanceof HTMLInputElement) {
                phraseKeywordsInput.value = '';
            }

            syncPhraseLengthIndicator();
        });

        phraseInput?.addEventListener('input', syncPhraseLengthIndicator);

        phraseInput?.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                phraseAddBtn?.click();
            }
        });

        phraseKeywordsInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                phraseAddBtn?.click();
            }
        });

        phrasesExportBtn?.addEventListener('click', () => {
            const result = downloadSavedPhrasesExport();
            setFeedback(result.message, !result.ok);
        });

        phrasesImportBtn?.addEventListener('click', () => {
            phrasesImportFileInput?.click();
        });

        phrasesImportFileInput?.addEventListener('change', async () => {
            const selectedFile = phrasesImportFileInput instanceof HTMLInputElement
                ? phrasesImportFileInput.files?.[0]
                : null;

            if (!selectedFile) return;

            try {
                const rawContent = await selectedFile.text();
                const parsedContent = JSON.parse(rawContent);
                const result = importSavedPhrases(parsedContent);

                setFeedback(result.message, !result.ok);
                if (result.ok) {
                    refreshSavedPhrasesList();
                }
            } catch (e) {
                setFeedback('Import impossible : fichier JSON invalide.', true);
            } finally {
                if (phrasesImportFileInput instanceof HTMLInputElement) {
                    phrasesImportFileInput.value = '';
                }
            }
        });

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSettingsModal();
            }
        });

        refreshSavedPhrasesList();
        syncPhraseLengthIndicator();
        phraseInput?.focus();
    }

    function openSavedPhrasesPickerModal() {
        if (!isSupportedPage()) return;
        if (savedPhrases.length === 0) return;

        if (modalOpen) {
            closeSettingsModal();
        }

        modalOpen = true;
        hideImagePreview();

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
        modal.style.width = 'min(760px, calc(100vw - 24px))';
        modal.style.maxHeight = 'min(88vh, 860px)';
        modal.style.overflowY = 'auto';
        modal.style.background = 'rgba(24,24,27,0.98)';
        modal.style.border = '1px solid rgba(255,255,255,0.08)';
        modal.style.borderRadius = '18px';
        modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.45)';
        modal.style.padding = '18px';
        modal.style.fontFamily = 'Inter, Arial, sans-serif';
        modal.style.color = '#fff';
        applyScrollableModalStyle(modal);

        const cardStyle = `
            padding:12px;
            border-radius:14px;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.06);
        `;

        modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
            <div>
                <div style="font-size:16px;font-weight:700;">Toutes les réponses rapides</div>
                <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">
                    ${formatSavedPhrasesCountLabel()} disponibles. Clique sur une réponse pour l’insérer dans le chat.
                </div>
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

        <div style="${cardStyle};margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div style="font-size:13px;font-weight:700;">Filtrer par mot-clé</div>
                <button id="tm-saved-phrases-picker-clear" type="button" style="
                    border:none;
                    background:#3f3f46;
                    color:#fff;
                    border-radius:10px;
                    padding:8px 10px;
                    cursor:pointer;
                    font-size:12px;
                    font-weight:600;
                ">Réinitialiser</button>
            </div>
            <div id="tm-saved-phrases-picker-filter-meta" style="margin-top:8px;font-size:11px;color:#71717a;">
                Aucun filtre actif.
            </div>
            <div id="tm-saved-phrases-picker-filters" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;"></div>
        </div>

        <div style="${cardStyle}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                <div style="font-size:13px;font-weight:700;">Réponses disponibles</div>
                <div id="tm-saved-phrases-picker-count" style="font-size:12px;color:#a1a1aa;"></div>
            </div>
            <div id="tm-saved-phrases-picker-list" style="display:grid;gap:10px;"></div>
        </div>

        <div id="tm-feedback" style="
            min-height:20px;
            margin-top:14px;
            font-size:12px;
            color:#93c5fd;
        "></div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#tm-close-modal');
        const clearFiltersBtn = modal.querySelector('#tm-saved-phrases-picker-clear');
        const feedback = modal.querySelector('#tm-feedback');
        const pickerCount = modal.querySelector('#tm-saved-phrases-picker-count');
        const filtersWrap = modal.querySelector('#tm-saved-phrases-picker-filters');
        const filterMeta = modal.querySelector('#tm-saved-phrases-picker-filter-meta');
        const pickerList = modal.querySelector('#tm-saved-phrases-picker-list');
        const activeKeywordFilters = new Set();

        function setFeedback(message, isError = false) {
            if (!feedback) return;

            feedback.textContent = message;
            feedback.style.color = isError ? '#fca5a5' : '#93c5fd';
        }

        function getRankedPickerEntries() {
            return getRankedSavedPhrases().map((entry) => ({
                ...entry,
                matchPercent: computeSavedPhraseMatchPercent(entry.score)
            }));
        }

        function normalizeKeywordFilterKey(keyword) {
            return normalizeSavedPhraseText(keyword).toLocaleLowerCase('fr');
        }

        function phraseMatchesActiveFilters(entry) {
            if (activeKeywordFilters.size === 0) return true;

            const phraseKeywordKeys = new Set(
                entry.phrase.keywords
                    .map((keyword) => normalizeKeywordFilterKey(keyword))
                    .filter(Boolean)
            );

            for (const activeFilter of activeKeywordFilters) {
                if (!phraseKeywordKeys.has(activeFilter)) {
                    return false;
                }
            }

            return true;
        }

        function toggleKeywordFilter(keyword) {
            const keywordKey = normalizeKeywordFilterKey(keyword);
            if (!keywordKey) return;

            if (activeKeywordFilters.has(keywordKey)) {
                activeKeywordFilters.delete(keywordKey);
            } else {
                activeKeywordFilters.add(keywordKey);
            }

            refreshPickerFilters();
            refreshPickerList();
        }

        function createKeywordChip(keyword, isSelected = false, onClick = null) {
            const chip = document.createElement(onClick ? 'button' : 'span');
            chip.textContent = keyword;
            chip.style.display = 'inline-flex';
            chip.style.alignItems = 'center';
            chip.style.padding = '4px 8px';
            chip.style.borderRadius = '999px';
            chip.style.background = isSelected ? 'rgba(139,92,246,0.32)' : 'rgba(124,58,237,0.18)';
            chip.style.border = isSelected ? '1px solid rgba(167,139,250,0.45)' : '1px solid rgba(139,92,246,0.22)';
            chip.style.color = isSelected ? '#ffffff' : '#ddd6fe';
            chip.style.fontSize = '11px';
            chip.style.lineHeight = '1.2';
            if (onClick) {
                chip.type = 'button';
                chip.style.cursor = 'pointer';
                chip.style.transition = 'all 0.15s ease';
                chip.addEventListener('click', onClick);
            }
            return chip;
        }

        function refreshPickerFilters() {
            if (!filtersWrap || !filterMeta || !clearFiltersBtn) return;

            const entries = getRankedPickerEntries();
            const availableKeywords = [];
            const seenKeywordKeys = new Set();

            entries.forEach((entry) => {
                entry.phrase.keywords.forEach((keyword) => {
                    const keywordKey = normalizeKeywordFilterKey(keyword);
                    if (!keywordKey || seenKeywordKeys.has(keywordKey)) return;

                    seenKeywordKeys.add(keywordKey);
                    availableKeywords.push(keyword);
                });
            });

            availableKeywords.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

            filtersWrap.innerHTML = '';

            if (availableKeywords.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Aucun mot-clé enregistré pour le moment.';
                empty.style.fontSize = '12px';
                empty.style.color = '#a1a1aa';
                filtersWrap.appendChild(empty);
            } else {
                availableKeywords.forEach((keyword) => {
                    const keywordKey = normalizeKeywordFilterKey(keyword);
                    const chip = createKeywordChip(
                        keyword,
                        activeKeywordFilters.has(keywordKey),
                        (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleKeywordFilter(keyword);
                        }
                    );
                    filtersWrap.appendChild(chip);
                });
            }

            clearFiltersBtn.disabled = activeKeywordFilters.size === 0;
            clearFiltersBtn.style.opacity = activeKeywordFilters.size === 0 ? '0.55' : '1';
            clearFiltersBtn.style.cursor = activeKeywordFilters.size === 0 ? 'not-allowed' : 'pointer';

            if (activeKeywordFilters.size === 0) {
                filterMeta.textContent = 'Aucun filtre actif.';
                return;
            }

            filterMeta.textContent = `${activeKeywordFilters.size} filtre${activeKeywordFilters.size > 1 ? 's' : ''} actif${activeKeywordFilters.size > 1 ? 's' : ''}. Clique à nouveau sur un mot-clé pour le retirer.`;
        }

        function refreshPickerList() {
            if (!pickerList || !pickerCount) return;

            const entries = getRankedPickerEntries();
            const filteredEntries = entries.filter((entry) => phraseMatchesActiveFilters(entry));
            const contextualSortingActive = entries.length > 0 && entries[0].score > 0;

            pickerList.innerHTML = '';
            pickerCount.textContent = contextualSortingActive
                ? `${filteredEntries.length}/${entries.length} affichée${filteredEntries.length > 1 ? 's' : ''} · tri contextuel actif`
                : `${filteredEntries.length}/${entries.length} affichée${filteredEntries.length > 1 ? 's' : ''}`;

            if (entries.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Aucune réponse rapide enregistrée pour le moment.';
                empty.style.fontSize = '12px';
                empty.style.color = '#a1a1aa';
                empty.style.padding = '6px 2px';
                pickerList.appendChild(empty);
                return;
            }

            if (filteredEntries.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Aucune réponse ne correspond aux mots-clés sélectionnés.';
                empty.style.fontSize = '12px';
                empty.style.color = '#a1a1aa';
                empty.style.padding = '6px 2px';
                pickerList.appendChild(empty);
                return;
            }

            filteredEntries.forEach((entry) => {
                const phrase = entry.phrase;
                const previewText = truncateSavedPhrasePreviewText(phrase.text);
                const row = document.createElement('div');
                row.style.width = '100%';
                row.style.textAlign = 'left';
                row.style.padding = '12px';
                row.style.borderRadius = '12px';
                row.style.background = 'rgba(59,130,246,0.08)';
                row.style.border = '1px solid rgba(59,130,246,0.16)';
                row.style.cursor = 'pointer';
                row.style.transition = 'background 0.15s ease, border-color 0.15s ease';
                row.tabIndex = 0;
                row.setAttribute('role', 'button');

                row.addEventListener('mouseenter', () => {
                    row.style.background = 'rgba(99,102,241,0.15)';
                    row.style.borderColor = 'rgba(129,140,248,0.32)';
                });

                row.addEventListener('mouseleave', () => {
                    row.style.background = 'rgba(59,130,246,0.08)';
                    row.style.borderColor = 'rgba(59,130,246,0.16)';
                });

                function insertPhrase() {
                    const input = getChatInput();
                    const result = insertSavedPhraseIntoChatInput(input, phrase.text);

                    if (!result.ok) {
                        setFeedback(result.message, true);
                        return;
                    }

                    closeSettingsModal();
                }

                row.addEventListener('click', insertPhrase);
                row.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        insertPhrase();
                    }
                });

                const textRow = document.createElement('div');
                textRow.style.display = 'flex';
                textRow.style.alignItems = 'flex-start';
                textRow.style.gap = '8px';

                if (contextualSortingActive && entry.matchPercent > 0) {
                    const percentBadge = document.createElement('span');
                    percentBadge.textContent = `${entry.matchPercent}%`;
                    percentBadge.title = 'Taux de correspondance estimé';
                    percentBadge.style.display = 'inline-flex';
                    percentBadge.style.alignItems = 'center';
                    percentBadge.style.justifyContent = 'center';
                    percentBadge.style.padding = '3px 7px';
                    percentBadge.style.borderRadius = '999px';
                    percentBadge.style.background = 'rgba(34,197,94,0.18)';
                    percentBadge.style.border = '1px solid rgba(74,222,128,0.28)';
                    percentBadge.style.color = '#bbf7d0';
                    percentBadge.style.fontSize = '10px';
                    percentBadge.style.fontWeight = '700';
                    percentBadge.style.flexShrink = '0';
                    percentBadge.style.marginTop = '1px';
                    textRow.appendChild(percentBadge);
                }

                const text = document.createElement('div');
                text.textContent = previewText;
                text.style.fontSize = '12px';
                text.style.lineHeight = '1.5';
                text.style.color = '#e4e4e7';
                text.style.whiteSpace = 'pre-wrap';
                text.style.wordBreak = 'break-word';
                text.style.flex = '1';
                text.style.minWidth = '0';

                const meta = document.createElement('div');
                meta.style.display = 'flex';
                meta.style.justifyContent = 'space-between';
                meta.style.alignItems = 'center';
                meta.style.gap = '10px';
                meta.style.flexWrap = 'wrap';
                meta.style.marginTop = '8px';

                const keywordsLabel = document.createElement('div');
                keywordsLabel.textContent = phrase.keywords.length > 0 ? 'Mots-clés liés' : 'Aucun mot-clé';
                keywordsLabel.style.fontSize = '11px';
                keywordsLabel.style.color = phrase.keywords.length > 0 ? '#c4b5fd' : '#71717a';

                const length = document.createElement('div');
                length.textContent = formatSavedPhraseLengthLabel(phrase.text);
                length.style.fontSize = '11px';
                length.style.color = '#71717a';

                const metaLeft = document.createElement('div');
                metaLeft.style.display = 'flex';
                metaLeft.style.alignItems = 'center';
                metaLeft.style.gap = '8px';
                metaLeft.style.flexWrap = 'wrap';
                metaLeft.appendChild(keywordsLabel);

                meta.appendChild(metaLeft);
                meta.appendChild(length);

                textRow.appendChild(text);
                row.appendChild(textRow);
                row.appendChild(meta);

                if (phrase.keywords.length > 0) {
                    const keywordsWrap = document.createElement('div');
                    keywordsWrap.style.display = 'flex';
                    keywordsWrap.style.flexWrap = 'wrap';
                    keywordsWrap.style.gap = '6px';
                    keywordsWrap.style.marginTop = '8px';

                    phrase.keywords.forEach((keyword) => {
                        const keywordKey = normalizeKeywordFilterKey(keyword);
                        const chip = createKeywordChip(
                            keyword,
                            activeKeywordFilters.has(keywordKey),
                            (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleKeywordFilter(keyword);
                            }
                        );
                        keywordsWrap.appendChild(chip);
                    });

                    row.appendChild(keywordsWrap);
                }

                pickerList.appendChild(row);
            });
        }

        closeBtn?.addEventListener('click', closeSettingsModal);
        overlay.addEventListener('click', closeSettingsModal);
        clearFiltersBtn?.addEventListener('click', () => {
            if (activeKeywordFilters.size === 0) return;
            activeKeywordFilters.clear();
            refreshPickerFilters();
            refreshPickerList();
        });

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSettingsModal();
            }
        });

        refreshPickerFilters();
        refreshPickerList();
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
        const settingsCheckboxLabelStyle = `
            display:flex;
            align-items:center;
            gap:10px;
            cursor:pointer;
            font-size:12px;
            color:#d4d4d8;
        `;
        const settingsCheckboxLabelWithMarginStyle = `
            ${settingsCheckboxLabelStyle}
            margin-top:12px;
        `;
        const settingsCheckboxInputStyle = (accentColor) => `
            width:16px;
            height:16px;
            accent-color:${accentColor};
            cursor:pointer;
            flex-shrink:0;
        `;
        const accessibilityCheckboxAccentColor = '#06b6d4';

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
        applyScrollableModalStyle(modal);

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

                <label style="${settingsCheckboxLabelStyle}">
                    <input id="tm-home-collapse-toggle-setting" type="checkbox" ${homeChatCollapsed ? 'checked' : ''} style="${settingsCheckboxInputStyle('#22c55e')}">
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

                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-hide-stats-toggle" type="checkbox" ${statsHidden ? 'checked' : ''} style="${settingsCheckboxInputStyle('#f59e0b')}">
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
                    Agrandit ou réduit les pseudos et les messages dans la shoutbox.
                </div>

                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-linkify-urls-toggle" type="checkbox" ${linkifyUrlsEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Rendre les URLs cliquables</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Détecte les liens dans les messages et les transforme en liens cliquables.
                </div>

                ${isChatPage() ? `
                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-chat-scrollbar-toggle" type="checkbox" ${chatScrollbarEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Afficher l’ascenseur du chat</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Ajoute une scrollbar visible uniquement sur la zone de messages de la page chat.
                </div>
                ` : ''}

                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-message-actions-left-toggle" type="checkbox" ${messageActionsLeftEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Actions des messages à gauche</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Déplace les boutons Réagir / Répondre qui apparaissent au survol vers la gauche du bloc message. Utile seulement sur la page Chat.
                </div>

                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-chat-input-toolbar-align-right-toggle" type="checkbox" ${chatInputToolbarAlignRight ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Aligner les boutons du chat à droite</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Par défaut, les boutons au-dessus de l'input du chat sont alignés à gauche. Active cette option pour les pousser à droite.
                </div>

                ${isChatPage() ? `
                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-hide-chat-footer-toggle" type="checkbox" ${hideChatFooterEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Masquer le footer sur la page Chat</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Retire le footer du site sur la page de chat dédiée pour libérer de la hauteur utile.
                </div>
                ` : ''}

                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-embed-url-images-toggle" type="checkbox" ${embedUrlImagesEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Prévisualiser les liens directs d'images au survol</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Affiche un aperçu flottant uniquement pour les URLs qui pointent directement vers un fichier image.
                </div>

                <label style="${settingsCheckboxLabelWithMarginStyle}">
                    <input id="tm-light-theme-toggle" type="checkbox" ${lightThemeEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle(accessibilityCheckboxAccentColor)}">
                    <span>Theme clair <span style="font-weight:700;text-decoration:underline;">BETA</span> pour la shoutbox</span>
                </label>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.45;">
                    Eclaircit la zone de chat, les messages, la stats box et les toasts du script. Reglage enregistre separement pour ${currentPageLabel}.
                </div>
            </div>

            <div style="${settingsCardStyle}">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Phrases Sauvegardées</div>

                <label style="${settingsCheckboxLabelStyle}">
                    <input id="tm-phrases-enabled-toggle" type="checkbox" ${savedPhrasesEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle('#8b5cf6')}">
                    <span>Activer les réponses rapides</span>
                </label>

                <div id="tm-phrases-summary" style="margin-top:10px;font-size:12px;color:#a1a1aa;line-height:1.5;">
                    ${formatSavedPhrasesSummaryLabel()}
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                    <button id="tm-phrases-configure" style="
                        border:none;
                        background:#7c3aed;
                        color:#fff;
                        border-radius:10px;
                        padding:10px 12px;
                        cursor:pointer;
                        font-weight:600;
                    ">Configurer</button>
                </div>

                <div style="margin-top:8px;font-size:11px;color:#71717a;line-height:1.4;">
                    Ouvre une fenêtre dédiée pour ajouter, retirer et gérer les réponses rapides.
                </div>
            </div>

            <div style="${settingsCardStyle}">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">GIF Klipy</div>

                <label style="${settingsCheckboxLabelStyle}">
                    <input id="tm-klipy-gifs-toggle" type="checkbox" ${klipyGifsEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle('#22c55e')}">
                    <span>Activer le bouton GIF Klipy</span>
                </label>

                <div style="margin-top:10px;font-size:12px;color:#a1a1aa;line-height:1.5;">
                    Permet d'utiliser un gif picker directement depuis le chat.
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
                    ${settingsCheckboxLabelStyle}
                    margin-top:10px;
                ">
                    <input id="tm-mention-keep-highlight-toggle" type="checkbox" ${mentionSettings.keepHighlightAfterBlink ? 'checked' : ''} style="${settingsCheckboxInputStyle('#22c55e')}">
                    <span>Garder la couleur après le clignotement</span>
                </label>

                <label style="
                    ${settingsCheckboxLabelStyle}
                    margin-top:10px;
                ">
                    <input id="tm-mention-include-reply-toggle" type="checkbox" ${mentionSettings.includeReplyContext ? 'checked' : ''} style="${settingsCheckboxInputStyle('#22c55e')}">
                    <span>Considérer aussi les réponses citées vers @moi</span>
                </label>

                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px;">
                    <label style="${settingsCheckboxLabelStyle}">
                        <input id="tm-mention-sound-toggle" type="checkbox" ${mentionSettings.soundEnabled ? 'checked' : ''} style="${settingsCheckboxInputStyle('#22c55e')}">
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

                <label style="${settingsCheckboxLabelStyle}">
                    <input id="tm-debug-toggle" type="checkbox" ${debugMode ? 'checked' : ''} style="${settingsCheckboxInputStyle('#ef4444')}">
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
        const phrasesConfigureBtn = modal.querySelector('#tm-phrases-configure');
        const phrasesSummary = modal.querySelector('#tm-phrases-summary');
        const toggleBtn = modal.querySelector('#tm-user-toggle');
        const phrasesEnabledToggle = modal.querySelector('#tm-phrases-enabled-toggle');
        const klipyGifsToggle = modal.querySelector('#tm-klipy-gifs-toggle');
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
        const chatScrollbarToggle = modal.querySelector('#tm-chat-scrollbar-toggle');
        const messageActionsLeftToggle = modal.querySelector('#tm-message-actions-left-toggle');
        const chatInputToolbarAlignRightToggle = modal.querySelector('#tm-chat-input-toolbar-align-right-toggle');
        const hideChatFooterToggle = modal.querySelector('#tm-hide-chat-footer-toggle');
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

        function syncSavedPhrasesMainSummary() {
            if (phrasesSummary) {
                phrasesSummary.textContent = formatSavedPhrasesSummaryLabel();
            }
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

        phrasesConfigureBtn?.addEventListener('click', () => {
            openSavedPhrasesConfigModal();
        });

        phrasesEnabledToggle?.addEventListener('change', () => {
            saveSavedPhrasesEnabled(phrasesEnabledToggle.checked);
            syncSavedPhrasesMainSummary();

            if (savedPhrasesEnabled) {
                injectSavedPhrasesToolbar();
                setFeedback('Réponses rapides activées.');
            } else {
                removeSavedPhrasesToolbar();
                setFeedback('Réponses rapides désactivées.');
            }
        });

        klipyGifsToggle?.addEventListener('change', () => {
            saveKlipyGifsEnabled(klipyGifsToggle.checked);

            if (klipyGifsEnabled) {
                injectKlipyGifToolbar();
                setFeedback('Bouton GIF Klipy activé.');
            } else {
                removeKlipyGifToolbar();
                setFeedback('Bouton GIF Klipy désactivé.');
            }
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

        chatScrollbarToggle?.addEventListener('change', () => {
            saveChatScrollbarEnabled(chatScrollbarToggle.checked);
            applyChatPageScrollbarState();
            setFeedback(chatScrollbarEnabled ? 'Ascenseur du chat activé.' : 'Ascenseur du chat désactivé.');
        });

        messageActionsLeftToggle?.addEventListener('change', () => {
            saveMessageActionsLeftEnabled(messageActionsLeftToggle.checked);
            applyMessageActionsPositionState();
            processAllMessages();
            setFeedback(
                messageActionsLeftEnabled
                    ? 'Actions natives des messages déplacées à gauche.'
                    : 'Actions natives des messages replacées à droite.'
            );
        });

        chatInputToolbarAlignRightToggle?.addEventListener('change', () => {
            saveChatInputToolbarAlignRight(chatInputToolbarAlignRightToggle.checked);
            applyChatInputToolbarAlignmentState();
            setFeedback(
                chatInputToolbarAlignRight
                    ? 'Barre d’outils du chat alignée à droite.'
                    : 'Barre d’outils du chat alignée à gauche.'
            );
        });

        hideChatFooterToggle?.addEventListener('change', () => {
            saveHideChatFooterEnabled(hideChatFooterToggle.checked);
            applyChatFooterVisibilityState();
            setFeedback(
                hideChatFooterEnabled
                    ? 'Footer masqué sur la page Chat.'
                    : 'Footer réaffiché sur la page Chat.'
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

    function isScriptUiElement(element) {
        if (!(element instanceof Element)) return true;

        return !!element.closest(
            [
                `#${PANEL_ID}`,
                `#${MODAL_ID}`,
                `#${OVERLAY_ID}`,
                `#${TOAST_ID}`,
                `#${PHRASES_MENU_WRAPPER_ID}`,
                `#${GIF_MENU_WRAPPER_ID}`
            ].join(', ')
        );
    }

    function isChatInputCandidate(element) {
        if (!(element instanceof HTMLElement)) return false;
        if (isScriptUiElement(element)) return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;

        if (element instanceof HTMLInputElement) {
            if (String(element.type || '').toLowerCase() !== 'text') return false;
            if (element.disabled) return false;
        }

        if (element instanceof HTMLTextAreaElement && element.disabled) {
            return false;
        }

        return true;
    }

    function getChatInputCandidateLabel(element) {
        if (!(element instanceof HTMLElement)) return '';

        return normalizeMentionComparableText(
            [
                element.getAttribute('placeholder'),
                element.getAttribute('aria-label'),
                element.getAttribute('title'),
                element.getAttribute('name')
            ]
                .filter(Boolean)
                .join(' ')
        );
    }

    function isNativeChatInputSendButton(button) {
        if (!(button instanceof HTMLButtonElement)) return false;

        const label = getNativeChatInputActionLabel(button);
        const className = String(button.getAttribute('class') || '');

        return (
            /\b(envoyer|send)\b/.test(label) ||
            className.includes('bg-cyan-500/10') ||
            className.includes('text-cyan-400')
        );
    }

    function looksLikeNativeChatInputUtilityButton(button) {
        if (!(button instanceof HTMLButtonElement)) return false;

        const className = String(button.getAttribute('class') || '');
        return (
            className.includes('bg-zinc-900') &&
            className.includes('border-zinc-800') &&
            className.includes('rounded-lg') &&
            className.includes('text-gray-400')
        );
    }

    function getChatInputCandidateScore(element) {
        if (!(element instanceof HTMLElement)) return Number.NEGATIVE_INFINITY;

        let score = 0;
        const label = getChatInputCandidateLabel(element);
        const controlsRow = getChatInputControlsRow(element);

        if (/\b(message|messages|ecrire|écrire|repondre|répondre|chat|shout)\b/.test(label)) {
            score += 160;
        }

        if (/\b(url|lien|image|gif|emoji|recherche|search|upload|joindre|galerie)\b/.test(label)) {
            score -= 140;
        }

        if (element instanceof HTMLTextAreaElement) {
            score += 40;
        }

        if (element.closest('.relative.flex-1')) {
            score += 35;
        }

        if (element.closest('form')) {
            score += 15;
        }

        if (controlsRow instanceof HTMLElement) {
            const rowButtons = Array.from(controlsRow.querySelectorAll('button[type="button"]'));

            if (rowButtons.some((button) => isNativeChatInputSendButton(button))) {
                score += 90;
            }

            if (rowButtons.some((button) => looksLikeNativeChatInputUtilityButton(button))) {
                score += 35;
            }
        }

        return score;
    }

    function findChatInputWithin(root) {
        if (!(root instanceof Element) && !(root instanceof Document)) return null;

        if (
            root instanceof HTMLElement &&
            root.matches('input[type="text"], textarea, [contenteditable="true"]') &&
            isChatInputCandidate(root)
        ) {
            return root;
        }

        const candidates = Array.from(root.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]'));
        const validCandidates = candidates.filter((element) => isChatInputCandidate(element));

        return validCandidates
            .slice()
            .sort((a, b) => getChatInputCandidateScore(b) - getChatInputCandidateScore(a))[0] || null;
    }

    function getSavedPhrasesMenu() {
        const wrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
        if (!(wrapper instanceof HTMLElement)) return null;

        const menu = wrapper.querySelector('[data-tm-saved-phrases-menu="1"]');
        return menu instanceof HTMLElement ? menu : null;
    }

    function clearSavedPhrasesMenuHideTimer(menu) {
        if (!(menu instanceof HTMLElement)) return;

        const timerId = Number(menu.dataset.tmHideTimerId || 0);
        if (timerId > 0) {
            clearTimeout(timerId);
            delete menu.dataset.tmHideTimerId;
        }
    }

    function showSavedPhrasesMenu(menu) {
        if (!(menu instanceof HTMLElement)) return;

        clearSavedPhrasesMenuHideTimer(menu);
        menu.style.display = 'flex';
        menu.dataset.tmOpen = '1';
        void menu.offsetWidth;
        menu.style.opacity = '1';
        menu.style.transform = 'translateY(0) scale(1)';
    }

    function hideSavedPhrasesMenu(menu) {
        if (!(menu instanceof HTMLElement)) return;

        clearSavedPhrasesMenuHideTimer(menu);
        menu.dataset.tmOpen = '0';
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(10px) scale(0.95)';

        const timerId = window.setTimeout(() => {
            if (menu.dataset.tmOpen === '1') return;

            menu.style.display = 'none';
            delete menu.dataset.tmHideTimerId;
        }, 200);

        menu.dataset.tmHideTimerId = String(timerId);
    }

    function closeSavedPhrasesMenu() {
        const menu = getSavedPhrasesMenu();
        if (menu) {
            hideSavedPhrasesMenu(menu);
        }
    }

    function removeSavedPhrasesToolbar() {
        const menu = getSavedPhrasesMenu();
        if (menu) {
            clearSavedPhrasesMenuHideTimer(menu);
        }

        const wrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
        if (wrapper) {
            wrapper.remove();
        }

        syncNativeChatInputActionButtons();
        syncChatInputToolbarReservedSpace();
    }

    function installSavedPhrasesToolbarGlobalHandlers() {
        if (savedPhrasesToolbarEventsInstalled) return;

        savedPhrasesToolbarEventsInstalled = true;

        document.addEventListener('click', (event) => {
            const wrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
            if (!(wrapper instanceof HTMLElement)) return;
            if (event.target instanceof Node && wrapper.contains(event.target)) return;

            closeSavedPhrasesMenu();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeSavedPhrasesMenu();
            }
        }, true);

        window.addEventListener('blur', () => {
            closeSavedPhrasesMenu();
        });
    }

    function getChatInput() {
        let input = null;

        if (isChatPage()) {
            const header = getChatPageHeaderElement();
            if (header && header.parentElement) {
                input = findChatInputWithin(header.parentElement);
            }
            if (!input) {
                const scroller = getChatPageMessagesRoot();
                if (scroller && scroller.parentElement && scroller.parentElement.nextElementSibling) {
                    input = findChatInputWithin(scroller.parentElement.nextElementSibling);
                }
            }
        } else if (isHomePage()) {
            const homeContainer = getHomepageChatContainer();
            if (homeContainer) {
                input = findChatInputWithin(homeContainer);
            }
        }

        if (!input) {
            const darkContainers = Array.from(document.querySelectorAll('.bg-zinc-950'));
            input = darkContainers
                .map((container) => findChatInputWithin(container))
                .find(Boolean) || null;
        }

        if (!input) {
            const allInputs = Array.from(document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]'));
            const validInputs = allInputs
                .filter((element) => isChatInputCandidate(element))
                .filter((element) => !element.closest('nav, header, [role="navigation"], .navbar'));

            input = validInputs
                .slice()
                .sort((a, b) => getChatInputCandidateScore(b) - getChatInputCandidateScore(a))[0] || null;
        }

        return input;
    }

    function getChatInputToolbarMountContext(input = getChatInput()) {
        if (!(input instanceof HTMLElement)) {
            return {
                mountParent: null,
                inputWrapper: null,
                directWrapper: null,
                fallbackArea: null
            };
        }

        const inputWrapper = input.closest('.relative.flex-1');
        const directWrapper = input.parentElement instanceof HTMLElement ? input.parentElement : null;
        const fallbackArea = input.closest('form');
        const mountParent =
            (inputWrapper instanceof HTMLElement && inputWrapper) ||
            directWrapper ||
            (fallbackArea instanceof HTMLElement ? fallbackArea : null);

        return {
            mountParent,
            inputWrapper: inputWrapper instanceof HTMLElement ? inputWrapper : null,
            directWrapper,
            fallbackArea: fallbackArea instanceof HTMLElement ? fallbackArea : null
        };
    }

    function ensureChatInputToolbarMountVisibility(context) {
        const mountParent = context?.mountParent;
        if (mountParent instanceof HTMLElement) {
            if (window.getComputedStyle(mountParent).position === 'static') {
                mountParent.style.position = 'relative';
            }
            mountParent.style.overflow = 'visible';
        }

        if (mountParent?.parentElement instanceof HTMLElement) {
            const computed = window.getComputedStyle(mountParent.parentElement);
            if (computed.overflow === 'hidden' || computed.overflowY === 'hidden') {
                mountParent.parentElement.style.overflow = 'visible';
            }
        }
    }

    function getChatInputToolbarRail(mountParent) {
        if (!(mountParent instanceof HTMLElement)) return null;

        const rail = Array.from(mountParent.children).find((child) =>
            child instanceof HTMLElement && child.getAttribute(CHAT_INPUT_TOOLBAR_RAIL_ATTR) === '1'
        );

        return rail instanceof HTMLElement ? rail : null;
    }

    function hasVisibleChatInputToolbar(rail) {
        if (!(rail instanceof HTMLElement)) return false;

        return Array.from(rail.children).some((child) =>
            child instanceof HTMLElement && child.style.display !== 'none'
        );
    }

    function syncChatInputToolbarReservedSpace(input = getChatInput()) {
        document.querySelectorAll(`[${CHAT_INPUT_TOOLBAR_SPACE_ATTR}="1"]`).forEach((element) => {
            if (!(element instanceof HTMLElement)) return;

            const rail = getChatInputToolbarRail(element);
            if (hasVisibleChatInputToolbar(rail)) {
                element.style.paddingTop = `${CHAT_INPUT_TOOLBAR_RESERVED_HEIGHT_PX}px`;
                return;
            }

            if (rail instanceof HTMLElement && rail.children.length === 0) {
                rail.remove();
            }
            element.style.removeProperty('padding-top');
            element.removeAttribute(CHAT_INPUT_TOOLBAR_SPACE_ATTR);
        });

        const context = getChatInputToolbarMountContext(input);
        if (!(context.mountParent instanceof HTMLElement)) return;

        const rail = getChatInputToolbarRail(context.mountParent);
        if (hasVisibleChatInputToolbar(rail)) {
            context.mountParent.style.paddingTop = `${CHAT_INPUT_TOOLBAR_RESERVED_HEIGHT_PX}px`;
            context.mountParent.setAttribute(CHAT_INPUT_TOOLBAR_SPACE_ATTR, '1');
            return;
        }

        if (rail instanceof HTMLElement && rail.children.length === 0) {
            rail.remove();
        }
        context.mountParent.style.removeProperty('padding-top');
        context.mountParent.removeAttribute(CHAT_INPUT_TOOLBAR_SPACE_ATTR);
    }

    function getOrCreateChatInputToolbarRail(context) {
        if (!(context?.mountParent instanceof HTMLElement)) return null;

        ensureChatInputToolbarMountVisibility(context);

        let rail = getChatInputToolbarRail(context.mountParent);
        if (!rail) {
            rail = document.createElement('div');
            rail.setAttribute(CHAT_INPUT_TOOLBAR_RAIL_ATTR, '1');
            rail.style.position = 'absolute';
            rail.style.top = '0';
            rail.style.left = '0';
            rail.style.right = '0';
            rail.style.display = 'flex';
            rail.style.alignItems = 'center';
            rail.style.justifyContent = chatInputToolbarAlignRight ? 'flex-end' : 'flex-start';
            rail.style.gap = '8px';
            rail.style.pointerEvents = 'none';
            rail.style.zIndex = '50';
            rail.style.overflow = 'visible';
            context.mountParent.appendChild(rail);
        }

        return rail;
    }

    function applyChatInputToolbarAlignmentState() {
        document.querySelectorAll(`[${CHAT_INPUT_TOOLBAR_RAIL_ATTR}="1"]`).forEach((rail) => {
            if (!(rail instanceof HTMLElement)) return;
            rail.style.justifyContent = chatInputToolbarAlignRight ? 'flex-end' : 'flex-start';
        });
    }

    function shouldUseChatInputToolbarRail() {
        return isSupportedPage() && (
            klipyGifsEnabled ||
            (savedPhrasesEnabled && savedPhrases.length > 0)
        );
    }

    function getChatInputControlsRow(input = getChatInput()) {
        if (!(input instanceof HTMLElement)) return null;

        const inputWrapper = input.closest('.relative.flex-1');
        if (inputWrapper instanceof HTMLElement && inputWrapper.parentElement instanceof HTMLElement) {
            return inputWrapper.parentElement;
        }

        const directWrapper = input.parentElement;
        if (directWrapper instanceof HTMLElement && directWrapper.parentElement instanceof HTMLElement) {
            return directWrapper.parentElement;
        }

        return null;
    }

    function getNativeChatInputActionSearchRoot(input = getChatInput()) {
        const context = getChatInputToolbarMountContext(input);
        const controlsRow = getChatInputControlsRow(input);

        return controlsRow
            || context.fallbackArea
            || (context.mountParent?.parentElement instanceof HTMLElement ? context.mountParent.parentElement : null)
            || context.mountParent
            || null;
    }

    function getNativeChatInputActionLabel(button) {
        if (!(button instanceof HTMLButtonElement)) return '';

        return normalizeMentionComparableText(
            [
                button.getAttribute('title'),
                button.getAttribute('aria-label'),
                button.textContent
            ]
                .filter(Boolean)
                .join(' ')
        );
    }

    function isNativeChatInputUtilityButton(button) {
        if (!(button instanceof HTMLButtonElement)) return false;
        if (button.hasAttribute('data-tm-native-chat-input-action-moved')) return false;
        if (button.closest(`#${PHRASES_MENU_WRAPPER_ID}, #${GIF_MENU_WRAPPER_ID}`)) return false;
        if (button.closest(`[${NATIVE_CHAT_INPUT_ACTION_HOST_ATTR}="1"]`)) return false;

        const label = getNativeChatInputActionLabel(button);
        const isEmojiButton = /\b(emoji|emojis|smile|smiley|sticker)\b/.test(label);
        const isImageButton = /\b(image|images|img|photo|picture|upload|insere|insérer|inserer|joindre|galerie)\b/.test(label);
        const looksNativeUtilityButton = looksLikeNativeChatInputUtilityButton(button);

        if (isNativeChatInputSendButton(button)) return false;
        if (!looksNativeUtilityButton) return false;
        return isEmojiButton || isImageButton || !!button.querySelector('svg');
    }

    function getChatInputActionContainers(input = getChatInput()) {
        const controlsRow = getChatInputControlsRow(input);
        if (!(controlsRow instanceof HTMLElement)) return [];

        const inputWrapper =
            (input instanceof HTMLElement && input.closest('.relative.flex-1')) ||
            (input instanceof HTMLElement && input.parentElement instanceof HTMLElement ? input.parentElement : null);

        return Array.from(controlsRow.children).filter((child) => {
            if (!(child instanceof HTMLElement)) return false;
            if (child.getAttribute(CHAT_INPUT_TOOLBAR_RAIL_ATTR) === '1') return false;
            if (child.getAttribute(NATIVE_CHAT_INPUT_ACTION_HOST_ATTR) === '1') return false;
            if (child.id === PHRASES_MENU_WRAPPER_ID || child.id === GIF_MENU_WRAPPER_ID) return false;
            if (child === inputWrapper) return false;
            if (inputWrapper instanceof HTMLElement && child.contains(inputWrapper)) return false;
            return true;
        });
    }

    function getNativeChatInputActionButtons(input = getChatInput()) {
        const actionContainers = getChatInputActionContainers(input);
        if (actionContainers.length === 0) return [];

        const candidateButtons = [];

        actionContainers.forEach((container) => {
            if (container instanceof HTMLButtonElement && String(container.type || '').toLowerCase() === 'button') {
                candidateButtons.push(container);
            }

            container
                .querySelectorAll(':scope > button[type="button"], :scope > * > button[type="button"]')
                .forEach((button) => {
                    if (button instanceof HTMLButtonElement) {
                        candidateButtons.push(button);
                    }
                });
        });

        const explicitMatches = [];
        const fallbackMatches = [];

        Array.from(new Set(candidateButtons))
            .filter((button) => isNativeChatInputUtilityButton(button))
            .forEach((button) => {
            const label = getNativeChatInputActionLabel(button);
            if (/\b(emoji|emojis|image|images|img|photo|picture|upload|insere|insérer|inserer|joindre|galerie)\b/.test(label)) {
                explicitMatches.push(button);
                return;
            }

            fallbackMatches.push(button);
            });

        return Array.from(new Set([...explicitMatches, ...fallbackMatches])).slice(0, 2);
    }

    function restoreNativeChatInputActionButtons() {
        const movedButtons = Array.from(document.querySelectorAll('[data-tm-native-chat-input-action-moved="1"]'));

        movedButtons.forEach((button) => {
            if (!(button instanceof HTMLButtonElement)) return;

            const placeholderId = button.getAttribute('data-tm-native-chat-input-action-placeholder-id') || '';
            const placeholder = placeholderId
                ? document.querySelector(`[${NATIVE_CHAT_INPUT_ACTION_PLACEHOLDER_ATTR}="${placeholderId}"]`)
                : null;
            const source = placeholder?.parentElement instanceof HTMLElement ? placeholder.parentElement : null;
            const host = button.closest(`[${NATIVE_CHAT_INPUT_ACTION_HOST_ATTR}="1"]`);

            if (placeholder instanceof HTMLElement) {
                placeholder.replaceWith(button);
            } else if (host instanceof HTMLElement && host.parentElement instanceof HTMLElement) {
                host.parentElement.insertBefore(button, host);
            }

            if (host instanceof HTMLElement && host.childElementCount === 0) {
                host.remove();
            }

            button.removeAttribute('data-tm-native-chat-input-action-moved');
            button.removeAttribute('data-tm-native-chat-input-action-placeholder-id');

            if (source instanceof HTMLElement) {
                source.removeAttribute(NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR);

                Array.from(source.children).forEach((child) => {
                    if (!(child instanceof HTMLElement)) return;
                    if (!child.classList.contains('bottom-24')) return;

                    child.classList.remove('bottom-24');
                    child.classList.add('bottom-12');
                    child.style.removeProperty('top');
                    child.style.removeProperty('z-index');
                    child.style.removeProperty('bottom');
                });
            }
        });

        document.querySelectorAll(`[${NATIVE_CHAT_INPUT_ACTION_HOST_ATTR}="1"]`).forEach((host) => {
            if (!(host instanceof HTMLElement)) return;
            if (host.childElementCount === 0) {
                host.remove();
            }
        });
    }

    function syncMovedNativeChatInputActionPopovers() {
        applyNativeChatInputPopoverState();
        if (!isChatPage()) return;

        document.querySelectorAll(`[${NATIVE_CHAT_INPUT_ACTION_PLACEHOLDER_ATTR}]`).forEach((placeholder) => {
            if (!(placeholder instanceof HTMLElement)) return;

            const source = placeholder.parentElement;
            if (!(source instanceof HTMLElement)) return;

            source.setAttribute(NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR, '1');
            source.style.overflow = 'visible';

            const popupCandidates = source.querySelectorAll(':scope > .absolute.bottom-12, :scope > .fixed.bottom-12, :scope > .absolute.bottom-24, :scope > .fixed.bottom-24');

            Array.from(popupCandidates).forEach((child) => {
                if (!(child instanceof HTMLElement)) return;

                const computedStyle = window.getComputedStyle(child);
                if (computedStyle.position !== 'absolute' && computedStyle.position !== 'fixed') return;

                child.classList.remove('bottom-12');
                child.classList.add('bottom-24');
                child.style.top = 'auto';
                child.style.removeProperty('bottom');
                child.style.zIndex = '120';
            });
        });
    }

    function scheduleMovedNativeChatInputActionPopoversSync() {
        window.requestAnimationFrame(() => {
            syncMovedNativeChatInputActionPopovers();

            window.requestAnimationFrame(() => {
                syncMovedNativeChatInputActionPopovers();
            });
        });
    }

    function syncNativeChatInputActionButtons(input = getChatInput()) {
        if (!shouldUseChatInputToolbarRail()) {
            restoreNativeChatInputActionButtons();
            return;
        }

        const context = getChatInputToolbarMountContext(input);
        const rail = getChatInputToolbarRail(context.mountParent);
        if (!(rail instanceof HTMLElement)) {
            restoreNativeChatInputActionButtons();
            return;
        }

        const gifWrapper = document.getElementById(GIF_MENU_WRAPPER_ID);
        const phrasesWrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
        const candidateButtons = getNativeChatInputActionButtons(input);

        candidateButtons.forEach((button, index) => {
            const placeholderId = `native-action-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
            const placeholder = document.createElement('span');
            placeholder.setAttribute(NATIVE_CHAT_INPUT_ACTION_PLACEHOLDER_ATTR, placeholderId);
            placeholder.style.display = 'none';

            const host = document.createElement('div');
            host.setAttribute(NATIVE_CHAT_INPUT_ACTION_HOST_ATTR, '1');
            host.style.display = 'flex';
            host.style.alignItems = 'center';
            host.style.position = 'relative';
            host.style.overflow = 'visible';
            host.style.flexShrink = '0';
            host.style.pointerEvents = 'auto';
            host.style.zIndex = '80';

            if (button.getAttribute(NATIVE_CHAT_INPUT_ACTION_POPOVER_SYNC_BOUND_ATTR) !== '1') {
                button.setAttribute(NATIVE_CHAT_INPUT_ACTION_POPOVER_SYNC_BOUND_ATTR, '1');
                button.addEventListener('click', () => {
                    scheduleMovedNativeChatInputActionPopoversSync();
                });
            }

            button.before(placeholder);
            if (placeholder.parentElement instanceof HTMLElement) {
                placeholder.parentElement.setAttribute(NATIVE_CHAT_INPUT_ACTION_SOURCE_ATTR, '1');
                placeholder.parentElement.style.overflow = 'visible';
            }
            button.setAttribute('data-tm-native-chat-input-action-moved', '1');
            button.setAttribute('data-tm-native-chat-input-action-placeholder-id', placeholderId);
            host.appendChild(button);

            if (gifWrapper instanceof HTMLElement && gifWrapper.parentElement === rail) {
                rail.insertBefore(host, gifWrapper);
            } else if (phrasesWrapper instanceof HTMLElement && phrasesWrapper.parentElement === rail) {
                rail.insertBefore(host, phrasesWrapper);
            } else {
                rail.appendChild(host);
            }
        });

        syncMovedNativeChatInputActionPopovers();
    }

    function getChatInputMaxLength(input) {
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            const attributeMaxLength = Number(input.getAttribute('maxlength'));
            if (Number.isFinite(attributeMaxLength) && attributeMaxLength > 0) {
                return attributeMaxLength;
            }

            if (input.maxLength > 0) {
                return input.maxLength;
            }
        }

        return MAX_SAVED_PHRASE_LENGTH;
    }

    function insertTextIntoChatInput(input, textToInsert, successMessage = 'Texte inséré.') {
        if (!(input instanceof HTMLElement)) {
            return { ok: false, message: 'Champ de texte non trouvé.' };
        }

        const text = String(textToInsert || '').trim();
        if (!text) {
            return { ok: false, message: 'Texte vide.' };
        }

        input.focus();

        const currentValue = input.isContentEditable
            ? (input.textContent || '')
            : ('value' in input ? (input.value || '') : '');
        const prefix = currentValue.length > 0 && !/\s$/.test(currentValue) ? ' ' : '';
        const nextValue = currentValue + prefix + text;
        const maxLength = getChatInputMaxLength(input);

        if (maxLength > 0 && nextValue.length > maxLength) {
            return {
                ok: false,
                message: `Le message dépasserait la limite du chat (${nextValue.length}/${maxLength}).`
            };
        }

        if (input.isContentEditable) {
            input.textContent = nextValue;
        } else if ('value' in input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window[input.tagName === 'TEXTAREA' ? 'HTMLTextAreaElement' : 'HTMLInputElement'].prototype,
                'value'
            )?.set;

            if (nativeSetter) {
                nativeSetter.call(input, nextValue);
            } else {
                input.value = nextValue;
            }
        } else {
            return { ok: false, message: 'Champ de texte non compatible.' };
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: true, message: successMessage };
    }

    function insertSavedPhraseIntoChatInput(input, phraseText) {
        const phrase = normalizeSavedPhraseText(phraseText);
        if (!phrase) {
            return { ok: false, message: 'Phrase vide.' };
        }

        return insertTextIntoChatInput(input, phrase, 'Phrase insérée.');
    }

    function insertGifIntoChatInput(input, gifUrl) {
        const embedMarkup = buildKlipyGifEmbedMarkup(gifUrl);
        if (!embedMarkup) {
            return { ok: false, message: 'GIF Klipy invalide.' };
        }

        return insertTextIntoChatInput(input, embedMarkup, 'Balise BBCode GIF insérée.');
    }

    function buildSavedPhrasesMenuContent(menu, input = getChatInput()) {
        if (!(menu instanceof HTMLElement)) return;

        menu.innerHTML = '';

        const rankedPhrases = getRankedSavedPhrases(input);
        const visiblePhraseCount = Math.min(rankedPhrases.length, MAX_VISIBLE_SAVED_PHRASES_IN_MENU);
        const contextualSortingActive = rankedPhrases.length > 0 && rankedPhrases[0].score > 0;

        if (contextualSortingActive) {
            const helperLabel = document.createElement('div');
            helperLabel.textContent = 'Suggestions contextuelles';
            helperLabel.style.padding = '6px 10px 8px';
            helperLabel.style.fontSize = '11px';
            helperLabel.style.fontWeight = '700';
            helperLabel.style.color = '#c4b5fd';
            helperLabel.style.opacity = '0.95';
            menu.appendChild(helperLabel);
        }

        for (let i = 0; i < visiblePhraseCount; i++) {
            const rankedPhrase = rankedPhrases[i];
            if (!rankedPhrase?.phrase) continue;

            const phraseText = rankedPhrase.phrase.text;
            const previewText = truncateSavedPhrasePreviewText(phraseText);
            const keywordsLabel = formatSavedPhraseKeywordsLabel(rankedPhrase.phrase.keywords);
            const item = document.createElement('button');
            item.type = 'button';

            const titleParts = [phraseText];
            if (rankedPhrase.phrase.keywords.length > 0) {
                titleParts.push(`Mots-clés : ${keywordsLabel}`);
            }
            if (rankedPhrase.matchedKeywords.length > 0) {
                titleParts.push(`Correspondance : ${rankedPhrase.matchedKeywords.join(', ')}`);
            }
            if (contextualSortingActive && rankedPhrase.matchPercent > 0) {
                titleParts.push(`Match estimé : ${rankedPhrase.matchPercent}%`);
            }
            item.title = titleParts.join('\n');
            item.style.background = 'transparent';
            item.style.border = 'none';
            item.style.color = '#e4e4e7';
            item.style.padding = '8px 12px';
            item.style.borderRadius = '8px';
            item.style.fontSize = '12px';
            item.style.cursor = 'pointer';
            item.style.width = '100%';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.gap = '10px';
            item.style.transition = 'all 0.15s ease';

            if (contextualSortingActive && rankedPhrase.matchPercent > 0) {
                const percentBadge = document.createElement('span');
                percentBadge.textContent = `${rankedPhrase.matchPercent}%`;
                percentBadge.style.display = 'inline-flex';
                percentBadge.style.alignItems = 'center';
                percentBadge.style.justifyContent = 'center';
                percentBadge.style.padding = '3px 7px';
                percentBadge.style.borderRadius = '999px';
                percentBadge.style.background = 'rgba(34,197,94,0.18)';
                percentBadge.style.border = '1px solid rgba(74,222,128,0.28)';
                percentBadge.style.color = '#bbf7d0';
                percentBadge.style.fontSize = '10px';
                percentBadge.style.fontWeight = '700';
                percentBadge.style.flexShrink = '0';
                item.appendChild(percentBadge);
            }

            const textLabel = document.createElement('span');
            textLabel.textContent = previewText;
            textLabel.style.flex = '1';
            textLabel.style.minWidth = '0';
            textLabel.style.textAlign = 'left';
            textLabel.style.whiteSpace = 'nowrap';
            textLabel.style.overflow = 'hidden';
            textLabel.style.textOverflow = 'ellipsis';
            item.appendChild(textLabel);

            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(139, 92, 246, 0.15)';
                item.style.color = '#fff';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
                item.style.color = '#e4e4e7';
            });

            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                const nextInput = getChatInput();

                if (!nextInput) {
                    if (typeof showToast === 'function') showToast('Champ de texte non trouvé.', true);
                    return;
                }

                const result = insertSavedPhraseIntoChatInput(nextInput, phraseText);
                if (!result.ok) {
                    if (typeof showToast === 'function') showToast(result.message, true);
                    return;
                }

                hideSavedPhrasesMenu(menu);
            });

            menu.appendChild(item);
        }

        if (rankedPhrases.length > MAX_VISIBLE_SAVED_PHRASES_IN_MENU) {
            const divider = document.createElement('div');
            divider.style.height = '1px';
            divider.style.margin = '6px 4px';
            divider.style.background = 'rgba(255,255,255,0.08)';
            menu.appendChild(divider);

            const moreBtn = document.createElement('button');
            moreBtn.type = 'button';
            moreBtn.textContent = `Autres (${rankedPhrases.length - MAX_VISIBLE_SAVED_PHRASES_IN_MENU})`;
            moreBtn.style.background = 'rgba(124,58,237,0.16)';
            moreBtn.style.border = '1px solid rgba(139,92,246,0.22)';
            moreBtn.style.color = '#ddd6fe';
            moreBtn.style.padding = '9px 12px';
            moreBtn.style.borderRadius = '10px';
            moreBtn.style.fontSize = '12px';
            moreBtn.style.fontWeight = '600';
            moreBtn.style.textAlign = 'left';
            moreBtn.style.cursor = 'pointer';
            moreBtn.style.width = '100%';
            moreBtn.style.transition = 'all 0.15s ease';

            moreBtn.addEventListener('mouseenter', () => {
                moreBtn.style.background = 'rgba(124,58,237,0.24)';
                moreBtn.style.borderColor = 'rgba(139,92,246,0.34)';
            });

            moreBtn.addEventListener('mouseleave', () => {
                moreBtn.style.background = 'rgba(124,58,237,0.16)';
                moreBtn.style.borderColor = 'rgba(139,92,246,0.22)';
            });

            moreBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                hideSavedPhrasesMenu(menu);
                openSavedPhrasesPickerModal();
            });

            menu.appendChild(moreBtn);
        }
    }

    function injectSavedPhrasesToolbar() {
        if (!isSupportedPage()) return;
        if (!savedPhrasesEnabled) {
            removeSavedPhrasesToolbar();
            return;
        }

        installSavedPhrasesToolbarGlobalHandlers();

        const textInput = getChatInput();
        if (!textInput) return;
        const mountContext = getChatInputToolbarMountContext(textInput);
        const rail = getOrCreateChatInputToolbarRail(mountContext);
        if (!(rail instanceof HTMLElement)) return;

        let wrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = PHRASES_MENU_WRAPPER_ID;
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '8px';
            wrapper.style.justifyContent = 'flex-end';
            wrapper.style.position = 'relative';
            wrapper.style.zIndex = '50';
            wrapper.style.overflow = 'visible';
            wrapper.style.pointerEvents = 'auto';
            wrapper.style.flexShrink = '0';
        }

        if (wrapper.parentNode !== rail) {
            rail.appendChild(wrapper);
        }

        wrapper.innerHTML = '';
        if (savedPhrases.length === 0) {
            wrapper.style.display = 'none';
            syncChatInputToolbarReservedSpace(textInput);
            return;
        }

        wrapper.style.display = 'flex';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.innerHTML = '<span style="margin-right:4px;">✨</span> Réponses rapides';
        toggleBtn.title = 'Ouvrir les réponses rapides';
        toggleBtn.setAttribute('aria-label', 'Ouvrir les réponses rapides');
        toggleBtn.style.background = 'linear-gradient(135deg, rgba(88,28,135,0.7) 0%, rgba(30,58,138,0.7) 100%)';
        toggleBtn.style.border = '1px solid rgba(139,92,246,0.25)';
        toggleBtn.style.color = '#e0e7ff';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.fontWeight = '600';
        toggleBtn.style.padding = '6px 14px';
        toggleBtn.style.borderRadius = '999px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.backdropFilter = 'blur(10px)';
        toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
        toggleBtn.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.filter = 'brightness(1.15)';
            toggleBtn.style.transform = 'scale(1.02)';
            toggleBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            toggleBtn.style.border = '1px solid rgba(139,92,246,0.4)';
        });
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.filter = 'brightness(1)';
            toggleBtn.style.transform = 'scale(1)';
            toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
            toggleBtn.style.border = '1px solid rgba(139,92,246,0.25)';
        });

        const quickAddBtn = document.createElement('button');
        quickAddBtn.type = 'button';
        quickAddBtn.textContent = '+';
        quickAddBtn.title = 'Ajouter une réponse rapide depuis le texte du chat';
        quickAddBtn.setAttribute('aria-label', 'Ajouter une réponse rapide depuis le texte du chat');
        quickAddBtn.style.width = '34px';
        quickAddBtn.style.height = '34px';
        quickAddBtn.style.border = '1px solid rgba(59,130,246,0.28)';
        quickAddBtn.style.background = 'linear-gradient(135deg, rgba(30,64,175,0.7) 0%, rgba(8,145,178,0.7) 100%)';
        quickAddBtn.style.color = '#eff6ff';
        quickAddBtn.style.fontSize = '18px';
        quickAddBtn.style.fontWeight = '700';
        quickAddBtn.style.lineHeight = '1';
        quickAddBtn.style.borderRadius = '999px';
        quickAddBtn.style.cursor = 'pointer';
        quickAddBtn.style.backdropFilter = 'blur(10px)';
        quickAddBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)';
        quickAddBtn.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

        quickAddBtn.addEventListener('mouseenter', () => {
            quickAddBtn.style.filter = 'brightness(1.12)';
            quickAddBtn.style.transform = 'scale(1.03)';
            quickAddBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            quickAddBtn.style.border = '1px solid rgba(96,165,250,0.42)';
        });

        quickAddBtn.addEventListener('mouseleave', () => {
            quickAddBtn.style.filter = 'brightness(1)';
            quickAddBtn.style.transform = 'scale(1)';
            quickAddBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)';
            quickAddBtn.style.border = '1px solid rgba(59,130,246,0.28)';
        });

        const menu = document.createElement('div');
        menu.setAttribute('data-tm-saved-phrases-menu', '1');
        menu.style.display = 'none';
        menu.style.position = 'absolute';
        menu.style.bottom = 'calc(100% + 8px)';
        menu.style.right = '0';
        menu.style.background = 'rgba(24, 24, 27, 0.75)';
        menu.style.backdropFilter = 'blur(16px)';
        menu.style.border = '1px solid rgba(255,255,255,0.08)';
        menu.style.borderRadius = '14px';
        menu.style.padding = '6px';
        menu.style.minWidth = '220px';
        menu.style.maxWidth = '300px';
        menu.style.maxHeight = '280px';
        menu.style.overflowY = 'auto'; // custom scrollbar si possible, sinon normal
        menu.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
        menu.style.flexDirection = 'column';
        menu.style.gap = '2px';
        menu.style.zIndex = '1000';
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(10px) scale(0.95)';
        menu.style.transformOrigin = 'bottom right';
        menu.style.transition = 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            if (menu.dataset.tmOpen === '1') {
                hideSavedPhrasesMenu(menu);
            } else {
                buildSavedPhrasesMenuContent(menu, getChatInput());
                closeKlipyGifMenu();
                closeSavedPhrasesMenu();
                showSavedPhrasesMenu(menu);
            }
        });

        menu.addEventListener('click', (e) => e.stopPropagation());

        quickAddBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeKlipyGifMenu();
            closeSavedPhrasesMenu();
            openSavedPhraseQuickAddModal(getChatInputCurrentValue(textInput), textInput);
        });

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(quickAddBtn);
        wrapper.appendChild(menu);
        syncChatInputToolbarReservedSpace(textInput);
        syncNativeChatInputActionButtons(textInput);
    }

    function getKlipyGifMenu() {
        const wrapper = document.getElementById(GIF_MENU_WRAPPER_ID);
        if (!(wrapper instanceof HTMLElement)) return null;

        const menu = wrapper.querySelector('[data-tm-klipy-gif-menu="1"]');
        return menu instanceof HTMLElement ? menu : null;
    }

    function clearKlipyGifSearchDebounce() {
        if (!klipyGifSearchDebounceTimer) return;
        clearTimeout(klipyGifSearchDebounceTimer);
        klipyGifSearchDebounceTimer = null;
    }

    function clearKlipyGifMenuHideTimer(menu) {
        if (!(menu instanceof HTMLElement)) return;

        const timerId = Number(menu.dataset.tmHideTimerId || 0);
        if (timerId > 0) {
            clearTimeout(timerId);
            delete menu.dataset.tmHideTimerId;
        }
    }

    function showKlipyGifMenu(menu) {
        if (!(menu instanceof HTMLElement)) return;

        clearKlipyGifMenuHideTimer(menu);
        menu.style.display = 'flex';
        menu.dataset.tmOpen = '1';
        void menu.offsetWidth;
        menu.style.opacity = '1';
        menu.style.transform = 'translateY(0) scale(1)';
    }

    function hideKlipyGifMenu(menu) {
        if (!(menu instanceof HTMLElement)) return;

        clearKlipyGifSearchDebounce();
        clearKlipyGifMenuHideTimer(menu);
        menu.dataset.tmOpen = '0';
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(10px) scale(0.95)';

        const timerId = window.setTimeout(() => {
            if (menu.dataset.tmOpen === '1') return;

            menu.style.display = 'none';
            delete menu.dataset.tmHideTimerId;
        }, 200);

        menu.dataset.tmHideTimerId = String(timerId);
    }

    function closeKlipyGifMenu() {
        const menu = getKlipyGifMenu();
        if (menu) {
            hideKlipyGifMenu(menu);
        }
    }

    function removeKlipyGifToolbar() {
        clearKlipyGifSearchDebounce();

        const menu = getKlipyGifMenu();
        if (menu) {
            clearKlipyGifMenuHideTimer(menu);
        }

        const wrapper = document.getElementById(GIF_MENU_WRAPPER_ID);
        if (wrapper) {
            wrapper.remove();
        }

        syncNativeChatInputActionButtons();
        syncChatInputToolbarReservedSpace();
    }

    function installKlipyGifToolbarGlobalHandlers() {
        if (klipyGifToolbarEventsInstalled) return;

        klipyGifToolbarEventsInstalled = true;

        document.addEventListener('click', (event) => {
            const wrapper = document.getElementById(GIF_MENU_WRAPPER_ID);
            if (!(wrapper instanceof HTMLElement)) return;
            if (event.target instanceof Node && wrapper.contains(event.target)) return;

            closeKlipyGifMenu();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeKlipyGifMenu();
            }
        }, true);

        window.addEventListener('blur', () => {
            closeKlipyGifMenu();
        });
    }

    function getKlipyGifMenuElements(menu) {
        if (!(menu instanceof HTMLElement)) {
            return {
                searchInput: null,
                status: null,
                results: null,
                loadMoreBtn: null
            };
        }

        return {
            searchInput: menu.querySelector('[data-tm-klipy-search="1"]'),
            status: menu.querySelector('[data-tm-klipy-status="1"]'),
            results: menu.querySelector('[data-tm-klipy-results="1"]'),
            loadMoreBtn: menu.querySelector('[data-tm-klipy-more="1"]')
        };
    }

    function setKlipyGifMenuStatus(menu, message, isError = false) {
        const { status } = getKlipyGifMenuElements(menu);
        if (!(status instanceof HTMLElement)) return;

        status.textContent = message;
        status.style.color = isError ? '#fca5a5' : '#cbd5f5';
    }

    function updateKlipyGifMoreButton(menu, visible, isLoading = false) {
        const { loadMoreBtn } = getKlipyGifMenuElements(menu);
        if (!(loadMoreBtn instanceof HTMLButtonElement)) return;

        loadMoreBtn.style.display = visible ? 'inline-flex' : 'none';
        loadMoreBtn.disabled = isLoading;
        loadMoreBtn.textContent = isLoading ? 'Chargement...' : 'Afficher plus';
        loadMoreBtn.style.cursor = isLoading ? 'progress' : 'pointer';
        loadMoreBtn.style.opacity = isLoading ? '0.72' : '1';
    }

    function createKlipyGifResultCard(result, menu) {
        const card = document.createElement('button');
        card.type = 'button';
        card.title = result.title || 'Insérer ce GIF Klipy';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        card.style.padding = '8px';
        card.style.borderRadius = '12px';
        card.style.border = '1px solid rgba(255,255,255,0.08)';
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.cursor = 'pointer';
        card.style.color = '#f8fafc';
        card.style.textAlign = 'left';
        card.style.transition = 'transform 0.16s ease, border-color 0.16s ease, background 0.16s ease';
        card.style.minWidth = '0';

        const preview = document.createElement('img');
        preview.src = result.previewUrl;
        preview.alt = result.title || 'GIF Klipy';
        preview.loading = 'lazy';
        preview.referrerPolicy = 'no-referrer';
        preview.style.display = 'block';
        preview.style.width = '100%';
        preview.style.aspectRatio = result.width > 0 && result.height > 0 ? `${result.width} / ${result.height}` : '1 / 1';
        preview.style.maxHeight = '140px';
        preview.style.objectFit = 'cover';
        preview.style.borderRadius = '10px';
        preview.style.background = 'rgba(15,23,42,0.55)';

        const title = document.createElement('div');
        title.textContent = result.title || 'GIF Klipy';
        title.style.fontSize = '11px';
        title.style.fontWeight = '700';
        title.style.lineHeight = '1.35';
        title.style.color = '#e2e8f0';
        title.style.whiteSpace = 'nowrap';
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';

        const subtitle = document.createElement('div');
        subtitle.textContent = result.tags.length > 0 ? result.tags.join(' · ') : 'Insérer la balise [img][/img]';
        subtitle.style.fontSize = '10px';
        subtitle.style.lineHeight = '1.35';
        subtitle.style.color = '#94a3b8';
        subtitle.style.whiteSpace = 'nowrap';
        subtitle.style.overflow = 'hidden';
        subtitle.style.textOverflow = 'ellipsis';

        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-1px)';
            card.style.borderColor = 'rgba(34,197,94,0.28)';
            card.style.background = 'rgba(34,197,94,0.08)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.borderColor = 'rgba(255,255,255,0.08)';
            card.style.background = 'rgba(255,255,255,0.03)';
        });

        card.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const nextInput = getChatInput();
            if (!nextInput) {
                showToast('Champ de texte non trouvé.', true);
                return;
            }

            const resultInsertion = insertGifIntoChatInput(nextInput, result.gifUrl);
            if (!resultInsertion.ok) {
                showToast(resultInsertion.message, true);
                return;
            }

            hideKlipyGifMenu(menu);
        });

        card.appendChild(preview);
        card.appendChild(title);
        card.appendChild(subtitle);
        return card;
    }

    function renderKlipyGifResults(menu, results, append = false) {
        const { results: resultsContainer } = getKlipyGifMenuElements(menu);
        if (!(resultsContainer instanceof HTMLElement)) return;

        if (!append) {
            resultsContainer.innerHTML = '';
        }

        if (!Array.isArray(results) || results.length === 0) {
            if (!append) {
                const emptyState = document.createElement('div');
                emptyState.textContent = 'Aucun GIF disponible pour cette recherche.';
                emptyState.style.padding = '10px 12px';
                emptyState.style.borderRadius = '10px';
                emptyState.style.background = 'rgba(255,255,255,0.03)';
                emptyState.style.border = '1px dashed rgba(255,255,255,0.08)';
                emptyState.style.fontSize = '11px';
                emptyState.style.color = '#94a3b8';
                emptyState.style.textAlign = 'center';
                resultsContainer.appendChild(emptyState);
            }
            return;
        }

        results.forEach((result) => {
            resultsContainer.appendChild(createKlipyGifResultCard(result, menu));
        });
    }

    async function loadKlipyGifResults(menu, { append = false } = {}) {
        if (!(menu instanceof HTMLElement)) return;

        const { searchInput } = getKlipyGifMenuElements(menu);
        if (!(searchInput instanceof HTMLInputElement)) return;

        const rawQuery = String(searchInput.value || '').trim();
        const effectiveQuery = rawQuery.length >= KLIPY_SEARCH_MIN_LENGTH ? rawQuery : '';
        const nextCursor = append ? String(menu.dataset.tmKlipyNext || '') : '';

        if (append && !nextCursor) return;

        const requestId = String(++klipyGifRequestSerial);
        menu.dataset.tmKlipyRequestId = requestId;

        updateKlipyGifMoreButton(menu, append || !!menu.dataset.tmKlipyNext, append);
        setKlipyGifMenuStatus(
            menu,
            rawQuery && rawQuery.length < KLIPY_SEARCH_MIN_LENGTH
                ? `Tendances Klipy. Tape au moins ${KLIPY_SEARCH_MIN_LENGTH} caractères pour chercher.`
                : effectiveQuery
                    ? `Recherche Klipy: ${effectiveQuery}`
                    : 'Chargement des tendances Klipy...'
        );

        try {
            const payload = await fetchKlipyGifFeed({
                query: effectiveQuery,
                pos: nextCursor
            });

            if (menu.dataset.tmKlipyRequestId !== requestId) return;

            renderKlipyGifResults(menu, payload.results, append);
            menu.dataset.tmKlipyLoaded = '1';
            menu.dataset.tmKlipyQuery = effectiveQuery;
            menu.dataset.tmKlipyNext = payload.next || '';

            if (payload.results.length === 0 && !append) {
                setKlipyGifMenuStatus(
                    menu,
                    effectiveQuery
                        ? `Aucun GIF Klipy pour "${effectiveQuery}".`
                        : 'Aucun GIF tendance disponible pour le moment.',
                    true
                );
            } else if (rawQuery && rawQuery.length < KLIPY_SEARCH_MIN_LENGTH) {
                setKlipyGifMenuStatus(menu, `Tendances Klipy. Tape au moins ${KLIPY_SEARCH_MIN_LENGTH} caractères pour chercher.`);
            } else {
                setKlipyGifMenuStatus(
                    menu,
                    effectiveQuery
                        ? `Résultats Klipy pour "${effectiveQuery}".`
                        : 'Tendances Klipy.'
                );
            }

            updateKlipyGifMoreButton(menu, !!payload.next, false);
        } catch (error) {
            if (menu.dataset.tmKlipyRequestId !== requestId) return;

            if (!append) {
                renderKlipyGifResults(menu, [], false);
            }

            updateKlipyGifMoreButton(menu, false, false);
            setKlipyGifMenuStatus(
                menu,
                `Erreur Klipy: ${error instanceof Error ? error.message : 'chargement impossible.'}`,
                true
            );
        }
    }

    function scheduleKlipyGifSearch(menu) {
        clearKlipyGifSearchDebounce();
        klipyGifSearchDebounceTimer = window.setTimeout(() => {
            klipyGifSearchDebounceTimer = null;
            loadKlipyGifResults(menu);
        }, KLIPY_SEARCH_DEBOUNCE_MS);
    }

    function injectKlipyGifToolbar() {
        if (!isSupportedPage()) return;
        if (!klipyGifsEnabled) {
            removeKlipyGifToolbar();
            return;
        }

        installKlipyGifToolbarGlobalHandlers();

        const textInput = getChatInput();
        if (!textInput) return;
        const mountContext = getChatInputToolbarMountContext(textInput);
        const rail = getOrCreateChatInputToolbarRail(mountContext);
        if (!(rail instanceof HTMLElement)) return;

        let wrapper = document.getElementById(GIF_MENU_WRAPPER_ID);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = GIF_MENU_WRAPPER_ID;
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'flex-start';
            wrapper.style.position = 'relative';
            wrapper.style.zIndex = '50';
            wrapper.style.overflow = 'visible';
            wrapper.style.pointerEvents = 'auto';
        }

        const phrasesWrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
        if (wrapper.parentNode !== rail) {
            if (phrasesWrapper instanceof HTMLElement && phrasesWrapper.parentElement === rail) {
                rail.insertBefore(wrapper, phrasesWrapper);
            } else {
                rail.appendChild(wrapper);
            }
        } else if (phrasesWrapper instanceof HTMLElement && phrasesWrapper.parentElement === rail && wrapper.nextElementSibling !== phrasesWrapper) {
            rail.insertBefore(wrapper, phrasesWrapper);
        }

        wrapper.innerHTML = '';
        wrapper.style.display = 'flex';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.innerHTML = '<span style="margin-right:4px;">🎞</span> GIF';
        toggleBtn.title = 'Ouvrir le picker GIF Klipy';
        toggleBtn.setAttribute('aria-label', 'Ouvrir le picker GIF Klipy');
        toggleBtn.style.background = 'linear-gradient(135deg, rgba(21,128,61,0.72) 0%, rgba(5,150,105,0.72) 100%)';
        toggleBtn.style.border = '1px solid rgba(74,222,128,0.26)';
        toggleBtn.style.color = '#ecfdf5';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.fontWeight = '600';
        toggleBtn.style.padding = '6px 14px';
        toggleBtn.style.borderRadius = '999px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.backdropFilter = 'blur(10px)';
        toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
        toggleBtn.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.filter = 'brightness(1.12)';
            toggleBtn.style.transform = 'scale(1.02)';
            toggleBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            toggleBtn.style.border = '1px solid rgba(134,239,172,0.42)';
        });

        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.filter = 'brightness(1)';
            toggleBtn.style.transform = 'scale(1)';
            toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
            toggleBtn.style.border = '1px solid rgba(74,222,128,0.26)';
        });

        const menu = document.createElement('div');
        menu.setAttribute('data-tm-klipy-gif-menu', '1');
        menu.style.display = 'none';
        menu.style.position = 'absolute';
        menu.style.bottom = 'calc(100% + 8px)';
        menu.style.left = '0';
        menu.style.width = 'min(640px, calc(100vw - 28px))';
        menu.style.maxHeight = 'min(76vh, 620px)';
        menu.style.background = 'rgba(17,24,39,0.9)';
        menu.style.backdropFilter = 'blur(16px)';
        menu.style.border = '1px solid rgba(255,255,255,0.08)';
        menu.style.borderRadius = '16px';
        menu.style.padding = '10px';
        menu.style.boxShadow = '0 18px 45px rgba(0,0,0,0.48)';
        menu.style.flexDirection = 'column';
        menu.style.gap = '10px';
        menu.style.zIndex = '1000';
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(10px) scale(0.95)';
        menu.style.transformOrigin = 'bottom left';
        menu.style.transition = 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.gap = '10px';

        const title = document.createElement('div');
        title.textContent = 'Klipy GIF';
        title.style.fontSize = '12px';
        title.style.fontWeight = '700';
        title.style.color = '#f8fafc';

        const subtitle = document.createElement('div');
        subtitle.textContent = 'Insertion via balise [img][/img]';
        subtitle.style.fontSize = '10px';
        subtitle.style.color = '#94a3b8';

        const titleBlock = document.createElement('div');
        titleBlock.appendChild(title);
        titleBlock.appendChild(subtitle);

        const providerLink = document.createElement('a');
        providerLink.href = 'https://klipy.com/';
        providerLink.target = '_blank';
        providerLink.rel = 'noreferrer noopener';
        providerLink.textContent = 'Klipy';
        providerLink.style.fontSize = '10px';
        providerLink.style.fontWeight = '700';
        providerLink.style.color = '#86efac';
        providerLink.style.textDecoration = 'none';

        header.appendChild(titleBlock);
        header.appendChild(providerLink);

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Rechercher un GIF Klipy';
        searchInput.setAttribute('data-tm-klipy-search', '1');
        searchInput.style.width = '100%';
        searchInput.style.background = 'rgba(15,23,42,0.75)';
        searchInput.style.color = '#f8fafc';
        searchInput.style.border = '1px solid rgba(255,255,255,0.08)';
        searchInput.style.borderRadius = '12px';
        searchInput.style.padding = '10px 12px';
        searchInput.style.outline = 'none';
        searchInput.style.fontSize = '12px';

        const status = document.createElement('div');
        status.setAttribute('data-tm-klipy-status', '1');
        status.textContent = `Tendances Klipy. Tape au moins ${KLIPY_SEARCH_MIN_LENGTH} caractères pour chercher.`;
        status.style.fontSize = '11px';
        status.style.lineHeight = '1.45';
        status.style.color = '#cbd5f5';

        const results = document.createElement('div');
        results.setAttribute('data-tm-klipy-results', '1');
        results.style.display = 'grid';
        results.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
        results.style.gap = '8px';
        results.style.maxHeight = '420px';
        results.style.overflowY = 'auto';
        results.style.paddingRight = '2px';

        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.type = 'button';
        loadMoreBtn.setAttribute('data-tm-klipy-more', '1');
        loadMoreBtn.textContent = 'Afficher plus';
        loadMoreBtn.style.display = 'none';
        loadMoreBtn.style.alignSelf = 'center';
        loadMoreBtn.style.border = '1px solid rgba(74,222,128,0.22)';
        loadMoreBtn.style.background = 'rgba(22,163,74,0.12)';
        loadMoreBtn.style.color = '#dcfce7';
        loadMoreBtn.style.borderRadius = '999px';
        loadMoreBtn.style.padding = '8px 12px';
        loadMoreBtn.style.fontSize = '11px';
        loadMoreBtn.style.fontWeight = '700';
        loadMoreBtn.style.cursor = 'pointer';

        const footer = document.createElement('div');
        footer.textContent = 'Le bouton colle une balise BBCode [img]URL[/img] dans le champ du chat.';
        footer.style.fontSize = '10px';
        footer.style.lineHeight = '1.45';
        footer.style.color = '#64748b';

        menu.appendChild(header);
        menu.appendChild(searchInput);
        menu.appendChild(status);
        menu.appendChild(results);
        menu.appendChild(loadMoreBtn);
        menu.appendChild(footer);

        toggleBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (menu.dataset.tmOpen === '1') {
                hideKlipyGifMenu(menu);
                return;
            }

            closeSavedPhrasesMenu();
            closeKlipyGifMenu();
            showKlipyGifMenu(menu);

            if (menu.dataset.tmKlipyLoaded !== '1') {
                loadKlipyGifResults(menu);
            }

            searchInput.focus();
        });

        searchInput.addEventListener('input', () => {
            delete menu.dataset.tmKlipyLoaded;
            delete menu.dataset.tmKlipyNext;
            scheduleKlipyGifSearch(menu);
        });

        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                clearKlipyGifSearchDebounce();
                loadKlipyGifResults(menu);
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                hideKlipyGifMenu(menu);
            }
        });

        loadMoreBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            loadKlipyGifResults(menu, { append: true });
        });

        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(menu);
        syncChatInputToolbarReservedSpace(textInput);
        syncNativeChatInputActionButtons(textInput);
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
        const normalizedMessageText = normalizeMentionComparableText(messageText);
        const normalizedReplyContextText = normalizeMentionComparableText(replyContextText).replace(/^@+/, '');
        const stableTimestampToken = messageTimestampKey > 0
            ? String(messageTimestampKey)
            : normalizeMentionComparableText(messageTimestamp);

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

        const signatureParts = [username, stableTimestampToken, normalizedMessageText];

        // Keep reply-context-only mentions distinct without making home/chat hashes diverge.
        if (!normalizedMessageText && normalizedReplyContextText) {
            signatureParts.push(`reply:${normalizedReplyContextText}`);
        }

        return {
            hash: hashString(signatureParts.join('|')),
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
        picker.style.zIndex = '260';

        const rect = picker.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        const nextLeft = messageActionsLeftEnabled
            ? clamp(clientX - rect.width - LONG_PRESS_REACTION_PICKER_OFFSET_X, 8, maxLeft)
            : clamp(clientX + LONG_PRESS_REACTION_PICKER_OFFSET_X, 8, maxLeft);
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

    function installSavedPhrasesReplyContextTracker() {
        document.addEventListener('click', (event) => {
            if (modalOpen || !isChatPage()) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            const clickedButton = target.closest('button');
            if (!(clickedButton instanceof HTMLButtonElement)) return;

            const messageEl = findMessageElementFromTarget(clickedButton);
            if (!messageEl || !messageEl.contains(clickedButton)) return;

            const replyButton = getMessageReplyActionButton(messageEl);
            if (!(replyButton instanceof HTMLButtonElement) || replyButton.disabled) return;
            if (clickedButton !== replyButton && !replyButton.contains(clickedButton)) return;

            setSavedPhrasesReplyContextFromMessage(messageEl);
        }, true);
    }

    function installNativeReactionButtonPositionHandler() {
        document.addEventListener('click', (event) => {
            if (modalOpen || !isChatPage() || !messageActionsLeftEnabled) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            const clickedButton = target.closest('button');
            if (!(clickedButton instanceof HTMLButtonElement)) return;

            const messageEl = findMessageElementFromTarget(clickedButton);
            if (!messageEl || !messageEl.contains(clickedButton)) return;

            const reactionButton = getMessageReactionActionButton(messageEl);
            if (!(reactionButton instanceof HTMLButtonElement) || reactionButton.disabled) return;
            if (clickedButton !== reactionButton && !reactionButton.contains(clickedButton)) return;

            positionReactionPickerNearPointer(event.clientX, event.clientY);
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
        const currentChatContextKey = getCurrentChatContextKey();

        if (!isChatPage()) {
            clearSavedPhrasesReplyContext();
        } else if (savedPhrasesReplyContext && savedPhrasesReplyContext.contextKey !== currentChatContextKey) {
            clearSavedPhrasesReplyContext();
        }

        lastChatContextKey = currentChatContextKey;

        if (isSupportedPage()) {
            statsCollapsed = loadStatsCollapsed();
            statsHidden = loadStatsHidden();
            chatScrollbarEnabled = loadChatScrollbarEnabled();
            messageActionsLeftEnabled = loadMessageActionsLeftEnabled();
            hideChatFooterEnabled = loadHideChatFooterEnabled();
            lightThemeEnabled = loadLightThemeEnabled();

            if (isHomePage() && !getHomepageChatContainer()) {
                removeSavedPhrasesToolbar();
                removeKlipyGifToolbar();
                stopObserver();
                return;
            }

            createStatsBox();
            syncHomepageCollapseUi(true);
            applyBoxPosition();
            applyLightThemeState();
            applyChatPageScrollbarState();
            applyMessageActionsPositionState();
            applyChatFooterVisibilityState();
            applyHomeChatPopoverState();
            applyNativeChatInputPopoverState();
            injectSavedPhrasesToolbar();
            injectKlipyGifToolbar();
            applyChatInputToolbarAlignmentState();
            syncNativeChatInputActionButtons();

            if (isHomePage() && homeChatCollapsed) {
                stopObserver();
            } else {
                processAllMessages();
                startObserver();
            }
        } else {
            lightThemeEnabled = false;
            applyLightThemeState();
            applyMessageActionsPositionState();
            applyChatFooterVisibilityState();
            applyHomeChatPopoverState();
            applyNativeChatInputPopoverState();
            stopObserver();
            removeSavedPhrasesToolbar();
            removeKlipyGifToolbar();
            removeStatsBox();
            closeSettingsModal();
            hideImagePreview();
            removeToast();
            syncNativeChatInputActionButtons();
        }
    }

    function installRouteWatcher() {
        if (routeWatcher) return;

        let lastUrl = location.href;
        let lastPageType = getCurrentPageType();

        routeWatcher = setInterval(() => {
            const currentPageType = getCurrentPageType();

            if (isChatPage()) {
                applyChatPageScrollbarState();
            }

            if (location.href !== lastUrl || currentPageType !== lastPageType) {
                lastUrl = location.href;
                lastPageType = currentPageType;
                refreshForRoute();
            } else if (isChatPage() && getCurrentChatContextKey() !== lastChatContextKey) {
                lastChatContextKey = getCurrentChatContextKey();
                clearSavedPhrasesReplyContext();
                injectSavedPhrasesToolbar();
                injectKlipyGifToolbar();
                applyChatInputToolbarAlignmentState();
                syncNativeChatInputActionButtons();
                processAllMessages();
            } else if (isHomePage() && !getHomepageChatContainer()) {
                removeSavedPhrasesToolbar();
                removeKlipyGifToolbar();
                stopObserver();
            } else if (isHomePage() && needsHomepageCollapseUiRefresh()) {
                syncHomepageCollapseUi();
            } else if (isHomePage() && getHomepageChatContainer() && !observer) {
                refreshForRoute();
            } else if (isSupportedPage()) {
                if (!savedPhrasesEnabled) {
                    removeSavedPhrasesToolbar();
                }

                if (!klipyGifsEnabled) {
                    removeKlipyGifToolbar();
                }

                const textInput = getChatInput();
                if (textInput) {
                    const mountContext = getChatInputToolbarMountContext(textInput);
                    const mountParent = mountContext.mountParent;
                    const phrasesWrapper = document.getElementById(PHRASES_MENU_WRAPPER_ID);
                    const gifWrapper = document.getElementById(GIF_MENU_WRAPPER_ID);

                    if (
                        savedPhrasesEnabled &&
                        savedPhrases.length > 0 &&
                        mountParent &&
                        (!phrasesWrapper || !mountParent.contains(phrasesWrapper))
                    ) {
                        injectSavedPhrasesToolbar();
                    }

                    if (klipyGifsEnabled && mountParent && (!gifWrapper || !mountParent.contains(gifWrapper))) {
                        injectKlipyGifToolbar();
                    }

                    applyChatInputToolbarAlignmentState();
                    syncNativeChatInputActionButtons(textInput);
                }
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

        window.addEventListener('resize', () => {
            if (!isChatPage() || !messageActionsLeftEnabled) return;
            processAllMessages();
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
        installSavedPhrasesReplyContextTracker();
        installNativeReactionButtonPositionHandler();
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
