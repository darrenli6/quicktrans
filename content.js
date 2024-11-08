// 创建翻译弹出框样式
const style = document.createElement('style');
style.textContent = `
  .translation-popup {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 300px;
  }
  .translation-popup .original {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
  }
  .translation-popup .translated {
    margin-bottom: 8px;
  }
  .translation-popup .controls {
    display: flex;
    gap: 8px;
  }
  .translation-popup .speaker-icon {
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    background: #f0f0f0;
  }
  .translation-popup .speaker-icon:hover {
    background: #e0e0e0;
  }
  .translation-popup .close-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .translation-popup .close-btn:hover {
    background: #f0f0f0;
  }
`;
document.head.appendChild(style);

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
function createTranslationPopup(original, translated, targetLang, x, y) {
  // 移除现有的弹出框
  const existingPopup = document.querySelector('.translation-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('div');
  popup.className = 'translation-popup';
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;

  popup.innerHTML = `
    <div class="close-btn">×</div>
    <div class="original">
      ${original}
      <span class="speaker-icon" data-text="${original}" data-lang="auto">🔊</span>
    </div>
    <div class="translated">
      ${translated}
      <span class="speaker-icon" data-text="${translated}" data-lang="${targetLang}">🔊</span>
    </div>
  `;

  // 添加关闭按钮事件
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
  });

  // 添加语音朗读事件
  popup.querySelectorAll('.speaker-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      speakText(icon.dataset.text, icon.dataset.lang);
    });
  });

  document.body.appendChild(popup);

  // 点击页面其他地方关闭弹出框
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', closePopup);
    }
  });
}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'translateSelection') {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    try {
      const translated = await translateText(request.text, request.targetLang);
      const x = rect.left + window.scrollX;
      const y = rect.bottom + window.scrollY;

      createTranslationPopup(request.text, translated, request.targetLang, x, y);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  }
}); 