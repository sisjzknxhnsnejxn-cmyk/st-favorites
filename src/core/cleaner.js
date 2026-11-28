/**
 * 内容清洗与格式化工具
 * 用于 TXT 导出时清洗 HTML、过滤思维链、优化排版
 */

/**
 * 移除 HTML 标签，保留纯文本
 * @param {string} html - HTML 字符串
 * @returns {string} 纯文本
 */
export function stripHtmlTags(html) {
    if (!html || typeof html !== 'string') return '';

    // 检查是否在浏览器环境
    if (typeof document !== 'undefined') {
        // 浏览器环境：使用 DOM API
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // 移除 script 和 style 标签
        temp.querySelectorAll('script, style').forEach(el => el.remove());

        // 获取纯文本
        return temp.textContent || temp.innerText || '';
    } else {
        // Node.js 环境：使用正则表达式
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除 script
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')     // 移除 style
            .replace(/<[^>]+>/g, '')                                               // 移除所有标签
            .replace(/&nbsp;/g, ' ')                                               // 替换 &nbsp;
            .replace(/&lt;/g, '<')                                                 // 替换 &lt;
            .replace(/&gt;/g, '>')                                                 // 替换 &gt;
            .replace(/&amp;/g, '&')                                                // 替换 &amp;
            .replace(/&quot;/g, '"')                                               // 替换 &quot;
            .replace(/&#39;/g, "'");                                               // 替换 &#39;
    }
}

/**
 * 过滤思维链标签
 * @param {string} text - 文本内容
 * @param {boolean} preserveThinking - 是否保留思维链
 * @returns {string} 处理后的文本
 */
export function filterThinkingTags(text, preserveThinking = false) {
    if (!text || typeof text !== 'string') return '';
    if (preserveThinking) return text;

    // 匹配常见的思维链标签
    const thinkingPatterns = [
        /<thinking>[\s\S]*?<\/thinking>/gi,
        /<thought>[\s\S]*?<\/thought>/gi,
        /<reasoning>[\s\S]*?<\/reasoning>/gi,
        /<internal>[\s\S]*?<\/internal>/gi,
        /\[thinking\][\s\S]*?\[\/thinking\]/gi,
        /\[thought\][\s\S]*?\[\/thought\]/gi,
    ];

    let result = text;
    for (const pattern of thinkingPatterns) {
        result = result.replace(pattern, '');
    }

    return result;
}

/**
 * 解析用户输入的标签名列表
 * 支持中英文逗号、换行、分号分隔，并自动去掉包裹的尖括号与斜杠
 * @param {string|Array<string>} input - 原始输入
 * @returns {Array<string>} 规范化后的标签名数组（去重、去空）
 */
export function parseTagNames(input) {
    const raw = Array.isArray(input) ? input.join(',') : String(input ?? '');
    const names = raw
        .split(/[,，;；\r\n]+/)
        .map(part => part.trim())
        .map(part => part.replace(/^<+\s*\/?\s*/, '').replace(/\s*\/?\s*>+$/, '').trim())
        .filter(Boolean);
    return [...new Set(names)];
}

/**
 * 转义正则表达式中的特殊字符
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 按标签名移除成对标签及其包裹的内容（支持嵌套同名标签）
 * - 成对出现：<状态栏>…</状态栏> 整块删除
 * - 自闭合或落单：仅删除标签本身，保留周围文本
 * - 同时兼容被转义的形式：&lt;状态栏&gt;…&lt;/状态栏&gt;
 *
 * @param {string} text - 待处理文本
 * @param {Array<string>|string} tagNames - 标签名列表
 * @returns {string} 处理后的文本
 */
export function filterCustomTags(text, tagNames) {
    if (!text || typeof text !== 'string') return '';

    const names = parseTagNames(tagNames);
    if (names.length === 0) return text;

    let result = text;
    for (const name of names) {
        result = removeTagBlocks(result, name, false);
        result = removeTagBlocks(result, name, true);
    }
    return result;
}

/**
 * 针对单个标签名执行一次扫描式删除
 * @param {string} text - 待处理文本
 * @param {string} name - 标签名
 * @param {boolean} escaped - 是否处理 HTML 转义形式（&lt; &gt;）
 * @returns {string} 处理后的文本
 */
function removeTagBlocks(text, name, escaped) {
    const lt = escaped ? '&lt;' : '<';
    const gt = escaped ? '&gt;' : '>';
    const safeName = escapeRegExp(name);
    // 同时捕获开标签、闭标签与自闭合标签
    const pattern = new RegExp(
        `${lt}\\s*(/)?\\s*${safeName}(\\s[^${escaped ? '&' : '<>'}]*?)?\\s*(/)?\\s*${gt}`,
        'gi',
    );

    const tokens = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const isClosing = Boolean(match[1]);
        const isSelfClosing = Boolean(match[3]);
        tokens.push({
            start: match.index,
            end: match.index + match[0].length,
            kind: isClosing ? 'close' : (isSelfClosing ? 'self' : 'open'),
        });
        // 防止零宽匹配造成死循环
        if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    }

    if (tokens.length === 0) return text;

    /** @type {Array<{start: number, end: number}>} 待删除区间 */
    const ranges = [];
    /** @type {Array<{start: number, end: number}>} 未闭合的开标签栈 */
    const stack = [];

    for (const token of tokens) {
        if (token.kind === 'self') {
            // 自闭合：只有在不被某个未闭合区块包裹时才单独删除
            if (stack.length === 0) ranges.push({ start: token.start, end: token.end });
            continue;
        }
        if (token.kind === 'open') {
            stack.push(token);
            continue;
        }
        // close
        const opened = stack.pop();
        if (opened) {
            // 只有最外层配对才需要记录区间，内层已被外层覆盖
            if (stack.length === 0) ranges.push({ start: opened.start, end: token.end });
        } else {
            // 落单的闭标签：仅删除标签本身
            ranges.push({ start: token.start, end: token.end });
        }
    }

    // 剩余未闭合的开标签：仅删除标签本身
    for (const opened of stack) {
        ranges.push({ start: opened.start, end: opened.end });
    }

    if (ranges.length === 0) return text;

    ranges.sort((a, b) => a.start - b.start);
    let output = '';
    let cursor = 0;
    for (const range of ranges) {
        if (range.start < cursor) continue; // 跳过重叠区间
        output += text.slice(cursor, range.start);
        cursor = range.end;
    }
    output += text.slice(cursor);
    return output;
}

