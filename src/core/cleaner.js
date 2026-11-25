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
 * @returns {string} 清洗后的纯文本
 */
export function cleanContent(content, preserveThinking = false) {
    if (!content) return '';
    
    let text = content;
    
    // 1. 先过滤思维链（在 HTML 标签还在时）
    text = filterThinkingTags(text, preserveThinking);
    
    // 2. 移除 HTML 标签
    text = stripHtmlTags(text);
    
    // 3. 清理空白
    text = cleanWhitespace(text);
    
    return text;
}

/**
 * 格式化单条收藏为 TXT 格式
 * @param {Object} item - 收藏项
 * @param {boolean} preserveThinking - 是否保留思维链
 * @returns {string} 格式化后的文本
 */
export function formatItemForTxt(item, preserveThinking = false) {
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
    const cleanedText = cleanContent(item.message.rawText, preserveThinking);
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
 * @returns {string} 完整的 TXT 内容
 */
export function generateTxtExport(items, preserveThinking = false) {
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
    
    const content = items.map(item => formatItemForTxt(item, preserveThinking)).join('\n');
    
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
