
class SkinChromaEnhancer {
    constructor() {
        this.config = {
            POLL_INTERVAL_MS: 250,
            SKIN_SELECTORS: [
                ".skin-name-text",
                ".skin-name",
            ],
            fetchDebounce: 1000,
            panelWidth: 320,
            panelHeight: 320
        };
        
        this.state = {
            currentChampionId: null,
            currentSkinName: null,
            currentSkinData: null,
            skinMap: new Map(),
            isActive: false,
            isInChampSelect: false,
            lastSkinCheckTime: 0,
            lastLoggedSkin: null,
            lastProcessedSkinName: null
        };
        
        this.domCache = {
            chromaPanel: null,
            activeChromaButton: null,
            currentSkinCard: null,
            buttonCheckAttempts: 0
        };
        
        this.timers = {
            champCheck: null,
            skinCheck: null,
            buttonCheck: null
        };
        
        this.observer = null;
        this.pollTimer = null;
        
        this.init();
    }
    
    init() {
        this.injectStyles();
        this.startMonitoring();
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
                border: 2px solid #90EE90 !important;  /* 边框，便于调试 #98FB98 #90EE90  */
                border-radius: 50%;
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
                max-height: 420px;
                min-height: 355px;
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
                height: 315px;
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
                font-family: "LoL Display", "Times New Roman", Times, serif;
                font-size: 14px !important;
                line-height: 1.2 !important;
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
                min-height: 40px;
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
        const cleanName = skinName.replace(/\s*\(.*?\)\s*/g, "").trim();
        return cleanName;
    }
    
