function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    const hostname = parsed.hostname;
    const privateIps = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
    if (privateIps.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

module.exports = { validateUrl };