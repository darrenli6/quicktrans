// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
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

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('translate-')) {
    const targetLang = info.menuItemId.replace('translate-', '');
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText,
      targetLang: targetLang
    });
  }
}); 