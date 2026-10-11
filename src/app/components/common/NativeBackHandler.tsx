import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// Screens that count as "home": Back there asks to press twice to exit the app.
const HOME_PATHS = new Set(['/', '/jemaat', '/admin', '/login']);
const isHome = (pathname: string, search: string) =>
  HOME_PATHS.has(pathname) || (pathname === '/dashboard' && !new URLSearchParams(search).get('tab'));

/** Closes the top-most open dialog / drawer / lightbox. Returns true if something was closed. */
function closeTopOverlay(): boolean {
  const overlays = [...document.querySelectorAll<HTMLElement>('.MuiDialog-root, .fixed.inset-0')]
    .filter(el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
    .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  const top = overlays[overlays.length - 1];
  if (!top) return false;

  if (top.classList.contains('MuiDialog-root')) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    top.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return true;
  }
  const buttons = [...top.querySelectorAll<HTMLButtonElement>('button')];
  const closer =
    buttons.find(b => /^(Batal|Tutup|Close|Kembali)$/i.test(b.textContent?.trim() || '')) ||
    buttons.find(b => b.querySelector('svg.lucide-x'));
  (closer ?? top).click(); // a bare backdrop (mobile drawer) closes on click
  return true;
}

/**
 * Android hardware/gesture Back:
 *  1. closes an open dialog or the drawer first,
 *  2. otherwise goes back one screen,
 *  3. on a home screen, needs a second press within 2s to exit.
 * Does nothing in a normal browser.
 */
export default function NativeBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastPress = useRef(0);
  const toast = useRef<HTMLDivElement | null>(null);
  const loc = useRef(location);
  loc.current = location;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showToast = (msg: string) => {
      toast.current?.remove();
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = 'position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:rgba(17,24,39,.92);color:#fff;padding:10px 18px;border-radius:999px;font:500 13px system-ui,sans-serif;z-index:99999;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.25)';
      document.body.appendChild(el);
      toast.current = el;
      setTimeout(() => { el.remove(); if (toast.current === el) toast.current = null; }, 1800);
    };

    const handle = CapApp.addListener('backButton', () => {
      if (closeTopOverlay()) return;

      const { pathname, search } = loc.current;
      if (isHome(pathname, search)) {
        const now = Date.now();
        if (now - lastPress.current < 2000) { CapApp.exitApp(); return; }
        lastPress.current = now;
        showToast('Tekan sekali lagi untuk keluar');
        return;
      }

      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-1);
      else navigate(pathname.startsWith('/dashboard') ? '/dashboard' : '/', { replace: true });
    });

    return () => { handle.then(h => h.remove()); };
  }, [navigate]);

  return null;
}
