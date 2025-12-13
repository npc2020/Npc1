console.log("[NpcSkinID] Plugin loaded");

const LOG_PREFIX = "[NpcSkinID]";

let userInfo = null;
let currentRoomId = null;
let riotWs = null;
let lastSkinData = null;
let sendMessageTimeout = null;
let lastMessageData = null;

// ============ 控制台拦截器 ============
(function setupSkinInterceptor() {
  const originalLog = console.log;
  const originalInfo = console.info;
  
  console.log = function(...args) {
    const result = originalLog.apply(console, args);
    
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
    const result = originalInfo.apply(console, args);
    
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[LOG_INFO]')) {
      fastParseSkin(args);
    }
    
    return result;
  };
})();

// 快速解析皮肤信息
function fastParseSkin(args) {
  try {
    // 找对象参数
    for (const arg of args) {
      if (arg && typeof arg === 'object' && arg.id && arg.name) {
        handleSkinData(arg);
        return;
      }
    }
    
    // 从字符串提取
    const text = args.join(' ');
    if (text.includes('{') && text.includes('}')) {
      const start = text.indexOf('{');
      const end = text.indexOf('}', start) + 1;
      if (end > start) {
        const jsonStr = text.substring(start, end);
        try {
          const data = JSON.parse(jsonStr);
          if (data.id && data.name) {
            handleSkinData(data);
            return;
          }
        } catch (e) {
          const idMatch = jsonStr.match(/"id":\s*(\d+)/);
          const nameMatch = jsonStr.match(/"name":\s*"([^"]+)"/);
          if (idMatch && nameMatch) {
            handleSkinData({
              id: parseInt(idMatch[1]),
              name: nameMatch[1]
            });
          }
        }
      }
    }
  } catch (e) {}
}

// 处理皮肤数据
function handleSkinData(skinData) {
  const skinId = skinData.id;
  const skinName = skinData.name;
  
  if (!skinName) return;
  
  const cleanName = skinName.replace(/\s*\(.*?\)\s*/g, "").trim();
  
  // 去重
  if (lastSkinData && 
      lastSkinData.id === skinId && 
      lastSkinData.name === cleanName) {
    return;
  }
  
  // 更新数据
  lastSkinData = { 
    id: skinId, 
    name: cleanName, 
    time: Date.now() 
  };
  
  // 智能防抖发送消息
  smartDebounceSendMessage(cleanName, skinId);
}

// ============ 智能防抖发送消息 ============
function smartDebounceSendMessage(skinName, skinId) {
  // 保存最后一次的数据
  lastMessageData = { skinName, skinId };
  
  // 清除之前的定时器
  if (sendMessageTimeout) {
    clearTimeout(sendMessageTimeout);
  }
  
  // 智能计算防抖时间
  const now = Date.now();
  const timeSinceLast = lastSkinData ? now - lastSkinData.time : 1000;
  
  // 动态防抖时间
  const debounceTime = timeSinceLast < 500 ? 400 : 200;
  
  sendMessageTimeout = setTimeout(() => {
    if (lastMessageData) {
      sendSkinMessage(lastMessageData.skinName, lastMessageData.skinId);
      lastMessageData = null;
    }
  }, debounceTime);
}

// ============ 聊天功能 ============
function initLolConnection() {
  fetch('/lol-chat/v1/me')
    .then(r => r.json())
    .then(data => {
      userInfo = data;
    })
    .catch(() => {});
  
  const riotLink = document.querySelector('link[rel="riot:plugins:websocket"]');
  if (riotLink) {
    riotWs = new WebSocket(riotLink.href, 'wamp');
    
    riotWs.onopen = () => {
      riotWs.send(JSON.stringify([5, 'OnJsonApiEvent_lol-chat_v1_conversations']));
    };
    
    riotWs.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[2]?.data?.body === 'joined_room') {
          const match = data[2].uri.match(/\/lol-chat\/v1\/conversations\/(.+)\/messages/);
          if (match) {
            currentRoomId = match[1];
          }
        }
      } catch (e) {}
    };
  }
}

