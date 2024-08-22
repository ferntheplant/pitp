// taken from https://github.com/aabccd021/bun-html-live-reload
import type {
  Server,
  ServerWebSocket,
  WebSocketHandler,
  WebSocketServeOptions,
} from "bun";
import { watch } from "fs";
import path from "path";

declare global {
  var ws: ServerWebSocket<unknown> | undefined;
}

const reloadCommand = "reload";

globalThis.ws?.send(reloadCommand);

const makeLiveReloadScript = (wsUrl: string) => `
<!-- start bun live reload script -->
<script type="text/javascript">
  (function() {
    const socket = new WebSocket("ws://${wsUrl}");
      socket.onmessage = function(msg) {
      if(msg.data === '${reloadCommand}') {
        location.reload()
      }
    };
    console.log('Live reload enabled.');
  })();
</script>
<!-- end bun live reload script -->
`;

export type PureWebSocketServeOptions<WebSocketDataType> = Omit<
  WebSocketServeOptions<WebSocketDataType>,
  "fetch" | "websocket"
> & {
  fetch(request: Request, server: Server): Promise<Response> | Response;
  websocket?: WebSocketHandler<WebSocketDataType>;
};

export const withHtmlLiveReload = <
  WebSocketDataType,
  T extends PureWebSocketServeOptions<WebSocketDataType>,
>(
  serveOptions: T,
): WebSocketServeOptions<WebSocketDataType> => {
  const wsPath = "__bun_live_reload_websocket__";
  const watcher = watch(path.resolve(import.meta.dir, "../public"));

  return {
    ...serveOptions,
    fetch: async (req, server) => {
      const reqUrl = new URL(req.url);
      if (reqUrl.pathname === "/" + wsPath) {
        const upgraded = server.upgrade(req);

        if (!upgraded) {
          return new Response(
            "Failed to upgrade websocket connection for live reload",
            { status: 400 },
          );
        }
        return;
      }

      const response = await serveOptions.fetch(req, server);

      if (!response.headers.get("Content-Type")?.startsWith("text/html")) {
        return response;
      }

      const originalHtml = await response.text();
      const liveReloadScript = makeLiveReloadScript(`${reqUrl.host}/${wsPath}`);
      const htmlWithLiveReload = originalHtml + liveReloadScript;

      return new Response(htmlWithLiveReload, response);
    },
    websocket: {
      ...serveOptions.websocket,
      open: async (ws) => {
        globalThis.ws = ws;
        await serveOptions.websocket?.open?.(ws);

        if (watcher)
          watcher.on("change", async () => {
            ws.send(reloadCommand);
          });
      },
    },
  };
};
