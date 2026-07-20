"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, Upload, Download, X, Loader2,
  Image as ImageIcon, Wand2,
} from "lucide-react";

const AI_SERVICE = "http://localhost:8000/api/v1";

const EDIT_MODES = [
  { value: "remove_watermark", label: "去水印", hint: "框选水印区域精准去除" },
  { value: "description_edit", label: "指令编辑", hint: "一句话描述修改内容，AI 自动改图" },
  { value: "stylization_all", label: "风格迁移", hint: "保留画面内容，转换绘画风格" },
  { value: "expand", label: "扩图", hint: "向外扩展画面，AI 补全四周" },
  { value: "super_resolution", label: "超分", hint: "模糊图片变高清（2~4倍）" },
];

export default function CreatePage() {
  const [mode, setMode] = useState<"generate" | "edit">("generate");

  // ── 文生图 ──
  const [text, setText] = useState("");
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [genResult, setGenResult] = useState<string | null>(null);

  // ── 图片编辑 ──
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editFunction, setEditFunction] = useState("remove_watermark");
  const [editPrompt, setEditPrompt] = useState("");
  const [editResult, setEditResult] = useState<string | null>(null);
  const [expandTop, setExpandTop] = useState(1.3);
  const [expandBottom, setExpandBottom] = useState(1.3);
  const [expandLeft, setExpandLeft] = useState(1.3);
  const [expandRight, setExpandRight] = useState(1.3);
  const [superScale, setSuperScale] = useState(2);

  // ── 水印框选 ──
  const [wmRect, setWmRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [wmDrawing, setWmDrawing] = useState(false);
  const wmStart = useRef({ x: 0, y: 0 });
  const editImgRef = useRef<HTMLImageElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ========== 文生图 ==========

  function handleRefFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("请上传图片文件"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("图片不超过 5MB"); return; }
    setRefImage(file);
    setRefPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleEnhance() {
    if (!text.trim()) { setError("请先输入描述文字"); return; }
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("text", text);
      const res = await fetch(`${AI_SERVICE}/image/enhance`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.code === 200) {
        setPositivePrompt(json.data.positive_prompt);
        setNegativePrompt(json.data.negative_prompt);
      } else { setError(json.message || "扩写失败"); }
    } catch { setError("AI 服务连接失败"); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (!positivePrompt.trim()) { setError("请先生成或输入正向提示词"); return; }
    setLoading(true); setError(null); setGenResult(null);
    try {
      const fd = new FormData();
      fd.append("positive_prompt", positivePrompt);
      fd.append("negative_prompt", negativePrompt);
      if (refImage) fd.append("reference_image", refImage);
      const res = await fetch(`${AI_SERVICE}/image/generate`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.code === 200) { setGenResult(json.data.image_url); }
      else { setError(json.message || "生成失败"); }
    } catch { setError("图片生成失败"); }
    finally { setLoading(false); }
  }

  // ========== 图片编辑 ==========

  function handleEditFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("请上传图片文件"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("图片不超过 5MB"); return; }
    setEditImage(file);
    setEditPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function makeMask(): Promise<File | null> {
    if (!wmRect || !editImgRef.current) return null;
    const img = editImgRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(wmRect.x * canvas.width, wmRect.y * canvas.height, wmRect.w * canvas.width, wmRect.h * canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/png"));
    return blob ? new File([blob], "mask.png", { type: "image/png" }) : null;
  }

  async function handleEdit() {
    if (!editImage) { setError("请先上传要编辑的图片"); return; }
    const needsPrompt = ["description_edit", "stylization_all"].includes(editFunction);
    if (needsPrompt && !editPrompt.trim()) { setError("此功能需要输入描述文字"); return; }
    setLoading(true); setError(null); setEditResult(null);
    try {
      const fd = new FormData();
      fd.append("function", editFunction);
      fd.append("base_image", editImage);
      fd.append("prompt", editPrompt || "remove watermark");
      fd.append("expand_top", String(expandTop));
      fd.append("expand_bottom", String(expandBottom));
      fd.append("expand_left", String(expandLeft));
      fd.append("expand_right", String(expandRight));
      fd.append("scale", String(superScale));
      if (wmRect) { const mask = await makeMask(); if (mask) fd.append("mask_image", mask); }
      const res = await fetch(`${AI_SERVICE}/image/edit`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.code === 200) { setEditResult(json.data.image_url); }
      else { setError(json.message || "编辑失败"); }
    } catch { setError("编辑请求失败"); }
    finally { setLoading(false); }
  }

  // ── 水印框选（全局事件不卡边缘）──
  function wmMouseDown(e: React.MouseEvent<HTMLImageElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    wmStart.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    setWmDrawing(true);
  }
  useEffect(() => {
    if (!wmDrawing || !editImgRef.current) return;
    const img = editImgRef.current;
    function move(e: MouseEvent) {
      const rect = img.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const sx = wmStart.current.x, sy = wmStart.current.y;
      setWmRect({ x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy) });
    }
    function up() { setWmDrawing(false); }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  }, [wmDrawing]);

  // ========== 下载 ==========

  async function downloadImage(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lingji-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { window.open(url, "_blank"); }
  }

  // ========== 渲染 ==========

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-[#8b8680] hover:text-[#e8e4dd] transition-colors mb-8">
        <ArrowLeft size={18} /><span className="text-sm">返回</span>
      </Link>

      <h1 className="text-3xl font-bold text-[#e8e4dd] mb-2">灵机 · 创作</h1>
      <p className="text-sm text-[#8b8680] mb-8">AI 生图 + 图片编辑，一站式图像创作</p>

      {/* Tab */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        <button onClick={() => { setMode("generate"); setError(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "generate" ? "bg-[#c9a96e] text-[#0f0f14]" : "text-[#8b8680] hover:text-[#e8e4dd]"}`}>
          <Sparkles size={15} />文生图
        </button>
        <button onClick={() => { setMode("edit"); setError(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "edit" ? "bg-[#c9a96e] text-[#0f0f14]" : "text-[#8b8680] hover:text-[#e8e4dd]"}`}>
          <Wand2 size={15} />图片编辑
        </button>
      </div>

      {/* ══════════ 文生图 ══════════ */}
      {mode === "generate" && (
        <>
          <div className="mb-6">
            <label className="block text-sm text-[#8b8680] mb-2">描述你想要生成的画面</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="例如：一只水墨画的仙鹤站在老松树上，云雾缭绕，晨曦微光" rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#e8e4dd] placeholder:text-[#8b8680]/50 focus:outline-none focus:border-[#c9a96e]/40 transition-colors resize-none" />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-[#8b8680] mb-2">参考图（可选）</label>
            {refPreview ? (
              <div className="relative inline-block">
                <img src={refPreview} alt="参考图" className="w-32 h-32 object-cover rounded-xl border border-white/10" />
                <button onClick={() => { setRefImage(null); setRefPreview(null); if (refInputRef.current) refInputRef.current.value = ""; }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#c44b3c] text-white flex items-center justify-center hover:bg-[#d45b4c]"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => refInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-[#8b8680] hover:border-[#c9a96e]/30 hover:text-[#c9a96e] transition-colors">
                <Upload size={16} /><span className="text-sm">上传参考图</span>
              </button>
            )}
            <input ref={refInputRef} type="file" accept="image/*" onChange={handleRefFile} className="hidden" />
          </div>
          <button onClick={handleEnhance} disabled={loading || !text.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e4dd] hover:border-[#c9a96e]/30 hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-8">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>{loading ? "分析中..." : "LLM 扩写提示词"}</span>
          </button>
          <div className="mb-4">
            <label className="block text-sm text-[#8b8680] mb-2">正向提示词</label>
            <textarea value={positivePrompt} onChange={(e) => setPositivePrompt(e.target.value)}
              placeholder="LLM 扩写后出现在这里..." rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#e8e4dd] placeholder:text-[#8b8680]/50 focus:outline-none focus:border-[#c9a96e]/40 transition-colors resize-none" />
          </div>
          <div className="mb-8">
            <label className="block text-sm text-[#8b8680] mb-2">负向提示词</label>
            <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="不希望出现的元素..." rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#e8e4dd] placeholder:text-[#8b8680]/50 focus:outline-none focus:border-[#c9a96e]/40 transition-colors resize-none" />
          </div>
          {error && <div className="mb-6 px-4 py-3 rounded-xl bg-[#c44b3c]/10 border border-[#c44b3c]/20 text-[#d45b4c] text-sm">{error}</div>}
          <button onClick={handleGenerate} disabled={loading || !positivePrompt.trim()}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#c9a96e] text-[#0f0f14] font-semibold hover:bg-[#d4b878] disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-10 shadow-lg shadow-[#c9a96e]/10">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
            <span>{loading ? "正在生成..." : "生成图片"}</span>
          </button>
          {genResult && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <img src={genResult} alt="生成结果" className="w-full h-auto" />
              <div className="flex justify-end gap-3 px-4 py-3 border-t border-white/5">
                <button onClick={() => downloadImage(genResult)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#e8e4dd] text-sm hover:bg-white/10 transition-colors">
                  <Download size={16} /><span>下载</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════ 图片编辑 ══════════ */}
      {mode === "edit" && (
        <>
          <div className="mb-6">
            <label className="block text-sm text-[#8b8680] mb-2">上传要编辑的图片</label>
            {editPreview ? (
              <div>
                <div className="relative inline-block select-none">
                  <img ref={editImgRef} src={editPreview} alt="待编辑" draggable={false}
                    className="max-w-full max-h-64 rounded-xl border border-white/10 cursor-crosshair select-none"
                    onMouseDown={editFunction === "remove_watermark" ? wmMouseDown : undefined} />
                  {editFunction === "remove_watermark" && wmRect && (
                    <div className="absolute border-2 border-[#c9a96e] bg-[#c9a96e]/10 pointer-events-none"
                      style={{ left: `${wmRect.x * 100}%`, top: `${wmRect.y * 100}%`, width: `${wmRect.w * 100}%`, height: `${wmRect.h * 100}%` }} />
                  )}
                  <button onClick={() => { setEditImage(null); setEditPreview(null); setEditResult(null); setWmRect(null); if (editInputRef.current) editInputRef.current.value = ""; }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#c44b3c] text-white flex items-center justify-center hover:bg-[#d45b4c]"><X size={14} /></button>
                </div>
                {editFunction === "remove_watermark" && (
                  <p className="text-xs text-[#8b8680] mt-2">{wmRect ? "已框选水印区域 ✓" : "💡 拖拽框选水印位置"}</p>
                )}
              </div>
            ) : (
              <button onClick={() => editInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-[#8b8680] hover:border-[#c9a96e]/30 hover:text-[#c9a96e] transition-colors">
                <Upload size={16} /><span className="text-sm">选择图片</span>
              </button>
            )}
            <input ref={editInputRef} type="file" accept="image/*" onChange={handleEditFile} className="hidden" />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-[#8b8680] mb-3">选择编辑功能</label>
            <div className="grid grid-cols-2 gap-2">
              {EDIT_MODES.map((em) => (
                <button key={em.value} onClick={() => { setEditFunction(em.value); setEditPrompt(""); }}
                  className={`text-left p-3 rounded-xl border transition-all ${editFunction === em.value ? "border-[#c9a96e]/40 bg-[#c9a96e]/5 text-[#e8e4dd]" : "border-white/10 bg-white/[0.02] text-[#8b8680] hover:border-white/20"}`}>
                  <div className="text-sm font-medium">{em.label}</div>
                  <div className="text-xs mt-0.5 opacity-60">{em.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {editFunction === "description_edit" && (
            <div className="mb-6">
              <label className="block text-sm text-[#8b8680] mb-2">描述修改内容</label>
              <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="例如：把背景换成傍晚的星空" rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#e8e4dd] placeholder:text-[#8b8680]/50 focus:outline-none focus:border-[#c9a96e]/40 transition-colors resize-none" />
            </div>
          )}

          {editFunction === "stylization_all" && (
            <div className="mb-6">
              <label className="block text-sm text-[#8b8680] mb-2">目标风格描述</label>
              <input value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="例如：水墨画风格 / 油画质感" type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#e8e4dd] placeholder:text-[#8b8680]/50 focus:outline-none focus:border-[#c9a96e]/40 transition-colors" />
            </div>
          )}

          {editFunction === "expand" && (
            <div className="mb-6">
              <label className="block text-sm text-[#8b8680] mb-2">扩展比例（1.0=不变，2.0=加倍）</label>
              <div className="grid grid-cols-2 gap-3">
                {[["上", expandTop, setExpandTop], ["下", expandBottom, setExpandBottom], ["左", expandLeft, setExpandLeft], ["右", expandRight, setExpandRight]].map(([label, val, setter]) => (
                  <div key={label as string} className="flex items-center gap-2">
                    <span className="text-xs text-[#8b8680] w-4">{label}</span>
                    <input type="range" min="1.0" max="2.0" step="0.1" value={val as number}
                      onChange={(e) => (setter as Function)(parseFloat(e.target.value))}
                      className="flex-1 accent-[#c9a96e]" />
                    <span className="text-xs text-[#8b8680] w-7">{String(val)}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editFunction === "super_resolution" && (
            <div className="mb-6">
              <label className="block text-sm text-[#8b8680] mb-2">放大倍数：{superScale}x</label>
              <input type="range" min="1" max="4" step="1" value={superScale}
                onChange={(e) => setSuperScale(parseInt(e.target.value))} className="w-full accent-[#c9a96e]" />
              <div className="flex justify-between text-xs text-[#8b8680] mt-1"><span>1x</span><span>2x</span><span>3x</span><span>4x</span></div>
            </div>
          )}

          {error && <div className="mb-6 px-4 py-3 rounded-xl bg-[#c44b3c]/10 border border-[#c44b3c]/20 text-[#d45b4c] text-sm">{error}</div>}

          <button onClick={handleEdit} disabled={loading || !editImage}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#c9a96e] text-[#0f0f14] font-semibold hover:bg-[#d4b878] disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-10 shadow-lg shadow-[#c9a96e]/10">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
            <span>{loading ? "正在编辑..." : "开始编辑"}</span>
          </button>

          {editResult && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="grid grid-cols-2 gap-px bg-white/10">
                <div>
                  <div className="text-xs text-[#8b8680] px-3 py-2 bg-white/[0.02]">原图</div>
                  <img src={editPreview!} alt="原图" className="w-full h-auto" />
                </div>
                <div>
                  <div className="text-xs text-[#8b8680] px-3 py-2 bg-white/[0.02]">编辑后</div>
                  <img src={editResult} alt="编辑结果" className="w-full h-auto" />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-4 py-3 border-t border-white/5">
                <button onClick={() => downloadImage(editResult)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#e8e4dd] text-sm hover:bg-white/10 transition-colors">
                  <Download size={16} /><span>下载</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
