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
    
    /**
     * Initialise le graphique Chart.js
     * @param {string} canvasId - ID du canvas HTML
     * @returns {Chart} Instance Chart.js
     */
    const initChart = (canvasId) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        chartInstance = new Chart(ctx, {
            type: 'line',
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
                            color: 'rgba(42, 42, 42, 0.3)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#b0b0b0',
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0
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
