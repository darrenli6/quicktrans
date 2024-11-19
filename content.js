// 检查是否已经添加了样式
if (!document.querySelector('#quicktrans-style')) {
  const style = document.createElement('style');
  style.id = 'quicktrans-style';  // 添加唯一ID
  style.textContent = `
    .translation-popup {
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 500px;
    }
    .sentence-pair {
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .sentence-pair:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    .original {
      color: #333;
      margin-bottom: 5px;
    }
    .translated {
      color: #666;
      font-style: italic;
    }
    .speaker-icon {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      background: #f0f0f0;
      margin-left: 5px;
    }
    .speaker-icon:hover {
      background: #e0e0e0;
    }
    .close-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .close-btn:hover {
      background: #f0f0f0;
    }
  `;
  document.head.appendChild(style);
}

// 使用 IIFE 来避免全局变量污染
(function() {
  // 将文本分割成句子
  function splitIntoSentences(text) {
    return text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];
  }

  // 翻译文本
  async function translateText(text, targetLang) {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0][0][0];
  }

  // 创建语音朗读功能
  function speakText(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  }

  // 创建翻译弹出框
  async function createTranslationPopup(original, x, y) {
    const existingPopup = document.querySelector('.translation-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.className = 'translation-popup';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    popup.innerHTML = '<div class="close-btn">×</div><div class="sentences-container"></div>';
    
    document.body.appendChild(popup);
    const container = popup.querySelector('.sentences-container');

    const sentences = splitIntoSentences(original);
    for (let sentence of sentences) {
      sentence = sentence.trim();
      if (sentence) {
        const sentenceDiv = document.createElement('div');
        sentenceDiv.className = 'sentence-pair';

        const originalDiv = document.createElement('div');
        originalDiv.className = 'original';
        originalDiv.textContent = sentence;
        sentenceDiv.appendChild(originalDiv);

        const translatedDiv = document.createElement('div');
        translatedDiv.className = 'translated';
        translatedDiv.textContent = '翻译中...';
        sentenceDiv.appendChild(translatedDiv);

        container.appendChild(sentenceDiv);

        try {
          const translated = await translateText(sentence, 'zh-CN');
          translatedDiv.innerHTML = `
            ${translated}
            <span class="speaker-icon" data-text="${translated}" data-lang="zh-CN">🔊</span>
          `;
        } catch (error) {
          translatedDiv.textContent = '翻译失败';
          translatedDiv.style.color = '#f44336';
        }
      }
    }

    popup.querySelectorAll('.speaker-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        speakText(icon.dataset.text, icon.dataset.lang);
      });
    });

    popup.querySelector('.close-btn').addEventListener('click', () => {
      popup.remove();
    });

    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }

  // 添加键盘事件监听器
  document.addEventListener('keydown', async (event) => {
    if (event.key === '/' && (event.metaKey || event.ctrlKey)) { // Command + / 或 Ctrl + /
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY;
        
        createTranslationPopup(selectedText, x, y);
      }
    }
  });

  // 保留右键菜单功能的消息监听器
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'translateSelection') {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      try {
        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY;
        createTranslationPopup(request.text, x, y);
      } catch (error) {
        console.error('Translation failed:', error);
      }
    }
  });
})(); 