// 存储选中的目标语言
let targetLanguage = 'zh-CN'; // 默认为中文

// 为每个语言选项添加点击事件
document.querySelectorAll('.language-option').forEach(option => {
  option.addEventListener('click', async () => {
    // 更新选中状态的样式
    document.querySelectorAll('.language-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    option.classList.add('selected');

    // 获取选中的语言
    targetLanguage = option.dataset.lang;

    // 执行翻译
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: translatePage,
      args: [targetLanguage] // 传递目标语言参数
    });
  });
});

// 页面加载时选中默认语言
document.querySelector(`[data-lang="${targetLanguage}"]`).classList.add('selected');

function translatePage(targetLang) {
  // 获取页面所有文本节点
  function getAllTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  // 翻译文本
  async function translateText(text, targetLang) {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0][0][0];
  }

  // 创建加载指示器
  const loadingDiv = document.createElement('div');
  loadingDiv.textContent = '正在翻译...';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 9999;
  `;
  document.body.appendChild(loadingDiv);

  // 开始翻译
  (async () => {
    try {
      const textNodes = getAllTextNodes();
      for (let node of textNodes) {
        const originalText = node.textContent.trim();
        if (originalText && !/^\d+$/.test(originalText)) {
          const parentElement = node.parentElement;
          const nextElement = node.nextSibling;
          if (nextElement && nextElement.classList && nextElement.classList.contains('translation-text')) {
            continue;
          }

          const translatedText = await translateText(originalText, targetLang);
          
          const translationSpan = document.createElement('span');
          translationSpan.className = 'translation-text';
          translationSpan.style.cssText = `
            display: block;
            color: #666;
            font-size: 0.9em;
            margin-top: 2px;
            font-style: italic;
          `;
          translationSpan.textContent = translatedText;
          
          const originalSpan = document.createElement('span');
          originalSpan.className = 'original-text';
          
          const originalParent = node.parentNode;
          originalParent.insertBefore(originalSpan, node);
          originalSpan.appendChild(node);
          
          originalSpan.after(translationSpan);
        }
      }
      loadingDiv.textContent = '翻译完成！';
      setTimeout(() => loadingDiv.remove(), 2000);
    } catch (error) {
      loadingDiv.textContent = '翻译失败：' + error.message;
      loadingDiv.style.backgroundColor = '#f44336';
      setTimeout(() => loadingDiv.remove(), 3000);
    }
  })();
} 