import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, Maximize2, Minimize2, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { parseSuggestions, buildMediaCaptions } from '../utils/suggestions';

/**
 * AI 建议面板组件
 */
export function SuggestionPanel({ fusion, onClose, agent, onExecute }) {
  const [copiedId, setCopiedId] = useState(null);
  const [dense, setDense] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullTab, setFullTab] = useState('doc'); // doc | image | video
  const [selectTasks, setSelectTasks] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(new Set());
  const [selectedAssets, setSelectedAssets] = useState(new Set());
  const [selectedKpis, setSelectedKpis] = useState(new Set());
  
  if (!fusion) return null;

  const suggestions = parseSuggestions(fusion.notes);
  const structured = fusion.structured || null;

  // 将“建议列表”映射为全屏文档所需结构，保证没有对应类型时也能给出合理默认值
  const buildDocFromSuggestions = (items, title) => {
    const findBy = (pred) => items.find(pred)?.content;
    const oneSentence = findBy(s => /一句|主张|slogan|口号/i.test(s.type)) || title || '';
    const bigIdea = findBy(s => /big|主意|核心|反共识|idea/i.test(s.type)) || findBy(s=>/卖点/.test(s.type)) || '';
    const titleList = items.filter(s => /标题/i.test(s.type)).map(s => s.content);
    const hookList = items.filter(s => /开场|钩子/i.test(s.type)).map(s => s.content);
    const pipeline = findBy(s => /传播|渠道|链路|分发/i.test(s.type)) || '抖音/小红书/视频号/朋友圈/社群 联动种草与转化。';
    const assets = findBy(s => /素材|清单|资产/i.test(s.type)) || '品牌主视觉、短视频脚本、海报KV、落地页、用户证言、FAQ、活动页。';
    const mvp = findBy(s => /(MVP|最小验证|里程碑|实验|冲刺|计划)/i.test(s.type)) || '在小范围内推出样品，收集目标用户反馈，验证市场接受度。';
    const sellingPoint = findBy(s => /卖点|价值/i.test(s.type)) || `突出“${title}”给用户带来的直接好处（效率/省钱/省时/体验）。`;
    const contrarian = findBy(s => /反共识|差异|亮点/i.test(s.type)) || `用反常识角度切入，让“${title}”形成记忆点。`;
    const talkTrack = findBy(s => /话术|CTA|行动号召/i.test(s.type)) || '一句话行动号召：现在就试试/领取/加入，限时福利。';

    const makeTitleVars = (t) => [
      t,
      `${t}｜从0到1的实践`,
      `为什么是${t}`,
      `${t} 的3个关键`,
      `${t}：一图看懂`
    ];
    const makeHookVars = (t) => [
      `先抛问题：我们如何用“${t}”解决老难题？`,
      `反差开场：当${t}遇到现实世界，会发生什么？`,
      `数字开场：3个动作，让${t}直接落地`,
      `故事开场：一个用户因为${t}而改变`,
      `悬念开场：别急着否定${t}，先看这个实验`
    ];

    const titlesTop5 = titleList.length >= 5 ? titleList.slice(0,5) : makeTitleVars(title).slice(0, 5 - titleList.length).concat(titleList).slice(0,5);
    const hooksTop5 = hookList.length >= 5 ? hookList.slice(0,5) : makeHookVars(title).slice(0, 5 - hookList.length).concat(hookList).slice(0,5);

    const splitToList = (text) => (text || '')
      .split(/[、，,\/\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    return { 
      oneSentence, bigIdea, titlesTop5, hooksTop5, pipeline, assets, mvp,
      sellingPoint, contrarian, talkTrack,
      pipelineList: splitToList(pipeline),
      assetList: splitToList(assets)
    };
  };
  const doc = buildDocFromSuggestions(suggestions, fusion.title);

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const copyAll = async () => {
    const fullText = `${fusion.title}\n\n${fusion.notes}`;
    copyToClipboard(fullText, 'all');
  };

  // 构建 Markdown / JSON
  const getPipeline = () => (structured?.pipeline || doc.pipelineList || []);
  const getAssets = () => (structured?.assets || doc.assetList || []);
  const getKpis = () => (structured?.kpis || []);
  const buildMarkdown = () => {
    const lines = [];
    lines.push(`# ${fusion.title}`);
    const one = structured?.oneSentence || doc.oneSentence;
    const big = structured?.bigIdea || doc.bigIdea;
    if (one) lines.push(`\n## 一句话主张\n${one}`);
    if (big) lines.push(`\n## Big Idea\n${big}`);
    const titles = structured?.titlesTop5 || doc.titlesTop5 || [];
    const hooks = structured?.hooksTop5 || doc.hooksTop5 || [];
    if (titles.length) {
      lines.push(`\n## 标题 Top 5`);
      titles.forEach((t, i) => lines.push(`${i+1}. ${t}`));
    }
    if (hooks.length) {
      lines.push(`\n## 开场钩子 Top 5`);
      hooks.forEach((t, i) => lines.push(`${i+1}. ${t}`));
    }
    const pipe = getPipeline();
    const assets = getAssets();
    const sps = structured?.sellingPoints || [doc.sellingPoint];
    const cps = structured?.contrarianPoints || [doc.contrarian];
    const talks = structured?.talkTracks || [doc.talkTrack];
    if (pipe.length) lines.push(`\n## 传播链路\n- ${pipe.join('\n- ')}`);
    if (sps?.length || cps?.length || talks?.length) {
      lines.push(`\n## 核心卖点与差异`);
      sps?.forEach(s=>lines.push(`- 卖点：${s}`));
      cps?.forEach(s=>lines.push(`- 反共识：${s}`));
      talks?.forEach(s=>lines.push(`- 话术：${s}`));
    }
    if (assets.length) lines.push(`\n## 素材清单\n- ${assets.join('\n- ')}`);
    if (structured?.milestones?.length) {
      lines.push(`\n## 里程碑`);
      structured.milestones.forEach(m=>lines.push(`- ${m.name}：${m.desc}`));
    } else if (structured?.mvp || doc.mvp) {
      lines.push(`\n## MVP\n${structured?.mvp || doc.mvp}`);
    }
    if (getKpis().length) {
      lines.push(`\n## KPI`);
      getKpis().forEach(k=>lines.push(`- ${k.name}：${k.target}`));
    }
    return lines.join('\n');
  };
  const buildStructuredFallback = () => ({
    title: fusion.title,
    oneSentence: structured?.oneSentence || doc.oneSentence,
    bigIdea: structured?.bigIdea || doc.bigIdea,
    titlesTop5: structured?.titlesTop5 || doc.titlesTop5,
    hooksTop5: structured?.hooksTop5 || doc.hooksTop5,
    pipeline: getPipeline(),
    assets: getAssets(),
    sellingPoints: structured?.sellingPoints || [doc.sellingPoint],
    contrarianPoints: structured?.contrarianPoints || [doc.contrarian],
    talkTracks: structured?.talkTracks || [doc.talkTrack],
    mvp: structured?.mvp || doc.mvp,
    milestones: structured?.milestones || [],
    kpis: getKpis(),
    notes: fusion.notes.split('\n')
  });
  const copyMarkdown = () => copyToClipboard(buildMarkdown(), 'md');
  const copyJSON = () => copyToClipboard(JSON.stringify(structured || buildStructuredFallback(), null, 2), 'json');

  // 任务看板导出（基于勾选）
  const buildTaskBoardMarkdown = () => {
    const pipe = getPipeline();
    const assets = getAssets();
    const kpis = getKpis();
    const selPipe = selectedPipeline.size ? [...selectedPipeline].map(i=>pipe[i]) : pipe;
    const selAssets = selectedAssets.size ? [...selectedAssets].map(i=>assets[i]) : assets;
    const selKpis = selectedKpis.size ? [...selectedKpis].map(i=>kpis[i]) : kpis;
    const out = [
      `# ${fusion.title}｜任务看板`,
      `\n## 传播链路`,
      ...selPipe.map(p=>`- [ ] ${p}`),
      `\n## 素材清单`,
      ...selAssets.map(a=>`- [ ] ${a}`),
      selKpis.length ? `\n## KPI` : '',
      ...selKpis.map(k=>`- [ ] ${k.name}：${k.target}`)
    ].filter(Boolean);
    return out.join('\n');
  };
  const copyTaskBoard = () => copyToClipboard(buildTaskBoardMarkdown(), 'kanban');

  return (
    <motion.div
      className="suggestion-panel w-96 max-w-[90vw]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-bfl-accent" />
          <h3 className="text-lg font-semibold text-bfl-text">{fusion.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(true)}
            className="p-1 rounded hover:bg-bfl-surface-2"
            title="全屏展开"
          >
            <Maximize2 className="w-4 h-4 text-bfl-text-dim" />
          </button>
          <button
            onClick={onClose}
            className="text-bfl-text-dim hover:text-bfl-text text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className={`space-y-3 mb-4 ${dense ? 'max-h-[320px] overflow-auto custom-scrollbar' : ''}`}>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="group relative bg-white border border-bfl-border rounded-lg p-3 hover:shadow-sm transition-shadow"
          >
            {suggestion.type && (
              <div className="text-xs font-medium text-bfl-secondary mb-1">
                {suggestion.type}
              </div>
            )}
            <p className="text-sm text-bfl-text pr-8">{suggestion.content}</p>
            
            <button
              onClick={() => copyToClipboard(suggestion.content, suggestion.id)}
              className="absolute top-3 right-3 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bfl-surface-2"
              title="复制此条建议"
            >
              {copiedId === suggestion.id ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-bfl-text-dim" />
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyAll}
          className="btn btn-secondary flex items-center gap-2 text-sm"
        >
          {copiedId === 'all' ? (
            <>
              <Check className="w-4 h-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              复制全部
            </>
          )}
        </button>
        <button onClick={copyMarkdown} className="btn btn-secondary text-sm">复制 Markdown</button>
        <button onClick={copyJSON} className="btn btn-secondary text-sm">复制 JSON</button>
        <button
          onClick={() => setDense(v => !v)}
          className="btn btn-secondary text-sm"
        >
          {dense ? '更多内容' : '压缩高度'}
        </button>
        <button
          onClick={() => setFullscreen(true)}
          className="btn btn-secondary text-sm"
        >
          全屏
        </button>
        <button
          onClick={onClose}
          className="btn btn-primary text-sm"
        >
          继续创作
        </button>
        {onExecute && (
          <button
            onClick={() => onExecute(fusion, agent)}
            className="btn btn-primary text-sm"
          >
            交给Agent执行
          </button>
        )}
      </div>

      {/* 全屏文档/图片/视频：通过 Portal 避免受父级 transform 影响 */}
      {fullscreen && createPortal(
        (
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative w-[1000px] max-w-[96vw] h-[80vh] bg-white rounded-2xl border border-bfl-border shadow-xl flex flex-col"
                initial={{ scale: 0.98, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.98, y: 10, opacity: 0 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-bfl-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-bfl-accent" />
                    <div className="text-base font-semibold text-bfl-text">{fusion.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg overflow-hidden border border-bfl-border">
                      <button className={`px-3 py-1.5 text-sm ${fullTab==='doc'?'bg-bfl-surface-2':''}`} onClick={()=>setFullTab('doc')}><FileText className="w-4 h-4 inline mr-1" />文档</button>
                      <button className={`px-3 py-1.5 text-sm ${fullTab==='image'?'bg-bfl-surface-2':''}`} onClick={()=>setFullTab('image')}><ImageIcon className="w-4 h-4 inline mr-1" />图片</button>
                      <button className={`px-3 py-1.5 text-sm ${fullTab==='video'?'bg-bfl-surface-2':''}`} onClick={()=>setFullTab('video')}><Video className="w-4 h-4 inline mr-1" />视频</button>
                    </div>
                    <button className="p-1 rounded hover:bg-bfl-surface-2" title="退出全屏" onClick={()=>setFullscreen(false)}>
                      <Minimize2 className="w-4 h-4 text-bfl-text-dim" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  {fullTab === 'doc' && (
                    <div className="max-w-none">
                      <div className="bg-white rounded-xl border border-bfl-border overflow-hidden">
                        <div className="px-6 py-5 border-b border-bfl-border bg-bfl-surface-2">
                          <div className="text-xl font-semibold text-bfl-text">{fusion.title}</div>
                          <div className="text-sm text-bfl-text-dim mt-1">完整输出方案</div>
                        </div>
                        <div className="p-6 space-y-8">
                          <div className="flex items-center gap-3 mb-2">
                            <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={selectTasks} onChange={e=>setSelectTasks(e.target.checked)} /> 启用任务勾选导出</label>
                            {selectTasks && (
                              <button className="btn btn-secondary text-sm" onClick={copyTaskBoard}>复制任务看板</button>
                            )}
                          </div>
                          <section>
                            <div className="section-title">一句话主张</div>
                            <div className="text-base leading-7 text-bfl-text">{structured?.oneSentence || doc.oneSentence}</div>
                          </section>
                          <section>
                            <div className="section-title">Big Idea</div>
                            <div className="text-base leading-7 text-bfl-text">{structured?.bigIdea || doc.bigIdea}</div>
                          </section>
                          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div>
                              <div className="section-title">标题 Top 5</div>
                              <ol className="list-decimal list-inside space-y-1 text-bfl-text">
                                {(structured?.titlesTop5 || doc.titlesTop5).map((t, idx)=>(<li key={idx}>{t}</li>))}
                              </ol>
                            </div>
                            <div>
                              <div className="section-title">开场钩子 Top 5</div>
                              <ol className="list-decimal list-inside space-y-1 text-bfl-text">
                                {(structured?.hooksTop5 || doc.hooksTop5).map((t, idx)=>(<li key={idx}>{t}</li>))}
                              </ol>
                            </div>
                          </section>
                          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            <div className="md:col-span-2">
                              <div className="section-title">传播链路</div>
                              <div className="flex flex-wrap gap-2">
                                {(structured?.pipeline || doc.pipelineList).map((p, i)=>(
                                  <label key={i} className="tag-pill inline-flex items-center gap-2 cursor-pointer">
                                    {selectTasks && (
                                      <input type="checkbox" checked={selectedPipeline.has(i)} onChange={(e)=>{
                                        setSelectedPipeline(prev=>{ const n = new Set(prev); e.target.checked ? n.add(i) : n.delete(i); return n; });
                                      }} />
                                    )}
                                    <span>{p}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="section-title">核心卖点与差异</div>
                              <ul className="list-disc list-inside space-y-1 text-bfl-text">
                                {(structured?.sellingPoints || [doc.sellingPoint]).map((s, i)=>(<li key={`sp-${i}`}>{s}</li>))}
                                {(structured?.contrarianPoints || [doc.contrarian]).map((s, i)=>(<li key={`cp-${i}`}>{s}</li>))}
                                {(structured?.talkTracks || [doc.talkTrack]).map((s, i)=>(<li key={`tt-${i}`}>{s}</li>))}
                              </ul>
                            </div>
                          </section>
                          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div>
                              <div className="section-title">素材清单</div>
                              <div className="flex flex-wrap gap-2">
                                {(structured?.assets || doc.assetList).map((a, i)=>(
                                  <label key={i} className="tag-pill inline-flex items-center gap-2 cursor-pointer">
                                    {selectTasks && (
                                      <input type="checkbox" checked={selectedAssets.has(i)} onChange={(e)=>{
                                        setSelectedAssets(prev=>{ const n = new Set(prev); e.target.checked ? n.add(i) : n.delete(i); return n; });
                                      }} />
                                    )}
                                    <span>{a}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="section-title">MVP / 里程碑</div>
                              {structured?.milestones ? (
                                <ul className="list-disc list-inside space-y-1 text-bfl-text">
                                  {structured.milestones.map((m, i)=>(
                                    <li key={i}><span className="font-medium">{m.name}</span>：{m.desc}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-base leading-7 text-bfl-text">{structured?.mvp || doc.mvp}</div>
                              )}
                            </div>
                          </section>
                          {structured?.kpis && (
                            <section>
                              <div className="section-title">关键指标 KPI</div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {structured.kpis.map((k, i)=>(
                                  <label key={i} className="kpi-card cursor-pointer inline-flex items-center gap-2">
                                    {selectTasks && (
                                      <input type="checkbox" checked={selectedKpis.has(i)} onChange={(e)=>{
                                        setSelectedKpis(prev=>{ const n = new Set(prev); e.target.checked ? n.add(i) : n.delete(i); return n; });
                                      }} />
                                    )}
                                    <div>
                                      <div className="text-xs text-bfl-text-dim">{k.name}</div>
                                      <div className="text-lg font-semibold text-bfl-text mt-1">{k.target}</div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {fullTab === 'image' && (
                    <div className="grid grid-cols-2 gap-3">
                      {(() => {
                        const caps = buildMediaCaptions(structured || { title: fusion.title, oneSentence: doc.oneSentence, hooksTop5: doc.hooksTop5, assets: doc.assetList, sellingPoints: [doc.sellingPoint] });
                        const list = caps.imageCaptions;
                        return [
                          <div key={0} className="aspect-video rounded-xl border border-bfl-border bg-bfl-surface-2 flex items-center justify-center text-bfl-text-dim">{list[0] || '海报占位（导出中）'}</div>,
                          <div key={1} className="aspect-video rounded-xl border border-bfl-border bg-bfl-surface-2 flex items-center justify-center text-bfl-text-dim">{list[1] || '封面A/B占位'}</div>,
                          <div key={2} className="aspect-square rounded-xl border border-bfl-border bg-bfl-surface-2 flex items-center justify-center text-bfl-text-dim">{list[2] || '徽章示意'}</div>,
                          <div key={3} className="aspect-square rounded-xl border border-bfl-border bg-bfl-surface-2 flex items-center justify-center text-bfl-text-dim">{'排行榜组件'}</div>
                        ];
                      })()}
                    </div>
                  )}
                  {fullTab === 'video' && (
                    <div className="space-y-3">
                      {(() => {
                        const caps = buildMediaCaptions(structured || { title: fusion.title, oneSentence: doc.oneSentence, hooksTop5: doc.hooksTop5 });
                        const list = caps.videoCaptions;
                        return [
                          <div key={0} className="rounded-xl border border-bfl-border p-3 bg-white">
                            <div className="text-sm font-semibold mb-1">15-30秒脚本</div>
                            <div className="text-sm text-bfl-text">{list[0]}</div>
                          </div>,
                          <div key={1} className="rounded-xl border border-bfl-border p-3 bg-white">
                            <div className="text-sm font-semibold mb-1">30-60秒脚本</div>
                            <div className="text-sm text-bfl-text">{list[1]}</div>
                          </div>
                        ];
                      })()}
                    </div>
                  )}
                </div>
                <div className="border-t border-bfl-border p-3 flex items-center gap-2 justify-end">
                  <button className="btn btn-secondary text-sm" onClick={()=>setFullscreen(false)}>关闭</button>
                  {onExecute && (
                    <button className="btn btn-primary text-sm" onClick={()=>onExecute(fusion, agent)}>交给Agent执行</button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        ),
        document.body
      )}
    </motion.div>
  );
}
