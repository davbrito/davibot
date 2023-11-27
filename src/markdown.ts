const specialCharRE = /(_*[\]()~`>#+-=|{}.!\\])/g;

export function sanitizeMarkdown(text: string): string {
  return text.replace(specialCharRE, "\\$1");
}

export function bold(text: string): string {
  return `*${text}*`;
}

export function italic(text: string): string {
  return `_${text}_`;
}

export function underline(text: string): string {
  return `__${text}__`;
}

export function striketrough(text: string): string {
  return `~${text}~`;
}

export function spoiler(text: string): string {
  return `||${text}||`;
}

export function inlineCode(text: string): string {
  return `\`${text}\``;
}

export function codeBlock(text: string, language = ""): string {
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

export function link(text: string, url: string): string {
  return `[${text}](${url})`;
}

export function mention(text: string, userId: number): string {
  return `[${text}](tg://user?id=${userId})`;
}
