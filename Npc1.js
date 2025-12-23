let userInfo = null;
let currentRoomId = null;
let lastSkinData = null;
let sendMessageTimeout = null;
let lastMessageData = null;
let isInChampSelect = false;
let gameflowWs = null;
let chatInitRetryCount = 0;
const MAX_CHAT_RETRY = 3;
let skinDataCache = new Map();
let originalConsoleLog = null;
let originalConsoleInfo = null;
let isConsoleInterceptorActive = false;

// 图片切换缩放效果函数
function changeImageWithZoomEffect(imgElement, newSrc, options = {}) {
    const {
        zoomLevel = 1.5,
        duration = 1000,
        fadeOutOpacity = 0.1
    } = options;
    
    if (!imgElement) return Promise.reject('No image element');
    
    return new Promise((resolve, reject) => {
        const originalTransition = imgElement.style.transition;
        const originalTransform = imgElement.style.transform;
        const originalOpacity = imgElement.style.opacity;
        
        imgElement.style.transition = `opacity ${duration/2}ms ease-in-out`;
        imgElement.style.opacity = fadeOutOpacity;
        
        const tempImg = new Image();
        tempImg.src = newSrc;
        
        tempImg.onload = function() {
            setTimeout(() => {
                imgElement.src = newSrc;
                
                imgElement.style.transition = `all ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
                imgElement.style.transformOrigin = 'center center';
                imgElement.style.willChange = 'transform, opacity';
                
                imgElement.style.opacity = '0.6';
                imgElement.style.transform = `scale(${zoomLevel})`;
                
                requestAnimationFrame(() => {
                    imgElement.style.opacity = '1';
                    imgElement.style.transform = 'scale(1)';
                    
                    setTimeout(() => {
                        imgElement.style.transition = originalTransition;
                        imgElement.style.transform = originalTransform;
                        imgElement.style.opacity = originalOpacity;
                        imgElement.style.willChange = '';
                        resolve();
                    }, duration + 100);
                });
            }, duration/2);
        };
        
        tempImg.onerror = () => {
            imgElement.style.opacity = '1';
            imgElement.style.transform = 'scale(1)';
            imgElement.style.transition = originalTransition;
            reject('Image load failed');
        };
    });
}

async function fetchSkinData() {
  try {
    const response = await fetch('https://lol.qq.com/act/AutoCMS/publish/LCU/ChampSelect/ChampSelect.js');
    const text = await response.text();
    const jsonObjects = [];
    const pattern = /\{[^{}]*"id"[^{}]*\}/g;
    const matches = text.match(pattern);
    
    if (matches) {
      for (const match of matches) {
        try {
          const skin = JSON.parse(match);
          if (skin.id && skin.splashPath) {
            jsonObjects.push(skin);
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (jsonObjects.length > 0) {
      skinDataCache.clear();
      jsonObjects.forEach(skin => {
        skinDataCache.set(skin.id, {
          emblemPath: skin.emblemPath || '',
          name: skin.name || '',
          splashPath: skin.splashPath
        });
      });
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

function changeChampSelectBackground(skinId) {
  const skinInfo = skinDataCache.get(skinId);
  if (!skinInfo) {
    return false;
  }
  
  let successCount = 0;
  
  // ============ 1. 修改背景大图（使用缩放效果） ============
  if (skinInfo.splashPath) {
    const previewImg = document.querySelector('.lol-uikit-background-switcher-image');
    if (previewImg) {
      changeImageWithZoomEffect(
        previewImg,
        skinInfo.splashPath,
        {
          zoomLevel: 1.6,
          duration: 1200,
          fadeOutOpacity: 0.05
        }
      );
      successCount++;
    }
  }
  
  // ============ 2. 修改emblem图标 ============
  if (skinInfo.emblemPath) {
    const emblemImg = document.querySelector('#t-champion-splash-emblem-overlay img');
    if (emblemImg) {
      emblemImg.src = skinInfo.emblemPath;
      successCount++;
    } else {
      const emblemElements = document.querySelectorAll('.champion-splash-emblem-overlay img');
      if (emblemElements.length > 0) {
        emblemElements.forEach(img => {
          img.src = skinInfo.emblemPath;
        });
        successCount++;
      }
    }
  }
  
  return successCount > 0;
}

function enableConsoleInterceptor() {
  if (isConsoleInterceptorActive) return;
  
  if (!originalConsoleLog) {
    originalConsoleLog = console.log;
  }
  if (!originalConsoleInfo) {
    originalConsoleInfo = console.info;
  }
  
  console.log = function(...args) {
    const result = originalConsoleLog.apply(console, args);
    
    if (args[0] && typeof args[0] === 'string') {
      const text = args[0];
      if (text.includes('skin:') || 
          (text.includes('"id"') && text.includes('"name"'))) {
        fastParseSkin(args);
      }
    }
    
    return result;
  };
  
  console.info = function(...args) {
    const result = originalConsoleInfo.apply(console, args);
    
    if (args[0] && typeof args[0] === 'string' && 
        args[0].includes('[LOG_INFO]') && 
        (args.some(arg => typeof arg === 'object' && arg.id) || 
         args.some(arg => typeof arg === 'string' && arg.includes('skin:')))) {
      fastParseSkin(args);
    }
    
    return result;
  };
  
  isConsoleInterceptorActive = true;
}

function disableConsoleInterceptor() {
  if (!isConsoleInterceptorActive) return;
  
  if (originalConsoleLog) {
    console.log = originalConsoleLog;
  }
  if (originalConsoleInfo) {
    console.info = originalConsoleInfo;
  }
  
  isConsoleInterceptorActive = false;
}

function fastParseSkin(args) {
  try {
    for (const arg of args) {
      if (arg && typeof arg === 'object' && arg.id && arg.name) {
        handleSkinData(arg);
        return;
      }
    }
  } catch (e) {}
}

function handleSkinData(skinData) {
  const skinId = skinData.id;
  const skinName = skinData.name;
  
  if (!skinName) return;
  
  const cleanName = skinName.replace(/\s*\(.*?\)\s*/g, "").trim();
  
  if (lastSkinData && 
      lastSkinData.id === skinId && 
      lastSkinData.name === cleanName) {
    return;
  }
  
  lastSkinData = { 
    id: skinId, 
    name: cleanName, 
    time: Date.now() 
  };
  
  if (skinDataCache.has(skinId)) {
    changeChampSelectBackground(skinId);
  }
  
  smartDebounceSendMessage(cleanName, skinId);
}

function smartDebounceSendMessage(skinName, skinId) {
  lastMessageData = { skinName, skinId };
  
  if (sendMessageTimeout) {
    clearTimeout(sendMessageTimeout);
  }
  
  sendMessageTimeout = setTimeout(() => {
    if (lastMessageData) {
      sendSkinMessage(lastMessageData.skinName, lastMessageData.skinId);
      lastMessageData = null;
    }
  }, 900);
}

function setupGameflowMonitor() {
  try {
    const wsLink = document.querySelector('link[rel="riot:plugins:websocket"]');
    if (!wsLink) {
      setTimeout(setupGameflowMonitor, 1000);
      return;
    }
    
    const uri = wsLink.href;
    gameflowWs = new WebSocket(uri, 'wamp');
    
    gameflowWs.onopen = () => {
      gameflowWs.send(JSON.stringify([5, "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase"]));
    };
    
    gameflowWs.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        
        if (data && Array.isArray(data) && data.length >= 2) {
          const eventType = data[0];
          const eventName = data[1];
          
          if (eventType === 8 && eventName === "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase") {
            const eventData = data[2];
            if (eventData && eventData.data) {
              const phase = eventData.data;
              
              const wasInChampSelect = isInChampSelect;
              isInChampSelect = phase === "ChampSelect";
              
              if (wasInChampSelect !== isInChampSelect) {
                if (isInChampSelect && !wasInChampSelect) {
                  enableConsoleInterceptor();
                  resetForNewChampSelect();
                  chatInitRetryCount = 0;
                  setTimeout(() => initLolConnection(), 1000);
                } else if (!isInChampSelect && wasInChampSelect) {
                  disableConsoleInterceptor();
                  cleanupAfterChampSelect();
                }
              }
            }
          }
        }
      } catch (error) {}
    };
    
    gameflowWs.onerror = () => {};
    
    gameflowWs.onclose = () => {
      setTimeout(setupGameflowMonitor, 5000);
    };
    
  } catch (error) {
    setTimeout(setupGameflowMonitor, 5000);
  }
}

function resetForNewChampSelect() {
  lastSkinData = null;
  lastMessageData = null;
  userInfo = null;
  currentRoomId = null;
  
  if (sendMessageTimeout) {
    clearTimeout(sendMessageTimeout);
    sendMessageTimeout = null;
  }
}

function cleanupAfterChampSelect() {
  lastSkinData = null;
  lastMessageData = null;
  
  if (sendMessageTimeout) {
    clearTimeout(sendMessageTimeout);
    sendMessageTimeout = null;
  }
}

async function initLolConnection() {
  try {
    if (chatInitRetryCount >= MAX_CHAT_RETRY) {
      return;
    }
    
    chatInitRetryCount++;
    
    const userResponse = await fetch('/lol-chat/v1/me');
    if (!userResponse.ok) {
      if (chatInitRetryCount < MAX_CHAT_RETRY) {
        setTimeout(() => {
          if (isInChampSelect) {
            initLolConnection();
          }
        }, 2000);
      }
      return;
    }
    
    userInfo = await userResponse.json();
    
    const conversationsResponse = await fetch('/lol-chat/v1/conversations');
    if (!conversationsResponse.ok) {
      if (chatInitRetryCount < MAX_CHAT_RETRY) {
        setTimeout(() => {
          if (isInChampSelect) {
            initLolConnection();
          }
        }, 2000);
      }
      return;
    }
    
    const conversations = await conversationsResponse.json();
    const champSelectRoom = conversations.find(conv => 
      conv.type === "championSelect"
    );
    
    if (champSelectRoom) {
      currentRoomId = champSelectRoom.id;
      chatInitRetryCount = 0;
    } else {
      if (chatInitRetryCount < MAX_CHAT_RETRY) {
        setTimeout(() => {
          if (isInChampSelect) {
            initLolConnection();
          }
        }, 2000);
      }
    }
  } catch (error) {
    if (chatInitRetryCount < MAX_CHAT_RETRY) {
      setTimeout(() => {
        if (isInChampSelect) {
          initLolConnection();
        }
      }, 2000);
    }
  }
}

async function sendSkinMessage(skinName, skinId) {
  if (!isInChampSelect) {
    return;
  }
  
  if (!userInfo || !currentRoomId) {
    await initLolConnection();
    if (!userInfo || !currentRoomId) {
      return;
    }
  }
  
  const cleanName = skinName.replace(/\s*\(.*?\)\s*/g, "").trim();
  const messageText = `当前皮肤: ${cleanName} ID:${skinId}`;
  
  try {
    const response = await fetch(`/lol-chat/v1/conversations/${currentRoomId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: "championSelect",
        fromId: userInfo.id,
        fromSummonerId: userInfo.summonerId,
        isHistorical: false,
        timestamp: new Date().toISOString(),
        body: messageText
      })
    });
    
    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        userInfo = null;
        currentRoomId = null;
        chatInitRetryCount = 0;
      }
    }
  } catch (error) {
    userInfo = null;
    currentRoomId = null;
  }
}

