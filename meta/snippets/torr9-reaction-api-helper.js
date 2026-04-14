/*
 * Helper autonome pour expérimenter l'appel API des réactions Torr9.
 *
 * Usage console navigateur :
 *   Torr9ReactionApiHelper.installAuthObserver();
 *   const messageEl = Torr9ReactionApiHelper.findMessageElementFromTarget($0);
 *   const meta = Torr9ReactionApiHelper.resolveMessageApiMeta(messageEl);
 *   await Torr9ReactionApiHelper.react({
 *     channel: meta.channel,
 *     messageId: meta.messageId,
 *     emoji: '👍'
 *   });
 *
 * Tu peux aussi forcer le token :
 *   await Torr9ReactionApiHelper.react({
 *     channel: 'general',
 *     messageId: 241824,
 *     emoji: '👍',
 *     bearerToken: 'eyJ...'
 *   });
 */
(function attachTorr9ReactionApiHelper(globalObject) {
    'use strict';

    const TORR9_API_BASE_URL = 'https://api.torr9.net/api/v1';

    let observedBearerToken = '';

    function normalizeBearerToken(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';

        const match = rawValue.match(/^(?:bearer\s+)?([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i);
        return match ? match[1] : '';
    }

    function extractBearerTokenFromValue(value, depth) {
        const currentDepth = Number(depth) || 0;
        if (currentDepth > 5 || value === null || value === undefined) return '';

        if (typeof value === 'string') {
            const directToken = normalizeBearerToken(value);
            if (directToken) return directToken;

            const trimmedValue = value.trim();
            if (
                trimmedValue &&
                trimmedValue.length <= 20000 &&
                (/^[\[{]/.test(trimmedValue) || /^"/.test(trimmedValue))
            ) {
                try {
                    return extractBearerTokenFromValue(JSON.parse(trimmedValue), currentDepth + 1);
                } catch (error) {}
            }

            return '';
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return '';
        }

        if (Array.isArray(value)) {
            for (const entry of value.slice(0, 25)) {
                const extractedToken = extractBearerTokenFromValue(entry, currentDepth + 1);
                if (extractedToken) return extractedToken;
            }

            return '';
        }

        if (typeof value === 'object') {
            const prioritizedKeys = [
                'authorization',
                'Authorization',
                'token',
                'accessToken',
                'access_token',
                'jwt',
                'bearer',
                'authToken',
                'idToken',
                'session',
                'user',
                'data'
            ];

            for (const key of prioritizedKeys) {
                if (!(key in value)) continue;

                const extractedToken = extractBearerTokenFromValue(value[key], currentDepth + 1);
                if (extractedToken) return extractedToken;
            }

            for (const entry of Object.values(value).slice(0, 25)) {
                const extractedToken = extractBearerTokenFromValue(entry, currentDepth + 1);
                if (extractedToken) return extractedToken;
            }
        }

        return '';
    }

    function rememberBearerToken(value) {
        const normalizedToken = normalizeBearerToken(value);
        if (!normalizedToken) return '';

        observedBearerToken = normalizedToken;
        return observedBearerToken;
    }

    function getAuthorizationHeaderValue(headersLike) {
        if (!headersLike) return '';

        try {
            if (headersLike instanceof Headers) {
                return String(headersLike.get('authorization') || headersLike.get('Authorization') || '').trim();
            }
        } catch (error) {}

        if (Array.isArray(headersLike)) {
            for (const entry of headersLike) {
                if (!Array.isArray(entry) || entry.length < 2) continue;
                if (String(entry[0] || '').toLowerCase() !== 'authorization') continue;
                return String(entry[1] || '').trim();
            }

            return '';
        }

        if (typeof headersLike === 'object') {
            for (const pair of Object.entries(headersLike)) {
                if (String(pair[0] || '').toLowerCase() !== 'authorization') continue;
                return String(pair[1] || '').trim();
            }
        }

        return '';
    }

    function observeAuthorizationHeader(headersLike) {
        const headerValue = getAuthorizationHeaderValue(headersLike);
        if (!headerValue) return '';

        return rememberBearerToken(headerValue);
    }

    function getBearerTokenFromStorage(storage) {
        if (!storage || typeof storage.length !== 'number') return '';

        try {
            const matchingKeys = [];
            const fallbackKeys = [];

            for (let index = 0; index < storage.length; index += 1) {
                const storageKey = storage.key(index);
                if (!storageKey) continue;

                if (/(token|auth|session|user|profile)/i.test(storageKey)) {
                    matchingKeys.push(storageKey);
                } else {
                    fallbackKeys.push(storageKey);
                }
            }

            for (const storageKey of matchingKeys.concat(fallbackKeys)) {
                const extractedToken = extractBearerTokenFromValue(storage.getItem(storageKey), 0);
                if (extractedToken) return extractedToken;
            }
        } catch (error) {}

        return '';
    }

    function getBearerToken() {
        if (observedBearerToken) return observedBearerToken;

        const storageToken = getBearerTokenFromStorage(globalObject.localStorage) ||
            getBearerTokenFromStorage(globalObject.sessionStorage);
        if (storageToken) {
            return rememberBearerToken(storageToken);
        }

        const nextDataToken = extractBearerTokenFromValue(globalObject.__NEXT_DATA__, 0);
        if (nextDataToken) {
            return rememberBearerToken(nextDataToken);
        }

        return '';
    }

    function installAuthObserver() {
        if (globalObject.fetch && globalObject.fetch.__tmTorr9ReactionHelperObserved !== true) {
            const originalFetch = globalObject.fetch;
            const observedFetch = function observedFetchWrapper() {
                const input = arguments[0];
                const init = arguments[1];

                if (input instanceof Request) {
                    observeAuthorizationHeader(input.headers);
                }

                if (init && init.headers) {
                    observeAuthorizationHeader(init.headers);
                }

                return originalFetch.apply(this, arguments);
            };

            observedFetch.__tmTorr9ReactionHelperObserved = true;
            globalObject.fetch = observedFetch;
        }

        if (
            globalObject.XMLHttpRequest &&
            globalObject.XMLHttpRequest.prototype &&
            globalObject.XMLHttpRequest.prototype.__tmTorr9ReactionHelperObserved !== true
        ) {
            const originalSetRequestHeader = globalObject.XMLHttpRequest.prototype.setRequestHeader;

            globalObject.XMLHttpRequest.prototype.setRequestHeader = function setObservedRequestHeader(name, value) {
                if (String(name || '').toLowerCase() === 'authorization') {
                    rememberBearerToken(value);
                }

                return originalSetRequestHeader.apply(this, arguments);
            };

            globalObject.XMLHttpRequest.prototype.__tmTorr9ReactionHelperObserved = true;
        }

        return {
            ok: true,
            message: 'Observation auth installée.'
        };
    }

    function normalizeName(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizeComparableText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .trim()
            .toLowerCase();
    }

    function normalizeChatContextLabel(value) {
        return normalizeComparableText(value).replace(/\s+/g, ' ');
    }

    function normalizeChatMessageId(value) {
        const rawValue = String(value || '').trim();
        return /^\d+$/.test(rawValue) ? rawValue : '';
    }

    function getChatPageHeaderTitle() {
        const titles = Array.from(
            globalObject.document.querySelectorAll('h2.text-sm.font-semibold.text-white.truncate')
        );

        for (const title of titles) {
            const textValue = String(title.textContent || '').trim();
            if (!textValue) continue;
            if (normalizeChatContextLabel(textValue) === 'chat') continue;
            return textValue;
        }

        return '';
    }

    function getCurrentChannel() {
        const headerTitle = getChatPageHeaderTitle();
        if (!headerTitle || !headerTitle.startsWith('#')) return '';
        return headerTitle.slice(1).trim();
    }

    function isChatMessage(element) {
        if (!(element instanceof HTMLElement)) return false;

        const isMessageContainer =
            element.classList.contains('group') &&
            element.classList.contains('relative') &&
            element.classList.contains('flex') &&
            element.classList.contains('items-start');

        if (!isMessageContainer) return false;

        const hasTextBlock = !!element.querySelector(':scope > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words');
        const hasAvatarSlot = !!element.querySelector(':scope > .flex-shrink-0.w-7, :scope > .flex-shrink-0.w-7.md\\:w-9');
        return hasTextBlock && hasAvatarSlot;
    }

    function findMessageElementFromTarget(target) {
        if (!(target instanceof Element)) return null;
        const messageElement = target.closest('.group.relative.flex.items-start');
        return isChatMessage(messageElement) ? messageElement : null;
    }

    function getUsernameFromMessage(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return '';
        const userButton = messageEl.querySelector(':scope > .flex-1.min-w-0 > .flex.items-baseline button[type="button"]');
        return String(userButton && userButton.textContent || '').trim();
    }

    function getLogicalUsername(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return '';

        const directUsername = getUsernameFromMessage(messageEl);
        if (directUsername) return directUsername;

        let previousElement = messageEl.previousElementSibling;
        while (previousElement) {
            if (isChatMessage(previousElement)) {
                const previousUsername = getUsernameFromMessage(previousElement);
                if (previousUsername) return previousUsername;
            }
            previousElement = previousElement.previousElementSibling;
        }

        return '';
    }

    function getMessageTextContent(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return '';
        const textBlock = messageEl.querySelector(':scope > .flex-1.min-w-0 > .text-sm.text-gray-200.break-words');
        return String(textBlock && textBlock.textContent || '').trim();
    }

    function parseMessageTimestampKey(timestampText) {
        const rawValue = String(timestampText || '').trim();
        if (!rawValue) return 0;

        const match = rawValue.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*[aà]\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
        if (!match) return 0;

        const day = Number(match[1]);
        const monthIndex = Number(match[2]) - 1;
        const year = Number(match[3]);
        const hour = Number(match[4]);
        const minute = Number(match[5]);
        const second = Number(match[6] || '0');

        const timestamp = new Date(year, monthIndex, day, hour, minute, second).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function getMessageTimestampText(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return '';

        const metaSpans = Array.from(
            messageEl.querySelectorAll(':scope > .flex-1.min-w-0 > .flex.items-baseline span')
        );
        const parsedCandidate = metaSpans
            .map((span) => String(span.textContent || '').trim())
            .find((textValue) => parseMessageTimestampKey(textValue) > 0);

        if (parsedCandidate) return parsedCandidate;

        return metaSpans
            .map((span) => String(span.textContent || '').trim())
            .filter(Boolean)
            .pop() || '';
    }

    function getReactInternalCandidates(element) {
        if (!(element instanceof HTMLElement)) return [];

        const candidates = [];
        Object.keys(element).forEach((key) => {
            if (!key.startsWith('__reactProps$') && !key.startsWith('__reactFiber$')) return;

            const value = element[key];
            if (!value) return;

            candidates.push(value);

            if (value.memoizedProps) {
                candidates.push(value.memoizedProps);
            }

            if (value.pendingProps) {
                candidates.push(value.pendingProps);
            }
        });

        return candidates;
    }

    function normalizeReactionApiCandidate(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

        const messageId = normalizeChatMessageId(value.id ?? value.messageId ?? value.message_id);
        if (!messageId) return null;

        const messageText = String(
            value.content ??
            value.text ??
            value.message ??
            value.body ??
            value.messageText ??
            ''
        ).trim();
        const username = normalizeName(
            value.username ??
            value.user && value.user.username ??
            value.author && value.author.username ??
            value.sender && value.sender.username ??
            value.member && value.member.username ??
            ''
        );
        const createdAtRaw = value.createdAt ?? value.created_at ?? value.sentAt ?? value.timestamp ?? value.date ?? '';
        const createdAtMs = createdAtRaw ? Date.parse(String(createdAtRaw)) : 0;
        const channel = String(
            value.channel && (value.channel.slug || value.channel.name) ||
            value.channelName ||
            value.channel_name ||
            ''
        ).trim();

        if (!messageText && !username && !createdAtRaw && !channel && !Array.isArray(value.reactions)) {
            return null;
        }

        return {
            messageId,
            messageText,
            normalizedMessageText: normalizeComparableText(messageText).replace(/\s+/g, ' ').trim(),
            username,
            createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
            channel
        };
    }

    function scoreReactionApiCandidate(candidate, expected) {
        if (!candidate || !candidate.messageId) return -1;

        let score = 1;

        if (candidate.normalizedMessageText && expected.normalizedMessageText) {
            if (candidate.normalizedMessageText === expected.normalizedMessageText) {
                score += 8;
            } else if (
                candidate.normalizedMessageText.includes(expected.normalizedMessageText) ||
                expected.normalizedMessageText.includes(candidate.normalizedMessageText)
            ) {
                score += 4;
            }
        }

        if (candidate.username && expected.username && candidate.username === expected.username) {
            score += 5;
        }

        if (candidate.createdAtMs > 0 && expected.timestampKey > 0) {
            const deltaMs = Math.abs(candidate.createdAtMs - expected.timestampKey);
            if (deltaMs <= 1500) {
                score += 4;
            } else if (deltaMs <= 60000) {
                score += 2;
            }
        }

        if (candidate.channel && expected.channel && normalizeChatContextLabel(candidate.channel) === expected.channel) {
            score += 2;
        }

        return score;
    }

    function findBestReactionApiCandidate(rootValue, expected, seen, depth) {
        const currentDepth = Number(depth) || 0;
        const visited = seen || new WeakSet();

        if (currentDepth > 6 || rootValue === null || rootValue === undefined) return null;
        if (typeof rootValue !== 'object') return null;
        if (visited.has(rootValue)) return null;

        visited.add(rootValue);

        let bestMatch = null;
        const directCandidate = normalizeReactionApiCandidate(rootValue);
        if (directCandidate) {
            const directScore = scoreReactionApiCandidate(directCandidate, expected);
            if (directScore >= 6) {
                bestMatch = {
                    score: directScore,
                    candidate: directCandidate
                };
            }
        }

        const valuesToInspect = [];

        if (Array.isArray(rootValue)) {
            valuesToInspect.push(...rootValue.slice(0, 20));
        } else {
            const priorityKeys = ['message', 'messageData', 'chatMessage', 'data', 'item', 'props', 'children', 'messages'];

            priorityKeys.forEach((key) => {
                if (key in rootValue) {
                    valuesToInspect.push(rootValue[key]);
                }
            });

            Object.entries(rootValue)
                .slice(0, 30)
                .forEach(([key, value]) => {
                    if (priorityKeys.includes(key)) return;
                    if (typeof value === 'function') return;
                    if (value instanceof Node) return;
                    valuesToInspect.push(value);
                });
        }

        valuesToInspect.forEach((value) => {
            const nestedMatch = findBestReactionApiCandidate(value, expected, visited, currentDepth + 1);
            if (!nestedMatch) return;

            if (!bestMatch || nestedMatch.score > bestMatch.score) {
                bestMatch = nestedMatch;
            }
        });

        return bestMatch;
    }

    function resolveMessageApiMeta(messageEl) {
        if (!(messageEl instanceof HTMLElement)) {
            throw new Error('messageEl invalide.');
        }

        const currentChannel = getCurrentChannel();
        if (!currentChannel) {
            throw new Error('Impossible de déterminer le channel courant.');
        }

        const expected = {
            normalizedMessageText: normalizeComparableText(getMessageTextContent(messageEl)).replace(/\s+/g, ' ').trim(),
            username: normalizeName(getLogicalUsername(messageEl)),
            timestampKey: parseMessageTimestampKey(getMessageTimestampText(messageEl)),
            channel: normalizeChatContextLabel(currentChannel)
        };

        const sourceElements = [
            messageEl,
            messageEl.querySelector(':scope > .flex-1.min-w-0')
        ].filter((element) => element instanceof HTMLElement);

        let bestMatch = null;

        sourceElements.forEach((sourceElement) => {
            getReactInternalCandidates(sourceElement).forEach((candidateRoot) => {
                const candidateMatch = findBestReactionApiCandidate(candidateRoot, expected, new WeakSet(), 0);
                if (!candidateMatch) return;

                if (!bestMatch || candidateMatch.score > bestMatch.score) {
                    bestMatch = candidateMatch;
                }
            });
        });

        if (!bestMatch || !bestMatch.candidate || !bestMatch.candidate.messageId) {
            throw new Error('Impossible de résoudre le messageId depuis le DOM/React.');
        }

        return {
            channel: bestMatch.candidate.channel || currentChannel,
            messageId: bestMatch.candidate.messageId,
            score: bestMatch.score,
            username: bestMatch.candidate.username || getLogicalUsername(messageEl),
            messageText: bestMatch.candidate.messageText || getMessageTextContent(messageEl)
        };
    }

    function buildReactionUrl(channel, messageId) {
        const normalizedChannel = String(channel || '').trim();
        const normalizedMessageId = String(messageId || '').trim();

        if (!normalizedChannel) {
            throw new Error('Channel requis.');
        }

        if (!/^\d+$/.test(normalizedMessageId)) {
            throw new Error('messageId invalide.');
        }

        return `${TORR9_API_BASE_URL}/chat/channels/${encodeURIComponent(normalizedChannel)}/messages/${normalizedMessageId}/reactions`;
    }

    function buildReactionRequestInit(options) {
        const bearerToken = normalizeBearerToken(options && options.bearerToken);
        const emoji = String(options && options.emoji || '').trim();

        if (!emoji) {
            throw new Error('Emoji requis.');
        }

        if (!bearerToken) {
            throw new Error('Bearer token introuvable.');
        }

        return {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                Accept: '*/*',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bearerToken}`
            },
            body: JSON.stringify({ emoji })
        };
    }

    async function react(options) {
        const safeOptions = options || {};
        const bearerToken = normalizeBearerToken(safeOptions.bearerToken) || getBearerToken();
        const url = buildReactionUrl(safeOptions.channel, safeOptions.messageId);
        const requestInit = buildReactionRequestInit({
            emoji: safeOptions.emoji,
            bearerToken
        });

        const response = await globalObject.fetch(url, requestInit);

        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {}

        if (!response.ok) {
            const error = new Error(
                payload && payload.message ? payload.message : `HTTP ${response.status}`
            );
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return {
            ok: true,
            status: response.status,
            payload,
            url,
            requestInit
        };
    }

    globalObject.Torr9ReactionApiHelper = {
        TORR9_API_BASE_URL,
        installAuthObserver,
        getBearerToken,
        getCurrentChannel,
        findMessageElementFromTarget,
        resolveMessageApiMeta,
        buildReactionUrl,
        buildReactionRequestInit,
        react,
        _internals: {
            normalizeName,
            normalizeComparableText,
            normalizeChatContextLabel,
            normalizeChatMessageId,
            getChatPageHeaderTitle,
            getUsernameFromMessage,
            getLogicalUsername,
            getMessageTextContent,
            getMessageTimestampText,
            parseMessageTimestampKey,
            getReactInternalCandidates,
            normalizeReactionApiCandidate,
            scoreReactionApiCandidate,
            findBestReactionApiCandidate,
            normalizeBearerToken,
            extractBearerTokenFromValue,
            observeAuthorizationHeader,
            rememberBearerToken
        }
    };
})(window);
