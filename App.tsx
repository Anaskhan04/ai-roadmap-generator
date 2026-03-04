import React, { useState, useCallback, useEffect } from 'react';
import { generateRoadmap } from './services/geminiService';
import { RoadmapItem } from './types';
import RoadmapNode from './components/RoadmapNode';
import { LoadingSpinner, SparklesIcon } from './components/IconComponents';
import { mapStepsToRoadmapItems, updateNodeInTree } from './utils';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [mainTopic, setMainTopic] = useState('');
  const [roadmap, setRoadmap] = useState<RoadmapItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exploringNodeId, setExploringNodeId] = useState<string | null>(null);

  const getCoreErrorMessage = (err: unknown): string => {
    if (!(err instanceof Error)) {
      return 'Something went wrong. Please try again.';
    }

    let message = err.message || '';
    let lower = message.toLowerCase();

    const failedPrefix = 'failed to generate roadmap:';
    if (lower.startsWith(failedPrefix)) {
      message = message.slice(failedPrefix.length).trim();
      lower = message.toLowerCase();
    }

    if (lower.includes('gemini_api_key') || lower.includes('api key')) {
      return 'API key not found. Please set GEMINI_API_KEY in your .env file.';
    }

    if (lower.includes('expected between')) {
      return 'No steps were generated. Try rephrasing your topic.';
    }

    if (lower.includes('invalid response format') || lower.includes('invalid roadmap item')) {
      return 'The AI returned an unexpected format. Try a simpler topic or try again.';
    }

    if (lower.includes('taking too long') || lower.includes('timeout')) {
      return 'The AI took too long to respond. Please try again.';
    }

    return message;
  };

  const buildErrorMessage = (err: unknown, context: 'root' | 'explore'): string => {
    const core = getCoreErrorMessage(err);

    if (context === 'root') {
      return `Could not generate roadmap: ${core}`;
    }

    return `Could not explore deeper: ${core}`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem('ai-roadmap-state');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        topic?: string;
        mainTopic?: string;
        roadmap?: RoadmapItem[];
      };

      if (parsed && parsed.roadmap && Array.isArray(parsed.roadmap)) {
        setTopic(parsed.topic ?? '');
        setMainTopic(parsed.mainTopic ?? '');
        setRoadmap(parsed.roadmap);
      }
    } catch {
      // Ignore invalid persisted state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!roadmap || !mainTopic) {
      window.localStorage.removeItem('ai-roadmap-state');
      return;
    }

    const payload = JSON.stringify({ topic, mainTopic, roadmap });
    window.localStorage.setItem('ai-roadmap-state', payload);
  }, [topic, mainTopic, roadmap]);

  const handleCopyMarkdown = async () => {
    if (!roadmap || typeof window === 'undefined' || !navigator.clipboard) return;

    const buildMarkdown = (items: RoadmapItem[], level = 0): string => {
      const indent = '  '.repeat(level);
      return items
        .map((item) => {
          const line = `${indent}- ${item.title}: ${item.description}`;
          const children = item.children && item.children.length > 0
            ? `\n${buildMarkdown(item.children, level + 1)}`
            : '';
          return line + children;
        })
        .join('\n');
    };

    const markdown = `# Learning Roadmap for ${mainTopic || topic}\n\n${buildMarkdown(roadmap)}`;

    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Best-effort copy; silently fail if not available
    }
  };

  const handleCopyJson = async () => {
    if (!roadmap || typeof window === 'undefined' || !navigator.clipboard) return;

    const json = JSON.stringify({ topic: mainTopic || topic, roadmap }, null, 2);

    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Best-effort copy; silently fail if not available
    }
  };

  const handleGenerateRoadmap = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    setRoadmap(null);
    try {
      const result = await generateRoadmap(topic, null);
      const roadmapWithIds: RoadmapItem[] = mapStepsToRoadmapItems(result);
      setRoadmap(roadmapWithIds);
      setMainTopic(topic);
    } catch (err) {
      setError(buildErrorMessage(err, 'root'));
    } finally {
      setLoading(false);
    }
  }, [topic, loading]);

  const handleToggleExpand = useCallback(async (id: string, subTopic: string, hasChildren: boolean, isExpanded: boolean) => {
    if (!hasChildren && !isExpanded) {
      if (exploringNodeId === id) {
        return;
      }
      setExploringNodeId(id);
      setError(null);
      try {
        const result = await generateRoadmap(subTopic, mainTopic);
        const newChildren: RoadmapItem[] = mapStepsToRoadmapItems(result, id);
        
        setRoadmap(prevRoadmap => {
          if (!prevRoadmap) return null;
          return updateNodeInTree(prevRoadmap, id, {
            children: newChildren,
            isExpanded: true
          });
        });
      } catch (err) {
        setError(buildErrorMessage(err, 'explore'));
      } finally {
        setExploringNodeId(null);
      }
    } else {
      setRoadmap(prevRoadmap => {
        if (!prevRoadmap) return null;
        return updateNodeInTree(prevRoadmap, id, {
          isExpanded: !isExpanded
        });
      });
    }
  }, [mainTopic, exploringNodeId]);

  return (
    <div className="min-h-screen container mx-auto p-4 md:p-8 flex flex-col items-center">
      <header className="text-center my-8 md:my-12 animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
          AI Roadmap Generator
        </h1>
        <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-2xl">
          Enter any skill or topic, and get a personalized, step-by-step learning plan. Explore deeper into any step to reveal more details.
        </p>
      </header>
      
      <main className="w-full max-w-3xl">
        <form onSubmit={handleGenerateRoadmap} className="relative mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 'Learn Quantum Computing' or 'Master Sourdough Baking'"
            className="w-full pl-4 pr-40 md:pr-48 py-4 text-lg bg-slate-800 border-2 border-slate-700 rounded-full focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors duration-300"
          />
          <button
            type="submit"
            disabled={!topic.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center px-4 md:px-6 py-2.5 text-base font-semibold text-white bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full hover:from-cyan-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? (
              <LoadingSpinner className="w-6 h-6" />
            ) : (
              <>
                <SparklesIcon className="w-5 h-5 mr-2 hidden md:inline" />
                <span>Generate</span>
              </>
            )}
          </button>
        </form>

        {!roadmap && !loading && (
          <div className="mb-6 text-sm text-slate-400 animate-fade-in">
            <p>Try one of these example topics:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Full-stack Web Development', 'Data Science', 'UI/UX Design', 'Machine Learning from Scratch'].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setTopic(example)}
                  className="px-3 py-1 rounded-full border border-slate-700 text-slate-200 hover:border-cyan-500 hover:text-cyan-300 transition-colors text-xs md:text-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center animate-fade-in">
            <strong>Error:</strong> {error}
          </div>
        )}

        {roadmap && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in">
              Learning Roadmap for: <span className="text-cyan-400">{mainTopic}</span>
            </h2>

            <p className="text-center text-slate-400 text-sm mb-6 animate-fade-in">
              Click <span className="font-semibold">Explore Deeper</span> on any step to break it into more detailed sub-steps.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-full hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-colors"
              >
                Copy roadmap 
              </button>
              
            </div>

            {roadmap.map((item) => (
              <RoadmapNode
                key={item.id}
                item={item}
                level={0}
                onToggle={handleToggleExpand}
                exploringNodeId={exploringNodeId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;