    startMonitoring() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.start();
            });
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
        
        this.checkState();
        
        this.timers.skinCheck = setInterval(() => {
            this.checkState();
        }, this.config.POLL_INTERVAL_MS);
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
            attributes: true,
            characterData: true
        });
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
            
            if (!this.timers.skinCheck) {
                this.timers.skinCheck = setInterval(() => {
                    this.checkState();
                }, this.config.POLL_INTERVAL_MS);
            }
            
            if (!this.observer) {
                this.setupObservers();
            }
            
            await this.checkCurrentChampion();
        }
        
        if (skinName !== this.state.lastLoggedSkin) {
            this.state.lastLoggedSkin = skinName;
            await this.processSkinChange(skinName);
        }
    }
    
    async checkCurrentChampion() {
        try {
            const response = await fetch('/lol-champ-select/v1/current-champion');
            
            if (!response.ok) {
                return;
            }
            
            const championId = await response.json();
            
            if (championId === 0) {
                if (this.state.currentChampionId !== null) {
                    this.resetState();
                }
                return;
            }
            
            if (championId === this.state.currentChampionId) {
                return;
            }
            
            this.state.currentChampionId = championId;
            this.state.isActive = true;
            
            await this.fetchAndProcessSkinData();
            
        } catch (error) {
        }
    }
    
    async fetchAndProcessSkinData() {
        try {
            const response = await fetch('/lol-champ-select/v1/skin-carousel-skins');
            if (!response.ok) return;
            
            const skins = await response.json();
            
            const unownedSkins = skins.filter(skin => {
                const isOwned = skin.ownership?.owned || skin.unlocked === true;
                return !isOwned;
            });
            
            this.state.skinMap.clear();
            unownedSkins.forEach(skin => {
                const cleanedName = this.cleanSkinName(skin.name);
                if (cleanedName) {
                    this.state.skinMap.set(cleanedName, skin);
                }
            });
        } catch (error) {
        }
    }
    
    async processSkinChange(skinName) {
        const cleanedName = this.cleanSkinName(skinName);
        this.state.currentSkinName = cleanedName;
        
        const skinData = this.findSkinDataByName(cleanedName);
        
        if (!skinData) {
            this.removeChromaButton();
            return;
        }
        
        this.state.currentSkinData = skinData;
        
        const hasChromas = skinData.childSkins && skinData.childSkins.length > 0;
        
        if (hasChromas) {
            await this.delay(100);
            this.tryAttachChromaButton(skinData);
        } else {
            this.removeChromaButton();
        }
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
    
    findSkinDataByName(skinName) {
        for (let [key, value] of this.state.skinMap) {
            if (this.cleanSkinName(key) === skinName) {
                return value;
            }
        }
        
        for (let [key, value] of this.state.skinMap) {
            const cleanedKey = this.cleanSkinName(key);
            if (cleanedKey.includes(skinName) || skinName.includes(cleanedKey)) {
                return value;
            }
        }
        
        return null;
    }
    
    removeChromaButton() {
        if (this.domCache.activeChromaButton) {
            try {
                this.domCache.activeChromaButton.remove();
            } catch (e) {
            }
            this.domCache.activeChromaButton = null;
        }
        
        document.querySelectorAll('.chroma-enhancer-button').forEach(btn => {
            try {
                btn.remove();
            } catch (e) {
            }
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

chromas.forEach((chroma, index) => {
  if (!chroma.colors || !Array.isArray(chroma.colors) || chroma.colors.length === 0) {
    chroma.colors = [
      `hsl(${(index * 60) % 360}, 70%, 50%)`,
      `hsl(${(index * 60 + 30) % 360}, 80%, 40%)`
    ];
  }
});        

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
        
        // 基础皮肤 - 使用固定的渐变色（金红色渐变）
        html += `
            <li>
                <div class="chroma-native-button selected" data-id="${skinData.id}" data-name="${skinData.name}" data-is-chroma="false">
                    <div class="native-contents" style="background:linear-gradient(135deg, #f0e6d2 0%, #f0e6d2 48%, #be1e37 48%, #be1e37 52%, #f0e6d2 52%, #f0e6d2 100%)"></div>
                </div>
            </li>
        `;
        
        // 炫彩皮肤 - 保持原有的渐变色
        chromas.forEach(chroma => {
            const colors = chroma.colors || [];
            
            let colorStyle = '#555';
            if (colors.length >= 2) {
                colorStyle = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)`;
            } else if (colors.length === 1) {
                colorStyle = colors[0];
            } else {
                colorStyle = 'linear-gradient(135deg, #f0e6d2 0%, #f0e6d2 48%, #be1e37 48%, #be1e37 52%, #f0e6d2 52%, #f0e6d2 100%)';
            }
            
            html += `
                <li>
                    <div class="chroma-native-button" data-id="${chroma.id}" data-name="${chroma.name}" data-is-chroma="true">
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
        
        const defaultPreviewPath = skinData.chromaPreviewPath || skinData.splashPath || skinData.tilePath || '';
        
        chromaButtons.forEach(chromaButton => {
            const chromaId = parseInt(chromaButton.dataset.id);
            const isChroma = chromaButton.dataset.isChroma === 'true';
            
            chromaButton.addEventListener('mouseenter', () => {
                if (chromaId === skinData.id) {
                    previewImage.style.backgroundImage = `url('${defaultPreviewPath}')`;
                    previewName.textContent = skinData.name;
                } else {
                    const selectedChroma = chromas.find(c => c.id === chromaId);
                    if (selectedChroma) {
                        const previewPath = selectedChroma.chromaPreviewPath || selectedChroma.splashPath || defaultPreviewPath;
                        previewImage.style.backgroundImage = `url('${previewPath}')`;
                        previewName.textContent = selectedChroma.name;
                    }
                }
            });
            
            chromaButton.addEventListener('mouseleave', () => {
                const selectedButton = panel.querySelector('.chroma-native-button.selected');
                if (selectedButton) {
                    const selectedId = parseInt(selectedButton.dataset.id);
                    
                    if (selectedId === skinData.id) {
                        previewImage.style.backgroundImage = `url('${defaultPreviewPath}')`;
                        previewName.textContent = skinData.name;
                    } else {
                        const selectedChroma = chromas.find(c => c.id === selectedId);
                        if (selectedChroma) {
                            const previewPath = selectedChroma.chromaPreviewPath || selectedChroma.splashPath || defaultPreviewPath;
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
                
                if (chromaId === skinData.id) {
                    previewImage.style.backgroundImage = `url('${defaultPreviewPath}')`;
                    previewName.textContent = skinData.name;
                    
                    const buttonContent = button.querySelector('.chroma-btn-content');
                    if (buttonContent) {
                        buttonContent.style.background = "url('/fe/lol-champ-select/images/config/button-chroma.png') no-repeat";
                        buttonContent.style.backgroundSize = 'contain';
                    }
                } else {
                    const selectedChroma = chromas.find(c => c.id === chromaId);
                    if (selectedChroma) {
                        const previewPath = selectedChroma.chromaPreviewPath || selectedChroma.splashPath || defaultPreviewPath;
                        previewImage.style.backgroundImage = `url('${previewPath}')`;
                        previewName.textContent = selectedChroma.name;
                        
                        const buttonContent = button.querySelector('.chroma-btn-content');
                        if (buttonContent) {
                            const colors = selectedChroma.colors || [];
                            if (colors.length >= 2) {
                                buttonContent.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)`;
                            } else if (colors.length === 1) {
                                buttonContent.style.background = colors[0];
                            }
                        }
                    }
                }
                
                this.callNpcSkinMessenger(chromaButton, skinData, chromas);
                
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
    
    callNpcSkinMessenger(chromaButton, baseSkinData, chromas) {
        const chromaId = parseInt(chromaButton.dataset.id);
        const isChroma = chromaButton.dataset.isChroma === 'true';
        
        let skinInfo = {};
        
        if (isChroma) {
            const chromaData = chromas.find(c => c.id === chromaId);
            if (chromaData) {
                skinInfo = {
                    id: chromaData.id,
                    name: chromaData.name,
                    isChroma: true
                };
            }
        } else {
            skinInfo = {
                id: baseSkinData.id,
                name: baseSkinData.name,
                isChroma: false
            };
        }
        
        if (window.NpcSkinMessenger && typeof window.NpcSkinMessenger.sendSkinMessage === 'function') {
            try {
                window.NpcSkinMessenger.sendSkinMessage(skinInfo);
            } catch (error) {
            }
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
        this.state.isActive = false;
        this.state.isInChampSelect = false;
        this.state.lastSkinCheckTime = 0;
        this.state.lastLoggedSkin = null;
        this.state.lastProcessedSkinName = null;
        
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
        
        if (this.timers.skinCheck) {
            clearInterval(this.timers.skinCheck);
            this.timers.skinCheck = null;
        }
        
        if (this.timers.buttonCheck) {
            clearTimeout(this.timers.buttonCheck);
            this.timers.buttonCheck = null;
        }
        
        window.skinChromaEnhancer = null;
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.skinChromaEnhancer) {
            window.skinChromaEnhancer = new SkinChromaEnhancer();
        }
    }, 3000);
});
