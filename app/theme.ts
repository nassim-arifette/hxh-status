// The page follows the system colour scheme unless the reader has picked one
// with the header toggle. THEME_SCRIPT runs in <head>: it applies a stored pick
// as data-theme on <html> before the first paint, and it drives every
// [data-theme-toggle] button on the page by event delegation. Doing the toggle
// here rather than in a React component is what lets it work on the content
// pages, which ship no framework runtime (scripts/strip-page-scripts.mjs).
//
// Its bytes are identical on every page, so one CSP hash allows it everywhere
// (scripts/inject-csp-hashes.mjs).
//
// Switching grows the new theme out of the button as a circle, like ink
// spreading across the page, using the View Transitions API. Browsers without
// it, and readers who prefer reduced motion, get an instant switch.

export const themeStorageKey = "hxh-theme";

export const THEME_SCRIPT = `(function(){
var k=${JSON.stringify(themeStorageKey)},d=document,r=d.documentElement,m=function(q){return window.matchMedia(q).matches};
try{var s=localStorage.getItem(k);if(s==="light"||s==="dark")r.setAttribute("data-theme",s)}catch(e){}
function cur(){var t=r.getAttribute("data-theme");return t==="light"||t==="dark"?t:m("(prefers-color-scheme: light)")?"light":"dark"}
function sync(){var b=d.querySelectorAll("[data-theme-toggle]");for(var i=0;i<b.length;i++)b[i].setAttribute("aria-pressed",String(cur()==="dark"))}
d.addEventListener("DOMContentLoaded",sync);
window.matchMedia("(prefers-color-scheme: light)").addEventListener("change",sync);
d.addEventListener("click",function(e){
var b=e.target&&e.target.closest&&e.target.closest("[data-theme-toggle]");if(!b)return;
var n=cur()==="dark"?"light":"dark";
function go(){r.setAttribute("data-theme",n);try{localStorage.setItem(k,n)}catch(e){}sync()}
if(!d.startViewTransition||m("(prefers-reduced-motion: reduce)")){go();return}
var q=b.getBoundingClientRect(),x=q.left+q.width/2,y=q.top+q.height/2,
R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
d.startViewTransition(go).ready.then(function(){r.animate(
{clipPath:["circle(0px at "+x+"px "+y+"px)","circle("+R+"px at "+x+"px "+y+"px)"]},
{duration:520,easing:"cubic-bezier(0.22, 0.8, 0.24, 1)",pseudoElement:"::view-transition-new(root)"})})
})})();`;
