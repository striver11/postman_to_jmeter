export function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 255); // Ensure the name is not too long
}

export function replaceVariables(text, variables) {
  return text.replace(/{{(.+?)}}/g, (_, key) => {
    const value = variables[key.trim()];
    return value !== undefined ? value : `{{${key.trim()}}}`; // Retain the variable if not found
  });
}

export function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
