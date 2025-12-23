class SkinChromaEnhancer {
    constructor() {
        this.config = {
            SKIN_SELECTORS: [
                ".skin-name-text",
                ".skin-name",
            ],
            DEBOUNCE_DELAY: 100,
            WEBSOCKET_RECONNECT_DELAY: 3000
        };
        
        this.state = {
            currentChampionId: null,
            currentSkinName: null,
            currentSkinData: null,
            skinMap: new Map(),
            isInChampSelect: false,
            lastSkinCheckTime: 0,
            lastLoggedSkin: null,
            lastProcessedSkinName: null,
            isWebSocketConnected: false
        };
        
        this.domCache = {
            chromaPanel: null,
            activeChromaButton: null,
            currentSkinCard: null,
            buttonCheckAttempts: 0
        };
        
        this.timers = {
            buttonCheck: null,
            webSocketReconnect: null
        };
        
        this.observer = null;
        this.webSocket = null;
        
        this.debounceTimer = null;
        
        this.delayedInit();
    }
    
    delayedInit() {
        if (this.checkIfInChampSelect()) {
            this.init();
        } else {
            this.waitForChampSelect();
        }
    }
    
    checkIfInChampSelect() {
        return document.querySelector('.champion-select') !== null ||
               document.querySelector('.skin-selection-carousel') !== null ||
               document.querySelector('.skin-selection-item') !== null ||
               document.querySelector('.skin-name-text') !== null ||
               document.querySelector('.skin-name') !== null;
    }
    
    waitForChampSelect() {
        const champSelectObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            const isChampSelectElement = 
                                (node.classList && 
                                 (node.classList.contains('champion-select') || 
                                  node.classList.contains('skin-selection-carousel') ||
                                  node.classList.contains('skin-selection-item'))) ||
                                (node.querySelector && 
                                 (node.querySelector('.champion-select') || 
                                  node.querySelector('.skin-selection-carousel') ||
                                  node.querySelector('.skin-selection-item')));
                            
                            if (isChampSelectElement) {
                                champSelectObserver.disconnect();
                                setTimeout(() => this.init(), 300);
                                return;
                            }
                        }
                    }
                }
            }
        });
        
        champSelectObserver.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        setTimeout(() => champSelectObserver.disconnect(), 30000);
    }
    
    init() {
        this.injectStyles();
        this.connectWebSocket();
    }
    
    injectStyles() {
        const styleId = 'skin-chroma-enhancer-native-style';
        if (document.getElementById(styleId)) return;
        
        const styles = `
            .chroma-enhancer-button {
                pointer-events: auto;
                cursor: pointer;
                display: block !important;
                bottom: 1px;
                height: 25px;
                left: 50%;
                position: absolute;
                transform: translateX(-50%) translateY(50%);
                width: 25px;
                z-index: 10;
            }
            
            .chroma-btn-outer {
                border-radius: 50%;
                box-shadow: 0 0 4px 1px rgba(1,10,19,.25);
                height: 100%;
                overflow: hidden;
                position: relative;
                background: rgba(0, 0, 0, 0.5);
                box-sizing: border-box;
            }
            
            .chroma-btn-frame {
                background: linear-gradient(0deg,#695625 0,#a9852d 23%,#b88d35 93%,#c8aa6e);
                height: 100%;
                width: 100%;
                padding: 2px;
                box-sizing: border-box;
                border-radius: 50%;
            }
            
            .chroma-btn-content {
                background: url('/fe/lol-champ-select/images/config/button-chroma.png') no-repeat;
                background-size: contain;
                border: 2px solid #010a13;
                border-radius: 50%;
                height: 16px;
                width: 16px;
                margin: 1px;
                transition: background 0.2s;
            }
            
            .chroma-btn-inner {
                border-radius: 50%;
                box-shadow: inset 0 0 4px 4px rgba(0,0,0,.75);
                position: absolute;
                width: calc(100% - 4px);
                height: calc(100% - 4px);
                left: 2px;
                top: 2px;
                pointer-events: none;
            }
            
            .chroma-enhancer-flyout {
                position: fixed;
                z-index: 999999;
                pointer-events: all;
                overflow: visible;
            }
            
            .chroma-flyout-frame {
                position: absolute;
                overflow: visible;
                z-index: 999999;
            }
            
            .chroma-native-modal {
                background: #010a13;
                display: flex;
                flex-direction: column;
                width: 305px;
                position: relative;
                max-height: 370px;
                min-height: 370px;
            }
            
            .chroma-native-border {
                position: absolute;
                top: 0;
                left: 0;
                box-sizing: border-box;
                background-color: transparent;
                box-shadow: 0 0 0 1px rgba(1,10,19,0.48);
                border-top: 2px solid transparent;
                border-left: 2px solid transparent;
                border-right: 2px solid transparent;
                border-bottom: none;
                border-image: linear-gradient(to top, #785a28 0, #463714 50%, #463714 100%) 1 stretch;
                border-image-slice: 1 1 0 1;
                width: 100%;
                height: 100%;
                z-index: 2;
                pointer-events: none;
            }
            
            .chroma-native-information {
                background-size: cover;
                background-position: center;
                background-image: url('lol-game-data/assets/content/src/LeagueClient/GameModeAssets/Classic_SRU/img/champ-select-flyout-background.jpg');
                border-bottom: thin solid #463714;
                flex-grow: 1;
                height: 316px;
                position: relative;
                width: 100%;
                z-index: 1;
            }
            
            .chroma-native-image {
                background-repeat: no-repeat;
                background-size: contain;
                background-position: center;
                bottom: 0;
                left: 0;
                position: absolute;
                right: 0;
                top: 0;
            }
            
        .chroma-native-skin-name {
            bottom: 10px; 
            color: #f7f0de;
            font-family: "LoL Display", "LoL Display CN", "Times New Roman", Times, Baskerville, Georgia, serif;
            font-size: 20px !important; 
            line-height: normal !important; 
            font-weight: 700; 
            position: absolute;
            text-align: center;
            width: 100%;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
            
            .chroma-native-selection {
                pointer-events: all;
                align-items: center;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                justify-content: center;
                min-height: 54px;
                padding: 8px 0;
                width: 100%;
                position: relative;
                z-index: 1;
                background: #010a13;
                overflow-x: auto;
                max-height: 200px;
            }
            
            .chroma-native-options {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 2px;
            }
            
            .chroma-native-button {
                pointer-events: all;
                align-items: center;
                border-radius: 50%;
                box-shadow: 0 0 2px #010a13;
                border: none;
                display: flex;
                height: 26px;
                width: 26px;
                justify-content: center;
                margin: 0;
                padding: 0;
                cursor: pointer;
                box-sizing: border-box;
                background: transparent !important;
            }
            
            .chroma-native-button.selected {
                border: 2px solid #c89b3c;
            }
            
            .chroma-native-button:hover {
                border: 2px solid #c89b3c;
            }
            
            .chroma-native-button .native-contents {
                align-items: center;
                border: 2px solid #010a13;
                border-radius: 50%;
                display: flex;
                height: 18px;
                width: 18px;
                justify-content: center;
                box-shadow: 0 0 0 2px transparent;
                transition: none !important;
            }
            
            .chroma-native-button.selected .native-contents {
                box-shadow: 0 0 0 2px #c89b3c;
            }
            
            .chroma-hidden {
                display: none !important;
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }
    
    readCurrentSkin() {
        for (const selector of this.config.SKIN_SELECTORS) {
            const nodes = document.querySelectorAll(selector);
            if (!nodes.length) {
                continue;
            }
            
            let candidate = null;
            
            nodes.forEach((node) => {
                const name = node.textContent.trim();
                if (!name) {
                    return;
                }
                
                if (this.isVisible(node)) {
                    candidate = name;
                } else if (!candidate) {
                    candidate = name;
                }
            });
            
            if (candidate) {
                return candidate;
            }
        }
        
        return null;
    }
    
    isVisible(element) {
        if (typeof element.offsetParent === "undefined") {
            return true;
        }
        return element.offsetParent !== null;
    }
    
    cleanSkinName(skinName) {
        return skinName.replace(/\s*\(.*?\)\s*/g, "").trim();
    }
    
    connectWebSocket() {
        if (this.timers.webSocketReconnect) {
            clearTimeout(this.timers.webSocketReconnect);
        }
        
        try {
            const wsLink = document.querySelector('link[rel="riot:plugins:websocket"]');
            if (!wsLink) {
                this.timers.webSocketReconnect = setTimeout(() => this.connectWebSocket(), 1000);
                return;
            }
            
            const uri = wsLink.href;
            this.webSocket = new WebSocket(uri, 'wamp');
            
            this.webSocket.onopen = () => {
                this.state.isWebSocketConnected = true;
                
                this.startMonitoring();
                
                const subscribeMsg = JSON.stringify([5, "OnJsonApiEvent_lol-champ-select_v1_skin-carousel-skins"]);
                this.webSocket.send(subscribeMsg);
            };
            
            this.webSocket.onmessage = (message) => {
                try {
                    const data = JSON.parse(message.data);
                    
                    if (data && Array.isArray(data) && data.length >= 2) {
                        const eventType = data[0];
                        const eventName = data[1];
                        
                        if (eventType === 8 && eventName === "OnJsonApiEvent_lol-champ-select_v1_skin-carousel-skins") {
                            const eventData = data[2];
                            if (eventData && eventData.data) {
                                this.processSkinDataFromWebSocket(eventData.data);
                            }
                        }
                    }
                } catch (error) {}
            };
            
            this.webSocket.onerror = () => {
                this.state.isWebSocketConnected = false;
                this.timers.webSocketReconnect = setTimeout(() => this.connectWebSocket(), 5000);
            };
            
            this.webSocket.onclose = () => {
                this.state.isWebSocketConnected = false;
                this.timers.webSocketReconnect = setTimeout(() => this.connectWebSocket(), 3000);
            };
            
        } catch (error) {
            this.state.isWebSocketConnected = false;
            this.timers.webSocketReconnect = setTimeout(() => this.connectWebSocket(), 5000);
        }
    }
    
    startMonitoring() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.start());
            return;
        }
        
        this.start();
    }
    
    async start() {
        if (!document.body) {
            setTimeout(() => this.start(), 250);
            return;
        }
        
        this.setupObservers();
    }
    
    setupObservers() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.observer = new MutationObserver(() => {
            this.checkState();
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    }
    
    processSkinDataFromWebSocket(skinsData) {
        if (!skinsData || !Array.isArray(skinsData)) {
            return;
        }
        
        this.state.skinMap.clear();
        
        const filteredSkins = skinsData.filter(skin => {
            const isOwned = skin.ownership?.owned || skin.unlocked === true;
            const isUnowned = !isOwned;
            const hasChromas = skin.childSkins && skin.childSkins.length > 0;
            return isUnowned && hasChromas;
        });
        
        filteredSkins.forEach(skin => {
            const cleanedName = this.cleanSkinName(skin.name);
            if (cleanedName) {
                this.state.skinMap.set(cleanedName, skin);
            }
        });
        
        if (this.state.currentSkinName) {
            const skinData = this.state.skinMap.get(this.state.currentSkinName);
            if (skinData) {
                this.state.currentSkinData = skinData;
                this.tryAttachChromaButton(skinData);
            } else {
                this.removeChromaButton();
            }
        }
        
        setTimeout(() => {
            const skinName = this.readCurrentSkin();
            if (skinName) {
                this.processSkinChange(skinName);
            }
        }, 500);
    }
    
    async checkState() {
        const skinName = this.readCurrentSkin();
        
        if (!skinName) {
            if (this.state.isInChampSelect) {
                this.resetState();
            }
            return;
        }
        
        if (!this.state.isInChampSelect) {
            this.state.isInChampSelect = true;
        }
        
        if (skinName !== this.state.lastLoggedSkin) {
            this.state.lastLoggedSkin = skinName;
            await this.processSkinChange(skinName);
        }
    }
    
    async processSkinChange(skinName) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(async () => {
            await this._processSkinChange(skinName);
        }, this.config.DEBOUNCE_DELAY);
    }
    
    async _processSkinChange(skinName) {
        const cleanedName = this.cleanSkinName(skinName);
        this.state.currentSkinName = cleanedName;
        
        const skinData = this.state.skinMap.get(cleanedName);
        
        if (!skinData) {
            this.removeChromaButton();
            return;
        }
        
        this.state.currentSkinData = skinData;
        
        await this.delay(150);
        
        this.tryAttachChromaButton(skinData);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    tryAttachChromaButton(skinData) {
        if (this.timers.buttonCheck) {
            clearTimeout(this.timers.buttonCheck);
            this.domCache.buttonCheckAttempts = 0;
        }
        
        this.attemptAttachChromaButton(skinData);
    }
    
    attemptAttachChromaButton(skinData) {
        this.domCache.buttonCheckAttempts++;
        
        const skinCard = this.findCorrectSkinCard();
        
        if (skinCard) {
            this.removeChromaButton();
            
            const button = this.createChromaButton(skinData);
            skinCard.appendChild(button);
            
            this.domCache.currentSkinCard = skinCard;
            this.domCache.activeChromaButton = button;
            
            this.state.lastProcessedSkinName = this.state.currentSkinName;
            
            return true;
        } else {
            if (this.domCache.buttonCheckAttempts < 5) {
                this.timers.buttonCheck = setTimeout(() => {
                    this.attemptAttachChromaButton(skinData);
                }, 200);
            }
            
            return false;
        }
    }
    
    findCorrectSkinCard() {
        const centerCard = this.findCenterSkinCard();
        if (centerCard) {
            return centerCard;
        }
        
        const selectedCard = document.querySelector('.skin-selection-item-selected');
        if (selectedCard) {
            return selectedCard;
        }
        
        const offsetCards = document.querySelectorAll('[class*="skin-carousel-offset-"]');
        for (const card of offsetCards) {
            const classList = card.className.split(' ');
            for (const className of classList) {
                if (className.startsWith('skin-carousel-offset-')) {
                    const offset = parseInt(className.replace('skin-carousel-offset-', ''));
                    if (offset === 2) {
                        return card;
                    }
                }
            }
        }
        
        const allCards = document.querySelectorAll('.skin-selection-item');
        let largestCard = null;
        let largestArea = 0;
        
        for (const card of allCards) {
            if (this.isVisible(card)) {
                const rect = card.getBoundingClientRect();
                const area = rect.width * rect.height;
                if (area > largestArea) {
                    largestArea = area;
                    largestCard = card;
                }
            }
        }
        
        return largestCard;
    }
    
    findCenterSkinCard() {
        const windowCenter = window.innerWidth / 2;
        const allCards = document.querySelectorAll('.skin-selection-item');
        
        let closestCard = null;
        let closestDistance = Infinity;
        
        for (const card of allCards) {
            if (!this.isVisible(card)) continue;
            
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.left + rect.width / 2;
            const distance = Math.abs(cardCenter - windowCenter);
            
            const score = distance / (rect.width * rect.height);
            
            if (score < closestDistance) {
                closestDistance = score;
                closestCard = card;
            }
        }
        
        return closestCard;
    }
    
    createChromaButton(skinData) {
        const button = document.createElement('div');
        button.className = 'chroma-enhancer-button';
        button.dataset.skinId = skinData.id;
        button.dataset.skinName = skinData.name;
        
        button.innerHTML = `
            <div class="chroma-btn-outer">
                <div class="chroma-btn-frame">
                    <div class="chroma-btn-content"></div>
                    <div class="chroma-btn-inner"></div>
                </div>
            </div>
        `;
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.showNativeChromaPanel(skinData, button);
        });
        
        return button;
    }
    
    removeChromaButton() {
        if (this.domCache.activeChromaButton) {
            try {
                this.domCache.activeChromaButton.remove();
            } catch (e) {}
            this.domCache.activeChromaButton = null;
        }
        
        document.querySelectorAll('.chroma-enhancer-button').forEach(btn => {
            try {
                btn.remove();
            } catch (e) {}
        });
        
        if (this.timers.buttonCheck) {
            clearTimeout(this.timers.buttonCheck);
            this.domCache.buttonCheckAttempts = 0;
        }
    }
    
    showNativeChromaPanel(skinData, button) {
        this.removeChromaPanel();
        
        const chromas = skinData.childSkins || [];
        if (chromas.length === 0) return;
        
        const flyout = document.createElement('div');
        flyout.className = 'chroma-enhancer-flyout';
        flyout.id = 'chroma-enhancer-flyout';
        
        const frame = document.createElement('div');
        frame.className = 'chroma-flyout-frame';
        
        const modal = document.createElement('div');
        modal.className = 'chroma-native-modal';
        modal.id = 'chroma-native-modal';
        
        const rect = button.getBoundingClientRect();
        const panelWidth = 305;
        const panelHeight = 380;
        
        let top = rect.top - panelHeight - 15;
        let left = rect.left + rect.width / 2 - panelWidth / 2;
        
        left = Math.max(10, Math.min(left, window.innerWidth - panelWidth - 10));
        top = Math.max(10, top);
        
        flyout.style.left = `${left}px`;
        flyout.style.top = `${top}px`;
        
        modal.innerHTML = this.createNativePanelHTML(skinData, chromas);
        
        frame.appendChild(modal);
        flyout.appendChild(frame);
        
        document.body.appendChild(flyout);
        this.domCache.chromaPanel = flyout;
        
        this.setupNativePanelEvents(modal, skinData, chromas, button);
    }
    
    createNativePanelHTML(skinData, chromas) {
        const previewPath = skinData.chromaPreviewPath || skinData.tilePath || '';
        
        return `
            <div class="chroma-native-border"></div>
            <div class="chroma-native-information">
                <div class="chroma-native-image" style="background-image: url('${previewPath}')"></div>
                <div class="chroma-native-skin-name">${skinData.name}</div>
            </div>
            <div class="chroma-native-selection">
                <ul class="chroma-native-options">
                    ${this.createNativeChromaOptionsHTML(skinData, chromas)}
                </ul>
            </div>
        `;
    }

    createNativeChromaOptionsHTML(skinData, chromas) {
        let html = '';
        
        if (skinData.productType === null) {
            html += `
                <li>
                    <div class="chroma-native-button selected" data-id="${skinData.id}" data-name="${skinData.name}" data-is-chroma="false">
                        <div class="native-contents" style="background:linear-gradient(135deg, #f0e6d2 0%, #f0e6d2 48%, #be1e37 48%, #be1e37 52%, #f0e6d2 52%, #f0e6d2 100%)"></div>
                    </div>
                </li>
            `;
        }
        
        chromas.forEach((chroma, index) => {
            const colors = chroma.colors || [];
            
            let colorStyle = '#555';
            if (colors.length >= 2) {
                colorStyle = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)`;
            } else if (colors.length === 1) {
                colorStyle = colors[0];
            } else {
                if (skinData.productType !== null) {
                    const presetColors = [
                        ['#FF6B6B', '#4ECDC4'],
                        ['#45B7D1', '#96C93D'],
                        ['#FECA57', '#FF9FF3'],
                        ['#54A0FF', '#5F27CD'],
                        ['#00D2D3', '#FF9F43'],
                        ['#EE5A24', '#009432'],
                    ];
                    const colorPair = presetColors[index % presetColors.length];
                    colorStyle = `linear-gradient(135deg, ${colorPair[0]} 0%, ${colorPair[0]} 50%, ${colorPair[1]} 50%, ${colorPair[1]} 100%)`;
                } else {
                    colorStyle = 'linear-gradient(135deg, #f0e6d2 0%, #f0e6d2 48%, #be1e37 48%, #be1e37 52%, #f0e6d2 52%, #f0e6d2 100%)';
                }
            }
            
            const isSelected = (skinData.productType !== null && index === 0) || 
                              (skinData.productType === null && index === 0 && chromas.length > 0);
            
            html += `
                <li>
                    <div class="chroma-native-button ${isSelected ? 'selected' : ''}" 
                         data-id="${chroma.id}" 
                         data-name="${chroma.name}" 
                         data-is-chroma="${skinData.productType === null}"
                         data-is-tiered="${skinData.productType !== null}"
                         data-index="${index}">
                        <div class="native-contents" style="background:${colorStyle}"></div>
                    </div>
                </li>
            `;
        });
        
        return html;
    }
    
    setupNativePanelEvents(panel, skinData, chromas, button) {
        const chromaButtons = panel.querySelectorAll('.chroma-native-button');
        const previewImage = panel.querySelector('.chroma-native-image');
        const previewName = panel.querySelector('.chroma-native-skin-name');
        
        const defaultPreviewPath = skinData.chromaPreviewPath || skinData.tilePath || '';
        
        let currentPreviewPath = defaultPreviewPath;
        let currentSkinName = skinData.name;
        
        if (skinData.productType !== null && chromas.length > 0) {
            const firstChroma = chromas[0];
            currentPreviewPath = firstChroma.chromaPreviewPath || firstChroma.tilePath || defaultPreviewPath;
            currentSkinName = firstChroma.name;
            previewImage.style.backgroundImage = `url('${currentPreviewPath}')`;
            previewName.textContent = currentSkinName;
        }
        
        chromaButtons.forEach(chromaButton => {
            const chromaId = parseInt(chromaButton.dataset.id);
            const isChroma = chromaButton.dataset.isChroma === 'true';
            const isTiered = chromaButton.dataset.isTiered === 'true';
            const chromaIndex = parseInt(chromaButton.dataset.index);
            
            chromaButton.addEventListener('mouseenter', () => {
                if (!isChroma && !isTiered) {
                    previewImage.style.backgroundImage = `url('${defaultPreviewPath}')`;
                    previewName.textContent = skinData.name;
                } else {
                    const selectedChroma = chromas[chromaIndex];
                    if (selectedChroma) {
                        const previewPath = selectedChroma.chromaPreviewPath || selectedChroma.tilePath || '';
                        previewImage.style.backgroundImage = `url('${previewPath}')`;
                        previewName.textContent = selectedChroma.name;
                    }
                }
            });
            
            chromaButton.addEventListener('mouseleave', () => {
                const selectedButton = panel.querySelector('.chroma-native-button.selected');
                if (selectedButton) {
                    const selectedId = parseInt(selectedButton.dataset.id);
                    const selectedIsChroma = selectedButton.dataset.isChroma === 'true';
                    const selectedIsTiered = selectedButton.dataset.isTiered === 'true';
                    const selectedIndex = parseInt(selectedButton.dataset.index);
                    
                    if (!selectedIsChroma && !selectedIsTiered) {
                        previewImage.style.backgroundImage = `url('${defaultPreviewPath}')`;
                        previewName.textContent = skinData.name;
                    } else {
                        const selectedChroma = chromas[selectedIndex];
                        if (selectedChroma) {
                            const previewPath = selectedChroma.chromaPreviewPath || selectedChroma.tilePath || '';
                            previewImage.style.backgroundImage = `url('${previewPath}')`;
                            previewName.textContent = selectedChroma.name;
                        }
                    }
                }
            });
            
            chromaButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                chromaButtons.forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                chromaButton.classList.add('selected');
                
                if (!isChroma && !isTiered) {
                    previewImage.style.backgroundImage = `url('${defaultPreviewPath}')`;
                    previewName.textContent = skinData.name;
                    
                    const buttonContent = button.querySelector('.chroma-btn-content');
                    if (buttonContent) {
                        buttonContent.style.background = "url('/fe/lol-champ-select/images/config/button-chroma.png') no-repeat";
                        buttonContent.style.backgroundSize = 'contain';
                    }
                } else {
                    const selectedChroma = chromas[chromaIndex];
                    if (selectedChroma) {
                        const previewPath = selectedChroma.chromaPreviewPath || selectedChroma.tilePath || '';
                        previewImage.style.backgroundImage = `url('${previewPath}')`;
                        previewName.textContent = selectedChroma.name;
                        
                        const buttonContent = button.querySelector('.chroma-btn-content');
                        if (buttonContent) {
                            const colors = selectedChroma.colors || [];
                            if (colors.length >= 2) {
                                buttonContent.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)`;
                            } else if (colors.length === 1) {
                                buttonContent.style.background = colors[0];
                            } else if (skinData.productType !== null) {
                                const presetColors = [
                                    ['#FF6B6B', '#4ECDC4'],
                                    ['#45B7D1', '#96C93D'],
                                    ['#FECA57', '#FF9FF3'],
                                ];
                                const colorPair = presetColors[chromaIndex % presetColors.length];
                                buttonContent.style.background = `linear-gradient(135deg, ${colorPair[0]} 0%, ${colorPair[0]} 50%, ${colorPair[1]} 50%, ${colorPair[1]} 100%)`;
                            }
                        }
                    }
                }
                
                this.callNpcSkinMessenger(chromaButton, skinData, chromas, chromaIndex);
                
                this.removeChromaPanel();
            });
        });
        
        setTimeout(() => {
            const closeHandler = (e) => {
                const flyout = document.getElementById('chroma-enhancer-flyout');
                if (flyout && !flyout.contains(e.target) && !button.contains(e.target)) {
                    flyout.remove();
                    this.domCache.chromaPanel = null;
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    callNpcSkinMessenger(chromaButton, baseSkinData, chromas, chromaIndex) {
        const chromaId = parseInt(chromaButton.dataset.id);
        const isChroma = chromaButton.dataset.isChroma === 'true';
        const isTiered = chromaButton.dataset.isTiered === 'true';
        
        let skinInfo = {};
        
        if (isChroma || isTiered) {
            const chromaData = chromas[chromaIndex];
            if (chromaData) {
                skinInfo = {
                    id: chromaData.id,
                    name: chromaData.name,
                    isChroma: isChroma,
                    isTiered: isTiered,
                    index: chromaIndex
                };
            }
        } else {
            skinInfo = {
                id: baseSkinData.id,
                name: baseSkinData.name,
                isChroma: false,
                isTiered: false
            };
        }
        
        if (window.NpcSkinMessenger && typeof window.NpcSkinMessenger.sendSkinMessage === 'function') {
            try {
                window.NpcSkinMessenger.sendSkinMessage(skinInfo);
            } catch (error) {}
        }
    }
    
    removeChromaPanel() {
        const flyout = document.getElementById('chroma-enhancer-flyout');
        if (flyout) {
            flyout.remove();
            this.domCache.chromaPanel = null;
        }
    }
    
    resetState() {
        this.state.currentChampionId = null;
        this.state.currentSkinName = null;
        this.state.currentSkinData = null;
        this.state.skinMap.clear();
        this.state.isInChampSelect = false;
        this.state.lastSkinCheckTime = 0;
        this.state.lastLoggedSkin = null;
        this.state.lastProcessedSkinName = null;
        this.state.isWebSocketConnected = false;
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        this.removeChromaButton();
        this.removeChromaPanel();
        
        this.domCache.activeChromaButton = null;
        this.domCache.currentSkinCard = null;
        this.domCache.chromaPanel = null;
    }
    
    destroy() {
        this.resetState();
        
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        if (this.timers.buttonCheck) {
            clearTimeout(this.timers.buttonCheck);
            this.timers.buttonCheck = null;
        }
        
        if (this.timers.webSocketReconnect) {
            clearTimeout(this.timers.webSocketReconnect);
            this.timers.webSocketReconnect = null;
        }
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        if (this.webSocket) {
            try {
                this.webSocket.close();
            } catch (error) {}
            this.webSocket = null;
        }
        
        const styleEl = document.getElementById('skin-chroma-enhancer-native-style');
        if (styleEl) {
            styleEl.remove();
        }
        
        window.skinChromaEnhancer = null;
    }
}

function startXC() {
    if (!document.body) {
        setTimeout(startXC, 100);
        return;
    }
    
    if (!window.skinChromaEnhancer) {
        window.skinChromaEnhancer = new SkinChromaEnhancer();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startXC);
} else {
    startXC();
}
