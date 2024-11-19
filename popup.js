document.addEventListener('DOMContentLoaded', () => {
  const sourceLangSelect = document.getElementById('sourceLang');
  const targetLangSelect = document.getElementById('targetLang');
  const translateBtn = document.getElementById('translateBtn');
  const swapLangsBtn = document.getElementById('swapLangs');

  // 从存储中恢复语言选择
  chrome.storage.sync.get(['sourceLang', 'targetLang'], (data) => {
    if (data.sourceLang) {
      sourceLangSelect.value = data.sourceLang;
    }
    if (data.targetLang) {
      targetLangSelect.value = data.targetLang;
    }
    updateTargetLangOptions();
  });

  // 更新目标语言选项，避免选择相同语言
  function updateTargetLangOptions() {
    const selectedSourceLang = sourceLangSelect.value;
    Array.from(targetLangSelect.options).forEach(option => {
      option.disabled = option.value === selectedSourceLang;
    });

    // 如果目标语言被禁用，自动选择下一个可用语言
    if (targetLangSelect.value === selectedSourceLang) {
      targetLangSelect.value = Array.from(targetLangSelect.options).find(option => !option.disabled).value;
    }
  }

  sourceLangSelect.addEventListener('change', () => {
    updateTargetLangOptions();
    saveLanguageSelection();
  });

  targetLangSelect.addEventListener('change', saveLanguageSelection);

  swapLangsBtn.addEventListener('click', () => {
    const temp = sourceLangSelect.value;
    sourceLangSelect.value = targetLangSelect.value;
    targetLangSelect.value = temp;
    updateTargetLangOptions();
    saveLanguageSelection();
  });

  translateBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: translatePage,
      args: [sourceLang, targetLang]
    });
  });

  // 保存语言选择到存储
  function saveLanguageSelection() {
    chrome.storage.sync.set({
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value
    });
  }

  // 初始化目标语言选项
  updateTargetLangOptions();
});

function translatePage(sourceLang, targetLang) {
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
  async function translateText(text, sourceLang, targetLang) {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
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

          const translatedText = await translateText(originalText, sourceLang, targetLang);
          
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