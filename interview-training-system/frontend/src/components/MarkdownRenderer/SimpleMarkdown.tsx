/**
 * 简单的 Markdown 渲染器（不依赖外部库）
 * 支持基本的 Markdown 语法
 */
import React from 'react';

interface SimpleMarkdownProps {
  content: string;
  className?: string;
}

const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content, className }) => {
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    lines.forEach((line, index) => {
      // 代码块处理
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // 结束代码块
          elements.push(
            <pre key={`code-${index}`} style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '14px',
              lineHeight: '1.6',
            }}>
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // 开始代码块
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // 标题
      if (line.startsWith('# ')) {
        elements.push(<h1 key={index} style={{ fontSize: '2em', marginTop: '16px', marginBottom: '8px', fontWeight: 'bold' }}>{line.substring(2)}</h1>);
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(<h2 key={index} style={{ fontSize: '1.5em', marginTop: '14px', marginBottom: '8px', fontWeight: 'bold' }}>{line.substring(3)}</h2>);
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(<h3 key={index} style={{ fontSize: '1.25em', marginTop: '12px', marginBottom: '6px', fontWeight: 'bold' }}>{line.substring(4)}</h3>);
        return;
      }
      if (line.startsWith('#### ')) {
        elements.push(<h4 key={index} style={{ fontSize: '1.1em', marginTop: '10px', marginBottom: '6px', fontWeight: 'bold' }}>{line.substring(5)}</h4>);
        return;
      }

      // 列表
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItem = line.trim().substring(2);
        elements.push(
          <li key={index} style={{ marginLeft: '20px', marginBottom: '4px' }}>
            {renderInlineMarkdown(listItem)}
          </li>
        );
        return;
      }

      // 空行
      if (line.trim() === '') {
        elements.push(<br key={index} />);
        return;
      }

      // 普通段落
      elements.push(
        <p key={index} style={{ marginBottom: '12px' }}>
          {renderInlineMarkdown(line)}
        </p>
      );
    });

    // 如果还有未关闭的代码块
    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key="code-final" style={{ 
          background: '#f5f5f5', 
          padding: '12px', 
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '14px',
          lineHeight: '1.6',
        }}>
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];

    // 处理粗体 **text**
    const boldRegex = /\*\*(.+?)\*\*/g;
    // 处理斜体 *text*
    const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    // 处理行内代码 `code`
    const codeRegex = /`(.+?)`/g;
    // 处理链接 [text](url)
    const linkRegex = /\[(.+?)\]\((.+?)\)/g;

    const matches: Array<{ type: string; start: number; end: number; content: string; url?: string }> = [];

    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({ type: 'bold', start: match.index, end: match.index + match[0].length, content: match[1] });
    }
    while ((match = italicRegex.exec(text)) !== null) {
      matches.push({ type: 'italic', start: match.index, end: match.index + match[0].length, content: match[1] });
    }
    while ((match = codeRegex.exec(text)) !== null) {
      matches.push({ type: 'code', start: match.index, end: match.index + match[0].length, content: match[1] });
    }
    while ((match = linkRegex.exec(text)) !== null) {
      matches.push({ type: 'link', start: match.index, end: match.index + match[0].length, content: match[1], url: match[2] });
    }

    matches.sort((a, b) => a.start - b.start);

    let lastIndex = 0;
    matches.forEach((match, index) => {
      if (match.start > lastIndex) {
        parts.push(text.substring(lastIndex, match.start));
      }

      switch (match.type) {
        case 'bold':
          parts.push(<strong key={`bold-${index}`}>{match.content}</strong>);
          break;
        case 'italic':
          parts.push(<em key={`italic-${index}`}>{match.content}</em>);
          break;
        case 'code':
          parts.push(
            <code key={`code-${index}`} style={{ 
              background: '#f5f5f5', 
              padding: '2px 6px', 
              borderRadius: '3px',
              fontSize: '0.9em',
              fontFamily: 'monospace',
            }}>
              {match.content}
            </code>
          );
          break;
        case 'link':
          parts.push(
            <a key={`link-${index}`} href={match.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
              {match.content}
            </a>
          );
          break;
      }

      lastIndex = match.end;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={className} style={{ lineHeight: '1.8' }}>
      {renderMarkdown(content)}
    </div>
  );
};

export default SimpleMarkdown;
