export const normalizeEscapedLineBreaks = (value) => {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\/r\/n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
}
