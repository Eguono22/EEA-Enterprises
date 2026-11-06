import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTACT_LINK_ORIGINS, getLinkFailureMessage, getNavigationAction } from '../utils/webview-navigation.js';

const siteUrl = 'https://eea-enterprises.com/';

test('internal blank frames do not open another app or show an alert', () => {
  for (const url of ['about:blank', 'about:blank#widget', 'about:srcdoc']) {
    assert.equal(getNavigationAction({ url }, siteUrl), 'allow');
  }
});

test('embedded third-party web content stays inside the page', () => {
  assert.equal(getNavigationAction({
    url: 'https://widget.example.com/embed',
    isTopFrame: false,
    hasTargetFrame: true,
  }, siteUrl), 'allow');
});

test('store navigation stays in the app', () => {
  for (const url of [siteUrl, '/contact-us/', `${siteUrl}contact-us/#email`, 'https://www.eea-enterprises.com/shop/']) {
    assert.equal(getNavigationAction({ url, isTopFrame: true }, siteUrl), 'allow');
  }
});

test('external top-level links and new windows open outside the WebView', () => {
  for (const request of [
    { url: 'https://wa.me/31621671526', isTopFrame: true },
    { url: 'https://example.com', isTopFrame: false, hasTargetFrame: false },
    { url: 'https://eea-enterprises.com.example.com/' },
    { url: 'https://example.com' }, // Android can omit iOS-only frame fields.
  ]) {
    assert.equal(getNavigationAction(request, siteUrl), 'external');
  }
});

test('phone, email and messaging links reach our handler even from a frame', () => {
  for (const url of ['mailto:support@eea-enterprises.com', 'tel:+31621671526', 'sms:+31621671526', 'whatsapp://send?phone=31621671526']) {
    assert.equal(getNavigationAction({ url, isTopFrame: false }, siteUrl), 'external');
    assert.ok(CONTACT_LINK_ORIGINS.includes(`${new URL(url).protocol}*`));
  }
});

test('invalid and browser-internal URLs do not launch another app', () => {
  for (const url of [undefined, null, '', '  ', 'https://[invalid', 'javascript:void(0)', 'data:text/html,test', 'about:config']) {
    assert.equal(getNavigationAction({ url }, siteUrl), 'ignore');
  }
});

test('a genuine contact-app failure leaves usable contact details', () => {
  const emailMessage = getLinkFailureMessage('mailto:support@eea-enterprises.com?subject=Help');
  assert.ok(emailMessage.includes('support@eea-enterprises.com'));
  assert.ok(!emailMessage.includes('?subject'));
  assert.ok(getLinkFailureMessage('tel:+31621671526').includes('+31621671526'));
  assert.ok(getLinkFailureMessage('whatsapp://send').includes('WhatsApp'));
});
