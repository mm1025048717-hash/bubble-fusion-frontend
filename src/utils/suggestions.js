// AI 建议生成相关函数

/**
 * 本地规则生成建议
 * @param {string} textA 
 * @param {string} textB 
 * @returns {object} {title, notes}
 */
export function generateLocalSuggestions(textA, textB) {
  const title = `${textA} × ${textB}`;
  
  const notes = [
    `核心卖点：用"${textA}"的方法解决"${textB}"里的老问题。`,
    `反共识尝试：把"${textB}"的用户旅程搬进"${textA}"的分发渠道。`,
    `最小验证：做一个一天可交付的Demo，验证${textA}∩${textB}的真实点击/转化率。`,
    `角色定位：谁是买单人？谁是使用者？谁会反对？提前准备三句反驳话术。`
  ].join('\n');
  
  return { title, notes };
}

/**
 * 调用后端 API 获取建议
 * @param {string} textA 
 * @param {string} textB 
 * @param {string} apiUrl 
 * @returns {Promise<object>} {title, notes}
 */
export async function fetchSuggestions(textA, textB, apiUrl, prompt, options = {}) {
  try {
    const response = await fetch(`${apiUrl}/api/fuse/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        a: textA,
        b: textB,
        context: { source: 'mvp', prompt, ...options }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // 保留后端返回的 provider（ali-proxy/deepseek-proxy/proxy-cache），便于排障
    return { ...data, provider: data?.provider || 'api' };
  } catch (error) {
    console.warn('API 调用失败，使用本地规则:', error);
    return { ...generateLocalSuggestions(textA, textB), provider: 'local' };
  }
}

/**
 * 获取融合建议（优先使用 API）
 * @param {string} textA 
 * @param {string} textB 
 * @returns {Promise<object>} {title, notes}
 */
function stripCodeFences(content) {
  if (typeof content !== 'string') return '';
  const fence = content.match(/```[a-zA-Z]*[\s\S]*?```/);
  if (fence) {
    return fence[0].replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  return content.trim();
}

function safeParseJsonLike(text) {
  if (typeof text !== 'string') return null;
  // 裁剪到第一个"{"和最后一个"}"，去掉可能的前后解释性文字
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  let body = text.slice(start, end + 1);
  // 去除尾逗号：对象或数组收尾的多余逗号
  body = body.replace(/,(\s*[}\]])/g, '$1');
  // 替换全角引号为半角
  body = body.replace(/[“”]/g, '"');
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export async function getSuggestions(textA, textB, prompt, options = {}) {
  const apiUrl = window.__BFL_API__;
  const deepseekKey = window.__DEEPSEEK_KEY__;
  const deepseekBase = window.__DEEPSEEK_BASE__ || 'https://api.deepseek.com';
  // 显式使用本地规则（用户选择了本地模型）
  if ((options.model || '').toLowerCase() === 'local') {
    return Promise.resolve({ ...generateLocalSuggestions(textA, textB), provider: 'local' });
  }
  
  if (apiUrl) {
    // API 模式下也设置请求超时（10-15s），由后端兜底
    return fetchSuggestions(textA, textB, apiUrl, prompt, options);
  }
  // 直接调用 DeepSeek（兼容 OpenAI SDK 的 fetch 接口）
  if (deepseekKey) {
    try {
      // 带超时的请求，避免网络挂起导致 UI 一直转圈
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), Math.max(8000, options.timeoutMs || 15000));
      const resp = await fetch(`${deepseekBase}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          // DeepSeek V3 对应 deepseek-chat
          model: options.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: (() => {
              const baseLite = '你是创意融合助手。请统一输出 JSON：{"title": "...", "notes": ["卖点：...","反共识：...","最小验证：...","话术：..."]}，不要额外文字。';
              const basePitch = '你是Pitch-Agent，请把输入主题融合为可对外展示的一页式产物。统一输出 JSON：{"title": "...", "notes": ["卖点：...","反共识：...","最小验证：...","话术：..."]}，不要额外文字。';
              const detailed = '你是营销方案专家，请输出严格 JSON（不要任何多余文本）。字段如下：{"title":"...","oneSentence":"...","bigIdea":"...","titlesTop5":["..."],"hooksTop5":["..."],"pipeline":["抖音","小红书","视频号","社群",...],"assets":["品牌主视觉","短视频脚本",...],"sellingPoints":["..."],"contrarianPoints":["..."],"talkTracks":["..."],"mvp":"...","milestones":[{"name":"...","desc":"..."}],"kpis":[{"name":"...","target":"..."}],"notes":["卖点：...","反共识：...","最小验证：...","话术：..."]}';
              if (options.detail) return detailed;
              return options.agent === 'pitch' ? basePitch : baseLite;
            })() },
            { role: 'user', content: `把「${textA}」与「${textB}」融合。${prompt || ''}` }
          ],
          temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
          max_tokens: typeof options.maxTokens === 'number' ? options.maxTokens : (options.detail ? 1600 : 600),
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(to);
      if (resp.ok) {
        const data = await resp.json();
        const raw = data.choices?.[0]?.message?.content || '';
        // 解析JSON或代码块
        let content = stripCodeFences(raw);
        let parsed = null;
        try { parsed = JSON.parse(content); } catch { parsed = safeParseJsonLike(content); }
        if (parsed?.title || parsed?.oneSentence || parsed?.notes || parsed?.sellingPoints) {
          // 构建 notes（若缺失则从结构字段拼接）
          let noteLines = Array.isArray(parsed.notes) ? parsed.notes.slice() : [];
          const pushLines = (arr, prefix) => Array.isArray(arr) && arr.forEach(v => noteLines.push(`${prefix}${v}`));
          if (noteLines.length === 0) {
            pushLines(parsed.sellingPoints, '卖点：');
            pushLines(parsed.contrarianPoints, '反共识：');
            pushLines(parsed.talkTracks, '话术：');
            if (parsed.mvp) noteLines.push(`MVP：${parsed.mvp}`);
          }
          const notesStr = noteLines.join('\n');
          return { title: parsed.title || `${textA} × ${textB}`, notes: notesStr || `${textA} × ${textB}`, provider: 'deepseek', structured: parsed };
        }
        if (content) {
          return { title: `${textA} × ${textB}`, notes: content, provider: 'deepseek' };
        }
      }
    } catch (e) {
      console.warn('DeepSeek 调用失败，使用本地规则', e?.name === 'AbortError' ? '（超时或网络中断）' : e);
    }
  }
  
  return Promise.resolve({ ...generateLocalSuggestions(textA, textB), provider: 'local' });
}

