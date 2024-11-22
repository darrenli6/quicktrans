// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 先移除所有已存在的菜单
  chrome.contextMenus.removeAll(() => {
    // 创建父菜单
    chrome.contextMenus.create({
      id: "translateMenu",
      title: "翻译选中文本",
      contexts: ["selection"]
    });

    // 创建子菜单项
    const languages = [
      { id: "zh-CN", title: "翻译为中文" },
      { id: "en", title: "翻译为英文" },
      { id: "ja", title: "翻译为日文" }
    ];

    languages.forEach(lang => {
      chrome.contextMenus.create({
        id: `translate-${lang.id}`,
        parentId: "translateMenu",
        title: lang.title,
        contexts: ["selection"]
      });
    });
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('translate-')) {
    const targetLang = info.menuItemId.replace('translate-', '');
    
    // 添加检查：确保当前页面可以注入脚本
    if (!tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') && 
        !tab.url.startsWith('https://chrome.google.com/webstore/')) {
      
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'translateSelection',
          text: info.selectionText,
          targetLang: targetLang
        }).catch(error => {
          console.error('Failed to send message:', error);
        });
      }).catch(error => {
        console.error('Failed to inject content script:', error);
      });
    } else {
      // 可选：显示一个通知告诉用户
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: '无法翻译',
        message: '此页面不支持翻译功能'
      });
    }
  }
}); 