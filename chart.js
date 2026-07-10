/**
 * chart.js — Gestion du graphique Chart.js
 * 
 * Responsabilités:
 * - Initialisation et mise à jour du graphique
 * - Rendu des données OHLCV en graphique linéaire
 * - Tooltips avec % de variation depuis la date de début
 * - Thème sombre avec accent doré
 */

const ChartManager = (() => {
    let chartInstance = null;
    let chartDates = []; // dates ISO alignées sur les points du graphique (pour l'axe X hiérarchique)
    let xTickLabels = []; // label pré-calculé par point (string | [ligne1, ligne2] | '')
    let yearBoundaryIndices = []; // indices marquant un changement d'année (séparateurs)

    const MONTHS_FULL = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const MONTHS_SHORT = [
        'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
        'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'
    ];

    /**
     * Plugin : dessine un séparateur vertical discret au changement d'année.
     */
    const yearSeparatorPlugin = {
        id: 'yearSeparators',
        afterDraw(chart) {
            if (!yearBoundaryIndices || yearBoundaryIndices.length === 0) return;
            const xScale = chart.scales.x;
            const yScale = chart.scales.y;
            if (!xScale || !yScale) return;

            const ctx = chart.ctx;
            ctx.save();
            ctx.strokeStyle = 'rgba(240, 180, 41, 0.22)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            for (const idx of yearBoundaryIndices) {
                const x = xScale.getPixelForValue(idx);
                if (x === undefined || Number.isNaN(x)) continue;
                ctx.beginPath();
                ctx.moveTo(x, yScale.top);
                ctx.lineTo(x, yScale.bottom);
                ctx.stroke();
            }
            ctx.restore();
        }
    };

    /**
     * Calcule dynamiquement les labels de l'axe X selon l'étendue temporelle.
     * - Courte période (≤ 18 mois) : mois en toutes lettres + année
     * - Moyenne (≤ 36 mois) : mois abrégés + année
     * - Longue (≤ 96 mois) : trimestres (janv/avr/juil/oct) + année
     * - Très longue (> 96 mois) : janvier de chaque année
     * L'année reste toujours visible (2e ligne au changement d'année).
     * @param {Array} data - Données OHLCV filtrées (triées par date croissante)
     * @private
     */
    const computeXAxis = (data) => {
        xTickLabels = new Array(data.length).fill('');
        yearBoundaryIndices = [];
        if (!data.length) return;

        const firstDate = new Date(`${data[0].date}T00:00:00`);
        const lastDate = new Date(`${data[data.length - 1].date}T00:00:00`);
        const spanMonths = (lastDate.getFullYear() - firstDate.getFullYear()) * 12
            + (lastDate.getMonth() - firstDate.getMonth());

        // Choisit la stratégie de densité
        let monthFilter; // (monthIndex) => bool : quels débuts de mois on étiquette
        let useFullMonth;
        if (spanMonths <= 18) {
            monthFilter = () => true;          // chaque mois
            useFullMonth = true;               // en toutes lettres
        } else if (spanMonths <= 36) {
            monthFilter = () => true;          // chaque mois
            useFullMonth = false;              // abrégé
        } else if (spanMonths <= 96) {
            monthFilter = (m) => m % 3 === 0;  // trimestres
            useFullMonth = false;
        } else {
            monthFilter = (m) => m === 0;      // janvier seulement
            useFullMonth = false;
        }

        let prevMonth = null;
        let prevYear = null;
        for (let i = 0; i < data.length; i += 1) {
            const d = new Date(`${data[i].date}T00:00:00`);
            const month = d.getMonth();
            const year = d.getFullYear();

            const isMonthStart = month !== prevMonth || year !== prevYear;

            if (year !== prevYear && prevYear !== null) {
                yearBoundaryIndices.push(i);
            }

            if (isMonthStart && monthFilter(month)) {
                const name = useFullMonth ? MONTHS_FULL[month] : MONTHS_SHORT[month];
                // Année sur une 2e ligne au 1er label d'une nouvelle année
                xTickLabels[i] = (year !== prevYear) ? [name, String(year)] : name;
            }

            prevMonth = month;
            prevYear = year;
        }

        // Garantit qu'au moins la première année soit visible
        if (xTickLabels[0] === '') {
            const name0 = useFullMonth ? MONTHS_FULL[firstDate.getMonth()] : MONTHS_SHORT[firstDate.getMonth()];
            xTickLabels[0] = [name0, String(firstDate.getFullYear())];
        }
    };

    /**
     * Initialise le graphique Chart.js
     * @param {string} canvasId - ID du canvas HTML
     * @returns {Chart} Instance Chart.js
     */
    const initChart = (canvasId) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            plugins: [yearSeparatorPlugin],
            data: {
                labels: [],
                datasets: [{
                    label: 'Prix de clôture (EUR)',
                    data: [],
                    borderColor: '#f0b429',
                    backgroundColor: 'rgba(240, 180, 41, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#f0b429',
                    pointBorderColor: '#1a1a1a',
                    pointBorderWidth: 2,
                    hoverBackgroundColor: '#f0b429'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#f0f0f0',
                            font: {
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial',
                                size: 12
                            },
                            boxWidth: 12,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 26, 0.9)',
                        titleColor: '#f0b429',
                        bodyColor: '#f0f0f0',
                        borderColor: '#f0b429',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            // Titre de l'infobulle : date complète (jour mois année)
                            title: function(items) {
                                if (!items.length) return '';
                                const iso = chartDates[items[0].dataIndex];
                                if (!iso) return '';
                                const d = new Date(`${iso}T00:00:00`);
                                return d.toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'long', year: 'numeric'
                                });
                            },
                            // Personnalise le contenu du tooltip
                            label: function(context) {
                                let label = '';
                                if (context.parsed.y !== null) {
                                    label = `Prix: €${context.parsed.y.toFixed(2)}`;
                                }
                                return label;
                            },
                            afterLabel: function(context) {
                                // Affiche la % de variation depuis le début
                                const firstValue = this.chart.data.datasets[0].data[0];
                                if (firstValue && context.parsed.y !== null) {
                                    const change = ((context.parsed.y - firstValue) / firstValue * 100).toFixed(2);
                                    const sign = change >= 0 ? '+' : '';
                                    return `Variation: ${sign}${change}%`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            drawOnChartArea: false,
                            drawBorder: false,
                            tickLength: 0
                        },
                        ticks: {
                            color: '#b0b0b0',
                            font: {
                                size: 11
                            },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            // Labels pré-calculés dynamiquement selon l'échelle (voir computeXAxis)
                            callback: function(value, index) {
                                return xTickLabels[index] !== undefined ? xTickLabels[index] : '';
                            }
                        }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(42, 42, 42, 0.3)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#b0b0b0',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '€' + value.toFixed(0);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Prix (EUR)',
                            color: '#f0b429',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
        
        return chartInstance;
    };
    
    /**
     * Met à jour les données du graphique
     * @param {Array} data - Données OHLCV filtrées
     */
    const updateChart = (data) => {
        if (!chartInstance || !data || data.length === 0) {
            console.warn('Pas de données pour mettre à jour le graphique');
            return;
        }
        
        // Extrait les dates et prix de clôture
        const labels = data.map(d => formatDateForChart(d.date));
        const prices = data.map(d => d.close);
        chartDates = data.map(d => d.date); // conserve les dates ISO pour l'axe hiérarchique
        computeXAxis(data); // calcule les labels dynamiques et les séparateurs d'année
        
        // Met à jour les données du graphique
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = prices;
        
        // Mise à jour automatique de l'échelle Y
        chartInstance.options.scales.y.max = undefined; // Auto-scale
        chartInstance.options.scales.y.min = undefined;
        
        chartInstance.update();
        console.log(`✓ Graphique mis à jour avec ${data.length} points`);
    };
    
    /**
     * Formate une date pour l'affichage sur le graphique
     * Réduit la densité de labels sur petit écran
     * @private
     */
    const formatDateForChart = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return `${day}/${month}`;
    };
    
    /**
     * Mets à jour les labels d'accessibilité du graphique
     * Pour les lecteurs d'écran
     */
    const updateChartAccessibility = (data) => {
        const canvas = document.getElementById('price-chart');
        const description = `
            Graphique linéaire montrant le prix de clôture de CW8.PA.
            Du ${data[0].date} au ${data[data.length - 1].date}.
            Prix minimum: €${Math.min(...data.map(d => d.close)).toFixed(2)}.
            Prix maximum: €${Math.max(...data.map(d => d.close)).toFixed(2)}.
        `;
        canvas.setAttribute('aria-label', description);
    };
    
    /**
     * Détruit l'instance du graphique
     */
    const destroyChart = () => {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    };
    
    return {
        initChart,
        updateChart,
        updateChartAccessibility,
        destroyChart
    };
})();