/**
 * 解析建议文本为结构化数据
 * @param {string} notes 
 * @returns {array} 建议数组
 */
export function parseSuggestions(notes) {
  const lines = notes.split('\n').filter(line => line.trim());
  return lines.map((line, index) => {
    const match = line.match(/^(.+?)：(.+)$/);
    if (match) {
      return {
        id: `suggestion-${index}`,
        type: match[1],
        content: match[2]
      };
    }
    return {
      id: `suggestion-${index}`,
      type: '',
      content: line
    };
  });
}

/**
 * 根据图片/视频页签自动生成占位文案
 * @param {object} structured 深度结构
 * @returns {object} {imageCaptions: string[], videoCaptions: string[]}
 */
export function buildMediaCaptions(structured = {}) {
  const title = structured.title || '';
  const oneSentence = structured.oneSentence || '';
  const selling = (structured.sellingPoints || []).slice(0, 2).join('、');
  const hooks = (structured.hooksTop5 || []).slice(0, 2);
  const images = [
    `KV主视觉：${title}｜${oneSentence}`,
    `卖点组合：${selling || title}`,
    `应用场景拼图：${(structured.assets || []).slice(0,3).join(' / ')}`
  ];
  const videos = [
    hooks[0] ? `15秒视频：${hooks[0]}` : `15秒视频：${title}`,
    hooks[1] ? `30秒视频：${hooks[1]}` : `30秒视频：从问题到解决`,
  ];
  return { imageCaptions: images, videoCaptions: videos };
}

/**
 * 生成导出数据
 * @param {array} bubbles 
 * @param {array} fusionEvents 
 * @returns {object} 导出数据
 */
export function generateExportData(bubbles, fusionEvents) {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    bubbles: bubbles.map(bubble => ({
      id: bubble.id,
      text: bubble.text,
      x: bubble.x,
      y: bubble.y,
      radius: bubble.radius,
      color: bubble.color,
      createdAt: bubble.createdAt,
      parentIds: bubble.parentIds || []
    })),
    fusionEvents: fusionEvents.map(event => ({
      id: event.id,
      bubbleAId: event.bubbleAId,
      bubbleBId: event.bubbleBId,
      resultBubbleId: event.resultBubbleId,
      timestamp: event.timestamp,
      title: event.title,
      notes: event.notes
    })),
    meta: {
      totalBubbles: bubbles.length,
      totalFusions: fusionEvents.length,
      exportedAt: new Date().toISOString()
    }
  };
}
