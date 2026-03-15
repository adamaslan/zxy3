/**
 * Sanitize a string before interpolating it into an LLM prompt.
 * Strips XML tag delimiters and control characters to prevent prompt injection.
 */
function sanitizeForPrompt(value, maxLength = 500) {
  if (!value) return '';
  return String(value)
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F]/g, '')
    .slice(0, maxLength)
    .trim();
}

module.exports = { sanitizeForPrompt };
