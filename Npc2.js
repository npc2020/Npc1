(function enableLockedSkinPreview() {
  const STYLE_ID = "lpp-ui-unlock-skins-css";
  const INLINE_ID = `${STYLE_ID}-inline`;
  const BORDER_CLASS = "lpp-skin-border";
  const HIDDEN_CLASS = "lpp-skin-hidden";
  const VISIBLE_OFFSETS = new Set([0, 1, 2, 3, 4]);

  const INLINE_RULES = `
    .skin-selection-carousel .skin-selection-item.disabled,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] {
      filter: grayscale(0) saturate(1.1) contrast(1.05) !important;
      -webkit-filter: grayscale(0) saturate(1.1) contrast(1.05) !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }

    .skin-selection-carousel .skin-selection-item.disabled .skin-selection-thumbnail,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .skin-selection-thumbnail {
      filter: grayscale(0) saturate(1.15) contrast(1.05) !important;
      -webkit-filter: grayscale(0) saturate(1.15) contrast(1.05) !important;
      transition: filter 0.25s ease;
    }

    .skin-selection-carousel .skin-selection-item:not(.disabled):not([aria-disabled="true"]):not(.skin-selection-item-selected):hover .skin-selection-thumbnail {
      filter: brightness(1.2) saturate(1.1) !important;
      -webkit-filter: brightness(1.2) saturate(1.1) !important;
      transition: filter 0.25s ease;
    }

    .skin-selection-carousel .skin-selection-item.disabled:not(.skin-selection-item-selected):hover .skin-selection-thumbnail,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"]:not(.skin-selection-item-selected):hover .skin-selection-thumbnail {
      filter: brightness(1.2) saturate(1.1) !important;
      -webkit-filter: brightness(1.2) saturate(1.1) !important;
      transition: filter 0.25s ease;
    }

    .skin-selection-carousel .skin-selection-item.disabled::before,
    .skin-selection-carousel .skin-selection-item.disabled::after,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"]::before,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"]::after,
    .skin-selection-carousel .skin-selection-item.disabled .skin-selection-thumbnail::before,
    .skin-selection-carousel .skin-selection-item.disabled .skin-selection-thumbnail::after,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .skin-selection-thumbnail::before,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .skin-selection-thumbnail::after {
      display: none !important;
    }

    .skin-selection-carousel .skin-selection-item.disabled .locked-state,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .locked-state {
      display: none !important;
    }

    .champion-select .uikit-background-switcher.locked:after {
      background: none !important;
    }

    .unlock-skin-hit-area {
      display: none !important;
      pointer-events: none !important;
    }

    .unlock-skin-hit-area .locked-state {
      display: none !important;
    }

    .skin-selection-carousel-container .skin-selection-carousel .skin-selection-item .skin-selection-thumbnail {
      height: 100% !important;
      margin: 0 !important;
      transition: filter 0.25s ease !important;
      transform: none !important;
    }

    .skin-selection-carousel-container .skin-selection-carousel .skin-selection-item.skin-selection-item-selected {
      background: #3c3c41 !important;
    }

    .skin-selection-carousel-container .skin-selection-carousel .skin-selection-item.skin-selection-item-selected .skin-selection-thumbnail {
      height: 100% !important;
      margin: 0 !important;
    }

    .skin-selection-carousel .skin-selection-item {
      position: relative;
      z-index: 1;
    }

    .skin-selection-carousel .skin-selection-item .skin-selection-item-information {
      position: relative;
      z-index: 2;
    }

    .skin-selection-carousel .skin-selection-item.${HIDDEN_CLASS} {
      pointer-events: none !important;
    }

    .skin-selection-carousel .skin-selection-item .lpp-skin-border {
      position: absolute;
      inset: -2px;
      border: 2px solid transparent;
      border-image-source: linear-gradient(0deg, #4f4f54 0%, #3c3c41 50%, #29272b 100%);
      border-image-slice: 1;
      border-radius: inherit;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .skin-selection-carousel .skin-selection-item.skin-carousel-offset-2 .lpp-skin-border {
      border: 2px solid transparent;
      border-image-source: linear-gradient(0deg, #c8aa6e 0%, #c89b3c 44%, #a07b32 59%, #785a28 100%) !important;
      border-image-slice: 1 !important;
      box-shadow: 
        inset 0 0 0 1px rgba(1, 10, 19, 0.6),
        0 0 12px rgba(200, 170, 110, 0.6),
        0 0 24px rgba(200, 170, 110, 0.3) !important;
    }

    .skin-selection-carousel .skin-selection-item:not(.skin-selection-item-selected):hover .lpp-skin-border {
      border: 2px solid transparent;
      border-image-source: linear-gradient(0deg, #c8aa6e 0%, #c89b3c 44%, #a07b32 59%, #785a28 100%) !important;
      border-image-slice: 1 !important;
      box-shadow: 
        inset 0 0 0 1px rgba(1, 10, 19, 0.6),
        0 0 8px rgba(200, 170, 110, 0.4),
        0 0 16px rgba(200, 170, 110, 0.2) !important;
    }

    .skin-selection-carousel .skin-selection-item.skin-carousel-offset-2.skin-selection-item-selected .lpp-skin-border {
      box-shadow: 
        inset 0 0 0 1px rgba(1, 10, 19, 0.6),
        0 0 16px rgba(200, 170, 110, 0.7),
        0 0 32px rgba(200, 170, 110, 0.4) !important;
      animation: gold-glow-pulse 2s infinite ease-in-out !important;
    }

    @keyframes gold-glow-pulse {
      0%, 100% {
        box-shadow: 
          inset 0 0 0 1px rgba(1, 10, 19, 0.6),
          0 0 0 3px rgba(200, 170, 110, 0.5),
          0 0 16px rgba(200, 170, 110, 0.7),
          0 0 32px rgba(200, 170, 110, 0.4) !important;
      }
      50% {
        box-shadow: 
          inset 0 0 0 1px rgba(1, 10, 19, 0.6),
          0 0 0 3px rgba(200, 170, 110, 0.5),
          0 0 20px rgba(200, 170, 110, 1),
          0 0 40px rgba(200, 170, 110, 0.6) !important;
      }
    }

    .thumbnail-wrapper {
      filter: grayscale(0) saturate(1) contrast(1) !important;
      -webkit-filter: grayscale(0) saturate(1) contrast(1) !important;
    }

    .skin-thumbnail-img {
      filter: grayscale(0) saturate(1) contrast(1) !important;
      -webkit-filter: grayscale(0) saturate(1) contrast(1) !important;
    }

    .locked-state {
      display: none !important;
    }

    .unlock-skin-hit-area {
      display: none !important;
      pointer-events: none !important;
    }

    .chroma-skin-button.locked,
    .chroma-skin-button.purchase-disabled {
      pointer-events: auto !important;
      cursor: pointer !important;
      opacity: 1 !important;
      filter: none !important;
    }
    
    .chroma-skin-button.locked::before,
    .chroma-skin-button.locked::after,
    .chroma-skin-button.purchase-disabled::before,
    .chroma-skin-button.purchase-disabled::after {
      display: none !important;
    }
  `;

  let isInitializing = false;
  let isInitialized = false;
  let retryCount = 0;
  const MAX_RETRIES = 20;
  
  let chromaModalObserver = null;

  function injectInlineRules() {
    if (document.getElementById(INLINE_ID)) {
      return;
    }

    const styleTag = document.createElement("style");
    styleTag.id = INLINE_ID;
    styleTag.textContent = INLINE_RULES;
    document.head.appendChild(styleTag);
  }

  function ensureBorderFrame(skinItem) {
    if (!skinItem) return;

    let border = skinItem.querySelector(`.${BORDER_CLASS}`);
    if (!border) {
      border = document.createElement("div");
      border.className = BORDER_CLASS;
      border.setAttribute("aria-hidden", "true");
      skinItem.insertBefore(border, skinItem.firstChild || null);
    }
  }

  function parseCarouselOffset(skinItem) {
    const offsetClass = Array.from(skinItem.classList).find((cls) =>
      cls.startsWith("skin-carousel-offset")
    );
    if (!offsetClass) return null;

    const match = offsetClass.match(/skin-carousel-offset-(-?\d+)/);
    if (!match) return null;

    const value = Number.parseInt(match[1], 10);
    return Number.isNaN(value) ? null : value;
  }

  function isOffsetVisible(offset) {
    if (offset === null) return true;
    return VISIBLE_OFFSETS.has(offset);
  }

  function applyOffsetVisibility(skinItem) {
    if (!skinItem) return;

    const offset = parseCarouselOffset(skinItem);
    const shouldBeVisible = isOffsetVisible(offset);

    skinItem.classList.toggle("lpp-visible-skin", shouldBeVisible);
    skinItem.classList.toggle(HIDDEN_CLASS, !shouldBeVisible);

    if (shouldBeVisible) {
      skinItem.style.removeProperty("pointer-events");
    } else {
      skinItem.style.setProperty("pointer-events", "none", "important");
    }
  }

  function markSkinsAsOwned() {
    document.querySelectorAll(".thumbnail-wrapper.unowned").forEach((wrapper) => {
      wrapper.classList.remove("unowned");
      wrapper.classList.add("owned");
    });

    document.querySelectorAll(".purchase-available").forEach((element) => {
      element.classList.remove("purchase-available");
      element.classList.add("active");
    });

    document.querySelectorAll(".purchase-disabled").forEach((element) => {
      element.classList.remove("purchase-disabled");
    });
  }

  function scanSkinSelection() {
    document.querySelectorAll(".skin-selection-item").forEach((skinItem) => {
      ensureBorderFrame(skinItem);
      applyOffsetVisibility(skinItem);
    });

    markSkinsAsOwned();
  }

  function getCurrentChromaInfo() {
    try {
      const chromaModal = document.querySelector('.champ-select-chroma-modal');
      if (!chromaModal) return null;
      
      const info = { id: null, name: null };
      
      const previewImage = chromaModal.querySelector('.chroma-information-image');
      if (previewImage && previewImage.style.backgroundImage) {
        const bgImage = previewImage.style.backgroundImage;
        const match = bgImage.match(/champion-chroma-images\/(\d+)\/(\d+)\.png/);
        if (match) {
          info.id = parseInt(match[2]);
        }
      }
      
      const skinNameElement = chromaModal.querySelector('.child-skin-name');
      if (skinNameElement) {
        const clone = skinNameElement.cloneNode(true);
        const notifications = clone.querySelectorAll('.child-skin-disabled-notification');
        notifications.forEach(n => n.remove());
        info.name = clone.textContent.trim();
      }
      
      return info.name ? info : null;
    } catch (e) {
      return null;
    }
  }

  function sendChromaInfoToSkinMessenger() {
    const chromaInfo = getCurrentChromaInfo();
    if (!chromaInfo || !chromaInfo.name) return false;
    
    if (window.NpcSkinMessenger && typeof window.NpcSkinMessenger.sendSkinMessage === 'function') {
      return window.NpcSkinMessenger.sendSkinMessage({
        name: chromaInfo.name,
        id: chromaInfo.id || 0,
        isChroma: true
      });
    }
    return false;
  }

  function updateChromaButtonInSkinSelection(color) {
    try {
      const selectedSkinItem = document.querySelector('.skin-selection-item-selected');
      if (!selectedSkinItem) return false;
      
      const chromaButton = selectedSkinItem.querySelector('.chroma-skin-button, .skin-chroma-button, [class*="chroma"]');
      if (!chromaButton) return false;
      
      let targetElement = chromaButton.querySelector('.content');
      if (!targetElement) {
        const frameColor = chromaButton.querySelector('.frame-color');
        if (frameColor) {
          targetElement = frameColor.querySelector('.content');
        }
      }
      
      if (targetElement && targetElement.style) {
        targetElement.style.background = color;
        return true;
      } else if (chromaButton.style) {
        chromaButton.style.background = color;
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  function handleRegularSkins() {
    try {
      document.querySelectorAll(".skin-selection-item").forEach((skinItem) => {
        ensureBorderFrame(skinItem);
        applyOffsetVisibility(skinItem);
      });
      
      const disabledItems = document.querySelectorAll('.skin-selection-item.disabled, .skin-selection-item[aria-disabled="true"]');
      disabledItems.forEach(item => {
        item.classList.remove('disabled');
        item.removeAttribute('aria-disabled');
      });
      
      const lockIcons = document.querySelectorAll('.locked-state, .lock-icon, .unlock-skin-hit-area');
      lockIcons.forEach(icon => {
        icon.style.display = 'none';
      });
      
      const grayElements = document.querySelectorAll('.thumbnail-wrapper.unowned, .skin-thumbnail-img[style*="grayscale"]');
      grayElements.forEach(el => {
        el.style.filter = 'none';
        el.classList.remove('unowned');
      });
      
    } catch (e) {
    }
  }

  function handleChromaSkins() {
    try {
      const chromaModal = document.querySelector('.champ-select-chroma-modal');
      if (!chromaModal) return;
      
      const chromaButtons = chromaModal.querySelectorAll('.chroma-skin-button');
      if (!chromaButtons.length) return;
      
      const defaultColors = [
        '#2756CE', '#FFEE59', '#54209B', '#73BFBE', '#DF9117',
        '#FF1515', '#E8CD6B', '#568DF3', '#ECC642', '#73BFBE'
      ];
      
      chromaButtons.forEach((button, index) => {
        const isLocked = button.classList.contains('locked') || 
                         button.classList.contains('purchase-disabled');
        
        if (isLocked) {
          button.classList.remove('locked', 'purchase-disabled', 'disabled');
          
          if (button.innerHTML.trim() === '<!---->' || button.innerHTML.trim() === '') {
            const colorIndex = index % defaultColors.length;
            const color = defaultColors[colorIndex];
            const gradient = `linear-gradient(135deg, ${color} 0%, ${color} 50%, ${color} 50%, ${color} 100%)`;
            
            button.innerHTML = `<div class="contents" style="background:${gradient}"></div>`;
            
            button.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              const parent = this.closest('.chroma-selection');
              if (parent) {
                parent.querySelectorAll('.chroma-skin-button.selected').forEach(btn => {
                  btn.classList.remove('selected');
                });
                
                this.classList.add('selected');
                
                setTimeout(sendChromaInfoToSkinMessenger, 50);
                
                updateChromaButtonInSkinSelection(gradient);
              }
            }, true);
          }
        }
      });
      
    } catch (e) {
    }
  }

  function setupObservers() {
    const skinObserver = new MutationObserver(() => {
      scanSkinSelection();
      markSkinsAsOwned();
    });
    
    skinObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    if (chromaModalObserver) chromaModalObserver.disconnect();
    
    chromaModalObserver = new MutationObserver((mutations) => {
      let foundChromaModal = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (node.classList && node.classList.contains('champ-select-chroma-modal') ||
                  node.querySelector && node.querySelector('.champ-select-chroma-modal')) {
                foundChromaModal = true;
                break;
              }
            }
          }
        }
        if (foundChromaModal) break;
      }
      
      if (foundChromaModal) {
        requestAnimationFrame(handleChromaSkins);
      }
      
      handleRegularSkins();
    });
    
    chromaModalObserver.observe(document.body, { childList: true, subtree: true });

    const intervalId = setInterval(() => {
      scanSkinSelection();
      markSkinsAsOwned();
      handleRegularSkins();
      handleChromaSkins();
    }, 500);

    const handleResize = () => scanSkinSelection();
    window.addEventListener("resize", handleResize, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scanSkinSelection();
      }
    }, false);

    document.addEventListener('click', () => {
      setTimeout(() => {
        handleRegularSkins();
        handleChromaSkins();
      }, 50);
    }, true);

    return () => {
      skinObserver.disconnect();
      chromaModalObserver.disconnect();
      clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
    };
  }

  function init() {
    if (isInitialized) {
      return;
    }
    
    if (isInitializing) {
      return;
    }
    
    isInitializing = true;

    try {
      if (!document || !document.head) {
        if (retryCount >= MAX_RETRIES) {
          isInitializing = false;
          retryCount = 0;
          return;
        }
        
        retryCount++;
        
        setTimeout(() => {
          isInitializing = false;
          init();
        }, 100);
        return;
      }

      injectInlineRules();
      scanSkinSelection();
      setupObservers();
      
      isInitialized = true;
      
    } catch (error) {
      isInitialized = false;
    } finally {
      isInitializing = false;
      retryCount = 0;
    }
  }

  if (typeof document === "undefined") {
    return;
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(init, 100);
    }, { once: true });
    
    window.addEventListener("load", () => {
      if (!isInitialized) {
        setTimeout(init, 300);
      }
    }, { once: true });
  }
})();
