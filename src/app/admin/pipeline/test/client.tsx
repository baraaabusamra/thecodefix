"use client";

import { useState, useEffect } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { pipelineUniversities, pipelinePrograms } from "@/db/schema";
import { fetchUniversities, fetchPrograms, discoverSources, runCollectionBatch, runExtractionBatch } from "./actions";
import { RankedSource } from "@/lib/curriculum/discovery/ranking";
import type { ExtractionBatchResult } from "@/lib/curriculum/extraction/batch";

type University = InferSelectModel<typeof pipelineUniversities>;
type Program = InferSelectModel<typeof pipelinePrograms>;

function PipelineRunner() {
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionMsg, setCollectionMsg] = useState<string>("");
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionResults, setExtractionResults] = useState<ExtractionBatchResult[]>([]);

  const handleRunCollection = async () => {
    setCollectionLoading(true);
    setCollectionMsg("");
    try {
      const { processed } = await runCollectionBatch();
      setCollectionMsg(
        processed === 0
          ? "ما في مهام تجميع جاهزة بالطابور حاليًا."
          : `تمّت معالجة ${processed} مهمة تجميع (بحث + تنزيل مستند).`
      );
    } catch (err: unknown) {
      setCollectionMsg("خطأ: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCollectionLoading(false);
    }
  };

  const handleRunExtraction = async () => {
    setExtractionLoading(true);
    setExtractionResults([]);
    try {
      const { results } = await runExtractionBatch();
      setExtractionResults(results);
    } finally {
      setExtractionLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-1 text-lg font-bold">تشغيل خط الأنابيب يدويًا</h2>
      <p className="mb-4 text-sm text-muted">
        ما في تشغيل تلقائي (cron) لهذا النظام حاليًا — هاي أزرار تشغّل مرحلة واحدة كل ضغطة، بعدد محدود
        من المهام لتفادي انتهاء وقت تنفيذ السيرفر.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRunCollection}
          disabled={collectionLoading}
          className="rounded-lg border border-border px-4 py-2 font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {collectionLoading ? "جاري التجميع..." : "معالجة مهام التجميع (حتى 5)"}
        </button>
        <button
          onClick={handleRunExtraction}
          disabled={extractionLoading}
          className="rounded-lg border border-border px-4 py-2 font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {extractionLoading ? "جاري الاستخراج..." : "تشغيل الاستخراج على المستندات الجاهزة (حتى 3)"}
        </button>
      </div>

      {collectionMsg && <p className="mt-3 text-sm">{collectionMsg}</p>}

      {extractionResults.length > 0 && (
        <ul className="mt-4 space-y-2">
          {extractionResults.map((r) => (
            <li
              key={r.documentId}
              className={`rounded-md p-2 text-sm ${r.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
            >
              {r.success ? "✔" : "✘"} {r.url} {r.error ? `— ${r.error}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TestClient() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [selectedUniv, setSelectedUniv] = useState("");
  const [selectedProg, setSelectedProg] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RankedSource[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUniversities().then(setUniversities);
  }, []);

  useEffect(() => {
    if (selectedUniv) {
      fetchPrograms(selectedUniv).then(setPrograms);
    }
  }, [selectedUniv]);

  const handleDiscover = async () => {
    if (!selectedUniv) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await discoverSources(selectedUniv, selectedProg || null);
      setResults(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PipelineRunner />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold">الجامعة</label>
          <select 
            className="w-full rounded-lg border border-border bg-surface px-3 py-2"
            value={selectedUniv}
            onChange={e => {
              setSelectedUniv(e.target.value);
              setPrograms([]);
            }}
          >
            <option value="">-- اختر الجامعة --</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.universitySlug} ({u.countrySlug})</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-semibold">البرنامج (اختياري)</label>
          <select 
            className="w-full rounded-lg border border-border bg-surface px-3 py-2"
            value={selectedProg} 
            onChange={e => setSelectedProg(e.target.value)}
            disabled={!selectedUniv}
          >
            <option value="">-- مستندات عامة للجامعة --</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.canonicalName || p.specializationSlug}</option>
            ))}
          </select>
        </div>
      </div>

      <button 
        onClick={handleDiscover}
        disabled={loading || !selectedUniv}
        className="rounded-lg bg-brand-purple px-4 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "جاري البحث..." : "اكتشاف المصادر (Tavily)"}
      </button>

      {error && <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-500">{error}</div>}

      {results.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold">النتائج ({results.length})</h2>
          {results.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="break-all text-lg font-bold text-brand-cyan hover:underline">
                  {r.title || r.url}
                </a>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${r.score >= 80 ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  التقييم: {r.score}
                </span>
              </div>
              <div className="mb-3 text-sm text-muted">{r.url}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-border bg-background px-2 py-1">النوع: {r.category}</span>
                <span className={`rounded-md px-2 py-1 ${r.isOfficialDomain ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {r.isOfficialDomain ? 'نطاق رسمي' : 'نطاق خارجي'}
                </span>
                <span className="rounded-md border border-border bg-background px-2 py-1">السبب: {r.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