/**
 * 清理多余空行和空格
 * @param {string} text - 文本内容
 * @returns {string} 清理后的文本
 */
export function cleanWhitespace(text) {
    if (!text || typeof text !== 'string') return '';

    return text
        .replace(/[ \t]+/g, ' ')           // 合并多个空格为一个
        .replace(/\n{3,}/g, '\n\n')        // 最多保留两个连续换行
        .replace(/^\s+|\s+$/g, '')         // 去除首尾空白
        .trim();
}

/**
 * 完整清洗流程：HTML → 纯文本
 * @param {string} content - 原始内容（可能包含 HTML）
 * @param {boolean} preserveThinking - 是否保留思维链
 * @param {Array<string>|string} customTags - 需要连同内容一起移除的自定义标签名
 * @returns {string} 清洗后的纯文本
 */
export function cleanContent(content, preserveThinking = false, customTags = []) {
    if (!content) return '';

    let text = content;

    // 1. 先过滤思维链（在 HTML 标签还在时）
    text = filterThinkingTags(text, preserveThinking);

    // 2. 过滤用户自定义的 <标签></标签> 区块
    text = filterCustomTags(text, customTags);

    // 3. 移除 HTML 标签
    text = stripHtmlTags(text);

    // 4. 转义实体还原后可能再次出现自定义标签，补一次过滤
    text = filterCustomTags(text, customTags);

    // 5. 清理空白
    text = cleanWhitespace(text);

    return text;
}

/**
 * 格式化单条收藏为 TXT 格式
 * @param {Object} item - 收藏项
 * @param {boolean} preserveThinking - 是否保留思维链
 * @param {Array<string>|string} customTags - 自定义过滤标签
 * @returns {string} 格式化后的文本
 */
export function formatItemForTxt(item, preserveThinking = false, customTags = []) {

    const lines = [];

    // 标题：角色名
    lines.push(`【${item.source.speakerName || item.source.ownerName}】`);
    lines.push('');

    // 元信息
    const date = new Date(item.createdAt);
    const dateStr = Number.isNaN(date.valueOf()) ? '未知时间' : date.toLocaleString('zh-CN');
    lines.push(`来源：${item.source.ownerName} / ${item.source.chatName}`);
    lines.push(`时间：${dateStr}`);

    // 标签
    if (item.tags && item.tags.length > 0) {
        lines.push(`标签：${item.tags.map(tag => `#${tag}`).join(' ')}`);
    }

    // 备注
    if (item.note) {
        lines.push(`备注：${item.note}`);
    }

    lines.push('');
    lines.push('─'.repeat(40));
    lines.push('');

    // 正文内容（清洗后）
    const cleanedText = cleanContent(item.message.rawText, preserveThinking, customTags);
    lines.push(cleanedText);


    // 思维链（如果保留且存在）
    if (preserveThinking && item.message.reasoning) {
        lines.push('');
        lines.push('【思维链】');
        lines.push(item.message.reasoning);
    }

    lines.push('');
    lines.push('═'.repeat(40));
    lines.push('');

    return lines.join('\n');
}

/**
 * 生成 TXT 导出内容
 * @param {Array} items - 收藏项数组
 * @param {boolean} preserveThinking - 是否保留思维链
 * @param {Array<string>|string} customTags - 自定义过滤标签
 * @returns {string} 完整的 TXT 内容
 */
export function generateTxtExport(items, preserveThinking = false, customTags = []) {

    if (!Array.isArray(items) || items.length === 0) {
        return '暂无收藏内容';
    }

    const header = [
        '═'.repeat(40),
        '　　　　SillyTavern 收藏导出',
        `　　　　　共 ${items.length} 条收藏`,
        `　　导出时间：${new Date().toLocaleString('zh-CN')}`,
        '═'.repeat(40),
        '',
        ''
    ].join('\n');

    const content = items.map(item => formatItemForTxt(item, preserveThinking, customTags)).join('\n');


    return header + content;
}

/**
 * 下载 TXT 文件
 * @param {string} content - 文本内容
 * @param {string} filename - 文件名
 */
export function downloadTxt(content, filename = `favorites-${Date.now()}.txt`) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 计算内容清洗后的大小节省
 * @param {string} original - 原始内容
 * @param {string} cleaned - 清洗后内容
 * @returns {Object} { original: number, cleaned: number, saved: number, percentage: string }
 */
export function calculateCleaningSavings(original, cleaned) {
    const originalBytes = new TextEncoder().encode(original).byteLength;
    const cleanedBytes = new TextEncoder().encode(cleaned).byteLength;
    const savedBytes = originalBytes - cleanedBytes;
    const percentage = originalBytes > 0
        ? ((savedBytes / originalBytes) * 100).toFixed(1)
        : '0.0';

    return {
        original: originalBytes,
        cleaned: cleanedBytes,
        saved: savedBytes,
        percentage: `${percentage}%`
    };
}
