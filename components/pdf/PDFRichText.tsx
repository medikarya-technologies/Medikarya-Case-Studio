import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

interface PDFRichTextProps {
  content?: string | null;
  primaryColor?: string;
  style?: any;
}

interface ASTNode {
  type: 'element' | 'text';
  tagName?: string;
  children?: ASTNode[];
  text?: string;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function parseHTMLToAST(htmlString: string): ASTNode[] {
  const root: ASTNode = { type: 'element', tagName: 'root', children: [] };
  const stack: ASTNode[] = [root];

  const cleaned = htmlString.replace(/<!--[\s\S]*?-->/g, '');
  const tagRegex = /<\/?([a-z1-6]+)[^>]*>|[^<]+/gi;
  let match;

  while ((match = tagRegex.exec(cleaned)) !== null) {
    const token = match[0];
    if (token.startsWith('<')) {
      const isClosing = token.startsWith('</');
      const isSelfClosing = token.endsWith('/>') || /^<br\s*\/?>/i.test(token);
      const tagNameMatch = token.match(/^<\/?([a-z1-6]+)/i);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';

      if (isClosing) {
        if (stack.length > 1 && stack[stack.length - 1].tagName === tagName) {
          stack.pop();
        }
      } else if (isSelfClosing || tagName === 'br') {
        const parent = stack[stack.length - 1];
        parent.children?.push({ type: 'element', tagName: 'br', children: [] });
      } else if (tagName) {
        const newNode: ASTNode = { type: 'element', tagName, children: [] };
        const parent = stack[stack.length - 1];
        parent.children?.push(newNode);
        stack.push(newNode);
      }
    } else {
      if (token) {
        const parent = stack[stack.length - 1];
        parent.children?.push({ type: 'text', text: decodeHTMLEntities(token) });
      }
    }
  }

  return root.children || [];
}

function renderInlineASTNode(node: ASTNode, isBold = false, key?: string | number): React.ReactNode {
  if (node.type === 'text') {
    if (!node.text) return null;
    return (
      <Text key={key} style={isBold ? { fontFamily: 'Helvetica-Bold' } : {}}>
        {node.text}
      </Text>
    );
  }

  if (node.type === 'element') {
    const tag = node.tagName;
    if (tag === 'br') {
      return '\n';
    }
    if (tag === 'strong' || tag === 'b') {
      return (
        <Text key={key} style={{ fontFamily: 'Helvetica-Bold' }}>
          {node.children?.map((child, idx) => renderInlineASTNode(child, true, idx))}
        </Text>
      );
    }
    // Fallback for other inline elements (em, i, span)
    return (
      <React.Fragment key={key}>
        {node.children?.map((child, idx) => renderInlineASTNode(child, isBold, idx))}
      </React.Fragment>
    );
  }

  return null;
}

function renderBlockASTNodes(
  nodes: ASTNode[],
  primaryColor: string
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  nodes.forEach((node, index) => {
    if (node.type === 'text') {
      const trimmed = node.text?.trim();
      if (trimmed) {
        result.push(
          <View key={`text-${index}`} style={{ marginBottom: 4 }} wrap={false}>
            <Text style={{ fontSize: 9.5, lineHeight: 1.45, color: '#1e293b' }}>
              {node.text}
            </Text>
          </View>
        );
      }
      return;
    }

    const tag = node.tagName;

    if (tag === 'p') {
      result.push(
        <View key={`p-${index}`} style={{ marginBottom: 4 }} wrap={false}>
          <Text style={{ fontSize: 9.5, lineHeight: 1.45, color: '#1e293b' }}>
            {node.children?.map((child, cIdx) => renderInlineASTNode(child, false, cIdx))}
          </Text>
        </View>
      );
    } else if (tag === 'ul') {
      const listItems = (node.children || []).filter((c) => c.tagName === 'li');
      result.push(
        <View key={`ul-${index}`} style={{ marginVertical: 2 }} wrap={false}>
          {listItems.map((li, liIdx) => (
            <View
              key={`li-${liIdx}`}
              style={{ flexDirection: 'row', marginLeft: 8, marginBottom: 2.5 }}
              wrap={false}
            >
              <Text style={{ width: 12, color: primaryColor, fontSize: 9.5 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.4, color: '#1e293b' }}>
                {li.children?.map((child, cIdx) => renderInlineASTNode(child, false, cIdx))}
              </Text>
            </View>
          ))}
        </View>
      );
    } else if (tag === 'ol') {
      const listItems = (node.children || []).filter((c) => c.tagName === 'li');
      result.push(
        <View key={`ol-${index}`} style={{ marginVertical: 2 }} wrap={false}>
          {listItems.map((li, liIdx) => (
            <View
              key={`li-${liIdx}`}
              style={{ flexDirection: 'row', marginLeft: 8, marginBottom: 2.5 }}
              wrap={false}
            >
              <Text
                style={{
                  width: 18,
                  fontFamily: 'Helvetica-Bold',
                  color: primaryColor,
                  fontSize: 9.5,
                }}
              >
                {liIdx + 1}.
              </Text>
              <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.4, color: '#1e293b' }}>
                {li.children?.map((child, cIdx) => renderInlineASTNode(child, false, cIdx))}
              </Text>
            </View>
          ))}
        </View>
      );
    } else {
      // General container or wrapper node
      if (node.children && node.children.length > 0) {
        result.push(
          <View key={`gen-${index}`} style={{ marginBottom: 4 }} wrap={false}>
            <Text style={{ fontSize: 9.5, lineHeight: 1.45, color: '#1e293b' }}>
              {node.children.map((child, cIdx) => renderInlineASTNode(child, false, cIdx))}
            </Text>
          </View>
        );
      }
    }
  });

  return result;
}

