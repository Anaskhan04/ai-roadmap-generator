export interface RoadmapStep {
  title: string;
  description: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  /**
   * Child steps created by the frontend when the user explores deeper.
   */
  children?: RoadmapItem[];
  isExpanded?: boolean;
}