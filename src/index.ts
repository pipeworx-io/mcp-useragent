interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * User-Agent parser MCP.
 *
 * Keyless, offline: parse a User-Agent string into browser, operating system,
 * device type, and a bot flag using well-known heuristics. Pure logic — no API,
 * no key. Heuristic, not exhaustive — obscure UAs may parse partially.
 */


const BOTS = /(bot|crawler|spider|crawling|slurp|mediapartners|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|discordbot|slackbot|curl|wget|python-requests|axios|go-http-client|headless)/i;

function browser(ua: string): { name: string; version?: string } {
  const tests: [string, RegExp][] = [
    ['Edge', /edg(?:e|a|ios)?\/([\d.]+)/i],
    ['Opera', /(?:opr|opera)\/([\d.]+)/i],
    ['Samsung Internet', /samsungbrowser\/([\d.]+)/i],
    ['Chrome', /(?:chrome|crios)\/([\d.]+)/i],
    ['Firefox', /(?:firefox|fxios)\/([\d.]+)/i],
    ['Safari', /version\/([\d.]+).*safari/i],
    ['Internet Explorer', /(?:msie |rv:)([\d.]+)/i],
  ];
  for (const [name, re] of tests) { const m = ua.match(re); if (m) return { name, version: m[1] }; }
  return { name: 'Unknown' };
}
function os(ua: string): { name: string; version?: string } {
  const tests: [string, RegExp][] = [
    ['iOS', /(?:iphone|ipad|ipod).*os ([\d_]+)/i],
    ['Android', /android ([\d.]+)/i],
    ['Windows', /windows nt ([\d.]+)/i],
    ['macOS', /mac os x ([\d_]+)/i],
    ['Chrome OS', /cros /i],
    ['Linux', /linux/i],
  ];
  for (const [name, re] of tests) { const m = ua.match(re); if (m) return { name, version: m[1] ? m[1].replace(/_/g, '.') : undefined }; }
  return { name: 'Unknown' };
}
const WIN_VER: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };

const tools: McpToolExport['tools'] = [
  {
    name: 'parse_user_agent',
    description: 'Parse a User-Agent string into browser, OS, device type (mobile/tablet/desktop/bot) and a bot flag (keyless, offline, heuristic).',
    inputSchema: { type: 'object', properties: { user_agent: { type: 'string', description: 'The User-Agent string.' } }, required: ['user_agent'] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name !== 'parse_user_agent') throw new Error(`Unknown tool: ${name}`);
  const ua = reqStr(args, 'user_agent', '"Mozilla/5.0 ... Chrome/120 ..."');
  const isBot = BOTS.test(ua);
  const b = browser(ua);
  const o = os(ua);
  if (o.name === 'Windows' && o.version && WIN_VER[o.version]) o.version = WIN_VER[o.version];
  const isTablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua);
  const isMobile = /mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua);
  const device = isBot ? 'bot' : isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  return { user_agent: ua, is_bot: isBot, browser: b, os: o, device_type: device, note: 'Heuristic parse — obscure or spoofed UAs may be partial.' };
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
