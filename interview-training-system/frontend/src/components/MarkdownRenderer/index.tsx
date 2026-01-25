/**
 * Markdown 渲染組件
 * 使用简单渲染器支持基本的 Markdown 語法
 * 如果需要完整的 Markdown 支持，可以安装 react-markdown 并修改此組件
 */
import React from 'react';
import './index.css';
import SimpleMarkdown from './SimpleMarkdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return <SimpleMarkdown content={content} className={`${className || ''} markdown-content`} />;
};

export default MarkdownRenderer;
