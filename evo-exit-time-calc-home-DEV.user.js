// ==UserScript==
// @name          EVO - Calcola Orario di Uscita (HOME) TEST
// @namespace     https://unibo.it/
// @version       1.0
// @description   Calcola e mostra l'orario di uscita nella pagina HOME. Include selettore fascia oraria e switch 7:12/6:01.
// @author        Stefano
// @match         https://personale-unibo.hrgpi.it/*
// @icon          https://www.unibo.it/favicon.ico
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_deleteValue
// ==/UserScript==

(function () {
    'use strict';

    // --- Definizione costanti ---
    const FASCE_ORARIE = {
        '07:30 - 08:30': '07:30',
        '08:00 - 09:00': '08:00',
        '08:30 - 09:30': '08:30'
    };
    const DEFAULT_FASCIA = '07:30 - 08:30';

    const STORAGE_KEY_FASCIA = 'evoExitTime_selectedFascia_home';
    const STORAGE_KEY_CALC_MODE = 'evoExitTime_calcMode_home';

    const COLOR_PRIMARY_ACTIVE = "#bb2e29";
    const COLOR_INACTIVE_BACKGROUND = "#ffffff";
    const COLOR_INACTIVE_TEXT = "#333333";
    const COLOR_SWITCH_BORDER = "#ffffff";
    const COLOR_COMPACT_BOX_BACKGROUND = "#DDD8D8";
    const COLOR_COMPACT_BOX_TEXT = "#333333";
    const COLOR_COMPACT_BOX_VALUE = "#333333";

    const CALC_MODE_SEVEN_TWELVE = {
        key: 'sevenTwelve',
        textShort: '7:12',
        minutes: 432,
        color: COLOR_PRIMARY_ACTIVE,
        logType: "7h 12m"
    };

    const CALC_MODE_SIX_ONE = {
        key: 'sixOne',
        textShort: '6:01',
        minutes: 361,
        color: COLOR_PRIMARY_ACTIVE,
        logType: "6h 1m"
    };

    const CALC_MODES_SWITCH = {
        [CALC_MODE_SEVEN_TWELVE.key]: CALC_MODE_SEVEN_TWELVE,
        [CALC_MODE_SIX_ONE.key]: CALC_MODE_SIX_ONE
    };

    const DEFAULT_CALC_MODE_KEY_SWITCH = CALC_MODE_SEVEN_TWELVE.key;
    const EXIT_LABEL = "Uscita:";

    /**
     * Inietta il CSS
     */
    function injectCSS() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap');

            #evoCalculatorContainerHome *,
            #evoCalculatorContainerHome {
                font-family: 'Open Sans', sans-serif !important;
            }

            #evoCalculatorContainerHome {
                background-color: #fff;
                border-radius: 0.25rem;
                box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075);
                padding: 1.25rem;
                margin-bottom: 1.5rem;
            }

            #evoCalculatorContainerHome h4 {
                font-size: 1.5rem;
                margin-bottom: 0.75rem;
                color: #212529;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #evoCalculatorContainerHome h4 i {
                font-size: 1.5rem;
                vertical-align: middle;
            }

            .evo-content-wrapper-home {
                display: flex;
                align-items: flex-start;
                gap: 15px;
                flex-wrap: wrap;
            }

            .evo-label-home {
                font-size: 13px;
                font-weight: 600;
                color: #555;
                margin-bottom: 5px;
                white-space: nowrap;
            }

            .evo-group-wrapper-home {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .evo-group-wrapper-home.linea-oraria {
                max-width: fit-content;
            }

            .evo-controls-inner-home {
                display: flex;
                align-items: center;
                gap: 7px;
            }

            #fasciaOrariaSelectorHome {
                padding: 8px;
                border-radius: 5px;
                border: 1px solid #ccc;
                font-size: 14px;
                background-color: white;
                cursor: pointer;
                width: 130px;
                height: 37.7667px;
                box-sizing: border-box;
            }

            .calc-mode-switch-home {
                display: flex;
                position: relative;
                border: 1px solid #ccc;
                border-radius: 6px;
                overflow: hidden;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                user-select: none;
                background-color: ${COLOR_INACTIVE_BACKGROUND};
                box-sizing: border-box;
                padding: 3px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                width: 144px;
                height: 37.7667px;
            }

            .calc-mode-slider-home {
                position: absolute;
                top: 3px;
                height: calc(100% - 6px);
                width: calc(50% - 6px);
                background-color: ${COLOR_PRIMARY_ACTIVE};
                border-radius: inherit;
                transition: left 0.2s ease;
                z-index: 1;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }

            .calc-mode-slider-home.pos-0 {
                left: 3px;
            }
            .calc-mode-slider-home.pos-1 {
                left: calc(100% - (50% - 6px) - 3px);
            }

            .calc-mode-switch-segment-home {
                flex: 1;
                padding: 0 5px;
                line-height: calc(37.7667px - 6px);
                text-align: center;
                white-space: nowrap;
                z-index: 2;
                position: relative;
                color: ${COLOR_INACTIVE_TEXT};
                transition: color 0.2s ease;
            }

            .calc-mode-switch-segment-home.active-text {
                color: ${COLOR_SWITCH_BORDER};
            }

            #compactExitTimeBoxHome {
                background-color: ${COLOR_COMPACT_BOX_BACKGROUND};
                color: ${COLOR_COMPACT_BOX_TEXT};
                width: 118.7px;
                height: 37.8px;
                box-sizing: border-box;
                padding: 8px 12px;
                border-radius: 5px;
                border: 1px solid #ccc;
                font-size: 14px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
            }

            #compactExitTimeBoxHome .value {
                color: ${COLOR_COMPACT_BOX_VALUE};
            }

            #compactExitTimeBoxHome .exit-label {
                font-size: 14px;
                font-weight: bold;
                line-height: 1;
                vertical-align: middle;
                color: ${COLOR_COMPACT_BOX_TEXT};
            }
        `;
        document.head.appendChild(style);
        console.log("Stili CSS iniettati (HOME v1.0).");
    }

    function timeToMinutes(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    function minutesToTime(mins) {
        const h = String(Math.floor(mins / 60)).padStart(2, '0');
        const m = String(mins % 60).padStart(2, '0');
        return `${h}:${m}`;
    }

    /**
     * Estrae le timbrature dalla tabella HOME "Timbrature di giornata"
     */
    function estraiTimbratureHome() {
        const badgeList = [];
        
        // Cerca la tabella delle timbrature
        const table = document.querySelector('table.clockings-table');
        if (!table) {
            console.warn("Tabella clockings-table non trovata");
            return badgeList;
        }

        // Cerca tutte le righe tranne l'header
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, index) => {
            if (index === 0) return; // Salta l'header
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                // Prima coppia: celle 0 (tipo) e 1 (orario)
                const tipo1 = cells[0].textContent.trim();
                const orario1 = cells[1].textContent.trim();
                
                if (tipo1.includes('Entrata') && /^\d{2}:\d{2}$/.test(orario1)) {
                    badgeList.push({ tipo: 'E', orario: orario1 });
                    console.log(`Timbratura trovata: E ${orario1}`);
                } else if (tipo1.includes('Uscita') && /^\d{2}:\d{2}$/.test(orario1)) {
                    badgeList.push({ tipo: 'U', orario: orario1 });
                    console.log(`Timbratura trovata: U ${orario1}`);
                }
                
                // Seconda coppia: celle 2 (tipo) e 3 (orario)
                const tipo2 = cells[2].textContent.trim();
                const orario2 = cells[3].textContent.trim();
                
                if (tipo2.includes('Entrata') && /^\d{2}:\d{2}$/.test(orario2)) {
                    badgeList.push({ tipo: 'E', orario: orario2 });
                    console.log(`Timbratura trovata: E ${orario2}`);
                } else if (tipo2.includes('Uscita') && /^\d{2}:\d{2}$/.test(orario2)) {
                    badgeList.push({ tipo: 'U', orario: orario2 });
                    console.log(`Timbratura trovata: U ${orario2}`);
                }
            }
        });
        
        return badgeList;
    }

    /**
     * Calcola l'orario di uscita
     */
    function calcolaOrarioDiUscita(fasciaSelezionataKey, mode) {
        const { minutes: minutiLavorativiNetti, logType } = mode;
        const limiteIngressoMinuti = timeToMinutes(FASCE_ORARIE[fasciaSelezionataKey]);
        console.log(`--- Avvio calcolo HOME (${logType}). Fascia: ${fasciaSelezionataKey} ---`);

        const badgeList = estraiTimbratureHome();
        
        badgeList.sort((a, b) => timeToMinutes(a.orario) - timeToMinutes(b.orario));
        console.log("Badge rilevati (ordinati):", badgeList);

        if (badgeList.length === 0) {
            console.warn("⚠️ Nessuna timbratura trovata.");
            if (compactExitTimeBox) {
                compactExitTimeBox.innerHTML = `<span class="exit-label">${EXIT_LABEL}</span> <span class="value">N/A</span>`;
            }
            return;
        }

        const entrataInizialeObj = badgeList.find(b => b.tipo === "E");
        if (!entrataInizialeObj) {
            console.warn("⚠️ Nessuna ENTRATA trovata.");
            if (compactExitTimeBox) {
                compactExitTimeBox.innerHTML = `<span class="exit-label">${EXIT_LABEL}</span> <span class="value">N/A</span>`;
            }
            return;
        }

        let entrataInizialeEffettiva = entrataInizialeObj.orario;
        let entrataInizialeConsiderataMinuti = timeToMinutes(entrataInizialeEffettiva);

        if (entrataInizialeConsiderataMinuti < limiteIngressoMinuti) {
            console.log(`Entrata (${entrataInizialeEffettiva}) antecedente al limite. Considerata: ${minutesToTime(limiteIngressoMinuti)}`);
            entrataInizialeConsiderataMinuti = limiteIngressoMinuti;
        }

        const entrataInizialeVisualizzata = minutesToTime(entrataInizialeConsiderataMinuti);

        // Gestione pausa
        let pausaInizio = null;
        let pausaFine = null;
        let lastUIndex = -1;
        const PAUSA_MINIMA_PREDEFINITA = 10;
        let pausaConsiderata = 0;

        for (let i = 0; i < badgeList.length - 1; i++) {
            if (badgeList[i].tipo === "U" && badgeList[i + 1].tipo === "E") {
                pausaInizio = badgeList[i].orario;
                pausaFine = badgeList[i + 1].orario;
                break;
            }
        }

        if (pausaInizio) {
            for (let i = lastUIndex + 1; i < badgeList.length; i++) {
                if (badgeList[i].tipo === "E") {
                    pausaFine = badgeList[i].orario;
                    break;
                }
            }
        }

        if (pausaInizio && pausaFine) {
            const minutiPausaReale = timeToMinutes(pausaFine) - timeToMinutes(pausaInizio);
            if (minutiPausaReale > 0 && minutiPausaReale < 180) {
                pausaConsiderata = Math.max(PAUSA_MINIMA_PREDEFINITA, minutiPausaReale);
                console.log(`Pausa considerata: ${pausaConsiderata} minuti.`);
            } else {
                pausaConsiderata = PAUSA_MINIMA_PREDEFINITA;
                console.log(`Pausa non valida, usando predefinita: ${pausaConsiderata} minuti.`);
            }
        } else {
            pausaConsiderata = PAUSA_MINIMA_PREDEFINITA;
            console.log(`Nessuna pausa U-E, usando predefinita: ${pausaConsiderata} minuti.`);
        }

        const minutiLavorativiTotali = minutiLavorativiNetti + pausaConsiderata;
        const uscitaPrevistaMinuti = entrataInizialeConsiderataMinuti + minutiLavorativiTotali;
        const uscitaPrevista = minutesToTime(uscitaPrevistaMinuti);

        console.log(`Calcolo: ${entrataInizialeVisualizzata} + ${minutiLavorativiTotali} min = ${uscitaPrevista}`);

        // Aggiorna la box compatta
        if (compactExitTimeBox) {
            compactExitTimeBox.innerHTML = `<span class="exit-label">${EXIT_LABEL}</span> <span class="value">${uscitaPrevista}</span>`;
            compactExitTimeBox.title = `Orario calcolato con ${logType}. Fascia: ${fasciaSelezionataKey} | Entrata: ${entrataInizialeEffettiva} (considerata: ${entrataInizialeVisualizzata}) | ${minutiLavorativiNetti}min + ${pausaConsiderata}min pausa`;
        }

        console.log(`--- Fine calcolo HOME (${logType}) ---`);
    }

    let fasciaSelect = null;
    let sevenTwelveSegment = null;
    let sixOneSegment = null;
    let sliderElement = null;
    let compactExitTimeBox = null;
    let currentActiveModeKeySwitch = null;

    function setActiveSwitchSegment(modeKey) {
        currentActiveModeKeySwitch = modeKey;
        GM_setValue(STORAGE_KEY_CALC_MODE, modeKey);
        console.log(`Modalità salvata: ${modeKey}`);

        if (sevenTwelveSegment) sevenTwelveSegment.classList.remove('active-text');
        if (sixOneSegment) sixOneSegment.classList.remove('active-text');

        let modeToCalculate = CALC_MODES_SWITCH[modeKey];

        if (modeKey === CALC_MODE_SEVEN_TWELVE.key) {
            if (sliderElement) {
                sliderElement.classList.remove('pos-1');
                sliderElement.classList.add('pos-0');
            }
            if (sevenTwelveSegment) sevenTwelveSegment.classList.add('active-text');
        } else if (modeKey === CALC_MODE_SIX_ONE.key) {
            if (sliderElement) {
                sliderElement.classList.remove('pos-0');
                sliderElement.classList.add('pos-1');
            }
            if (sixOneSegment) sixOneSegment.classList.add('active-text');
        }

        if (fasciaSelect && modeToCalculate) {
            calcolaOrarioDiUscita(fasciaSelect.value, modeToCalculate);
        }
    }

    const waitForPageElements = setInterval(() => {
        // Verifica che siamo sulla pagina Dashboard/Home
        const isDashboardPage = document.querySelector('form[name="Dashboard"]') !== null;
        const clockingsCard = document.querySelector('.card h4');
        const isClockingsCard = clockingsCard && clockingsCard.textContent.includes('Timbrature di giornata');
        
        if (isDashboardPage && isClockingsCard) {
            clearInterval(waitForPageElements);
            injectCSS();

            currentActiveModeKeySwitch = GM_getValue(STORAGE_KEY_CALC_MODE, DEFAULT_CALC_MODE_KEY_SWITCH);

            const evoCalculatorContainer = document.createElement('div');
            evoCalculatorContainer.id = 'evoCalculatorContainerHome';

            // Titolo con icona
            const titleHeader = document.createElement('h4');
            titleHeader.innerHTML = 'Ora del Giorno';
            evoCalculatorContainer.appendChild(titleHeader);

            // Wrapper per il contenuto
            const contentWrapper = document.createElement('div');
            contentWrapper.classList.add('evo-content-wrapper-home');

            // Gruppo "Linea oraria"
            const lineaOrariaGroupWrapper = document.createElement('div');
            lineaOrariaGroupWrapper.classList.add('evo-group-wrapper-home', 'linea-oraria');

            const lineaOrariaLabel = document.createElement('div');
            lineaOrariaLabel.classList.add('evo-label-home');
            lineaOrariaLabel.textContent = 'Linea oraria';
            lineaOrariaGroupWrapper.appendChild(lineaOrariaLabel);

            const evoControlsInner = document.createElement('div');
            evoControlsInner.classList.add('evo-controls-inner-home');

            // Selettore Fascia
            fasciaSelect = document.createElement('select');
            fasciaSelect.id = 'fasciaOrariaSelectorHome';
            for (const key in FASCE_ORARIE) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                fasciaSelect.appendChild(option);
            }
            const savedFascia = GM_getValue(STORAGE_KEY_FASCIA, DEFAULT_FASCIA);
            fasciaSelect.value = savedFascia;
            fasciaSelect.addEventListener('change', (e) => {
                GM_setValue(STORAGE_KEY_FASCIA, e.target.value);
                console.log(`Fascia salvata: ${e.target.value}`);
                let modeToCalculate = CALC_MODES_SWITCH[currentActiveModeKeySwitch];
                calcolaOrarioDiUscita(fasciaSelect.value, modeToCalculate);
            });
            evoControlsInner.appendChild(fasciaSelect);

            // Toggle Switch
            const calcModeSwitch = document.createElement('div');
            calcModeSwitch.classList.add('calc-mode-switch-home');
            evoControlsInner.appendChild(calcModeSwitch);

            sliderElement = document.createElement('span');
            sliderElement.classList.add('calc-mode-slider-home');
            calcModeSwitch.appendChild(sliderElement);

            sevenTwelveSegment = document.createElement('span');
            sevenTwelveSegment.textContent = CALC_MODE_SEVEN_TWELVE.textShort;
            sevenTwelveSegment.classList.add('calc-mode-switch-segment-home');
            sevenTwelveSegment.addEventListener('click', () => setActiveSwitchSegment(CALC_MODE_SEVEN_TWELVE.key));
            calcModeSwitch.appendChild(sevenTwelveSegment);

            sixOneSegment = document.createElement('span');
            sixOneSegment.textContent = CALC_MODE_SIX_ONE.textShort;
            sixOneSegment.classList.add('calc-mode-switch-segment-home');
            sixOneSegment.addEventListener('click', () => setActiveSwitchSegment(CALC_MODE_SIX_ONE.key));
            calcModeSwitch.appendChild(sixOneSegment);

            lineaOrariaGroupWrapper.appendChild(evoControlsInner);
            contentWrapper.appendChild(lineaOrariaGroupWrapper);

            // Gruppo "Orario di uscita"
            const oraDelGiornoGroupWrapper = document.createElement('div');
            oraDelGiornoGroupWrapper.classList.add('evo-group-wrapper-home');

            const oraDelGiornoLabel = document.createElement('div');
            oraDelGiornoLabel.classList.add('evo-label-home');
            oraDelGiornoLabel.textContent = 'Orario di uscita';
            oraDelGiornoGroupWrapper.appendChild(oraDelGiornoLabel);

            // Box Compatta Orario
            compactExitTimeBox = document.createElement('div');
            compactExitTimeBox.id = 'compactExitTimeBoxHome';
            compactExitTimeBox.innerHTML = `<span class="exit-label">${EXIT_LABEL}</span> <span class="value">--:--</span>`;
            oraDelGiornoGroupWrapper.appendChild(compactExitTimeBox);

            contentWrapper.appendChild(oraDelGiornoGroupWrapper);
            evoCalculatorContainer.appendChild(contentWrapper);

            // Inserimento SOPRA la card "Timbrature di giornata"
            const clockingsCardElement = clockingsCard.closest('.card');
            if (clockingsCardElement && clockingsCardElement.parentNode) {
                clockingsCardElement.parentNode.insertBefore(evoCalculatorContainer, clockingsCardElement);
                console.log("Container HOME aggiunto sopra la card Timbrature.");
            } else {
                console.warn("Card Timbrature non trovata.");
            }

            // Calcolo iniziale
            setActiveSwitchSegment(currentActiveModeKeySwitch);
        }
    }, 500);
})();