function start() {
  if (!document.body) {
    setTimeout(start, 100);
    return;
  }
  
  fetchSkinData();
  setupGameflowMonitor();
}

function stop() {
  if (sendMessageTimeout) clearTimeout(sendMessageTimeout);
  if (gameflowWs) gameflowWs.close();
  disableConsoleInterceptor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

window.addEventListener("beforeunload", stop);

window.NpcSkinMessenger = (function() {
  let isInitialized = false;
  
  function checkInitialization() {
    if (!isInitialized) {
      if (typeof userInfo === 'undefined' || 
          typeof currentRoomId === 'undefined' ||
          typeof smartDebounceSendMessage === 'undefined') {
        return false;
      }
      isInitialized = true;
    }
    return true;
  }
  
  function cleanSkinName(name) {
    if (!name) return '';
    return name
      .replace(/\s*\(.*?\)\s*/g, "")
      .replace(/\s*\[.*?\]\s*/g, "")
      .replace(/\s*炫彩.*$/i, "")
      .replace(/\s*Chroma.*$/i, "")
      .trim();
  }
  
  return {
    sendSkinMessage: function(skinInfo) {
      try {
        if (!skinInfo || 
            typeof skinInfo !== 'object' || 
            !skinInfo.name || 
            typeof skinInfo.name !== 'string' ||
            !skinInfo.id || 
            typeof skinInfo.id !== 'number') {
          return false;
        }
        
        if (!checkInitialization()) {
          return false;
        }
        
        const skinId = skinInfo.id;
        const skinName = skinInfo.name;
        const isChroma = !!skinInfo.isChroma;
        
        const shouldChangeBg = skinInfo.changeBackground !== false;
        if (shouldChangeBg) {
          changeChampSelectBackground(skinId);
        }
        
        const cleanName = cleanSkinName(skinName);
        if (typeof smartDebounceSendMessage === 'function') {
          smartDebounceSendMessage(cleanName, skinId, isChroma);
        }
        
        return true;
        
      } catch (error) {
        return false;
      }
    },
    
    changeBackgroundOnly: function(skinId) {
      if (!skinId || typeof skinId !== 'number') {
        return false;
      }
      return changeChampSelectBackground(skinId);
    },
    
    reloadSkinData: function() {
      return fetchSkinData();
    },
    
    getSkinCacheInfo: function() {
      return {
        size: skinDataCache.size,
        hasSkin: (skinId) => skinDataCache.has(skinId),
        allSkinIds: Array.from(skinDataCache.keys())
      };
    },
    
  };
})();
