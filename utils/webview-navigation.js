export const CONTACT_LINK_ORIGINS = [
  'http://*',
  'https://*',
  'mailto:*',
  'tel:*',
  'sms:*',
  'whatsapp:*',
  'about:blank',
  'about:srcdoc',
];

export function getNavigationAction(request, siteUrl) {
  const url = request?.url;
  if (typeof url !== 'string' || !url.trim()) return 'ignore';

  try {
    const target = new URL(url, siteUrl);

    // WebView and embedded widgets use these internally, including on iOS.
    if (target.protocol === 'about:') {
      return ['blank', 'srcdoc'].includes(target.pathname) ? 'allow' : 'ignore';
    }

    if (['http:', 'https:'].includes(target.protocol)) {
      const hostname = target.hostname.replace(/^www\./, '');
      const siteHostname = new URL(siteUrl).hostname.replace(/^www\./, '');
      const isEmbeddedFrame = request.isTopFrame === false && request.hasTargetFrame !== false;
      return hostname === siteHostname || isEmbeddedFrame ? 'allow' : 'external';
    }

    return ['mailto:', 'tel:', 'sms:', 'whatsapp:'].includes(target.protocol)
      ? 'external'
      : 'ignore';
  } catch {
    return 'ignore';
  }
}

export function getLinkFailureMessage(url) {
  if (url.startsWith('mailto:')) {
    const address = url.slice('mailto:'.length).split('?')[0];
    return `Please install or configure an email app, or email ${address} manually.`;
  }
  if (url.startsWith('tel:')) {
    return `Please use a device that supports phone calls, or dial ${url.slice('tel:'.length)} manually.`;
  }
  if (url.startsWith('whatsapp:')) {
    return 'Please install WhatsApp, or use the email or phone number on this page.';
  }
  return 'This link could not be opened. Please try again or use another contact option on this page.';
}
