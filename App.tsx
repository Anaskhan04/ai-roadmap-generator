import React, { useState, useCallback } from 'react';
import { generateRoadmap } from './services/geminiService';
import { RoadmapItem } from './types';
import RoadmapNode from './components/RoadmapNode';
import { LoadingSpinner, SparklesIcon } from './components/IconComponents';

// Helper to create URL-friendly slugs
const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [mainTopic, setMainTopic] = useState('');
  const [roadmap, setRoadmap] = useState<RoadmapItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exploringNodeId, setExploringNodeId] = useState<string | null>(null);


  const handleGenerateRoadmap = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    setRoadmap(null);
    try {
      const result = await generateRoadmap(topic, null);
      const roadmapWithIds: RoadmapItem[] = result.map((item, index) => ({
        ...item,
        id: `${slugify(item.title)}-${index}`,
      }));
      setRoadmap(roadmapWithIds);
      setMainTopic(topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  }, [topic, loading]);

  const handleToggleExpand = useCallback(async (id: string, subTopic: string, hasChildren: boolean, isExpanded: boolean) => {
    if (!hasChildren && !isExpanded) {
      setExploringNodeId(id);
      setError(null);
      try {
        const result = await generateRoadmap(subTopic, mainTopic);
        const newChildren: RoadmapItem[] = result.map((item, index) => ({
          ...item,
          id: `${id}-${slugify(item.title)}-${index}`
        }));
        
        setRoadmap(prevRoadmap => {
          if (!prevRoadmap) return null;
          return updateNodeInTree(prevRoadmap, id, {
            children: newChildren,
            isExpanded: true
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to explore deeper');
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
  }, [mainTopic]);

  const updateNodeInTree = (nodes: RoadmapItem[], targetId: string, updates: Partial<RoadmapItem>): RoadmapItem[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, ...updates };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetId, updates)
        };
      }
      return node;
    });
  };

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