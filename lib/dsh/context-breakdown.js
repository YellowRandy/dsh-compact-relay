/**
 * 上下文构成估算（2026-11-26）。
 *
 * 宿主只在它自己的 ContextMeter 里算「系统提示词 / 工具定义 / 对话消息」，没有通过 slot 暴露；
 * 这里按字符数折算：系统提示词多为中文（约 2.3 字符/token），工具定义是英文 JSON（约 3.9），
 * 用实测比例（78,915 字符 → 34.1K、4,717 字符 → 1.2K）校准过；消息部分用总用量减去前两段。
 * 结果标 estimated:true —— 与宿主的精确分词会有几个百分点出入。
 */
const SYSTEM_CHARS_PER_TOKEN = 2.3;
const TOOL_CHARS_PER_TOKEN = 3.9;

function lastEvent(log, type) {
  if (!Array.isArray(log)) return null;
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const event = log[i];
    if (event !== null && typeof event === 'object' && event.type === type) return event;
  }
  return null;
}

function textCharsOf(message) {
  if (typeof message === 'string') return message.length;
  const content = message !== null && typeof message === 'object' ? message.content : null;
  if (typeof content === 'string') return content.length;
  if (!Array.isArray(content)) return 0;
  let sum = 0;
  for (const part of content) {
    if (part !== null && typeof part === 'object' && typeof part.text === 'string') sum += part.text.length;
  }
  return sum;
}

/**
 * @param {object|null} session 活会话（有 log / requestHeader）
 * @param {number|null} usedTokens 当前上下文总用量
 * @returns {{system:number, tools:number, messages:number|null, estimated:true}|null}
 */
export function contextBreakdownOf(session, usedTokens) {
  if (session === null || session === undefined) return null;
  const systemEvent = lastEvent(session.log, 'system/message');
  const systemChars = systemEvent === null ? 0 : textCharsOf(systemEvent.data?.message);
  let toolsChars = 0;
  try {
    const header = typeof session.requestHeader === 'function' ? session.requestHeader() : null;
    if (Array.isArray(header?.tools)) toolsChars = JSON.stringify(header.tools).length;
  } catch {
    /* 老宿主没有 requestHeader：下面退回事件日志 */
  }
  if (toolsChars === 0) {
    const headerEvent = lastEvent(session.log, 'request/header');
    const tools = headerEvent?.data?.header?.tools;
    if (Array.isArray(tools)) toolsChars = JSON.stringify(tools).length;
  }
  if (systemChars === 0 && toolsChars === 0) return null;
  const system = Math.round(systemChars / SYSTEM_CHARS_PER_TOKEN);
  const tools = Math.round(toolsChars / TOOL_CHARS_PER_TOKEN);
  const used = Number.isFinite(usedTokens) ? usedTokens : null;
  const messages = used === null ? null : Math.max(0, used - system - tools);
  return { system, tools, messages, estimated: true };
}