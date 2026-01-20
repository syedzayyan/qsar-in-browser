// types/GraphData.ts
export interface GraphNode {
  id: string;
  smiles: string;
  molCounts: number;
  nodeType: "whole" | "fragment";
  image?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  color: string;
}

export interface ScaffoldGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
