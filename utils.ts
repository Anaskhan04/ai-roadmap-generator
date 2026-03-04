import type { RoadmapItem, RoadmapStep } from "./types";

export const slugify = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

export const updateNodeInTree = (
  nodes: RoadmapItem[],
  targetId: string,
  updates: Partial<RoadmapItem>
): RoadmapItem[] => {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, targetId, updates),
      };
    }
    return node;
  });
};

export const mapStepsToRoadmapItems = (
  steps: RoadmapStep[],
  parentId?: string
): RoadmapItem[] => {
  return steps.map((step, index) => {
    const baseSlug = slugify(step.title);
    const id = parentId ? `${parentId}-${baseSlug}-${index}` : `${baseSlug}-${index}`;

    return {
      id,
      title: step.title,
      description: step.description,
    };
  });
};