function renderLegacyPlainTextPDF(
  text: string,
  primaryColor: string
): React.ReactNode {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <View style={{ marginVertical: 2 }}>
      {lines.map((line, idx) => {
        // Numbered list item e.g. "1. Investigations"
        const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
        if (numMatch) {
          const numStr = numMatch[1];
          const rest = numMatch[2];
          return (
            <View
              key={idx}
              style={{ flexDirection: 'row', marginLeft: 8, marginBottom: 3, marginTop: 2 }}
              wrap={false}
            >
              <Text
                style={{
                  width: 18,
                  fontFamily: 'Helvetica-Bold',
                  color: primaryColor,
                  fontSize: 9.5,
                }}
              >
                {numStr}.
              </Text>
              <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.4, color: '#1e293b' }}>
                {rest}
              </Text>
            </View>
          );
        }

        // Bullet list item e.g. "- Began insidiously"
        const bulletMatch = line.match(/^[-•*]\s+(.*)/);
        if (bulletMatch) {
          const rest = bulletMatch[1];
          return (
            <View
              key={idx}
              style={{ flexDirection: 'row', marginLeft: 8, marginBottom: 2.5 }}
              wrap={false}
            >
              <Text style={{ width: 12, color: primaryColor, fontSize: 9.5 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.4, color: '#1e293b' }}>
                {rest}
              </Text>
            </View>
          );
        }

        // Normal paragraph line
        return (
          <View key={idx} style={{ marginBottom: 3 }} wrap={false}>
            <Text style={{ fontSize: 9.5, lineHeight: 1.45, color: '#1e293b' }}>
              {line}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function PDFRichText({
  content,
  primaryColor = '#064e3b',
  style,
}: PDFRichTextProps) {
  if (!content || !content.trim()) return null;

  const htmlMode = isHTML(content);

  return (
    <View style={style}>
      {htmlMode
        ? renderBlockASTNodes(parseHTMLToAST(content), primaryColor)
        : renderLegacyPlainTextPDF(content, primaryColor)}
    </View>
  );
}
