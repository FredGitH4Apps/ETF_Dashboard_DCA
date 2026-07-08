/**
 * calendar.js — Gestion du calendrier pour sélection de dates
 * 
 * Responsabilités:
 * - Afficher un calendrier interactif modal
 * - Navigation mois/année avec sélecteurs rapides
 * - Conversion dates en format JJ/MM/AAAA
 * - Gestion des événements de sélection
 */

const CalendarPicker = (() => {
    // État du calendrier
    let currentDate = new Date();
    let selectedDate = null;
    let activeField = null; // 'start' ou 'end'
    
    // Éléments DOM
    let elements = {};

    /**
     * Initialise le calendrier avec les références DOM
     */
    const init = () => {
        try {
            console.log('📅 Initialisation du calendrier...');
            
            // Récupère les références DOM
            elements = {
                modal: document.getElementById('calendar-modal'),
                overlay: document.getElementById('calendar-overlay'),
                prevBtn: document.getElementById('calendar-prev-month'),
                nextBtn: document.getElementById('calendar-next-month'),
                monthSelect: document.getElementById('calendar-month'),
                yearSelect: document.getElementById('calendar-year'),
                daysContainer: document.getElementById('calendar-days'),
                confirmBtn: document.getElementById('calendar-confirm'),
                cancelBtn: document.getElementById('calendar-cancel'),
                startDateBtn: document.getElementById('start-date-btn'),
                endDateBtn: document.getElementById('end-date-btn'),
                startDateInput: document.getElementById('start-date'),
                endDateInput: document.getElementById('end-date')
            };

            // Valide que tous les éléments existent
            const missingElements = [];
            for (const [key, el] of Object.entries(elements)) {
                if (!el) {
                    missingElements.push(key);
                    console.error(`❌ Élément manquant: ${key}`);
                }
            }

            if (missingElements.length > 0) {
                console.error(`⚠️ ${missingElements.length} éléments DOM manquants pour le calendrier. Abandon.`);
                return false;
            }

            // Initialise les sélecteurs mois/année
            initMonthSelector();
            initYearSelector();

            // Attache les event listeners
            attachEventListeners();

            // Affiche le calendrier initial
            renderCalendar();
            
            console.log('✅ Calendrier initialisé avec succès');
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du calendrier:', error);
            return false;
        }
    };

    /**
     * Initialise le sélecteur de mois
     */
    const initMonthSelector = () => {
        if (!elements.monthSelect) return;
        
        try {
            const months = [
                'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
            ];
            
            elements.monthSelect.innerHTML = '';
            months.forEach((month, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                option.textContent = month;
                if (idx === currentDate.getMonth()) {
                    option.selected = true;
                }
                elements.monthSelect.appendChild(option);
            });
        } catch (error) {
            console.error('❌ Erreur initMonthSelector:', error);
        }
    };

    /**
     * Initialise le sélecteur d'année (30 ans avant et après)
     */
    const initYearSelector = () => {
        if (!elements.yearSelect) return;
        
        try {
            const currentYear = currentDate.getFullYear();
            const startYear = currentYear - 30;
            const endYear = currentYear + 30;

            elements.yearSelect.innerHTML = '';
            for (let year = startYear; year <= endYear; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) {
                    option.selected = true;
                }
                elements.yearSelect.appendChild(option);
            }
        } catch (error) {
            console.error('❌ Erreur initYearSelector:', error);
        }
    };

    /**
     * Attache les event listeners
     */
    const attachEventListeners = () => {
        try {
            if (elements.startDateBtn) elements.startDateBtn.addEventListener('click', () => openCalendar('start'));
            if (elements.endDateBtn) elements.endDateBtn.addEventListener('click', () => openCalendar('end'));
            if (elements.prevBtn) elements.prevBtn.addEventListener('click', previousMonth);
            if (elements.nextBtn) elements.nextBtn.addEventListener('click', nextMonth);
            if (elements.monthSelect) elements.monthSelect.addEventListener('change', onMonthYearChange);
            if (elements.yearSelect) elements.yearSelect.addEventListener('change', onMonthYearChange);
            if (elements.confirmBtn) elements.confirmBtn.addEventListener('click', confirmDate);
            if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', closeCalendar);
            if (elements.overlay) elements.overlay.addEventListener('click', closeCalendar);
            
            // Empêche la fermeture au clic sur le modal
            if (elements.modal) {
                elements.modal.addEventListener('click', (e) => e.stopPropagation());
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'attachement des event listeners:', error);
        }
    };

    /**
     * Ouvre le calendrier pour un champ (start ou end)
     */
    const openCalendar = (field) => {
        try {
            activeField = field;
            
            // Récupère la date actuellement saisie si elle existe
            const input = field === 'start' ? elements.startDateInput : elements.endDateInput;
            if (input && input.value) {
                selectedDate = parseDate(input.value);
                currentDate = new Date(selectedDate);
            } else {
                selectedDate = null;
                currentDate = new Date();
            }

            initMonthSelector();
            initYearSelector();
            renderCalendar();

            // Affiche le modal
            if (elements.modal) elements.modal.classList.add('open');
            if (elements.overlay) elements.overlay.classList.add('open');
        } catch (error) {
            console.error('❌ Erreur openCalendar:', error);
        }
    };

    /**
     * Ferme le calendrier
     */
    const closeCalendar = () => {
        try {
            if (elements.modal) elements.modal.classList.remove('open');
            if (elements.overlay) elements.overlay.classList.remove('open');
            activeField = null;
        } catch (error) {
            console.error('❌ Erreur closeCalendar:', error);
        }
    };

    /**
     * Valide et applique la date sélectionnée
     */
    const confirmDate = () => {
        try {
            if (!selectedDate) {
                alert('Veuillez sélectionner une date');
                return;
            }

            const formattedDate = formatDate(selectedDate);
            const input = activeField === 'start' ? elements.startDateInput : elements.endDateInput;
            if (input) {
                input.value = formattedDate;
            }

            closeCalendar();
        } catch (error) {
            console.error('❌ Erreur confirmDate:', error);
        }
    };

    /**
     * Navigue au mois précédent
     */
    const previousMonth = () => {
        try {
            currentDate.setMonth(currentDate.getMonth() - 1);
            initMonthSelector();
            initYearSelector();
            renderCalendar();
        } catch (error) {
            console.error('❌ Erreur previousMonth:', error);
        }
    };

    /**
     * Navigue au mois suivant
     */
    const nextMonth = () => {
        try {
            currentDate.setMonth(currentDate.getMonth() + 1);
            initMonthSelector();
            initYearSelector();
            renderCalendar();
        } catch (error) {
            console.error('❌ Erreur nextMonth:', error);
        }
    };

    /**
     * Appelé lors de changement de mois/année via les sélecteurs
     */
    const onMonthYearChange = () => {
        try {
            if (elements.monthSelect && elements.yearSelect) {
                currentDate.setMonth(parseInt(elements.monthSelect.value));
                currentDate.setFullYear(parseInt(elements.yearSelect.value));
                renderCalendar();
            }
        } catch (error) {
            console.error('❌ Erreur onMonthYearChange:', error);
        }
    };

    /**
     * Affiche le calendrier du mois courant
     */
    const renderCalendar = () => {
        if (!elements.daysContainer) return;
        
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Premier jour du mois
            const firstDay = new Date(year, month, 1);
            // Dernier jour du mois
            const lastDay = new Date(year, month + 1, 0);
            
            // Index du jour de la semaine pour le 1er jour (0=lundi en notre système)
            let dayIndex = firstDay.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6; // Dimanche
            
            // Vide le conteneur des jours
            elements.daysContainer.innerHTML = '';

            // Ajoute les jours du mois précédent (grisés)
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = dayIndex - 1; i >= 0; i--) {
                const day = prevMonthLastDay - i;
                addDayElement(day, true, new Date(year, month - 1, day));
            }

            // Ajoute les jours du mois courant
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const dateObj = new Date(year, month, day);
                addDayElement(day, false, dateObj);
            }

            // Ajoute les jours du mois suivant (grisés)
            const totalCells = elements.daysContainer.children.length;
            const remainingCells = (7 - (totalCells % 7)) % 7;
            for (let day = 1; day <= remainingCells; day++) {
                addDayElement(day, true, new Date(year, month + 1, day));
            }
        } catch (error) {
            console.error('❌ Erreur renderCalendar:', error);
        }
    };

    /**
     * Ajoute un élément jour au calendrier
     */
    const addDayElement = (day, isOtherMonth, dateObj) => {
        try {
            if (!elements.daysContainer) return;
            
            const dayEl = document.createElement('button');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            dayEl.type = 'button';

            if (isOtherMonth) {
                dayEl.classList.add('other-month');
                dayEl.disabled = true;
            } else {
                // Vérifie si c'est aujourd'hui
                const today = new Date();
                if (
                    dateObj.getDate() === today.getDate() &&
                    dateObj.getMonth() === today.getMonth() &&
                    dateObj.getFullYear() === today.getFullYear()
                ) {
                    dayEl.classList.add('today');
                }

                // Vérifie si c'est la date sélectionnée
                if (selectedDate && isSameDate(dateObj, selectedDate)) {
                    dayEl.classList.add('selected');
                }

                // Attache l'event listener
                dayEl.addEventListener('click', () => selectDate(dateObj));
            }

            elements.daysContainer.appendChild(dayEl);
        } catch (error) {
            console.error('❌ Erreur addDayElement:', error);
        }
    };

    /**
     * Sélectionne une date
     */
    const selectDate = (dateObj) => {
        try {
            selectedDate = new Date(dateObj);
            renderCalendar();
        } catch (error) {
            console.error('❌ Erreur selectDate:', error);
        }
    };

    /**
     * Formate une date en JJ/MM/AAAA
     */
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    /**
     * Parse une date au format JJ/MM/AAAA
     */
    const parseDate = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        
        const date = new Date(year, month, day);
        
        // Valide que la date est correcte
        if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
            return null;
        }
        
        return date;
    };

    /**
     * Vérifie si deux dates sont identiques
     */
    const isSameDate = (date1, date2) => {
        return (
            date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear()
        );
    };

    return {
        init
    };
})();
