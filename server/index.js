// Minimal DeepSeek proxy with retry + in-memory cache
// Usage: DEEPSEEK_API_KEY in env; optional DEEPSEEK_BASE (default https://api.deepseek.com)

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 7070;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE || 'https://api.deepseek.com';
const ALI_API_KEY = process.env.ALI_API_KEY || '';
const ALI_COMPAT_BASE = process.env.ALI_COMPAT_BASE || 'https://dashscope.aliyuncs.com/compatible-mode';

if (!DEEPSEEK_API_KEY) {
  console.warn('[warn] DEEPSEEK_API_KEY is not set. The proxy will reject upstream calls.');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// simple LRU with TTL
const MAX_CACHE = 200;
const TTL_MS = 10 * 60 * 1000; // 10 min
const cache = new Map(); // key -> { value, expireAt }

function getCache(key) {
  const node = cache.get(key);
  if (!node) return null;
  if (Date.now() > node.expireAt) { cache.delete(key); return null; }
  // LRU touch
  cache.delete(key); cache.set(key, node);
  return node.value;
}

function setCache(key, value) {
  if (cache.size >= MAX_CACHE) {
    // delete oldest
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expireAt: Date.now() + TTL_MS });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, init, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`Upstream ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}

function buildMessages(a, b, prompt = '', options = {}) {
  const detail = options.detail === true;
  const agent = options.agent || 'fusion';
  const language = options.language || 'zh';
  
  const system = (() => {
    if (language === 'en') {
      const baseLite = 'You are a creative fusion assistant. Analyze two concepts and generate innovative fusion ideas. Output strict JSON only: {"title": "融合后的创意标题", "notes": ["Selling point: ...", "Contrarian view: ...", "MVP validation: ...", "Talk track: ..."]}. No additional text.';
      const detailed = 'You are a marketing strategy expert. Create comprehensive marketing plans by fusing concepts. Output strict JSON only with fields: {"title":"...","oneSentence":"...","bigIdea":"...","titlesTop5":["..."],"hooksTop5":["..."],"pipeline":["Platform1","Platform2",...],"assets":["Asset1","Asset2",...],"sellingPoints":["..."],"contrarianPoints":["..."],"talkTracks":["..."],"mvp":"...","milestones":[{"name":"...","desc":"..."}],"kpis":[{"name":"...","target":"..."}],"notes":["Selling point: ...","Contrarian: ...","MVP: ...","Talk track: ..."]}.';
      
      if (agent === 'pitch') {
        return 'You are a Pitch-Agent. Transform fused concepts into compelling one-page pitch materials. Output strict JSON: {"title":"...","oneSentence":"...","bigIdea":"...","titlesTop5":["..."],"hooksTop5":["..."],"sellingPoints":["..."],"contrarianPoints":["..."],"talkTracks":["..."],"mvp":"...","notes":["..."]}.';
      }
      
      return detail ? detailed : baseLite;
    } else {
      // 中文提示词 - 更详细和智能
      const baseLite = '你是创意融合专家。请深入分析两个概念，理解它们的本质特征、目标用户和应用场景，然后创造性地将它们融合成一个新的、有价值的创意方案。输出严格的 JSON 格式：{"title": "融合后的创意标题（要具体、有吸引力）", "notes": ["卖点：结合两个概念的核心优势，说明融合后的独特价值", "反共识：提出与传统认知不同的创新点", "最小验证：说明如何快速验证这个融合创意的可行性", "话术：如何向目标用户描述这个融合方案"]}。请确保标题具体、有创意，不要使用占位符。';
      
      const detailed = '你是资深的营销策略专家，擅长将不同领域的概念融合成可执行的营销方案。请深度分析两个概念的：
1. 核心价值主张
2. 目标用户群体
3. 应用场景
4. 差异化优势
然后创造性地融合成完整的营销方案。

输出严格的 JSON 格式（不要任何额外文字）：
{
  "title": "融合后的方案标题",
  "oneSentence": "一句话概括方案核心价值",
  "bigIdea": "核心创意理念",
  "titlesTop5": ["5个备选标题"],
  "hooksTop5": ["5个吸引人的开场话术"],
  "pipeline": ["传播渠道，如：抖音、小红书、视频号、社群等"],
  "assets": ["需要的营销素材，如：品牌主视觉、短视频脚本、海报等"],
  "sellingPoints": ["核心卖点列表"],
  "contrarianPoints": ["反共识的创新点"],
  "talkTracks": ["话术脚本"],
  "mvp": "最小可行产品描述",
  "milestones": [{"name": "里程碑名称", "desc": "描述"}],
  "kpis": [{"name": "指标名称", "target": "目标值"}],
  "notes": ["卖点", "反共识", "最小验证", "话术"]
}

请确保内容具体、可执行，避免使用占位符或模板化文字。';
      
      if (agent === 'pitch') {
        return '你是 Pitch-Agent，专门将融合概念转化为一页式提案材料。请分析两个概念的核心价值和互补性，创造性地融合成有说服力的方案。输出严格 JSON：{"title":"具体方案标题","oneSentence":"一句话价值主张","bigIdea":"核心创意","titlesTop5":["备选标题"],"hooksTop5":["开场话术"],"sellingPoints":["核心卖点"],"contrarianPoints":["反共识点"],"talkTracks":["话术"],"mvp":"最小可行方案","notes":["卖点","反共识","验证","话术"]}。内容要具体、有创意，避免占位符。';
      }
      
      return detail ? detailed : baseLite;
    }
  })();
  
  // 构建用户提示词 - 更详细和具体
  const userContent = (() => {
    if (language === 'en') {
      return `Fuse "${a}" with "${b}". 

Context:
- Concept A: ${a}
- Concept B: ${b}

${prompt ? `Additional requirements: ${prompt}` : ''}

Please create an innovative fusion that combines the strengths of both concepts. The result should be:
- Practical and actionable
- Unique and differentiated
- Target user-focused
- Value-driven

Generate a creative title and comprehensive suggestions.`;
    } else {
      return `请将「${a}」与「${b}」这两个概念进行深度融合。

概念分析：
- ${a}：请思考这个概念的核心特征、应用场景和目标用户
- ${b}：请思考这个概念的核心特征、应用场景和目标用户

${prompt ? `额外要求：${prompt}` : ''}

融合要求：
1. 深入理解两个概念的本质，找出它们的互补性和协同点
2. 创造性地融合成一个新的、有价值的方案
3. 方案要具体、可执行，而不是抽象的模板
4. 针对目标用户提供有价值的解决方案

请生成一个有创意、具体的标题和详细的建议方案。`;
    }
  })();
  
  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent }
  ];
}

app.post('/api/fuse/suggest', async (req, res) => {
  try {
    const { a, b, context = {} } = req.body || {};
    if (!a || !b) return res.status(400).json({ error: 'Missing a/b' });

    const cacheKey = JSON.stringify({ a, b, context });
    const hit = getCache(cacheKey);
    if (hit) return res.json({ ...hit, provider: 'proxy-cache' });

    // provider 解析：优先 context.provider，其次 model 前缀 ali:xxx
    let provider = (context.provider || '').toLowerCase();
    let model = context.model || 'deepseek-chat';
    if (!provider && typeof model === 'string' && model.startsWith('ali:')) {
      provider = 'ali';
      model = model.slice(4);
    }
    if (!provider) provider = 'deepseek';

    const messages = buildMessages(a, b, context.prompt, context);
    const body = {
      model,
      messages,
      temperature: typeof context.temperature === 'number' ? context.temperature : 0.7,
      max_tokens: typeof context.maxTokens === 'number' ? context.maxTokens : (context.detail ? 1600 : 600),
      stream: false
    };

    let upstream;
    if (provider === 'ali') {
      if (!ALI_API_KEY) return res.status(500).json({ error: 'Server missing ALI_API_KEY' });
      upstream = await fetchWithRetry(`${ALI_COMPAT_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ALI_API_KEY}` },
        body: JSON.stringify(body)
      }, 2);
    } else {
      if (!DEEPSEEK_API_KEY) return res.status(500).json({ error: 'Server missing DEEPSEEK_API_KEY' });
      upstream = await fetchWithRetry(`${DEEPSEEK_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify(body)
      }, 2);
    }

    const data = await upstream.json();
    const raw = data.choices?.[0]?.message?.content || '';
    let title = `${a} × ${b}`;
    let notes = '';
    let structured = null;
    // try parse JSON from content
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        const json = JSON.parse(raw.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1').replace(/[“”]/g, '"'));
        structured = json;
        title = json.title || title;
        if (Array.isArray(json.notes)) notes = json.notes.join('\n');
      } catch {}
    }
    if (!notes) notes = raw || `${a} × ${b}`;

    const result = { title, notes, structured };
    setCache(cacheKey, result);
    // Attach language for client awareness (pass-through)
    res.json({ ...result, provider: provider === 'ali' ? 'ali-proxy' : 'deepseek-proxy', language: context.language || 'zh' });
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[server] DeepSeek proxy running on http://localhost:${PORT}`);
});


