// ==UserScript==
// @name         torr9conf
// @namespace    http://tampermonkey.net/
// @version      1.0.6
// @description  Cache les lignes +18 sur my-uploads et stats si want_porn = false
// @match        https://torr9.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    let lastWantPorn;
    let toggleInProgress = false;

    /**
     * Lit et parse l'objet utilisateur stocké dans localStorage.user
     * Retourne null si la clé est absente ou invalide
     */
    function readUserObject() {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    /**
     * Retourne la valeur booléenne de user.want_porn
     */
    function readWantPorn() {
        const user = readUserObject();
        return user?.want_porn;
    }

    /**
     * Retourne l'identifiant utilisateur depuis l'objet user
     */
    function readUserId() {
        const user = readUserObject();
        return user?.user_id || user?.id;
    }

    /**
     * Lit le token uniquement dans localStorage.token
     */
    function readAuthToken() {
        return localStorage.getItem('token');
    }

    /**
     * Bascule la valeur want_porn via l'API distante
     * puis resynchronise localStorage.user si nécessaire
     * et recharge la page après succès
     */
    async function toggleWantPornViaApi() {
        if (toggleInProgress) return;

        try {
            toggleInProgress = true;

            const userId = readUserId();
            const currentWantPorn = readWantPorn();
            const token = readAuthToken();

            if (!userId) return;
            if (typeof currentWantPorn !== 'boolean') return;
            if (!token) return;

            const nextWantPorn = !currentWantPorn;

            const response = await fetch(`https://api.torr9.net/api/v1/users/${userId}/want-porn`, {
                method: 'PATCH',
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'omit',
                body: JSON.stringify({
                    want_porn: nextWantPorn
                })
            });

            if (!response.ok) return;

            try {
                await response.json();
            } catch {
                // Certaines réponses peuvent être vides ou non JSON
            }

            const user = readUserObject();
            if (user) {
                user.want_porn = nextWantPorn;
                localStorage.setItem('user', JSON.stringify(user));
            }

            checkWantPorn();
            window.location.reload();
        } finally {
            toggleInProgress = false;
        }
    }

    /**
     * Détecte une catégorie adulte
     */
    function isAdultCategory(text) {
        if (!text) return false;
        const normalized = text.toLowerCase();
        return normalized.includes('+18') || normalized.includes('-18');
    }

    /**
     * Normalise une chaine pour les comparaisons textuelles
     */
    function normalizeText(value) {
        return String(value || '').trim().replace(/\s+/g, ' ');
    }

    /**
     * Met a jour le texte uniquement si necessaire
     */
    function setTextIfChanged(element, nextText) {
        if (!element) return;

        const normalizedNextText = String(nextText);
        if (element.textContent === normalizedNextText) return;
        element.textContent = normalizedNextText;
    }

    /**
     * Memorise le texte d'origine d'un element pour permettre sa restauration
     */
    function rememberOriginalText(element) {
        if (!element) return;
        if (element.dataset.tmTorr9confOriginalText !== undefined) return;
        element.dataset.tmTorr9confOriginalText = element.textContent || '';
    }

    /**
     * Restaure le texte d'origine d'un element si un snapshot existe
     */
    function restoreOriginalText(element) {
        if (!element) return;
        if (element.dataset.tmTorr9confOriginalText === undefined) return;
        setTextIfChanged(element, element.dataset.tmTorr9confOriginalText);
    }

    /**
     * Vérifie si la page courante est my-uploads
     */
    function isMyUploadsPage() {
        return window.location.pathname.includes('/my-uploads');
    }

    /**
     * Vérifie si la page courante est stats
     */
    function isStatsPage() {
        return window.location.pathname.includes('/stats');
    }

    /**
     * Le filtrage adulte est actif uniquement si want_porn === false
     */
    function shouldFilterAdult() {
        return readWantPorn() === false;
    }

    /**
     * Filtre les lignes +18 sur la page my-uploads
     */
    function filterMyUploads() {
        if (!isMyUploadsPage()) return;

        const rows = document.querySelectorAll('.divide-y.divide-white\\/5 > div.grid');

        rows.forEach((row) => {
            row.style.display = '';
        });

        if (!shouldFilterAdult()) return;

        rows.forEach((row) => {
            const categoryCell = row.querySelector('.hidden.md\\:flex.md\\:col-span-1.items-center');
            const categorySpan = categoryCell?.querySelector('span');
            if (!categorySpan) return;

            const categoryText = (categorySpan.getAttribute('title') || categorySpan.textContent || '').trim();

            if (isAdultCategory(categoryText)) {
                row.style.display = 'none';
            }
        });
    }

    /**
     * Filtre les lignes +18 sur la page stats
     */
    function filterStats() {
        if (!isStatsPage()) return;

        const rows = getStatsRows();

        rows.forEach((row) => {
            row.style.display = '';
        });

        const statsSummaryElements = collectStatsSummaryElements();
        rememberStatsSummaryElements(statsSummaryElements);

        if (!shouldFilterAdult()) {
            restoreStatsSummaryElements(statsSummaryElements);
            return;
        }

        rows.forEach((row) => {
            if (isAdultCategory(getStatsRowCategory(row))) {
                row.style.display = 'none';
            }
        });

        updateStatsSummary(statsSummaryElements, rows.filter((row) => row.style.display !== 'none'));
    }

    /**
     * Retourne les lignes de la nouvelle page stats
     */
    function getStatsRows() {
        return Array.from(document.querySelectorAll('div.grid.grid-cols-1.md\\:grid-cols-12'))
            .filter((row) => {
                return !!row.querySelector('.md\\:col-span-3 p')
                    && !!row.querySelector('.hidden.md\\:flex.md\\:col-span-1.items-center span');
            });
    }

    /**
     * Retourne la categorie d'une ligne stats
     */
    function getStatsRowCategory(row) {
        const categorySpan = row.querySelector('.hidden.md\\:flex.md\\:col-span-1.items-center span');
        return normalizeText(categorySpan?.getAttribute('title') || categorySpan?.textContent || '');
    }

    /**
     * Retourne le statut d'une ligne stats
     */
    function getStatsRowStatus(row) {
        const statusSpan = row.querySelector('.md\\:hidden.flex.items-center.gap-2 > span');
        const normalizedStatus = normalizeText(statusSpan?.textContent || '').toLowerCase();

        if (normalizedStatus.includes('rejet')) return 'rejected';
        if (normalizedStatus.includes('attente')) return 'pending';
        if (normalizedStatus.includes('actif')) return 'active';

        return 'unknown';
    }

    /**
     * Repere les blocs de synthese a maintenir coherents sur la page stats
     */
    function collectStatsSummaryElements() {
        const statsRoot = Array.from(document.querySelectorAll('div.container.mx-auto.px-4.max-w-6xl'))
            .find((container) => normalizeText(container.querySelector('h1')?.textContent) === 'Mes Uploads');

        if (!statsRoot) {
            return {
                statsRoot: null,
                subtitle: null,
                resultCount: null,
                activeBadgeCount: null,
                pendingBadgeCount: null,
                rejectedBadgeCount: null,
                activeTabButton: null,
                pendingTabButton: null,
                rejectedTabButton: null
            };
        }

        const subtitle = Array.from(statsRoot.querySelectorAll('p'))
            .find((element) => /torrents/i.test(normalizeText(element.textContent)));
        const resultCount = Array.from(statsRoot.querySelectorAll('p'))
            .find((element) => /resultats/i.test(normalizeText(element.textContent)));

        const badgeDivs = Array.from(statsRoot.querySelectorAll('div.px-3.py-1\\.5'));
        const activeBadgeCount = badgeDivs.find((element) => /actifs/i.test(normalizeText(element.textContent)))
            ?.querySelector('span');
        const pendingBadgeCount = badgeDivs.find((element) => /attente/i.test(normalizeText(element.textContent)))
            ?.querySelector('span');
        const rejectedBadgeCount = badgeDivs.find((element) => /rejet/i.test(normalizeText(element.textContent)))
            ?.querySelector('span');

        const tabButtons = Array.from(statsRoot.querySelectorAll('button'));
        const activeTabButton = tabButtons.find((element) => /^Actifs?\s*\(/i.test(normalizeText(element.textContent)));
        const pendingTabButton = tabButtons.find((element) => /^En attente\s*\(/i.test(normalizeText(element.textContent)));
        const rejectedTabButton = tabButtons.find((element) => /^Rejet(?:és|es?)\s*\(/i.test(normalizeText(element.textContent)));

        return {
            statsRoot,
            subtitle,
            resultCount,
            activeBadgeCount,
            pendingBadgeCount,
            rejectedBadgeCount,
            activeTabButton,
            pendingTabButton,
            rejectedTabButton
        };
    }

    /**
     * Capture les textes d'origine des blocs de synthese
     */
    function rememberStatsSummaryElements(elements) {
        if (!elements?.statsRoot) return;

        rememberOriginalText(elements.subtitle);
        rememberOriginalText(elements.resultCount);
        rememberOriginalText(elements.activeBadgeCount);
        rememberOriginalText(elements.pendingBadgeCount);
        rememberOriginalText(elements.rejectedBadgeCount);
        rememberOriginalText(elements.activeTabButton);
        rememberOriginalText(elements.pendingTabButton);
        rememberOriginalText(elements.rejectedTabButton);
    }

    /**
     * Restaure les textes d'origine quand le filtre adulte est desactive
     */
    function restoreStatsSummaryElements(elements) {
        if (!elements?.statsRoot) return;

        restoreOriginalText(elements.subtitle);
        restoreOriginalText(elements.resultCount);
        restoreOriginalText(elements.activeBadgeCount);
        restoreOriginalText(elements.pendingBadgeCount);
        restoreOriginalText(elements.rejectedBadgeCount);
        restoreOriginalText(elements.activeTabButton);
        restoreOriginalText(elements.pendingTabButton);
        restoreOriginalText(elements.rejectedTabButton);
    }

    /**
     * Recalcule les compteurs visibles de la page stats filtree
     */
    function updateStatsSummary(elements, visibleRows) {
        if (!elements?.statsRoot) return;

        const summary = {
            total: visibleRows.length,
            active: 0,
            pending: 0,
            rejected: 0
        };

        visibleRows.forEach((row) => {
            const status = getStatsRowStatus(row);
            if (status === 'active') summary.active += 1;
            if (status === 'pending') summary.pending += 1;
            if (status === 'rejected') summary.rejected += 1;
        });

        setTextIfChanged(elements.subtitle, `${summary.total} torrents affiches`);
        setTextIfChanged(elements.resultCount, `${summary.total} resultats affiches`);
        setTextIfChanged(elements.activeBadgeCount, String(summary.active));
        setTextIfChanged(elements.pendingBadgeCount, String(summary.pending));
        setTextIfChanged(elements.rejectedBadgeCount, String(summary.rejected));
        setTextIfChanged(elements.activeTabButton, `Actifs (${summary.active})`);
        setTextIfChanged(elements.pendingTabButton, `En attente (${summary.pending})`);
        setTextIfChanged(elements.rejectedTabButton, `Rejetés (${summary.rejected})`);
    }

    /**
     * Applique tous les filtres nécessaires selon la page courante
     */
    function applyFilters() {
        filterMyUploads();
        filterStats();
    }

    /**
     * Réagit à un changement de want_porn
     */
    function onWantPornChange() {
        applyFilters();
    }

    /**
     * Compare la valeur actuelle à la dernière valeur connue
     * pour détecter les changements
     */
    function checkWantPorn() {
        const currentValue = readWantPorn();

        if (currentValue !== lastWantPorn) {
            lastWantPorn = currentValue;
            onWantPornChange();
        } else {
            applyFilters();
        }
    }

    /**
     * Observe les changements du DOM pour réappliquer les filtres
     * si le site recharge dynamiquement le contenu
     */
    function initObserver() {
        const observer = new MutationObserver(() => {
            applyFilters();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Initialise le raccourci clavier Ctrl + Alt + P
     * pour basculer want_porn via l'API
     */
    function initShortcut() {
        window.addEventListener('keydown', function (event) {
            const isP = event.key.toLowerCase() === 'p';

            if (event.ctrlKey && event.altKey && isP) {
                event.preventDefault();
                toggleWantPornViaApi();
            }
        });
    }

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
        const result = originalSetItem.apply(this, arguments);

        if (this === localStorage && key === 'user') {
            checkWantPorn();
        }

        return result;
    };

    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
        const result = originalRemoveItem.apply(this, arguments);

        if (this === localStorage && key === 'user') {
            checkWantPorn();
        }

        return result;
    };

    const originalClear = Storage.prototype.clear;
    Storage.prototype.clear = function () {
        const result = originalClear.apply(this, arguments);
        checkWantPorn();
        return result;
    };

    window.addEventListener('storage', function (event) {
        if (event.storageArea === localStorage && event.key === 'user') {
            checkWantPorn();
        }
    });

    window.addEventListener('DOMContentLoaded', () => {
        lastWantPorn = readWantPorn();
        applyFilters();
        initObserver();
        initShortcut();
    });

    setInterval(applyFilters, 1000);
})();
