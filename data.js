/**
 * data.js — Gestion des données ETF
 * 
 * Responsabilités:
 * - Récupération des données OHLCV via Yahoo Finance
 * - Mise en cache localStorage avec TTL de 24h
 * - Parsing CSV comme fallback
 * - Gestion des erreurs réseau
 */

const DataManager = (() => {
    const TICKER = 'CW8.PA';
    const CACHE_PREFIX = 'etf_cache_';
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

    // Proxies CORS publics tentés automatiquement (ordre de priorité)
    // Format: [label, urlPrefix] ou null pour requête directe
    const CORS_PROXIES = [
        null,                                                    // 1. Requête directe
        ['corsproxy.io', 'https://corsproxy.io/?url='],        // 2. corsproxy.io
        ['codetabs.com', 'https://api.codetabs.com/v1/proxy?quest='],  // 3. CodeTabs
        ['allorigins.win', 'https://api.allorigins.win/raw?url=']      // 4. allorigins
    ];

    /**
     * Obtient les données depuis le cache ou les récupère via Yahoo Finance.
     * Essaie plusieurs stratégies CORS automatiquement sans intervention.
     * Fallback: données de démonstration si tous les proxies échouent.
     * @param {string} startDate - Date de début (YYYY-MM-DD)
     * @param {string} endDate   - Date de fin   (YYYY-MM-DD)
     * @returns {Promise<{data: Array, source: string}>}
     */
    const fetchData = async (startDate, endDate) => {
        const cacheKey = `${CACHE_PREFIX}${TICKER}_${startDate}_${endDate}`;
        const cached = getFromCache(cacheKey);

        if (cached) {
            console.log('✓ Données récupérées du cache localStorage');
            return { data: cached, source: 'cached' };
        }

        // Tente chaque proxy en cascade jusqu'au premier succès
        const attempts = [];
        for (const proxy of CORS_PROXIES) {
            try {
                const label = proxy === null ? 'requête directe' : proxy[0];
                console.log(`🔄 Tentative ${attempts.length + 1}: ${label}...`);
                
                const data = await fetchFromYahooFinance(startDate, endDate, proxy);
                saveToCache(cacheKey, data);
                console.log(`✓ Données récupérées avec succès via ${label}`);
                return { data, source: 'live' };
            } catch (err) {
                const label = proxy === null ? 'direct' : proxy[0];
                attempts.push({ proxy: label, error: err.message });
                console.warn(`✗ ${label} échoué:`, err.message);
            }
        }

        // Dernière tentative: générer des données démo réalistes
        console.warn('⚠ Tous les proxies CORS ont échoué. Utilisation des données de démonstration.');
        const demoData = generateDemoData(startDate, endDate);
        saveToCache(cacheKey, demoData);
        return { data: demoData, source: 'demo' };
    };

    /**
     * Récupère les données OHLCV depuis Yahoo Finance
     * @param {string}      startDate
     * @param {string}      endDate
     * @param {Array|null}  proxy - [label, urlPrefix] ou null pour direct
     * @private
     */
    const fetchFromYahooFinance = async (startDate, endDate, proxy) => {
        const start = Math.floor(new Date(startDate).getTime() / 1000);
        const end   = Math.floor(new Date(endDate).getTime() / 1000);

        const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${TICKER}` +
                         `?interval=1d&period1=${start}&period2=${end}`;

        // Compose l'URL finale selon le proxy choisi
        let url = yahooUrl;
        if (proxy !== null) {
            const [label, prefix] = proxy;
            url = `${prefix}${encodeURIComponent(yahooUrl)}`;
        }

        let response;
        try {
            response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
        } catch (fetchErr) {
            throw new Error(`Erreur réseau: ${fetchErr.message}`);
        }

        if (!response.ok) {
            const text = await response.text().catch(() => '(contenu illisible)');
            throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
        }

        let json;
        try {
            json = await response.json();
        } catch (jsonErr) {
            throw new Error(`Erreur parsing JSON: ${jsonErr.message}`);
        }

        // Valide la structure de réponse
        if (!json?.chart?.result?.[0]) {
            throw new Error('Format inattendu: pas de données dans la réponse Yahoo');
        }

        const result = json.chart.result[0];
        const timestamps = result.timestamp;
        const q = result.indicators.quote[0];

        if (!timestamps || !q) {
            throw new Error('Données OHLCV manquantes dans la réponse');
        }

        return timestamps.map((ts, i) => ({
            date:   new Date(ts * 1000).toISOString().split('T')[0],
            open:   Math.round(q.open[i]   * 100) / 100,
            high:   Math.round(q.high[i]   * 100) / 100,
            low:    Math.round(q.low[i]    * 100) / 100,
            close:  Math.round(q.close[i]  * 100) / 100,
            volume: q.volume[i]
        })).filter(d => d.close !== null && !isNaN(d.close));
    };
    
    /**
     * Génère des données de démonstration réalistes
     * @private
     */
    const generateDemoData = (startDate, endDate) => {
        const data = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);
        // Base réaliste pour CW8.PA (MSCI World ETF) autour de 180 EUR
        let basePrice = 178.5 + Math.random() * 5;  // Entre 178.50 et 183.50
        
        while (currentDate <= lastDate) {
            // Skip weekends
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                // Variation quotidienne réaliste (-2% à +2%) avec tendance
                const trend = 0.0001;  // Très légère tendance haussière
                const dailyChange = (Math.random() - 0.48) * 0.04 + trend;
                const open = basePrice * (1 + dailyChange * 0.3);
                const close = basePrice * (1 + dailyChange);
                const high = Math.max(open, close) * (1 + Math.random() * 0.015);
                const low = Math.min(open, close) * (1 - Math.random() * 0.015);
                const volume = Math.floor(Math.random() * 4000000) + 2000000;  // 2-6M actions
                
                data.push({
                    date: currentDate.toISOString().split('T')[0],
                    open: Math.round(open * 100) / 100,
                    high: Math.round(high * 100) / 100,
                    low: Math.round(low * 100) / 100,
                    close: Math.round(close * 100) / 100,
                    volume: volume
                });
                
                basePrice = close;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`📊 Données de démonstration générées: ${data.length} points`);
        return data;
    };
    
    /**
     * Récupère les données du localStorage
     * Vérifie la validité du TTL
     * @private
     */
    const getFromCache = (key) => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const { data, timestamp } = JSON.parse(item);
            const isExpired = Date.now() - timestamp > CACHE_TTL;
            
            if (isExpired) {
                localStorage.removeItem(key);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Erreur lors de la lecture du cache:', error);
            return null;
        }
    };
    
    /**
     * Sauvegarde les données dans localStorage
     * @private
     */
    const saveToCache = (key, data) => {
        try {
            const cached = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cached));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du cache:', error);
        }
    };
    
    /**
     * Parse un fichier CSV aux format OHLCV standard
     * Accepte formats: (Date, Open, High, Low, Close, Volume) ou variations
     * @param {string} csvText - Contenu du fichier CSV
     * @returns {Array} Données OHLCV parsées
     */
    const parseCSV = (csvText) => {
        const lines = csvText.trim().split('\n');
        const data = [];
        
        // Saute l'en-tête
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(c => c.trim());
            
            if (cells.length < 6) continue;
            
            data.push({
                date: cells[0],
                open: parseFloat(cells[1]),
                high: parseFloat(cells[2]),
                low: parseFloat(cells[3]),
                close: parseFloat(cells[4]),
                volume: parseInt(cells[5])
            });
        }
        
        return data.length > 0 ? data : null;
    };
    
    /**
     * Filtre les données selon une plage de dates
     * @param {Array} data - Données brutes
     * @param {string} startDate - Date de début
     * @param {string} endDate - Date de fin
     * @returns {Array} Données filtrées
     */
    const filterByDateRange = (data, startDate, endDate) => {
        return data.filter(d => d.date >= startDate && d.date <= endDate);
    };
    
    /**
     * Efface le cache pour une plage donnée
     */
    const clearCache = (startDate, endDate) => {
        const key = `${CACHE_PREFIX}${TICKER}_${startDate}_${endDate}`;
        localStorage.removeItem(key);
        console.log('✓ Cache vidé');
    };
    
    return {
        fetchData,
        parseCSV,
        filterByDateRange,
        clearCache
    };
})();
