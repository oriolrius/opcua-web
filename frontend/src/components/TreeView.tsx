import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Tag, Play, Box, Loader2 } from "lucide-react";
import { browse } from "../api";
import type { TreeNode } from "../types";
import { NODE_CLASS } from "../types";

interface TreeViewProps {
  roots: TreeNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onUpdateRoots: (roots: TreeNode[]) => void;
}

function getNodeIcon(nodeClass: number, expanded: boolean) {
  switch (nodeClass) {
    case NODE_CLASS.Object:
      return expanded ? <FolderOpen className="w-4 h-4 text-amber-400" /> : <Folder className="w-4 h-4 text-amber-400" />;
    case NODE_CLASS.Variable:
      return <Tag className="w-4 h-4 text-blue-400" />;
    case NODE_CLASS.Method:
      return <Play className="w-4 h-4 text-green-400" />;
    default:
      return <Box className="w-4 h-4 text-slate-400" />;
  }
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onLoadChildren: (node: TreeNode) => Promise<void>;
}

function TreeNodeItem({ node, depth, selectedNodeId, onSelect, onLoadChildren }: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const isSelected = selectedNodeId === node.node_id;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.has_children) return;

    if (!expanded && !node.loaded) {
      setLoading(true);
      await onLoadChildren(node);
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  const handleSelect = () => {
    onSelect(node.node_id);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm text-sm
                     hover:bg-slate-700/50 transition-colors
                     ${isSelected ? "bg-blue-900/40 text-blue-200" : "text-slate-300"}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <span
          className={`shrink-0 w-4 h-4 flex items-center justify-center ${node.has_children ? "cursor-pointer" : "opacity-0"}`}
          onClick={handleToggle}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
          ) : node.has_children ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : null}
        </span>
        {getNodeIcon(node.node_class, expanded)}
        <span className="truncate ml-1">{node.display_name}</span>
      </div>

      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.node_id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({ roots, selectedNodeId, onSelect, onUpdateRoots }: TreeViewProps) {
  const updateNodeChildren = useCallback(
    (nodes: TreeNode[], targetId: string, children: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.node_id === targetId) {
          return { ...node, children, loaded: true };
        }
        if (node.children) {
          return { ...node, children: updateNodeChildren(node.children, targetId, children) };
        }
        return node;
      });
    },
    [],
  );

  const handleLoadChildren = useCallback(
    async (node: TreeNode) => {
      const children = await browse(node.node_id);
      onUpdateRoots(updateNodeChildren(roots, node.node_id, children));
    },
    [roots, onUpdateRoots, updateNodeChildren],
  );

  if (roots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Connect to a server to browse
      </div>
    );
  }

  return (
    <div className="py-1 overflow-auto h-full">
      {roots.map((node) => (
        <TreeNodeItem
          key={node.node_id}
          node={node}
          depth={0}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          onLoadChildren={handleLoadChildren}
        />
      ))}
    </div>
  );
}
