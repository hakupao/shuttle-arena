import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE } from "./config";

/** Attribute set on <html> while a non-default locale is pending; globals.css hides the body meanwhile. */
export const I18N_PENDING_ATTR = "data-i18n-pending";

/** Upper bound on how long the page stays hidden if hydration is slow or fails. */
const MAX_HIDDEN_MS = 3000;

/**
 * Inline <head> script, run before first paint. Prerendered HTML is always in
 * DEFAULT_LOCALE, so when the visitor's locale (same rules as I18nProvider:
 * cookie, then navigator.languages) differs, hide the page until the provider
 * has re-rendered in the right language instead of flashing English.
 */
export const I18N_BOOT_SCRIPT = `(function(){try{
var locales=${JSON.stringify(LOCALES)};
var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]*)/);
var l=m&&locales.indexOf(m[1])>=0?m[1]:null;
if(!l){var prefs=navigator.languages||[navigator.language];
for(var i=0;i<prefs.length&&!l;i++){var p=String(prefs[i]).toLowerCase().split(/[-_]/)[0];if(locales.indexOf(p)>=0)l=p;}}
if(l&&l!==${JSON.stringify(DEFAULT_LOCALE)}){var d=document.documentElement;d.setAttribute("${I18N_PENDING_ATTR}","");
setTimeout(function(){d.removeAttribute("${I18N_PENDING_ATTR}");},${MAX_HIDDEN_MS});}
}catch(e){}})();`;
