import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: '*'}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(limiter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/fuse/suggest', async (req, res) => {
  const { a, b, context = {} } = req.body || {};
  if (!a || !b) return res.status(400).json({ error: 'a and b required' });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = (context.model || 'deepseek-chat');

  if (!apiKey) {
    return res.json(localSuggest(a, b));
  }

  try {
    const resp = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: typeof context.temperature === 'number' ? context.temperature : 0.7,
        messages: [
          { role: 'system', content: '你是创意融合助手。请用 JSON 输出：{"title":"...","notes":["卖点：...","反共识：...","最小验证：...","话术：..."]}，不要额外文字。' },
          { role: 'user', content: `把「${a}」与「${b}」融合。${context.prompt || ''}` }
        ]
      })
    });

    if (!resp.ok) {
      return res.json(localSuggest(a, b));
    }
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const json = tryParseJson(raw);
    if (json?.title) {
      return res.json({ title: json.title, notes: Array.isArray(json.notes) ? json.notes.join('\n') : (json.notes || '') });
    }
    return res.json({ title: `${a} × ${b}`, notes: raw || localSuggest(a, b).notes });
  } catch (e) {
    return res.json(localSuggest(a, b));
  }
});

app.post('/api/score', (req, res) => {
  const { route } = req.body || {};
  // 简易本地评分：词频/长度/风险关键词
  const text = JSON.stringify(route || '');
  const novelty = Math.min(5, 1 + (text.length % 5));
  const brandFit = 3 + (text.includes('品牌') ? 1 : 0);
  const feasibility = 3 + (text.includes('验证') ? 1 : 0);
  const cost = 3;
  const risk = 2 + (text.includes('风险') ? 2 : 0);
  res.json({ radar: { novelty, brandFit, feasibility, cost, risk } });
});

function localSuggest(a, b) {
  return {
    title: `${a} × ${b}`,
    notes: [
      `核心卖点：用“${a}”的方法解决“${b}”里的老问题。`,
      `反共识尝试：把“${b}”的用户旅程搬进“${a}”的分发渠道。`,
      `最小验证：做一个一天可交付的Demo，验证${a}∩${b}的真实点击/转化率。`,
      `角色定位：谁是买单人？谁是使用者？谁会反对？提前准备三句反驳话术。`
    ].join('\n')
  };
}

function tryParseJson(s) {
  const match = String(s || '').match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  const body = match ? match[1] : s;
  try { return JSON.parse(body); } catch { return null; }
}

const port = process.env.PORT || 7070;
app.listen(port, () => console.log(`BFL API listening on :${port}`));


