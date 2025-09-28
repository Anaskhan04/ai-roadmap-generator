export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  children?: RoadmapItem[];
  isExpanded?: boolean;
}