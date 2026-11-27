import { useEffect, useMemo, useState } from 'react';
import { Download, Copy, Check, FileCode2, FolderTree, Terminal } from 'lucide-react';
import type { SourceFileEntry } from '../types/panel';

const CATEGORIES = [
  'All Files',
  'Android Kotlin',
  'C++17 NDK',
  'Python Backend',
  'HTML5 / CSS3 / JS',
  'Gradle & CMake',
  'API & APK Docs',
] as const;

export function SourceStudioView() {
  const [files, setFiles] = useState<SourceFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All Files');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/source/files')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load project source files.');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const loaded: SourceFileEntry[] = data.files || [];
        setFiles(loaded);
        if (loaded.length > 0) {
          const preferred =
            loaded.find((f) => f.path.endsWith('MainActivity.kt')) || loaded[0];
          setSelectedPath(preferred.path);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load files');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredFiles = useMemo(() => {
    if (activeCategory === 'All Files') return files;
    return files.filter((f) => f.category === activeCategory);
  }, [files, activeCategory]);

  const activeFile = useMemo(() => {
    return (
      filteredFiles.find((f) => f.path === selectedPath) ||
      filteredFiles[0] ||
      null
    );
  }, [filteredFiles, selectedPath]);

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">
              Complete Android, C++17 NDK &amp; Python Source
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Browse every generated source file for the standalone Android 10+ APK, native C++17 telemetry engine, Python FastAPI server, and build instructions.
            </p>
            <div className="mt-2 font-mono text-xs tabular-nums text-slate-400">
              {files.length} complete files · Kotlin + C++17 NDK + Python FastAPI + WebView HTML5/CSS3/JS + Gradle/CMake
            </div>
          </div>

          <a
            href="/api/source/download-zip"
            download="gold-fire-advanced-test-panel-android-project.zip"
            className="inline-flex min-h-[44px] whitespace-nowrap shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/15 hover:opacity-95"
          >
            <Download className="h-4 w-4" />
            Download Complete Project (.zip)
          </a>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[36px] whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-8 text-center text-sm text-slate-400">
          Loading multi-platform project repository...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* File Explorer Tree */}
          <aside className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-4 backdrop-blur-xl lg:col-span-4">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <FolderTree className="h-4 w-4 text-sky-400" />
                Project Files ({filteredFiles.length})
              </span>
            </div>

            <div className="max-h-[540px] space-y-1 overflow-y-auto pr-1">
              {filteredFiles.map((file) => {
                const isSelected = activeFile?.path === file.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15 text-white'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 truncate text-xs font-semibold">
                        <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
                        {file.lines}L
                      </span>
                    </div>
                    <span className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                      {file.path}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Code Viewer */}
          <section className="flex flex-col rounded-2xl border border-slate-800/80 bg-[#0A0D14]/95 backdrop-blur-xl lg:col-span-8">
            {activeFile ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-semibold text-white">
                      {activeFile.path}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
                      {activeFile.category} · {activeFile.lines} lines · {(activeFile.bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex min-h-[36px] whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-sky-400" />
                        Copy File
                      </>
                    )}
                  </button>
                </div>

                <div className="max-h-[540px] overflow-auto p-5">
                  <pre className="font-mono text-xs leading-relaxed text-slate-200">
                    <code>{activeFile.content}</code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                Select a file from the left to inspect its source code.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Quick APK Build & ADB Install Command Reference */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Terminal className="h-4 w-4 text-purple-400" />
          <h2>Quick Android APK Build &amp; Install Commands</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-[#07090F] p-4">
            <div className="text-xs font-semibold text-sky-300">1. Compile Standalone Android APK (NDK C++17 + Kotlin)</div>
            <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-slate-300">
{`cd android-app
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk`}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#07090F] p-4">
            <div className="text-xs font-semibold text-purple-300">2. Run &amp; Verify Python Anti-Cheat Testing API</div>
            <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-slate-300">
{`cd python-backend
pip install -r requirements.txt
pytest test_backend.py && uvicorn main:app --port 8000`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
