import React from 'react';
import type { RoadmapItem } from '../types';
import { ChevronDownIcon, ChevronUpIcon, LoadingSpinner } from './IconComponents';

interface RoadmapNodeProps {
  item: RoadmapItem;
  level: number;
  onToggle: (id: string, title: string, hasChildren: boolean, isExpanded: boolean) => void;
  exploringNodeId: string | null;
}

const RoadmapNode: React.FC<RoadmapNodeProps> = ({ item, level, onToggle, exploringNodeId }) => {
  const isExploring = exploringNodeId === item.id;
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = !!item.isExpanded;

  const isInteractable = item.children === undefined || hasChildren;

  const getButtonContent = () => {
    if (isExploring) {
      return (
        <>
          <LoadingSpinner className="w-4 h-4 mr-2" />
          <span>Exploring...</span>
        </>
      );
    }
    if (hasChildren && isExpanded) {
      return (
        <>
          <span>Collapse</span>
          <ChevronUpIcon className="w-4 h-4 ml-2" />
        </>
      );
    }
    if (hasChildren && !isExpanded) {
       return (
        <>
          <span>Expand</span>
          <ChevronDownIcon className="w-4 h-4 ml-2" />
        </>
      );
    }
    return (
      <>
        <span>Explore Deeper</span>
        <ChevronDownIcon className="w-4 h-4 ml-2" />
      </>
    );
  };

  return (
    <div className={`relative animate-fade-in ${level > 0 ? 'ml-6 md:ml-12' : ''}`}>
      {level > 0 && (
        <>
          <span className="absolute top-9 -left-6 md:-left-12 h-full w-px bg-slate-700" />
          <span className="absolute top-9 -left-6 md:-left-12 w-6 md:w-12 h-px bg-slate-700" />
        </>
      )}

      <div className="relative mt-4">
        <div className="absolute -left-2 md:-left-3 top-6 w-4 h-4 bg-cyan-500 rounded-full border-4 border-slate-900" />
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg shadow-lg transition-all duration-300 hover:border-cyan-500 hover:shadow-cyan-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-cyan-400">{item.title}</h3>
            {isInteractable && (
              <button
                onClick={() => onToggle(item.id, item.title, hasChildren, isExpanded)}
                disabled={isExploring}
                className="flex-shrink-0 flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                {getButtonContent()}
              </button>
            )}
          </div>
          <p className="mt-2 text-slate-300 pr-0 sm:pr-48">{item.description}</p>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-4">
          {item.children.map(child => (
            <RoadmapNode
              key={child.id}
              item={child}
              level={level + 1}
              onToggle={onToggle}
              exploringNodeId={exploringNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RoadmapNode;