async function sendSkinMessage(skinName, skinId) {
  if (!userInfo || !currentRoomId) {
    return;
  }
  
  const cleanName = skinName.replace(/\s*\(.*?\)\s*/g, "").trim();
  const messageText = `当前皮肤: ${cleanName} ID:${skinId}`;
  
  try {
    await fetch(`/lol-chat/v1/conversations/${currentRoomId}/messages`, {
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
  } catch (error) {}
}

// ============ 启动 ============
function start() {
  if (!document.body) {
    setTimeout(start, 100);
    return;
  }
  
  initLolConnection();
}

function stop() {
  if (sendMessageTimeout) clearTimeout(sendMessageTimeout);
  if (riotWs) riotWs.close();
}

// 立即启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

window.addEventListener("beforeunload", stop);

// ============ 对外接口 - 供解锁脚本调用 ============
window.NpcSkinMessenger = (function() {
  // 私有变量，防止外部直接访问
  let isInitialized = false;
  
  // 初始化检查
  function checkInitialization() {
    if (!isInitialized) {
      // 检查核心变量是否存在
      if (typeof userInfo === 'undefined' || 
          typeof currentRoomId === 'undefined' ||
          typeof smartDebounceSendMessage === 'undefined') {
        return false;
      }
      isInitialized = true;
    }
    return true;
  }
  
  // 清理皮肤名称
  function cleanSkinName(name) {
    if (!name) return '';
    return name
      .replace(/\s*\(.*?\)\s*/g, "")
      .replace(/\s*\[.*?\]\s*/g, "")
      .replace(/\s*炫彩.*$/i, "")
      .replace(/\s*Chroma.*$/i, "")
      .trim();
  }
  
  // 主接口对象
  return {
    /**
     * 发送皮肤消息（供其他脚本调用）
     * @param {Object} skinInfo - 皮肤信息 {name: string, id: number, isChroma?: boolean}
     * @returns {boolean} 是否成功处理
     */
    sendSkinMessage: function(skinInfo) {
      try {
        // 参数验证
        if (!skinInfo || 
            typeof skinInfo !== 'object' || 
            !skinInfo.name || 
            typeof skinInfo.name !== 'string' ||
            !skinInfo.id || 
            typeof skinInfo.id !== 'number') {
          return false;
        }
        
        // 检查初始化状态
        if (!checkInitialization()) {
          return false;
        }
        
        const skinId = skinInfo.id;
        const skinName = skinInfo.name;
        const isChroma = !!skinInfo.isChroma;
        
        // 清理名称
        const cleanName = cleanSkinName(skinName);
        
        // 使用现有的防抖逻辑发送消息
        if (typeof smartDebounceSendMessage === 'function') {
          smartDebounceSendMessage(cleanName, skinId, isChroma);
        } else {
          // 备用方案：直接发送
          if (typeof sendSkinMessage === 'function') {
            sendSkinMessage(cleanName, skinId);
          } else {
            return false;
          }
        }
        
        // 更新本地缓存（如果存在）
        if (typeof lastSkinData !== 'undefined') {
          lastSkinData = { 
            id: skinId, 
            name: cleanName, 
            time: Date.now(),
            isChroma: isChroma
          };
        }
        
        return true;
        
      } catch (error) {
        return false;
      }
    },
    
    /**
     * 检查是否已初始化并准备好
     * @returns {boolean}
     */
    isReady: function() {
      try {
        return checkInitialization() && 
               userInfo !== null && 
               currentRoomId !== null;
      } catch (e) {
        return false;
      }
    },
    
    /**
     * 获取当前连接状态
     * @returns {Object} 状态信息
     */
    getStatus: function() {
      try {
        return {
          initialized: isInitialized,
          userInfo: !!userInfo,
          roomId: !!currentRoomId,
          chatConnected: !!(userInfo && currentRoomId)
        };
      } catch (e) {
        return { initialized: false };
      }
    },
    
    /**
     * 手动触发发送（供调试，无日志）
     * @param {string} name - 皮肤名称
     * @param {number} id - 皮肤ID
     * @returns {boolean} 是否成功
     */
    testSend: function(name, id) {
      if (!name || !id) return false;
      return this.sendSkinMessage({name: name, id: id});
    }
  };
})();