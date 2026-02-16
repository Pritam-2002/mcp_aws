/**
 * Safe logger that writes to stderr to avoid interfering with MCP stdio transport.
 * MCP stdio transport MUST own stdout completely.
 */
export const log = (...args: any[]) => {
  // Use console.error instead of console.log
  // This ensures logs go to stderr and don't break the JSON-RPC stream on stdout
  console.error("[MCP]", ...args);
};

export const error = (...args: any[]) => {
  console.error("[ERROR]", ...args);
};
