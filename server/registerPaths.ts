import Module from "node:module";
import path from "node:path";

type ModuleWithResolve = typeof Module & {
  _resolveFilename: (
    request: string,
    parent: NodeModule | undefined,
    isMain: boolean,
    options?: unknown,
  ) => string;
};

const moduleWithResolve = Module as ModuleWithResolve;

const originalResolveFilename = moduleWithResolve._resolveFilename;

moduleWithResolve._resolveFilename = function resolveWithAlias(
  request: string,
  parent: NodeModule | undefined,
  isMain: boolean,
  options?: ModuleResolveFilenameOptions,
) {
  if (request.startsWith("@/")) {
    const resolved = path.join(__dirname, "..", request.slice(2));
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

type ModuleResolveFilenameOptions = Parameters<ModuleWithResolve["_resolveFilename"]>[3];
