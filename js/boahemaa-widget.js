// ============================================================
// BOAHEMAA WIDGET — JavaScript
// Extracted from boahemaa (for integration).html
//
// Dependencies (must load BEFORE this file):
//   - js/boahemaa-persistence.js   (session/localStorage management)
//   - lottie.js  OR  bodymovin CDN (Lottie animation engine)
//
// Exposes on window:
//   window.boahemaaAccent(key)       — switch accent color
//   window.boahemaaBlush(bool)       — toggle blush state
//   window.boahemaaExpression(name)  — set facial expression
//   window.boahemaaBodyState(name)   — set body animation state
//   window.toggleDecline()           — toggle decline head-shake
//   window.resetExprButton()         — sync expression button UI
//   window._setBodyStateBtn(name)    — sync body-state button UI
//
// Internal state flags (read by multiple systems):
//   window._idleSystemReady          — wave intro complete
//   window._waveIntroActive          — disables mouse tracking during wave
//   window._hoverGreetShouldPlay     — first-hover greet pending
//   window._hoverGreetActive         — hover greet currently playing
//   window._bodyStateActive          — a chat body state is live
//   window._thinkingStateActive      — thinking state active (disables tracking)
//   window._typingStateActive        — typing state active
//   window._declineActive            — decline head-shake running
//   window._declineOX/OY             — scripted head position during decline
//   window._declineLidClose          — lid override during decline
//   window._boahemaaSlideImpulse()   — earring physics hook for body slide
//
// Body state API values:
//   'idle'           — default idle + grabbing hands + slide system
//   'idle-static'    — idle body, no slide, no grabbing hands
//   'typing'         — typing.json Lottie, loops
//   'thinking-left'  — thinking_left.json + forearm overlay, auto-alternates
//   'thinking-right' — thinking_right.json + forearm overlay, auto-alternates
// ============================================================



// ╔══════════════════════════════════════════════════════════
// ║  HEAD TRACKER + ACCENT + BLINK + EXPRESSION API
// ╚══════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────
//  BOAHEMAA HEAD TRACKER v6.0
//  SVG viewBox: 0 0 139.71 214.93 (scaled ×0.18752 from 745.1×1146.3)
//
//  RULES
//  1. ClipPath shapes NEVER move.
//  2. #Hair is INSIDE Head_Group_Clip → moves WITH face (+ox/+oy).
//  3. #Hair_Bun OUTSIDE the clip → COUNTER face (-ox/-oy).
//  4. Eye groups: translate + horizontal roll + vertical roll.
//       look up  (oy<0): right CW, left CCW
//       look down(oy>0): right CCW, left CW
//  5. Pupils get extra offset inside their clip.
//  6. Eyelid gaze: up → lid lifts, down → lid drops.
//  7. Blink composites on top of gaze lid offset.
//  8. Blush squint composites on top of blink + gaze.
//  9. Proximity infinite — always tracking.
//
//  v6 ADDITIONS
//  A. Earring pendulum physics — lag behind head with damped swing.
//  B. Blush glow pulse — slow opacity oscillation when blush is active.
//  C. Idle timeout — after N ms of no mouse movement, look forward.
//  D. Click startle — blink hard on click, then settle.
//  E. Proximity pupil dilation — pupils widen as cursor nears face.
//  F. Cross-eye convergence — when cursor is between the eyes
//     (near nose bridge), both pupils converge inward like someone
//     trying to focus on their own nose.
// ─────────────────────────────────────────────────────────

// ── SVG MEASUREMENTS ──────────────────────

document.addEventListener('DOMContentLoaded', function () {

// ============================================================
//  SELF-INJECTION — builds all widget DOM on load
//  Nothing needs to be added to any HTML page except:
//    <link rel="stylesheet" href="boahemaa-widget.css"> in <head>
//    <script src="js/boahemaa-persistence.js"></script>  in <head> (first)
//    <script src="lottie.js"></script>                   before this file
//    <script src="boahemaa-widget.js"></script>          last before </body>
// ============================================================

// ── ASSET PATH AUTO-DETECTION ──────────────────────────
//  Resolves the site-root-relative base path for assets.
//  Assets (images/, lottie/) live in the SITE ROOT, not next
//  to the script file.
//
//  Priority order:
//  1. data-base attribute on the <script> tag itself
//     e.g. <script src="js/boahemaa-widget.js" data-base="/"></script>
//     or   <script src="js/boahemaa-widget.js" data-base=""></script>
//  2. Auto-detect: strip the script's subdirectory so we always
//     resolve to the root-level base URL of the page's origin.
//     e.g. script at https://example.com/js/boahemaa-widget.js
//          → base = https://example.com/
//          → images → https://example.com/images/
//          → lottie  → https://example.com/lottie/
//
var _boahemaaBase = (function() {
  var scripts = document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf('boahemaa-widget') !== -1) {
      // Check for explicit data-base override first
      var dataBase = scripts[i].getAttribute('data-base');
      if (dataBase !== null) {
        // Ensure trailing slash
        return dataBase === '' ? '' : (dataBase.replace(/\/?$/, '/'));
      }
      // Auto: resolve to origin root so images/ and lottie/ are correct
      // regardless of what subdirectory the script lives in.
      try {
        var url = new URL(scripts[i].src);
        return url.origin + '/';
      } catch(e) {
        // Fallback for relative src values: walk up to root
        var src = scripts[i].src.replace(/\/[^\/]*$/, '/'); // script dir
        // If src is a full URL starting with http, extract origin
        return src.replace(/\/[^\/]+\/$/, '/').replace(/\/[^\/]+\/$/, '/');
      }
    }
  }
  return '/';  // fallback: site root
})();

(function injectWidgetHTML() {
  // Avatar + character assembly
  var avatarFrame = document.createElement('div');
  avatarFrame.id = 'avatar-frame';
  avatarFrame.innerHTML = [
    '<div id="character-root">',
    '  <div id="lottie-body"></div>',
    '  <div id="lottie-hover-greet" style="display:none"></div>',
    '  <div id="lottie-typing" style="display:none"></div>',
    '  <div id="lottie-thinking-left-base" style="display:none"></div>',
    '  <div id="lottie-thinking-left-forearm" style="display:none"></div>',
    '  <div id="lottie-thinking-right-base" style="display:none"></div>',
    '  <div id="lottie-thinking-right-forearm" style="display:none"></div>',
    '  <div id="body-clip-area">',
    '    <img id="body-inner" src="' + _boahemaaBase + 'images/boahemaa-idle-body.svg" alt="" draggable="false"/>',
    '  </div>',
    '  <div id="head-clip-area">',
    '    <div id="boahemaa-container"></div>',
    '  </div>',
    '  <div id="grabbing-hands" style="display:none"><div id="grabbing-hands-lottie"></div></div>',
    '  <div id="chat-frame"></div>',
    '</div>',
  ].join('\n');
  document.body.appendChild(avatarFrame);

  // Chat panel
  var panel = document.createElement('div');
  panel.id = 'boahemaa-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with Boahemaa');
  panel.innerHTML = [
    '<div class="boahemaa-panel-header">',
    '  <div class="boahemaa-header-avatar-wrap">',
    '    <div class="boahemaa-header-avatar-fallback" aria-hidden="true">AB</div>',
    '    <img class="boahemaa-header-avatar-img" src="' + _boahemaaBase + 'images/boahemaa-profile.svg" alt="Boahemaa" onerror="this.style.display=\'none\'"/>',
    '  </div>',
    '  <div class="boahemaa-header-info">',
    '    <div class="boahemaa-header-name">Boahemaa</div>',
    '    <div class="boahemaa-header-status">',
    '      <span class="boahemaa-status-dot online" id="boahemaa-status-dot"></span>',
    '      <span class="boahemaa-status-text" id="boahemaa-status-text">online</span>',
    '    </div>',
    '  </div>',
    '  <div class="boahemaa-header-actions">',
    '    <button class="boahemaa-btn-icon" id="boahemaa-new-chat" title="New conversation" aria-label="New conversation">',
    '      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    '    </button>',
    '    <button class="boahemaa-btn-icon" id="boahemaa-close" title="Close" aria-label="Close chat">',
    '      <svg viewBox="0 0 24 24" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    '    </button>',
    '  </div>',
    '</div>',
    '<div class="boahemaa-messages" id="boahemaa-messages"></div>',
    '<div class="boahemaa-input-area">',
    '  <div class="boahemaa-input-wrapper">',
    '    <textarea class="boahemaa-input" id="boahemaa-input" placeholder="Ask me anything about Eugene…" rows="1" aria-label="Type your message"></textarea>',
    '    <button class="boahemaa-send-btn" id="boahemaa-send" aria-label="Send message">',
    '      <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    '    </button>',
    '    <div class="boahemaa-vfx-ring" id="boahemaa-vfx"></div>',
    '  </div>',
    '</div>',
    '<div class="boahemaa-panel-footer">',
    '  <div class="boahemaa-footer-version">Boahemaa 1.0</div>',
    '  <div class="boahemaa-footer-tagline">Eugene\'s AI assistant</div>',
    '</div>',
  ].join('\n');
  document.body.appendChild(panel);

  // Hover tooltip
  var tooltip = document.createElement('div');
  tooltip.id = 'boahemaa-hover-tooltip';
  tooltip.textContent = 'Chat with me';
  document.body.appendChild(tooltip);

  // Debug overlay (hidden by default)
  var debug = document.createElement('div');
  debug.id = 'debug';
  debug.style.display = 'none';
  debug.innerHTML = '<span id="dot"></span><span id="dbg">—</span>';
  document.body.appendChild(debug);
})();


const SCLERA_CY       = 133.08;
const SCLERA_R        = 14.51;
const SCLERA_BOTTOM_Y = SCLERA_CY + SCLERA_R;   // 147.59
const SCLERA_TOP_Y    = SCLERA_CY - SCLERA_R;   // 118.57
const EYELID_BOTTOM_Y = 134.54;
const BLINK_TRAVEL    = SCLERA_BOTTOM_Y - EYELID_BOTTOM_Y; // 13.05

// Lid travel in SVG units (scaled ×0.18752 from original)
const GAZE_UP_LIFT   = 3.38;
const GAZE_DOWN_DROP = 7.13;
const EYE_VERT_ROLL  = 0.75;

// ── LERP ──────────────────────────────────
const LERP_TRACK  = 0.18;
const LERP_RETURN = 0.09;

// ── MOVEMENT RANGES ───────────────────────
// SVG-unit offsets scaled ×0.18752. Rotation degrees unchanged.
const M = {
  eyeGroup   : { x: 4.88, y: 9.0  },
  eyeRot     : 6,
  pupil      : { x: 5.63, y: 6.0  },
  eyeShade   : { x: 2.63, y: 0    },
  brow       : { x: 4.88, y: 7.88 },
  browRot    : 7,
  browVertRot: 9,
  nose       : { x: 2.63, y: 6.75 },
  lips       : { x: 2.06, y: 5.63 },
  hair       : { x: 3.38, y: 5.63 },
  hairBun    : { x: 7.13, y: 9.0  },
  ears       : { x: 3.0,  y: 3.75 },
  neckShade  : { x: 2.63, y: 3.38 },
};

// Sclera centers — rotation pivots for eye groups
const SCL_R = { cx: 96.26, cy: 133.08 };
const SCL_L = { cx: 43.5,  cy: 133.08 };

// Brow rotation pivots — outer tips
const BROW_R_PIV = { x: 112.7, y: 119.4 };
const BROW_L_PIV = { x: 27.0,  y: 119.4 };

// ── ACCENT COLORS ─────────────────────────
const ACCENT_COLORS = {
  white : '#f0f0f0',
  purple: '#8B5CF6',
  blue  : '#4A9EFF',
  cyan  : '#00D9FF',
  green : '#24FF72',
};

// ── LIP PATHS (scaled ×0.18752) ───────────
const LIP_UPPER_NEUTRAL = 'M81.59,174.85s-7.2,.79-11.74,.79-11.74,-.79-11.74,-.79';
const LIP_UPPER_SMILE   = 'M81.59,171.58s-7.2,4.88-11.74,4.88-11.74,-4.88-11.74,-4.88';
const LIP_UPPER_SMILE_SLIGHT = 'M81.59,173.2s-7.2,2.5-11.74,2.5-11.74,-2.5-11.74,-2.5';
const LIP_LOWER_NEUTRAL = 'M66.66,181.28h6.41';
const LIP_LOWER_SMILE   = 'M67.99,181.28q1.88,2.25 3.75,0';
const LIP_LOWER_BLUSH  = 'M69.7,181.28h0.3';  // shrinks to near-dot when blushing

// ── BLUSH STATE ───────────────────────────
let blushProgress  = 0;
let smileProgress  = 0;
let squintProgress = 0;
let squintExtra    = 0;
let blushActive    = false;
let blushRAF       = null;
const BLUSH_SQUINT_EXTRA = BLINK_TRAVEL;

// Nose drag hitbox in SVG viewBox coords
const NOSE_CENTER = { x: 69.86, y: 160.70 };
const NOSE_RADIUS = 16.9;

// ── STATE ─────────────────────────────────
let mouse  = { x: 0, y: 0 };
let cur    = { x: 0, y: 0 };
let tgt    = { x: 0, y: 0 };
let ready  = false;
let E      = {};
let blinkY = 0;
let isDragging = false;

// Expression override live values — composited into apply() each frame
let exprBrowY    = 0;
let exprBrowRot  = 0;
let exprBrowAsyR = 0;
let exprBrowAsyL = 0;
let exprBrowTiltL = 0;  // extra per-brow tilt: left brow outer-tip CCW (negative = anti-clockwise)
let exprBrowTiltR = 0;  // extra per-brow tilt: right brow outer-tip CW (positive = clockwise)
let exprLidDrop  = 0;
let exprDilate   = 0;  // extra pupil dilation (0=none, 1=full +15% on top of proximity)
// Pupil override — expression can push pupils to a fixed direction (normalized -1..1)
// 0 = no override (mouse-driven), non-zero blends toward fixed target
let exprPupilOX  = 0;
let exprPupilOY  = 0;

// ── v6 STATE ──────────────────────────────

// Earring pendulum physics — proper angular spring-damper (from file 4)
// earringAngle = current swing angle in degrees, earringVelocity = angular velocity
let earringAngle    = 0;
let earringVelocity = 0;
let prevOX          = 0;  // previous ox to detect acceleration
const EARRING_DAMPING  = 0.91;
const EARRING_SPRING   = 0.18;
const EARRING_DRIVE    = 14;   // how strongly head movement drives the swing

// Blush pulse
let blushPulseT    = 0;
let blushPulseDir  = 1;
const BLUSH_PULSE_SPEED = 0.018; // radians per frame
const BLUSH_PULSE_DEPTH = 0.18;  // ±18% opacity oscillation around base

// Idle return
let lastMouseTime  = Date.now();
const IDLE_TIMEOUT = 3000;       // ms before idle kicks in
let idleActive     = false;
const LERP_IDLE    = 0.04;       // slower drift back to center

// Click startle blink
let clickReacting = false;

// Proximity — cursor distance to face center in SVG units
// We track a "proximity factor" 0..1 where 1 = cursor is right on the face
let proximityFactor = 0;         // computed each tick
let proxTarget      = 0;
let proxCur         = 0;
const PROX_NEAR_SVG = 18;        // SVG units — full dilation starts here
const PROX_FAR_SVG  = 55;        // SVG units — no effect past here

// Base iris/pupil radii from the SVG (used for scaling)
const IRIS_BASE_R  = 5.91;
const PUPIL_BASE_R = 3.02;
// Dilation: just a subtle scale via transform, not radius change
// pupilDilate 0..1 gives ±0.15 scale of black iris (same as file 4)

// Cross-eye convergence rectangle — strictly the gap between the eyes:
// X: inner edge of left sclera to inner edge of right sclera (nose bridge)
// Y: bottom of nose up to brow level
// SCL_L cx=43.5 + r=14.51 = 58.01 inner right edge
// SCL_R cx=96.26 - r=14.51 = 81.75 inner left edge
// Nose bottom ~163, brow ~112
let convergeFactor  = 0;
let convergeTarget  = 0;
let convergeMX      = 0;   // normalised -1..1 mouse X within the convergence rectangle
let convergeMY      = 0;   // normalised -1..1 mouse Y within the convergence rectangle
// The rectangle in SVG space
const CONVERGE_X_MIN = 58.0;   // inner right edge of left sclera
const CONVERGE_X_MAX = 82.0;   // inner left edge of right sclera
const CONVERGE_Y_MIN = 112.0;  // brow level (top of rectangle)
const CONVERGE_Y_MAX = 195.0;  // chin level — below lips (extended from nose)
const NOSE_CENTER_X  = 69.86;
// When in the zone, how far pupils converge at full strength
const CONVERGE_SHIFT = 4.2;    // SVG units inward per eye

// ── IDLE / MICRO-MOVEMENT STATE ───────────
let isIdleTimeout   = false;
let idleEyelidDroop = 0;         // 0–1 how heavy the lids are
let microX = 0, microY = 0;
let microVX = 0, microVY = 0;

// ── LOOK-AWAY STATE ───────────────────────
let lookAwayActive  = false;
let lookAwayTgt     = { x: 0, y: 0 };
let lookAwayCur     = { x: 0, y: 0 };
let lookAwayTimer   = null;

// ── BREATHING STATE ───────────────────────
let breathPhase = 0;
const BREATH_RATE = 0.0012;      // ~0.3 Hz

// ── EXPRESSION STATE ──────────────────────
let currentExpression = 'neutral';

// lip morph targets — all derived from the closed lip curve
// upper: M81.59,174.85s-7.2,Ys-11.74,Ys-11.74,-Y (Y controls arch)
// lower: either flat line or a curve
const LIP_UPPER_FROWN_SLIGHT  = 'M81.59,176.5s-7.2,-1.3-11.74,-1.3-11.74,1.3-11.74,1.3';
const LIP_UPPER_FROWN         = 'M81.59,177.8s-7.2,-2.8-11.74,-2.8-11.74,2.8-11.74,2.8';
const LIP_UPPER_FROWN_DEEP    = 'M81.59,179.2s-7.2,-4.3-11.74,-4.3-11.74,4.3-11.74,4.3';
const LIP_UPPER_FLAT          = 'M81.59,174.85s-7.2,0-11.74,0-11.74,0-11.74,0';
const LIP_UPPER_DECLINE       = 'M81.59,175.7s-7.2,-0.7-11.74,-0.7-11.74,0.7-11.74,0.7'; // midpoint: slight frown, not full
const LIP_UPPER_SKEPTICAL     = 'M81.59,174.1s-7.2,2.2-11.74,0.4-11.74,-0.4-11.74,-0.4';
const LIP_LOWER_FROWN_SLIGHT  = 'M66.66,181.28h6.41';
const LIP_LOWER_FROWN         = 'M67.5,182.4q1.68,-1.7 3.36,0';
const LIP_LOWER_FROWN_DEEP    = 'M67.99,183.5q1.88,-2.8 3.75,0';
const LIP_LOWER_FLAT          = 'M66.66,181.28h6.41';

// Expression definitions
// browY: extra Y offset added to brow (negative = raise, positive = furrow/lower)
// browRotExtra: added rotation in degrees (pos = inner tips down for angry/worried V)
// browAsymR/browAsymL: per-brow Y tweak for asymmetric expressions (skeptical)
// lidDrop: extra eyelid droop added to stack (0=none, 1=halfway, 2=full concern droop)
// lipGroup: which pre-drawn SVG group to show (null = use closed lip + morph)
// lipUpper/lipLower: morph targets for the closed lip
const EXPRESSIONS = {
  'neutral': {
    browY: 0, browRotExtra: 0, browAsymR: 0, browAsymL: 0,
    lidDrop: 0, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_NEUTRAL, lipLower: LIP_LOWER_NEUTRAL,
  },
  'happy': {
    browY: -2.5, browRotExtra: 12.0, browAsymR: 0, browAsymL: 0,
    lidDrop: -2.2, exprDilate: 0,
    lipGroup: 'lips-happy',
    lipUpper: LIP_UPPER_SMILE, lipLower: LIP_LOWER_SMILE,
  },
  'smile': {
    browY: -2.5, browRotExtra: 12.0, browAsymR: 0, browAsymL: 0,
    lidDrop: -2.2, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_SMILE, lipLower: LIP_LOWER_BLUSH,
    blushOpacity: 0.25,
  },
  'excited': {
    browY: -4.0, browRotExtra: 18.0, browAsymR: 0, browAsymL: 0,
    lidDrop: -5.5, exprDilate: 0.5,
    lipGroup: 'lips-excited',
    lipUpper: LIP_UPPER_SMILE, lipLower: LIP_LOWER_SMILE,
  },
  'shocked': {
    browY: -3.5, browRotExtra: 0, browAsymR: 0, browAsymL: 0,
    lidDrop: -4.0, exprDilate: 0,  // lids pull UP (wide open)
    lipGroup: 'lips-shocked_surprised',
    lipUpper: LIP_UPPER_NEUTRAL, lipLower: LIP_LOWER_NEUTRAL,
  },
  'concerned': {
    browY: 1.2, browRotExtra: 4.5, browAsymR: 0, browAsymL: 0,
    lidDrop: 2.8, exprDilate: 0,
    lipGroup: 'lips-corncerned',
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'confused': {
    browY: 0.8, browRotExtra: 3.0, browAsymR: -1.5, browAsymL: 1.5,
    lidDrop: 1.5, exprDilate: 0,
    lipGroup: 'lips-confused',
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'sad': {
    browY: 1.8, browRotExtra: 6.0, browAsymR: 0, browAsymL: 0,
    lidDrop: 4.5, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN, lipLower: LIP_LOWER_FROWN,
  },
  'disappointed': {
    browY: 1.4, browRotExtra: 4.0, browAsymR: 0, browAsymL: 0,
    lidDrop: 3.8, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'thinking-left': {
    // Uses excited-style browRotExtra as the base arch for BOTH brows (inner tips up).
    // Left brow (dominant): gets full excited-level raise + extra tilt via browTiltL.
    // Right brow (secondary): gets the browRotExtra arch but no extra tilt — rises but less.
    browY: -4.0, browRotExtra: 12.0, browAsymR: 0, browAsymL: -2.5,
    browTiltL: -6.0,   // extra CCW on left outer tip — pushes left brow higher/more tilted
    browTiltR: 0,
    lidDrop: -5.0, exprDilate: 0,
    pupilOX: -0.72, pupilOY: -0.78,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'thinking-right': {
    // Mirror: right brow dominant, left brow secondary.
    browY: -4.0, browRotExtra: 12.0, browAsymR: -2.5, browAsymL: 0,
    browTiltL: 0,
    browTiltR: 6.0,    // extra CW on right outer tip — pushes right brow higher/more tilted
    lidDrop: -5.0, exprDilate: 0,
    pupilOX: 0.72, pupilOY: -0.78,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'thinking': {
    // Neutral-direction thinking: pupils centered (no lateral offset).
    // Brows: symmetric raised arch, slightly lower than excited (browY -2.5 vs -4.0).
    // Lids: less wide-open than thinking-left/right (-2.5 vs -5.0).
    // Lips: slight smile — gentle upward curve, not a full grin.
    browY: -2.5, browRotExtra: 14.0, browAsymR: 0, browAsymL: 0,
    browTiltL: 0, browTiltR: 0,
    lidDrop: -2.5, exprDilate: 0,
    pupilOX: 0, pupilOY: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_SMILE_SLIGHT, lipLower: LIP_LOWER_SMILE,
  },
  'decline': {
    // Used during the decline head-shake expression.
    // Brows raise slightly upward (not full happy raise — more resigned/firm).
    // Lips sit between neutral and a slight frown — not sad, just "no".
    // Lids stay open at rest; the decline animation closes them during the shake.
    browY: -1.2, browRotExtra: 4.0, browAsymR: 0, browAsymL: 0,
    browTiltL: 0, browTiltR: 0,
    lidDrop: 0, exprDilate: 0,
    pupilOX: 0, pupilOY: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_DECLINE, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'curious': {
    browY: -2.0, browRotExtra: 1.0, browAsymR: -2.0, browAsymL: 0,
    lidDrop: -2.0, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FLAT, lipLower: LIP_LOWER_FLAT,
  },
  'skeptical': {
    browY: 0, browRotExtra: 0, browAsymR: -2.5, browAsymL: 1.8,
    lidDrop: 1.2, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_SKEPTICAL, lipLower: LIP_LOWER_FLAT,
  },
  'annoyed': {
    browY: 1.5, browRotExtra: 3.5, browAsymR: 0, browAsymL: 0,
    lidDrop: 3.2, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
  },
  'angry': {
    browY: 2.2, browRotExtra: 8.0, browAsymR: 0, browAsymL: 0,
    lidDrop: 3.8, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN, lipLower: LIP_LOWER_FROWN,
  },
  // Blush range — lid squint handled by blush system, but brow/lip can vary
  'slight-blush': {
    browY: 0, browRotExtra: 0, browAsymR: 0, browAsymL: 0,
    lidDrop: 0, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_NEUTRAL, lipLower: LIP_LOWER_NEUTRAL,
    blushLevel: 0.25,
  },
  'warm-shy': {
    browY: 0.8, browRotExtra: 1.0, browAsymR: 0, browAsymL: 0,
    lidDrop: 1.5, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_NEUTRAL, lipLower: LIP_LOWER_NEUTRAL,
    blushLevel: 0.5,
  },
  'embarrassed': {
    browY: 1.5, browRotExtra: 3.0, browAsymR: 0, browAsymL: 0,
    lidDrop: 3.0, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
    blushLevel: 0.75,
  },
  'very-blushed': {
    browY: 1.8, browRotExtra: 4.0, browAsymR: 0, browAsymL: 0,
    lidDrop: 4.2, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
    blushLevel: 1.0,
  },
  'super-shy': {
    browY: 1.2, browRotExtra: 2.5, browAsymR: 0, browAsymL: 0,
    lidDrop: 3.5, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN_SLIGHT, lipLower: LIP_LOWER_FROWN_SLIGHT,
    blushLevel: 0.9,
  },
  'happy-blush': {
    browY: -1.2, browRotExtra: 0, browAsymR: 0, browAsymL: 0,
    lidDrop: 1.5, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_SMILE, lipLower: LIP_LOWER_SMILE,
    blushLevel: 0.8,
  },
  'flustered': {
    browY: 2.5, browRotExtra: 5.5, browAsymR: 0, browAsymL: 0,
    lidDrop: 3.0, exprDilate: 0,
    lipGroup: null,
    lipUpper: LIP_UPPER_FROWN, lipLower: LIP_LOWER_FROWN,
    blushLevel: 1.0,
  },
};

// For backwards compat — EXPRESSION_GROUPS still used in setBlushState
const EXPRESSION_GROUPS = {
  'neutral'  : 'lips-closed-expressions',
  'happy'    : 'lips-happy',
  'excited'  : 'lips-excited',
  'shocked'  : 'lips-shocked_surprised',
  'concerned': 'lips-corncerned',
  'confused' : 'lips-confused',
};

// Expression transition state — animated lerp between two states
let exprFrom = null;
let exprTo   = null;
let exprT    = 1.0;   // 0=from, 1=to (fully arrived)
let exprRaf  = null;
const EXPR_SPEED = 0.07;

// Current lip group being shown (used for smooth transition from)
let currentExprLipGroup = null;

// ── SVG (embedded inline) ─────────────────
const SVG_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 139.71 214.93">
  <defs>
    <style>
      .cls-1 {
        clip-path: url(#clippath-6);
      }

      .cls-2 {
        fill: #d3d6e1;
      }

      .cls-3 {
        fill: #371613;
      }

      .cls-3, .cls-4, .cls-5, .cls-6, .cls-7, .cls-8, .cls-9, .cls-10, .cls-11, .cls-12, .cls-13, .cls-14, .cls-15, .cls-16 {
        fill-rule: evenodd;
      }

      .cls-17 {
        clip-path: url(#clippath-4);
      }

      .cls-4 {
        fill: #f0f0f0;
      }

      .cls-18 {
        stroke: #411a17;
        stroke-width: .9px;
      }

      .cls-18, .cls-19, .cls-20, .cls-21, .cls-22 {
        fill: none;
      }

      .cls-18, .cls-21, .cls-22 {
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .cls-5 {
        fill: #411a17;
      }

      .cls-23 {
        fill: #0e0e11;
      }

      .cls-24 {
        fill: #3d1412;
      }

      .cls-6, .cls-9 {
        fill: #000005;
      }

      .cls-25 {
        fill: #e84040;
      }

      .cls-26 {
        opacity: .4;
      }

      .cls-20 {
        stroke-width: .45px;
      }

      .cls-20, .cls-8, .cls-9, .cls-14 {
        stroke: #000;
        stroke-miterlimit: 10;
      }

      .cls-27 {
        clip-path: url(#clippath-1);
      }

      .cls-7 {
        fill: #0e0d0f;
      }

      .cls-28, .cls-29, .cls-30 {
        isolation: isolate;
      }

      .cls-8, .cls-9 {
        stroke-width: .09px;
      }

      .cls-8, .cls-14 {
        fill: #101017;
      }

      .cls-31 {
        clip-path: url(#clippath-5);
      }

      .cls-32 {
        fill: #46241a;
      }

      .cls-33 {
        clip-path: url(#clippath-3);
      }

      .cls-21 {
        stroke-width: 1.8px;
      }

      .cls-21, .cls-22 {
        stroke: #3d1412;
      }

      .cls-34 {
        opacity: 0;
      }

      .cls-10 {
        fill: #e09815;
      }

      .cls-11 {
        fill: #ab4340;
      }

      .cls-12 {
        fill: #834832;
      }

      .cls-35 {
        fill: #e5eaf3;
      }

      .cls-29 {
        mix-blend-mode: screen;
      }

      .cls-29, .cls-30 {
        opacity: .6;
      }

      .cls-36 {
        clip-path: url(#clippath-2);
      }

      .cls-13 {
        fill: #6a3129;
      }

      .cls-14 {
        stroke-width: .71px;
      }

      .cls-15 {
        fill: #3c1513;
      }

      .cls-16 {
        fill: #eaeaea;
      }

      .cls-37 {
        clip-path: url(#clippath);
      }

      .cls-22 {
        stroke-width: 2.25px;
      }
    </style>
    <clipPath id="clippath">
      <path class="cls-19" d="M69.86,154.36h0c9.45,0,17.18,7.73,17.18,17.18v26.21c0,9.45-7.73,17.18-17.18,17.18s-17.18-7.73-17.18-17.18v-26.21c0-9.45,7.73-17.18,17.18-17.18Z"/>
    </clipPath>
    <clipPath id="clippath-1">
      <path class="cls-19" d="M69.86,53.46c41.05,0,70.75,27.88,59.55,69.85-2.64,9.88-7.95,38.08-13.78,46.67-4.74,6.99-13.58,13.13-20.94,17.06-8.34,4.46-16.09,8.06-24.84,8.06s-16.5-3.6-24.84-8.06c-7.35-3.94-16.2-10.07-20.94-17.06-5.81-8.59-11.14-36.77-13.78-46.67C-.89,81.34,28.82,53.46,69.86,53.46Z"/>
    </clipPath>
    <clipPath id="clippath-2">
      <circle class="cls-19" cx="96.26" cy="133.08" r="14.51"/>
    </clipPath>
    <clipPath id="clippath-3">
      <circle class="cls-19" cx="96.26" cy="133.08" r="14.51"/>
    </clipPath>
    <clipPath id="clippath-4">
      <circle class="cls-19" cx="43.5" cy="133.08" r="14.51" transform="translate(-.91 .3) rotate(-.39)"/>
    </clipPath>
    <clipPath id="clippath-5">
      <circle class="cls-19" cx="43.5" cy="133.08" r="14.51" transform="translate(-.91 .3) rotate(-.39)"/>
    </clipPath>
    <clipPath id="clippath-6">
      <path class="cls-19" d="M158.36,14.66l18.75,76.3-48.06,64.95-3.77-15.13-5.79-23.21-5.76-8.68-3.53-16.73s-15.26-5.93-40.35-5.93-40.35,5.93-40.35,5.93l-3.53,16.73-5.76,8.68-5.79,23.21-3.77,15.13-48.06-64.95L-18.64,14.66,69.86-10.5l88.5,25.18v-.02Z"/>
    </clipPath>

    <filter id="outer-glow-1" x="-50%" y="-50%" width="200%" height="200%">
      <feFlood flood-color="#f0f0f0" flood-opacity="0.8" result="glowColor"/>
      <feComposite in="glowColor" in2="SourceGraphic" operator="in" result="glowMasked"/>
      <feGaussianBlur in="glowMasked" result="blurred" stdDeviation="3.5"/>
      <feMerge>
        <feMergeNode in="blurred"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="outer-glow-2" x="-50%" y="-50%" width="200%" height="200%">
      <feFlood flood-color="#f0f0f0" flood-opacity="0.8" result="glowColor"/>
      <feComposite in="glowColor" in2="SourceGraphic" operator="in" result="glowMasked"/>
      <feGaussianBlur in="glowMasked" result="blurred" stdDeviation="3.5"/>
      <feMerge>
        <feMergeNode in="blurred"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="outer-glow-3" x="-50%" y="-50%" width="200%" height="200%">
      <feFlood flood-color="#f0f0f0" flood-opacity="0.8" result="glowColor"/>
      <feComposite in="glowColor" in2="SourceGraphic" operator="in" result="glowMasked"/>
      <feGaussianBlur in="glowMasked" result="blurred" stdDeviation="3.5"/>
      <feMerge>
        <feMergeNode in="blurred"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="blush-blur" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="7.5"/>
    </filter>
  </defs>
  <g class="cls-28">
    <g id="Layer_2" data-name="Layer 2">
      <g id="Layer_1-2" data-name="Layer 1">
        <g id="Boahemaa-Head">
          <g id="Neck">
            <path id="Neck_Base" data-name="Neck Base" class="cls-12" d="M69.86,154.36h0c9.45,0,17.18,7.73,17.18,17.18v26.21c0,9.45-7.73,17.18-17.18,17.18h0c-9.45,0-17.18-7.73-17.18-17.18v-26.21c0-9.45,7.73-17.18,17.18-17.18h0Z"/>
            <g id="neck_shade_clip" data-name="neck shade clip">
              <g class="cls-37">
                <path id="neck_shade" data-name="neck shade" class="cls-15" d="M69.86,154.36h0c11.16,0,20.27,9.13,20.27,20.27v13.63c0,11.16-9.13,20.27-20.27,20.27h0c-11.16,0-20.27-9.13-20.27-20.27v-13.63c0-11.16,9.13-20.27,20.27-20.27h0Z"/>
              </g>
            </g>
            <path id="neck_joint_circle" data-name="neck joint circle" class="cls-19" d="M69.86,180.57c9.49,0,17.18,7.69,17.18,17.18s-7.69,17.18-17.18,17.18-17.18-7.69-17.18-17.18,7.69-17.18,17.18-17.18ZM69.86,180.57v34.35M87.04,197.75h-34.35"/>
          </g>
          <g id="Hair_Bun" data-name="Hair Bun">
            <polygon id="hair_bun_base" data-name="hair bun base" class="cls-14" points="69.86 112.69 66.22 108.98 60.11 112.17 55.52 104.84 48.88 109.67 45.52 102.38 38.77 104.11 35.75 96.77 26.28 94.47 24.73 87.92 19.2 84.45 19.8 80.1 13.63 76.11 15.2 67.05 9.86 58.79 15.05 49.67 13.01 42.68 17.77 39.88 17.77 32.72 23.9 29.46 26.32 18.92 37.83 15.4 40.93 9.11 49.07 9.11 54.63 2.59 61.37 5.46 69.86 .41 78.34 5.46 85.07 2.59 90.64 9.11 98.77 9.11 101.87 15.4 113.4 18.92 115.8 29.46 121.93 32.72 121.93 39.88 126.69 42.68 124.65 49.67 129.84 58.79 124.5 67.05 126.09 76.11 119.91 80.1 120.52 84.45 114.97 87.92 113.42 94.47 103.97 96.77 100.93 104.11 94.18 102.38 90.82 109.67 84.2 104.84 79.61 112.17 73.48 108.98 69.86 112.69"/>
            <path id="hair_bun_shade" data-name="hair bun shade" class="cls-6" d="M69.86,112.69l-3.64-3.71-6.11,3.19-4.59-7.33-6.64,4.82-3.34-7.28-6.75,1.71-3.02-7.33-9.45-2.29-1.56-6.56-5.55-3.47.62-4.35-6.19-3.99,1.58-9.04-5.34-8.27,5.19-9.11-2.04-6.99,4.76-2.81v-7.16l3.56,2.23v4.88l2.36,1.01-1.41,7.33,7.46,5.12-1.24,2.18,3,5.59,7.26.53c4.78,3.84,11.18,5.1,11.18,5.1l4.39,2.87,9.73-.98,9.86,2.42,9.6-2.16,8.81,1.05,10.56-1.07h9.02l3.36-2.72,1.2-5.64c1.22,0,6.28-1.67,6.28-1.67l1.88-9.09,5.19,9.11-5.34,8.27,1.58,9.04-6.19,3.99.62,4.35-5.53,3.47-1.56,6.56-9.47,2.29-3.04,7.33-6.75-1.71-3.34,7.28-6.64-4.82-4.59,7.33-6.11-3.19-3.64,3.71h.02v-.02Z"/>
            <g id="hair_bun_highlight" data-name="hair bun highlight" class="cls-29" filter="url(#outer-glow-2)">
              <polygon class="cls-4" points="37.83 15.4 40.93 9.11 49.07 9.11 54.63 2.59 61.37 5.46 69.86 .41 78.34 5.46 85.07 2.59 90.64 9.11 98.77 9.11 101.87 15.4 113.4 18.92 115.8 29.46 121.93 32.72 121.93 39.88 126.69 42.7 124.65 49.67 129.84 58.79 124.5 67.05 126.62 58.32 121.63 51.38 122.7 43.82 117.73 40.97 118.18 35.35 112.69 32.2 110.51 21.34 99.02 19.13 96.41 12.58 89.96 12.85 84.54 7.52 78.05 9.92 69.86 5.05 62.98 8.91 56.47 6.68 51.78 11.63 42.75 11.16 37.83 15.4"/>
            </g>
          </g>
          <g id="Ears">
            <g id="Ear_Left" data-name="Ear Left">
              <path id="ear_lobe_left" data-name="ear lobe left" class="cls-12" d="M28.16,138.76s-21.43-9.9-23.08-9.69c-1.65.19-4.48,3.88-4.74,5.01s-.62,11.48,0,12.94,12.38,13.89,13.71,14.31,14.19-2.63,14.19-2.63l-.08-19.91h0v-.02h0Z"/>
              <path id="ear_inner_shade_left" data-name="ear inner shade left" class="cls-13" d="M21.78,156.74s-12.34-7.37-12.54-7.91-1.33-11.59-1.33-11.59l4.63.32,5.61,4.67,3.62,14.53h.02v-.02h-.01Z"/>
              <polyline id="ear_inner_stroke_left" data-name="ear inner stroke left" class="cls-18" points="18.16 142.23 12.54 137.56 7.93 137.26 4.66 141.68"/>
              <path id="earring_left" data-name="earring left" class="cls-10" d="M15.05,160.24c-.83,2.48-2.68,8.18-2.68,9.51s1.37,3.08,3.08,3.08,3.08-1.37,3.08-3.08-1.86-7.01-2.68-9.51c1.01-.19,1.78-1.07,1.78-2.14s-.98-2.18-2.18-2.18-2.18.98-2.18,2.18.77,1.95,1.78,2.14h0Z"/>
            </g>
            <g id="Ear_Right" data-name="Ear Right">
              <path id="ear_lobe_right" data-name="ear lobe right" class="cls-12" d="M111.54,138.76s21.43-9.9,23.08-9.69,4.48,3.88,4.74,5.01.62,11.48,0,12.94-12.38,13.89-13.71,14.31-14.19-2.63-14.19-2.63l.08-19.91h0v-.02h0Z"/>
              <path id="ear_inner_shade_right" data-name="ear inner shade right" class="cls-13" d="M117.92,156.74s12.34-7.37,12.54-7.91,1.33-11.59,1.33-11.59l-4.63.32-5.63,4.67-3.62,14.53h0v-.02h0Z"/>
              <polyline id="ear_inner_stroke_right" data-name="ear inner stroke right" class="cls-18" points="121.54 142.23 127.16 137.56 131.77 137.26 135.06 141.68"/>
              <path id="earring_right" data-name="earring right" class="cls-10" d="M124.65,160.24c.83,2.48,2.68,8.18,2.68,9.51s-1.37,3.08-3.08,3.08-3.08-1.37-3.08-3.08,1.86-7.01,2.68-9.51c-1.01-.19-1.78-1.07-1.78-2.14s.98-2.18,2.18-2.18,2.18.98,2.18,2.18-.77,1.95-1.78,2.14h0Z"/>
              <g id="ear_lobe_highlight" data-name="ear lobe highlight" class="cls-29" filter="url(#outer-glow-3)">
                <path class="cls-4" d="M111.54,138.76s21.43-9.9,23.08-9.69,4.48,3.88,4.74,5.01c.26,1.13.62,11.48,0,12.94-.32.77-3.73,4.56-7.09,8.06,0-.04,5.63-7.67,6.06-8.64.43-.98,0-9.81-.3-11.64-.32-1.84-2.72-3.47-3.81-3.79-1.07-.32-22.69,7.78-22.69,7.78h0v-.02h0Z"/>
              </g>
            </g>
          </g>
          <path id="Head_Base" data-name="Head Base" class="cls-12" d="M69.86,53.46c41.05,0,70.75,27.88,59.55,69.85-2.64,9.88-7.95,38.08-13.78,46.67-4.74,6.99-13.58,13.13-20.94,17.06-8.34,4.46-16.09,8.06-24.84,8.06s-16.5-3.6-24.84-8.06c-7.35-3.94-16.2-10.07-20.94-17.06-5.81-8.59-11.14-36.77-13.78-46.67C-.89,81.34,28.82,53.46,69.86,53.46h0Z"/>
          <g id="Head_Group_Clip" data-name="Head Group Clip">
            <g class="cls-27">
              <g>
                <g id="Face">
                  <g id="Blush" filter="url(#blush-blur)" class="cls-34">
                    <g class="cls-30">
                      <path class="cls-25" d="M44.06,147.78c11.4,0,16.88,4.37,16.88,9.75s-5.48,9.75-16.88,9.75-16.88-4.37-16.88-9.75,5.48-9.75,16.88-9.75Z"/>
                    </g>
                    <g class="cls-30">
                      <path class="cls-25" d="M95.64,147.78c11.4,0,16.88,4.37,16.88,9.75s-5.48,9.75-16.88,9.75-16.88-4.37-16.88-9.75,5.48-9.75,16.88-9.75h0Z"/>
                    </g>
                  </g>
                  <path id="Nose" class="cls-5" d="M67.65,160.21c.68.3,1.2.66,2.21.66s1.52-.36,2.21-.66,2.29-.49,2.19.3c-.17,1.48-2.98,2.91-4.41,2.98-1.43-.08-4.24-1.5-4.41-2.98-.09-.79,1.52-.6,2.19-.3h.02Z"/>
                  <g id="Lips">
                    <g id="lips-happy" class="cls-34">
                      <g id="lips_upper" data-name="lips upper">
                        <g>
                          <path id="Lips_Upper_Base" data-name="Lips Upper Base" class="cls-3" d="M59.47,174.37h20.77s-1.72,8.78-10.39,8.78-10.39-8.78-10.39-8.78h0Z"/>
                          <path id="_1" data-name=" 1" class="cls-24" d="M69.86,173.58v1.58h-10.39v-1.58h10.39ZM69.86,173.58c.43,0,.79.36.79.79s-.36.79-.79.79v-1.58ZM81.01,174.52l-1.54-.3.77.94h-10.39v-1.58h10.39l.77.94h0ZM80.23,173.58c.43,0,.79.36.79.79s-.36.79-.79.79v-1.58ZM69.86,183.91v-1.58h.75l.69-.09.66-.11.62-.15.58-.19.54-.21.52-.24.49-.26.45-.3.43-.32.39-.34.37-.36.36-.36.32-.38.3-.38.28-.38.26-.38.22-.38.21-.38.19-.38.17-.36.15-.34.13-.32.11-.3.09-.28.07-.24.06-.23.06-.19.04-.15v-.11s.04-.06.04-.06h0l1.54.3v.11s-.06.13-.06.13l-.04.17-.06.21-.07.24-.09.28-.11.32-.13.34-.15.36-.17.38-.19.39-.21.41-.24.43-.26.43-.28.43-.32.43-.34.43-.37.43-.41.41-.43.41-.47.39-.51.38-.54.36-.58.32-.62.28-.66.24-.69.21-.73.17-.77.13-.81.08h-.84l.06.09h0ZM69.86,183.91c-.43,0-.79-.36-.79-.79s.36-.79.79-.79v1.58ZM59.47,173.58v1.58l.77-.94h0v.19s.06.15.06.15l.06.19.06.23.07.24.09.28.11.3.13.32.15.34.17.36.19.38.21.38.22.38.26.38.28.38.3.38.32.38.36.36.37.36.39.34.43.32.45.3.49.26.52.24.54.21.58.19.62.15.66.11.69.08h.75v1.59h-.84l-.81-.11-.77-.13-.73-.17-.69-.21-.66-.24-.62-.28-.58-.32-.54-.36-.51-.38-.47-.39-.43-.41-.41-.41-.37-.43-.34-.43-.32-.43-.28-.43-.26-.43-.24-.43-.21-.41-.19-.39-.17-.38-.15-.36-.13-.34-.11-.32-.09-.28-.07-.24-.06-.21-.04-.17-.04-.13v-.11s.75-.94.75-.94h0l.07-.08h0ZM58.68,174.52c-.07-.43.19-.84.62-.92s.84.19.92.62l-1.54.3h0Z"/>
                        </g>
                        <path id="teeth" class="cls-16" d="M69.86,174.37h8.64c-.67,2.49-4.65,3.94-8.64,4.03-3.99-.09-7.97-1.54-8.64-4.03h8.64Z"/>
                        <path id="tongue" class="cls-11" d="M69.86,179.82c2.01,0,4.41.38,5.47,1.82-1.41.88-3.21,1.48-5.47,1.48s-4.07-.6-5.47-1.48c1.05-1.44,3.47-1.82,5.47-1.82h0Z"/>
                      </g>
                      <path id="Lip_Curve_Bottom" data-name="Lip Curve Bottom" class="cls-24" d="M71.86,184.3c.37-.23.86-.11,1.09.26s.11.86-.26,1.09l-.82-1.33h0v-.02ZM69.86,186.44v-1.58h.73l.06-.04h.06l.06-.04h.06l.06-.04h.06l.06-.04h.06l.06-.06h.06l.06-.06h.06l.06-.06.06-.04.06-.04.06-.04.06-.04.06-.04.06-.04.82,1.33-.07.06-.09.06-.09.06-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04h-.09l-.09.06h-.09l-.09.04h-.09l-.09.04h-.09l-.09.04h-.94l.36.04h0ZM69.86,186.44c-.43,0-.79-.36-.79-.79s.36-.79.79-.79v1.58ZM67.01,185.65l.82-1.33.06.04.06.04.06.04.06.04.06.04.06.04.06.04h.06l.06.06h.06l.06.06h.06l.06.04h.06l.06.04h.06l.06.04h.06l.06.04h.73v1.58h-1.03l-.09-.04h-.09l-.09-.04h-.09l-.09-.04h-.09l-.09-.06-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.06-.09-.06-.07-.06h.36v-.02ZM67.01,185.65c-.37-.23-.49-.71-.26-1.09s.71-.49,1.09-.26l-.82,1.33h0v.02Z"/>
                    </g>
                    <g id="lips-excited" class="cls-34">
                      <path id="Lip_Curve_Bottom_0" data-name="Lip Curve Bottom 0" class="cls-24" d="M71.47,186.31c.36-.26.84-.17,1.11.19s.17.84-.17,1.11l-.92-1.28h-.02v-.02ZM69.86,188.43v-1.58h.84l.06-.04h.06l.06-.04h.06l.06-.04h.06l.06-.04h.06l.06-.06h.06l.06-.06h.06l.06-.06.06-.04.06-.04.06-.04.06-.04.92,1.28-.07.06-.07.06-.07.06-.07.06-.07.04-.07.04-.07.04-.07.04-.07.04-.07.04-.07.04-.07.04-.07.04-.07.04h-.07l-.07.06h-.07l-.07.06h-.07l-.07.04h-.07l-.07.04h-.07l-.07.04h-.6l-.32-.04h0v-.02ZM69.86,188.43c-.43,0-.79-.36-.79-.79s.36-.79.79-.79v1.58h0ZM67.31,187.6l.92-1.28.06.04.06.04.06.04.06.04.06.04h.06l.06.06h.06l.06.06h.06l.06.04h.06l.06.04h.06l.06.04h.06l.06.04h.06l.06.04h.73v1.58h-.67l-.07-.04h-.07l-.07-.04h-.07l-.07-.04h-.07l-.07-.06h-.07l-.07-.06-.07-.04-.07-.04-.07-.04-.07-.04-.07-.04-.07-.04-.07-.04-.07-.04-.07-.04-.07-.04-.07-.06-.07-.06-.07-.06-.07-.06h-.32v.04h0ZM67.31,187.6c-.36-.26-.43-.75-.17-1.11s.75-.43,1.11-.19l-.92,1.28h-.02v.02Z"/>
                      <g>
                        <g>
                          <path id="Lips_Upper_Base_1" data-name="Lips Upper Base 1" class="cls-3" d="M59.47,174.37h20.77s-1.72,10.86-10.39,10.86-10.39-10.86-10.39-10.86h0Z"/>
                          <path id="_1_2" data-name=" 1 2" class="cls-24" d="M69.86,173.58v1.58h-10.39v-1.58h10.39ZM69.86,173.58c.43,0,.79.36.79.79s-.36.79-.79.79v-1.58ZM81.01,174.48l-1.56-.24.77.92h-10.39v-1.58h10.39l.77.92h0l.02-.02ZM80.23,173.58c.43,0,.79.36.79.79s-.36.79-.79.79v-1.58ZM69.86,186.01v-1.58h0l.73-.04.69-.08.66-.13.62-.19.58-.23.54-.26.52-.3.49-.34.45-.36.43-.39.41-.41.37-.43.36-.45.34-.47.3-.47.28-.49.26-.49.24-.49.21-.47.19-.47.17-.45.15-.43.13-.41.11-.38.09-.36.07-.32.07-.28.06-.23.04-.19v-.13s.04-.08.04-.08h0l1.56.23v.13s-.06.15-.06.15l-.04.21-.06.26-.07.3-.09.34-.11.38-.13.41-.15.45-.17.47-.19.49-.21.51-.22.53-.26.53-.28.53-.32.54-.34.53-.37.53-.41.53-.43.51-.47.49-.51.45-.54.43-.58.39-.62.36-.66.32-.69.26-.73.23-.77.17-.82.09-.86.04h0v.02ZM69.86,186.01c-.43,0-.79-.36-.79-.79s.36-.79.79-.79v1.58ZM59.47,173.58v1.58l.77-.92h0v.23s.06.19.06.19l.06.23.07.28.07.32.09.36.11.38.13.41.15.43.17.45.19.47.21.47.24.49.26.49.28.49.3.47.34.47.36.45.37.43.41.41.43.39.45.36.49.34.52.3.54.26.58.23.62.19.66.13.69.08.73.04v1.58l-.86-.04-.82-.09-.77-.17-.73-.23-.69-.26-.66-.32-.62-.36-.58-.39-.54-.43-.51-.45-.47-.49-.43-.51-.41-.53-.37-.53-.34-.53-.32-.54-.28-.53-.26-.53-.22-.53-.21-.51-.19-.49-.17-.47-.15-.45-.13-.41-.11-.38-.09-.34-.07-.3-.06-.26-.04-.21-.04-.15v-.13s.75-.92.75-.92h.04ZM58.68,174.48c-.07-.43.22-.83.66-.9s.82.23.9.66l-1.56.24h0Z"/>
                        </g>
                        <path id="teeth_3" data-name="teeth 3" class="cls-16" d="M70.12,174.35h8.64c-.67,2.49-4.91,3.38-8.91,3.47-3.99-.09-7.71-.98-8.36-3.47h8.64-.02Z"/>
                        <path id="tongue_4" data-name="tongue 4" class="cls-11" d="M69.86,182.56c2.27-.6,4.03,0,5.17,1.03-1.37.98-3.06,1.61-5.17,1.61s-3.84-.66-5.21-1.65c1.18-1.01,3.02-1.59,5.21-.99Z"/>
                      </g>
                    </g>
                    <g id="lips-shocked_surprised" data-name="lips-shocked surprised" class="cls-34">
                      <path d="M75.43,180.31h-.32v-.56s-.06-.28-.06-.28l-.04-.28-.06-.28-.07-.28-.07-.28-.09-.28-.11-.28-.11-.28-.13-.26-.13-.26-.15-.26-.15-.24-.17-.24-.17-.24-.19-.23-.19-.23-.21-.21-.21-.21-.21-.19-.22-.17-.22-.17-.22-.15-.24-.13-.24-.11-.24-.09-.24-.08-.26-.08-.26-.06-.26-.04h-.26v-.32h.3l.28.04.28.06.28.08.28.09.26.11.26.13.26.13.24.15.24.17.22.19.22.19.22.21.21.23.21.23.19.24.19.24.17.26.17.26.15.26.15.28.13.28.13.28.11.28.09.28.09.3.07.3.06.3.06.3.04.3v.28s.04.28.04.28h0l-.09.04h0ZM69.86,184.66v-.32h.81l.26-.04.26-.04.24-.04.24-.06.24-.06.24-.06.22-.08.22-.08.21-.09.21-.09.21-.09.19-.11.19-.11.17-.13.17-.13.15-.15.15-.15.13-.17.13-.17.11-.17.11-.19.09-.19.07-.21.07-.21.06-.23.04-.23.04-.24v-.26s.02-.26.02-.26h.32v.28l-.04.28-.04.26-.06.24-.06.24-.07.23-.09.23-.09.21-.11.21-.13.19-.13.19-.15.17-.15.17-.17.15-.17.15-.19.13-.19.13-.21.11-.21.11-.22.09-.22.09-.22.08-.24.08-.24.08-.24.06-.26.06-.26.04-.26.04h-.28l-.28.04h-.58v.02ZM64.27,180.31h.32v.53s.06.24.06.24l.04.23.06.23.07.21.07.21.09.19.11.19.11.17.13.17.13.17.15.15.15.15.17.13.17.13.19.11.19.11.21.09.21.09.21.09.22.08.22.08.24.06.24.06.24.06.24.04.26.04h.26l.26.04h.54v.32h-.84l-.28-.04-.26-.04-.26-.04-.26-.06-.24-.06-.24-.08-.24-.08-.22-.08-.22-.09-.22-.09-.21-.11-.21-.11-.19-.13-.19-.13-.17-.15-.17-.15-.15-.17-.15-.17-.13-.19-.13-.19-.11-.21-.09-.21-.09-.23-.07-.23-.06-.24-.06-.24-.04-.26v-.28s-.04-.28-.04-.28h-.02v-.02ZM69.86,173.6v.32h-.26l-.26.04-.26.06-.26.08-.24.08-.24.09-.24.11-.24.13-.22.15-.22.17-.22.17-.21.19-.21.21-.21.21-.19.23-.19.23-.17.24-.17.24-.15.24-.15.26-.13.26-.13.26-.11.28-.11.28-.09.28-.07.28-.07.28-.06.28-.04.28-.04.28v.28s-.02.28-.02.28h-.32v-.28l.04-.28.04-.3.06-.3.06-.3.07-.3.09-.3.09-.28.11-.28.13-.28.13-.28.15-.28.15-.26.17-.26.17-.26.19-.24.19-.24.21-.23.21-.23.22-.21.22-.19.22-.19.24-.17.24-.15.26-.13.26-.13.26-.11.28-.09.28-.08.28-.06.28-.04h.3l-.09-.04h0Z"/>
                      <g>
                        <path id="Lips_Upper_Base_5" data-name="Lips Upper Base 5" class="cls-3" d="M69.86,173.75c3,0,5.42,3.58,5.42,6.54s-2.44,4.2-5.42,4.2-5.42-1.24-5.42-4.2,2.44-6.54,5.42-6.54h0Z"/>
                        <path id="_1_6" data-name=" 1 6" class="cls-24" d="M76.06,180.31h-1.57v-.49s-.06-.24-.06-.24l-.04-.24-.06-.26-.06-.26-.07-.26-.09-.26-.09-.24-.11-.24-.11-.24-.13-.24-.13-.24-.15-.23-.15-.23-.17-.23-.17-.21-.17-.21-.19-.19-.19-.17-.19-.17-.19-.15-.21-.15-.21-.13-.21-.11-.21-.09-.21-.09-.21-.08-.21-.06-.22-.04h-.22l-.22-.04v-1.58h.34l.34.06.32.06.32.08.32.09.3.13.3.13.28.15.28.17.26.19.26.21.24.21.24.23.22.24.22.24.21.26.21.26.19.28.17.28.17.28.15.3.15.3.13.3.11.32.11.32.09.32.07.32.07.32.06.32.04.32v.32s.04.32.04.32h0v.06h-.02ZM76.06,180.31c0,.43-.36.79-.79.79s-.79-.36-.79-.79h1.57ZM69.86,185.3v-1.58h.77l.24-.04.24-.04.22-.04.22-.04.22-.06.21-.06.21-.06.19-.08.19-.08.19-.08.17-.09.17-.09.15-.09.15-.11.13-.11.13-.11.11-.13.11-.13.09-.13.09-.15.07-.15.07-.15.07-.17.06-.17.06-.19.04-.21.04-.21v-.45h1.59v.32l-.04.3-.04.3-.06.28-.07.28-.09.26-.11.26-.11.24-.13.24-.15.23-.17.23-.17.21-.19.19-.19.19-.21.17-.21.15-.22.15-.22.13-.24.13-.24.11-.24.09-.26.09-.26.08-.26.08-.28.06-.28.06-.28.04-.28.04h-.3l-.3.06h-.6v.02ZM69.86,185.3c-.43,0-.79-.36-.79-.79s.36-.79.79-.79v1.58ZM63.63,180.31h1.57v.45s.06.21.06.21l.04.21.06.19.06.17.07.17.07.15.07.15.09.15.09.13.11.13.11.13.13.11.13.11.15.11.15.09.17.09.17.09.19.08.19.08.19.08.21.06.21.06.22.06.22.04.22.04.24.04h.24l.24.04h.52v1.58h-.9l-.3-.06-.28-.04-.28-.04-.28-.06-.28-.06-.26-.08-.26-.08-.26-.09-.24-.09-.24-.11-.24-.13-.22-.13-.22-.15-.21-.15-.21-.17-.19-.19-.19-.19-.17-.21-.17-.23-.15-.23-.13-.24-.11-.24-.11-.26-.09-.26-.07-.28-.06-.28-.04-.3v-.3s-.04-.32-.04-.32h0v-.02ZM63.63,180.31c0-.43.36-.79.79-.79s.79.36.79.79h-1.57ZM69.86,172.96v1.58h-.22l-.22.04-.22.04-.21.06-.21.08-.21.09-.21.09-.21.11-.21.13-.21.15-.19.15-.19.17-.19.17-.19.19-.17.21-.17.21-.17.23-.15.23-.15.23-.13.24-.13.24-.11.24-.11.24-.09.24-.09.26-.07.26-.06.26-.06.26-.04.24-.04.24v.49h-1.59v-.32l.04-.32.04-.32.06-.32.07-.32.07-.32.09-.32.11-.32.11-.32.13-.3.15-.3.15-.3.17-.28.17-.28.19-.28.21-.26.21-.26.22-.24.22-.24.24-.23.24-.21.26-.21.26-.19.28-.17.28-.15.3-.13.3-.13.32-.09.32-.08.32-.06.34-.04h.34v-.08h-.02ZM69.86,172.96c.43,0,.79.36.79.79s-.36.79-.79.79v-1.58Z"/>
                      </g>
                      <path id="teeth_7" data-name="teeth 7" class="cls-16" d="M73.93,176.24c-1.39.26-2.89.39-4.37.43-1.33-.04-2.64-.13-3.84-.36.99-1.48,2.47-2.57,4.12-2.57s3.09,1.05,4.09,2.49h0Z"/>
                      <path id="tongue_8" data-name="tongue 8" class="cls-11" d="M69.86,181.06c1.61,0,3.45.36,4.78,1.52-.92,1.35-2.72,1.93-4.78,1.93s-3.88-.6-4.78-1.93c1.33-1.16,3.17-1.52,4.78-1.52Z"/>
                      <path id="Lip_Curve_Bottom_9" data-name="Lip Curve Bottom 9" class="cls-24" d="M71.53,185.82c.28-.21.77-.23,1.11-.06s.37.47.09.68l-1.2-.62h0ZM69.86,187.36v-.96h.77l.06-.04h.06l.06-.04h.06l.06-.04h.06l.06-.06h.06l.06-.06.06-.04.06-.04.06-.04.06-.04.06-.04.06-.04.06-.04.06-.04,1.2.62-.07.06-.07.06-.07.06-.07.06-.07.06-.07.06-.07.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04-.09.04h-.09l-.09.06h-.09l-.09.06h-.09l-.09.04h-.09l-.09.04h-.75l-.06-.04h0ZM69.86,187.36c-.43,0-.79-.21-.79-.49s.36-.49.79-.49v.96h0v.02ZM66.97,186.44l1.2-.62.06.04.06.04.06.04.06.04.06.04.06.04.06.04.06.04h.06l.06.06h.06l.06.06h.06l.06.04h.06l.06.04h.06l.06.04h.71v.96h-.84l-.09-.04h-.09l-.09-.04h-.09l-.09-.06h-.09l-.09-.06-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.09-.04-.07-.04-.07-.06-.07-.06-.07-.06-.07-.06-.07-.06-.07-.06h0l-.06.04h0ZM66.97,186.44c-.28-.21-.24-.51.09-.68s.82-.15,1.11.06l-1.2.62h0Z"/>
                    </g>
                    <g id="lips-corncerned" class="cls-34">
                      <g>
                        <g>
                          <path id="Lips_Upper_Base_10" data-name="Lips Upper Base 10" class="cls-3" d="M61.78,177.76s4.41-2.29,9.07-1.18c4.67,1.11,6,1.65,6.88,1.18s-.84-3.84-7.97-4.01c-5.74,0-7.97,4.01-7.97,4.01h-.02Z"/>
                          <path id="_1_11" data-name=" 1 11" class="cls-24" d="M71.04,175.83l-.36,1.54h0l-.41-.09-.41-.08-.39-.06-.39-.04h-.39l-.39-.04h-1.14l-.37.06-.36.04-.36.06-.34.06-.34.08-.32.08-.3.08-.3.08-.28.08-.26.08-.24.08-.24.08-.22.08-.21.08-.19.08-.17.08-.15.06-.13.06-.09.04-.07.04h-.06l-.04.04h0l-.73-1.41h.02l.04-.04.07-.04.09-.04.11-.06.13-.06.17-.08.19-.08.21-.08.22-.08.24-.09.26-.09.28-.09.3-.09.3-.09.32-.09.34-.08.36-.08.36-.08.37-.08.39-.06.39-.06.41-.04.41-.04h1.31l.45.04.45.04.47.06.47.08.47.09h0l.06.13h0v-.02ZM71.04,175.83c.43.09.69.53.58.96-.09.43-.52.69-.96.58l.36-1.54h.02ZM77.34,177.07l.75,1.39h0l-.13.08-.13.06-.15.06-.15.04h-.15l-.15.04h-.77l-.17-.04h-.17l-.19-.06-.19-.04-.19-.04-.21-.04-.22-.06-.22-.06-.24-.06-.24-.06-.26-.06-.28-.08-.3-.08-.3-.08-.32-.08-.34-.08-.36-.09-.37-.09-.39-.09-.41-.09-.43-.09.36-1.54.43.09.41.09.39.09.37.09.36.09.34.08.32.08.3.08.28.08.28.08.26.06.24.06.22.06.22.06.21.04.19.04.17.04.17.04h.15l.13.06h.82l.04-.04h0l.02-.02ZM77.34,177.07c.37-.21.86-.08,1.07.32s.07.86-.32,1.07l-.75-1.39h0ZM69.75,174.53v-1.58h.69l.64.08.62.06.58.08.56.09.52.11.51.11.47.13.45.15.41.15.39.17.37.17.34.19.32.19.3.19.26.19.24.21.22.21.21.21.19.21.17.21.13.21.11.21.09.21.07.23.06.23v.23s0,.24,0,.24l-.06.24-.11.24-.19.23-.22.17-.75-1.39-.07.06-.07.08-.04.08v.06h0v-.09s-.06-.08-.06-.08l-.06-.09-.07-.11-.09-.13-.11-.13-.13-.13-.17-.15-.19-.15-.21-.15-.22-.15-.26-.15-.28-.15-.3-.15-.34-.13-.36-.13-.39-.13-.41-.11-.45-.11-.47-.09-.51-.08-.54-.08-.56-.06-.6-.04h-.64v-.02ZM69.73,174.53c-.43,0-.79-.38-.77-.81,0-.43.37-.79.81-.77l-.04,1.58h0ZM61.4,177.07l.73,1.41-1.05-1.09h0v-.08s.06-.08.06-.08l.06-.09.07-.11.09-.11.09-.13.11-.15.13-.17.15-.17.17-.19.19-.19.21-.19.22-.21.22-.21.24-.21.26-.21.28-.21.3-.21.32-.19.34-.19.36-.19.37-.17.41-.15.43-.15.45-.13.47-.11.49-.09.51-.08.52-.06.54-.04h.56v1.56h-.49l-.47.04-.45.06-.43.08-.41.08-.39.09-.37.11-.36.13-.34.13-.32.15-.3.15-.28.15-.28.17-.26.17-.24.17-.22.17-.21.17-.19.17-.19.17-.17.17-.15.15-.13.15-.11.15-.11.13-.09.11-.07.11-.06.09-.06.08-.04.06v.04h-.04l-1.05-1.09h0l-.04.04h0v.02ZM62.45,178.15c-.21.38-.69.53-1.07.3s-.52-.69-.3-1.07l1.37.77h0Z"/>
                        </g>
                        <path id="teeth_12" data-name="teeth 12" class="cls-16" d="M75.22,174.78c-1.29.38-2.74.58-4.18.62-1.84-.04-3.66-.36-5.16-.96,1.05-.41,2.32-.69,3.86-.69,2.4.06,4.2.47,5.47,1.03h0Z"/>
                      </g>
                      <path id="Lip_Curve_Bottom_13" data-name="Lip Curve Bottom 13" class="cls-24" d="M71.4,181.6l.88-1.29c.36.24.45.73.21,1.09-.24.36-.73.45-1.09.21h0ZM69.6,179.48h.92l.09.04h.09l.09.04h.09l.09.06h.09l.09.06.09.04.09.04.07.04.07.04.07.04.07.04.07.04.07.04.07.04.07.04.07.04.07.06.07.06.07.06-.88,1.29-.06-.04-.06-.04-.06-.04-.06-.04-.06-.04-.06-.04h-.06l-.06-.06h-.06l-.06-.06h-.06l-.06-.04h-.06l-.06-.04h-.06l-.06-.04h-.06l-.06-.04h-.79v-1.58h.02ZM69.6,179.48v1.58c-.43,0-.79-.36-.79-.79s.36-.79.79-.79h0ZM66.91,180.31l.07-.06.07-.06.07-.06.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.09-.04.09-.04h.09l.09-.06h.09l.09-.06h.09l.09-.04h.09l.09-.04h.82v1.58h-.84l-.06.04h-.06l-.06.04h-.06l-.06.04h-.06l-.06.04h-.06l-.06.06h-.06l-.06.06-.06.04-.06.04-.06.04-.06.04-.06.04-.06.04-.88-1.29h.02ZM66.91,180.31l.88,1.29c-.36.24-.84.15-1.09-.21-.24-.36-.15-.84.21-1.09h0Z"/>
                    </g>
                    <g id="lips-confused" class="cls-34">
                      <g>
                        <g>
                          <path id="Lips_Upper_Base_14" data-name="Lips Upper Base 14" class="cls-3" d="M69.86,173.75c3.52,0,6.39,3.15,6.39,5.27s-2.87-.47-6.39-.47-6.39,2.59-6.39.47,2.87-5.27,6.39-5.27Z"/>
                          <path id="_1_15" data-name=" 1 15" class="cls-24" d="M77.02,179.02h-1.57v-.28s-.06-.15-.06-.15l-.04-.17-.06-.17-.07-.19-.07-.19-.09-.19-.11-.19-.13-.19-.13-.19-.15-.19-.15-.19-.17-.19-.19-.19-.19-.19-.21-.17-.21-.17-.22-.17-.22-.15-.22-.15-.24-.13-.24-.13-.24-.11-.26-.11-.26-.09-.26-.08-.26-.08-.28-.06-.28-.04h-.28l-.28-.04v-1.58h.37l.37.04.36.06.36.08.36.08.34.09.34.11.32.13.32.15.3.15.3.17.28.19.28.19.26.21.26.21.24.21.22.23.22.23.21.23.21.24.19.24.17.24.17.24.15.26.13.26.11.26.09.26.09.26.07.26.06.26.04.26v.26h-.02v.02ZM77.02,179.02c0,.43-.36.79-.79.79s-.79-.36-.79-.79h1.57ZM69.86,179.33v-1.58h.36l.36.04.36.04.34.06.34.06.32.08.32.08.3.08.3.09.28.09.28.09.26.09.26.09.24.08.22.08.22.08.21.06.19.06.17.04.15.04h.11l.09.04h.07-.04l-.06.06-.04.06h0v-.17h1.57v.26l-.06.26-.07.24-.13.24-.19.23-.22.17-.24.11-.24.06h-.66l-.21-.06-.21-.06-.21-.06-.22-.08-.22-.08-.22-.08-.24-.08-.24-.08-.24-.08-.24-.08-.26-.08-.26-.08-.26-.08-.28-.08-.28-.06-.28-.06-.28-.06-.28-.04-.28-.04h-.6l-.04-.04h0ZM69.86,179.33c-.43,0-.79-.36-.79-.79s.36-.79.79-.79v1.58ZM62.68,179.02h1.57v.17h0l-.04-.06-.06-.04h-.04.17l.11-.04.15-.04.17-.04.19-.06.21-.06.22-.08.22-.08.24-.08.26-.09.26-.09.28-.09.28-.09.3-.09.3-.08.32-.08.32-.08.34-.06.34-.06.36-.04h.36l.36-.04v1.58h-.6l-.28.06-.28.04-.28.06-.28.06-.28.06-.28.08-.26.08-.26.08-.26.08-.24.08-.24.08-.24.08-.24.08-.22.08-.22.08-.22.08-.21.06-.21.06-.21.04h-.21l-.22.04h-.24l-.24-.09-.24-.11-.22-.17-.19-.23-.13-.24-.07-.24-.04-.26v-.26h0l-.04.04h0v-.02ZM62.68,179.02c0-.43.36-.79.79-.79s.79.36.79.79h-1.57ZM69.86,172.96v1.58h-.28l-.28.04-.28.04-.28.06-.26.08-.26.08-.26.09-.26.11-.24.11-.24.13-.24.13-.22.15-.22.15-.22.17-.21.17-.21.17-.19.19-.19.19-.17.19-.15.19-.15.19-.13.19-.13.19-.11.19-.09.19-.07.19-.07.19-.06.17-.04.17-.04.15v.28h-1.59v-.26l.04-.26.06-.26.07-.26.09-.26.09-.26.11-.26.13-.26.15-.26.17-.24.17-.24.19-.24.21-.24.21-.23.22-.23.22-.23.24-.21.26-.21.26-.21.28-.19.28-.19.3-.17.3-.15.32-.15.32-.13.34-.11.34-.09.36-.08.36-.08.36-.06.37-.04h.37-.02v-.02ZM69.86,172.96c.43,0,.79.36.79.79s-.36.79-.79.79v-1.58Z"/>
                        </g>
                        <path id="teeth_16" data-name="teeth 16" class="cls-16" d="M74.13,175.4c-1.37.23-2.83.36-4.29.38-1.46,0-2.92-.15-4.29-.38,1.12-.96,2.64-1.63,4.29-1.63s3.15.69,4.29,1.63Z"/>
                      </g>
                      <path id="Lip_Curve_Bottom_17" data-name="Lip Curve Bottom 17" class="cls-24" d="M71.66,182.28l.88-1.29c.36.24.45.73.21,1.09-.24.36-.73.45-1.09.21h0ZM69.86,180.16h.92l.09.04h.09l.09.04h.09l.09.06h.09l.09.06.09.04.09.04.07.04.07.04.07.04.07.04.07.04.07.04.07.04.07.04.07.04.07.06.07.06.07.06-.88,1.29-.06-.04-.06-.04-.06-.04-.06-.04-.06-.04-.06-.04h-.06l-.06-.06h-.06l-.06-.06h-.06l-.06-.04h-.06l-.06-.04h-.06l-.06-.04h-.06l-.06-.04h-.79v-1.58h.02ZM69.86,180.16v1.58c-.43,0-.79-.36-.79-.79s.36-.79.79-.79h0ZM67.16,180.98l.07-.06.07-.06.07-.06.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.07-.04.09-.04.09-.04h.09l.09-.06h.09l.09-.06h.09l.09-.04h.09l.09-.04h.82v1.58h-.84l-.06.04h-.06l-.06.04h-.06l-.06.04h-.06l-.06.04h-.06l-.06.06h-.06l-.06.06-.06.04-.06.04-.06.04-.06.04-.06.04-.06.04-.88-1.29h.02ZM67.16,180.98l.88,1.29c-.36.24-.84.15-1.09-.21-.24-.36-.15-.84.21-1.09h0Z"/>
                    </g>
                    <g id="lips-closed-expressions">
                      <path id="Lip_Curve" data-name="Lip Curve" class="cls-22" d="M81.58,174.85s-7.2.79-11.74.79-11.74-.79-11.74-.79"/>
                      <path id="Lip_Curve_Bottom_18" data-name="Lip Curve Bottom 18" class="cls-21" d="M66.65,181.28h6.41"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <circle id="sclera_right" data-name="sclera right" class="cls-35" cx="96.26" cy="133.08" r="14.51"/>
                      <g class="cls-36">
                        <rect id="eye_shade_right_clip_0" data-name="eye shade right clip 0" class="cls-2" x="77.51" y="131.13" width="37.5" height="6.43"/>
                      </g>
                      <g class="cls-33">
                        <g id="Pupil_Right" data-name="Pupil Right">
                          <circle id="iris_brown_right" data-name="iris brown right" class="cls-32" cx="94.25" cy="134.99" r="5.91"/>
                          <circle id="iris_black_right" data-name="iris black right" class="cls-23" cx="94.26" cy="134.98" r="3.02"/>
                          <circle id="pupil_spec_right" data-name="pupil spec right" class="cls-35" cx="91.85" cy="136.41" r="1.37"/>
                        </g>
                      </g>
                      <g id="Eyelash_Eyelid_Right" data-name="Eyelash Eyelid Right">
                        <path id="upper_eyelid_right" data-name="upper eyelid right" class="cls-12" d="M96.26,103.34c5.64,0,10.86.45,15.02,1.2v28.88c-4.16.75-9.38,1.2-15.02,1.2s-10.86-.45-15.02-1.2v-28.88c4.16-.75,9.38-1.2,15.02-1.2Z"/>
                        <path id="eyelash_right" data-name="eyelash right" class="cls-7" d="M110.31,132.48c.84-.04,2.04-.34,2.04-.34-.39.96-1.07,1.29-1.07,1.29,3.81.94,5.81-.34,5.81-.34-.66,2.81-5.76,3.41-5.76,3.41-1.01-.81-4.07-1.33-4.07-1.33-8.91.32-16.71-.17-25.39-.17s-1.26-.56-1.26-1.26.56-1.26,1.26-1.26c9.79,0,18.43.39,28.43,0h0v-.02.02Z"/>
                      </g>
                    </g>
                    <path id="Brow_Right" data-name="Brow Right" class="cls-7" d="M81.11,122.01l.6-6.6s16.5-1.44,25.44-1.07c0,0,4.35,3.32,5.87,8.44,0,0-3.54-2.4-6-2.59s-25.91,1.84-25.91,1.84h0s0-.02,0-.02Z"/>
                  </g>
                  <g>
                    <g>
                      <circle id="sclera_left" data-name="sclera left" class="cls-35" cx="43.5" cy="133.08" r="14.51"/>
                      <g class="cls-17">
                        <rect id="eye_shade_right_clip_" data-name="eye shade right clip " class="cls-2" x="24.75" y="131.13" width="37.5" height="6.43"/>
                      </g>
                      <g class="cls-31">
                        <g id="Pupil_Left" data-name="Pupil Left">
                          <circle id="iris_brown_left" data-name="iris brown left" class="cls-32" cx="45.48" cy="135.01" r="5.91"/>
                          <circle id="iris_black_left" data-name="iris black left" class="cls-23" cx="45.48" cy="134.99" r="3.02"/>
                          <circle id="pupil_spec_left" data-name="pupil spec left" class="cls-35" cx="43.08" cy="136.41" r="1.37"/>
                        </g>
                      </g>
                      <g id="Eyelash_Eyelid_Left" data-name="Eyelash Eyelid Left">
                        <path id="upper_eyelid_left" data-name="upper eyelid left" class="cls-12" d="M43.5,103.34c-5.64,0-10.86.45-15.02,1.2v28.88c4.16.75,9.38,1.2,15.02,1.2s10.86-.45,15.02-1.2v-28.88c-4.16-.75-9.38-1.2-15.02-1.2Z"/>
                        <path id="eyelash_left" data-name="eyelash left" class="cls-7" d="M29.45,132.48c-.84-.04-2.04-.34-2.04-.34.39.96,1.05,1.29,1.05,1.29-3.81.94-5.81-.34-5.81-.34.66,2.81,5.76,3.41,5.76,3.41,1.01-.81,4.07-1.33,4.07-1.33,8.91.32,16.71-.17,25.39-.17s1.26-.56,1.26-1.26-.56-1.26-1.26-1.26c-9.79,0-18.43.39-28.43,0h.02v-.02.02Z"/>
                      </g>
                    </g>
                    <path id="Brow_Left" data-name="Brow Left" class="cls-7" d="M58.59,122.01l-.6-6.6s-16.5-1.44-25.44-1.07c0,0-4.35,3.32-5.89,8.44,0,0,3.54-2.4,6-2.59s25.91,1.84,25.91,1.84h.02v-.02Z"/>
                  </g>
                </g>
                <g id="Hair">
                  <path id="Hair_Base" data-name="Hair Base" class="cls-8" d="M158.36,14.66l18.75,76.3-48.06,64.95-3.77-15.13-5.79-23.21-5.76-8.68-3.53-16.73s-15.26-5.93-40.35-5.93-40.35,5.93-40.35,5.93l-3.53,16.73-5.76,8.68-5.79,23.21-3.77,15.13-48.06-64.95L-18.64,14.66,69.86-10.5l88.5,25.18h0v-.02Z"/>
                  <g id="hair_shade_clip" data-name="hair shade clip">
                    <g class="cls-1">
                      <g class="cls-26">
                        <path id="hair_shade" data-name="hair shade" class="cls-9" d="M69.86,104.37c36.3,0,67.48-8.33,81.13-20.23l3-3,11.74,25.2-13.44,18.15c-2.57,4.78-5.93,9.26-9.92,13.41l-13.33,18.02-22.24,3.53-36.94,5.85-36.94-5.85-22.24-3.53-13.33-18.02c-3.99-4.13-7.33-8.63-9.92-13.41l-13.43-18.15,11.74-25.2,3,3c13.65,11.91,44.85,20.23,81.13,20.23h-.02,0Z"/>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
            <path id="hair_edge_stroke" data-name="hair edge stroke" class="cls-20" d="M14.43,140.8c-1.69-7.11-3.11-13.67-4.14-17.49C-.89,81.34,28.82,53.46,69.86,53.46s70.75,27.88,59.55,69.85c-1.01,3.83-2.44,10.39-4.14,17.49"/>
            <g id="head_highlight" data-name="head highlight" class="cls-29" filter="url(#outer-glow-1)">
              <path class="cls-4" d="M87.11,190.85h0c1.76-1.01,3.53-2.03,5.33-2.98,7.35-3.94,16.2-11.33,20.94-18.32,5.81-8.59,11.14-36.77,13.78-46.67,9.53-35.76-10.61-61.28-42.15-68.06h0c32.83,6.04,54.17,31.91,44.4,68.51-2.64,9.88-7.95,38.08-13.78,46.67-4.74,6.99-13.58,13.13-20.94,17.06-2.57,1.37-5.08,2.66-7.58,3.79h0Z"/>
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</svg>`;

// ── LOAD ──────────────────────────────────
function loadSVG() {
  document.getElementById('boahemaa-container').innerHTML = SVG_CONTENT;
  cacheElements();
  ready = true;
  schedBlink();
  schedLookAway();
  requestAnimationFrame(tick);
}

function cacheElements() {
  const s = document.querySelector('#boahemaa-container svg');
  let egR = null, egL = null;
  s.querySelectorAll('g').forEach(g => {
    if (!egR && g.querySelector(':scope > circle#sclera_right')) egR = g;
    if (!egL && g.querySelector(':scope > circle#sclera_left'))  egL = g;
  });
  E = {
    eyeGroupR : egR,
    eyeGroupL : egL,
    pupilR    : s.querySelector('#Pupil_Right'),
    pupilL    : s.querySelector('#Pupil_Left'),
    eyeShadeR : s.querySelector('#eye_shade_right_clip_0'),
    eyeShadeL : s.querySelector('#eye_shade_right_clip_'),
    eyelidR   : s.querySelector('#upper_eyelid_right'),
    eyelashR  : s.querySelector('#eyelash_right'),
    eyelidL   : s.querySelector('#upper_eyelid_left'),
    eyelashL  : s.querySelector('#eyelash_left'),
    browR     : s.querySelector('#Brow_Right'),
    browL     : s.querySelector('#Brow_Left'),
    nose      : s.querySelector('#Nose'),
    lips      : s.querySelector('#Lips'),
    hair      : s.querySelector('#Hair'),
    hairBun   : s.querySelector('#Hair_Bun'),
    ears      : s.querySelector('#Ears'),
    blush     : s.querySelector('#Blush'),
    lipUpper  : s.querySelector('#Lip_Curve'),
    lipLower  : s.querySelector('#Lip_Curve_Bottom_18'),
    headHL    : s.querySelector('#head_highlight'),
    earHL     : s.querySelector('#ear_lobe_highlight'),
    hairBunHL : s.querySelector('#hair_bun_highlight'),
    neckShade : s.querySelector('#neck_shade'),
    glowFlood1: s.querySelector('#outer-glow-1 feFlood'),
    glowFlood2: s.querySelector('#outer-glow-2 feFlood'),
    glowFlood3: s.querySelector('#outer-glow-3 feFlood'),
    earringL  : s.querySelector('#earring_left'),
    earringR  : s.querySelector('#earring_right'),
    irisL_brown : s.querySelector('#iris_brown_left'),
    irisL_black : s.querySelector('#iris_black_left'),
    irisR_brown : s.querySelector('#iris_brown_right'),
    irisR_black : s.querySelector('#iris_black_right'),
    svgRoot     : s,
  };
  Object.entries(E).forEach(([k,v]) => { if (!v) console.warn('[Boahemaa] missing:', k); });
}

// ── HELPERS ───────────────────────────────
function tr(el, x, y) {
  if (!el) return;
  el.setAttribute('transform', `translate(${x.toFixed(3)},${y.toFixed(3)})`);
}
function trRot(el, tx, ty, deg, px, py) {
  if (!el) return;
  el.setAttribute('transform',
    `translate(${tx.toFixed(3)},${ty.toFixed(3)}) rotate(${deg.toFixed(3)},${px},${py})`);
}
function lerp(a, b, t) { return a + (b - a) * t; }

// ── LIP MORPH ─────────────────────────────
function morphPath(neutral, smile, t) {
  const numRe = /-?[\d.]+/g;
  const numsA = [...neutral.matchAll(numRe)].map(m => ({ val: parseFloat(m[0]), idx: m.index, len: m[0].length }));
  const numsB = [...smile.matchAll(numRe)].map(m => parseFloat(m[0]));
  if (numsA.length !== numsB.length) return neutral;
  const parts = neutral.split(numRe);
  const interp = numsA.map((a, i) => lerp(a.val, numsB[i], t).toFixed(3));
  return parts.reduce((acc, part, i) => acc + part + (interp[i] !== undefined ? interp[i] : ''), '');
}

// ── APPLY ─────────────────────────────────
function apply(ox, oy) {

  // EYE GROUPS — horizontal roll + vertical counter-roll
  const hRoll = ox * M.eyeRot;
  const vRoll = -oy * EYE_VERT_ROLL;
  trRot(E.eyeGroupR,
    ox * M.eyeGroup.x, oy * M.eyeGroup.y,
    hRoll + vRoll, SCL_R.cx, SCL_R.cy);
  trRot(E.eyeGroupL,
    ox * M.eyeGroup.x, oy * M.eyeGroup.y,
    hRoll - vRoll, SCL_L.cx, SCL_L.cy);

  // PUPILS — clamped inside sclera + convergence tracking
  const PUPIL_MAX_X = 5.25;
  const PUPIL_MAX_Y = 5.63;
  // Blend mouse position with expression pupil override (if any)
  // exprPupilOX/OY are normalized -1..1; 0 = full mouse drive
  // We blend: if override is non-zero, mix toward it proportionally
  const pupilBlend = Math.max(Math.abs(exprPupilOX), Math.abs(exprPupilOY));
  const blendedOX = pupilBlend > 0 ? ox * (1 - pupilBlend) + exprPupilOX * pupilBlend : ox;
  const blendedOY = pupilBlend > 0 ? oy * (1 - pupilBlend) + exprPupilOY * pupilBlend : oy;
  const rawPX = blendedOX * M.pupil.x;
  const rawPY = blendedOY * M.pupil.y;
  const pDist = Math.hypot(rawPX / PUPIL_MAX_X, rawPY / PUPIL_MAX_Y);
  const ps    = pDist > 1 ? 1 / pDist : 1;
  let finalPX_R = rawPX * ps;
  let finalPX_L = rawPX * ps;
  let finalPY   = rawPY * ps;

  // Cross-eye convergence: when cursor is in the nose-bridge rectangle,
  // pupils track it (X and Y) AND shift inward — like focusing on a close object.
  // convergeMX/MY are the normalised cursor position within the rectangle.
  if (convergeFactor > 0.01) {
    // Inward shift (convergence) — right shifts left, left shifts right
    const inwardShift = convergeFactor * CONVERGE_SHIFT;
    finalPX_R -= inwardShift;
    finalPX_L += inwardShift;
    // Also track the cursor Y within the box (up/down tracking)
    // convergeMY: -1=top(brow) to +1=bottom(nose)
    const trackY = convergeMY * PUPIL_MAX_Y * 0.7 * convergeFactor;
    finalPY = finalPY * (1 - convergeFactor) + trackY * convergeFactor;
    // Slight X pull toward center of zone (nose bridge)
    // convergeMX: -1=left edge to +1=right edge, 0=center
    // Both pupils pull toward center X of zone
    const trackXPull = convergeMX * PUPIL_MAX_X * 0.3 * convergeFactor;
    finalPX_R = finalPX_R - trackXPull * 0.5;
    finalPX_L = finalPX_L - trackXPull * 0.5;
  }

  tr(E.pupilR, finalPX_R, finalPY);
  tr(E.pupilL, finalPX_L, finalPY);

  // PUPIL DILATION — proximity + expression dilation composite
  applyPupilDilation(proxCur + exprDilate * (1 - proxCur)); // expression dilation fills remaining headroom

  // EYELIDS — gaze + blink + squint + expression lid drop composite
  const gazeBlend = 1 - squintProgress;
  const rawGazeY  = oy < 0 ? oy * GAZE_UP_LIFT : oy * GAZE_DOWN_DROP;
  const gazeY     = rawGazeY * gazeBlend;
  // exprLidDrop offsets the RESTING position (raise or droop)
  // blinkY is clamped independently so a full blink ALWAYS closes fully
  // regardless of how high or low the expression holds the lid
  // exprLidDrop can be negative (raised lids) or positive (drooped).
  // Squint and blink must always reach BLINK_TRAVEL at full close.
  // Raise compensation: how much extra travel is needed to overcome the raise
  const raiseComp = Math.max(0, -exprLidDrop); // positive when lids are raised
  // Squint travels BLINK_TRAVEL + raiseComp at full squint, so restY still hits BLINK_TRAVEL
  const effectiveSquint = squintExtra * (1 + raiseComp / BLINK_TRAVEL);
  const restY = gazeY + effectiveSquint + exprLidDrop;
  // Blink travels BLINK_TRAVEL + raiseComp at peak for same reason
  const blinkTravel = BLINK_TRAVEL + raiseComp;
  const scaledBlink = blinkY > 0 ? (blinkY / BLINK_TRAVEL) * blinkTravel : 0;
  // Decline lid override: adds on top of normal blink/squint, clamped to BLINK_TRAVEL
  const declineLidAdd = (window._declineLidClose || 0) * blinkTravel;
  const lidY = Math.min(restY + scaledBlink + declineLidAdd, BLINK_TRAVEL);
  const lidT      = `translate(0,${lidY.toFixed(3)})`;
  if (E.eyelidR)  E.eyelidR.setAttribute('transform', lidT);
  if (E.eyelashR) E.eyelashR.setAttribute('transform', lidT);
  if (E.eyelidL)  E.eyelidL.setAttribute('transform', lidT);
  if (E.eyelashL) E.eyelashL.setAttribute('transform', lidT);

  // EYE SHADE — rect stays inside its clipPath (sclera circle), never moves the group
  // We update y directly: natural y=131.13, moves with lidY so shadow tracks the lid
  const SHADE_BASE_Y = 131.13;
  if (E.eyeShadeR) E.eyeShadeR.setAttribute('y', (SHADE_BASE_Y + lidY).toFixed(3));
  if (E.eyeShadeL) E.eyeShadeL.setAttribute('y', (SHADE_BASE_Y + lidY).toFixed(3));

  // BROWS — horizontal rotation around outer tip + vertical arching + expression overrides
  const browProxLift = proxCur * 2.8;
  const hBrowRot = ox * M.browRot;
  const vBrowRot = -oy * M.browVertRot;
  const btx  = ox * M.brow.x;
  // Expression: browY shifts both brows, browAsym shifts each independently
  // browRotExtra adds inner-tip rotation (positive = V shape, negative = raised arch)
  const btyR = oy * M.brow.y - ox * 1.13 - browProxLift + exprBrowY + exprBrowAsyR;
  const btyL = oy * M.brow.y + ox * 1.13 - browProxLift + exprBrowY + exprBrowAsyL;
  // browRotExtra convention (FINAL):
  // Positive = brows RAISE (inner tips up) — happy, excited, surprised
  // Negative = brows FURROW down (inner tips down) — angry, worried V
  // Right brow pivot is at outer-right: negative SVG rotation lifts inner tip
  // Left brow pivot is at outer-left:  positive SVG rotation lifts inner tip
  const exprRotR =  exprBrowRot + exprBrowTiltR;  // right brow: CW = inner tip up (happy/excited); +tiltR = clockwise on outer tip
  const exprRotL = -exprBrowRot + exprBrowTiltL;  // left brow: CCW = inner tip up; tiltL is already signed (negative = anti-clockwise)
  trRot(E.browR, btx, btyR,  hBrowRot + vBrowRot + exprRotR, BROW_R_PIV.x, BROW_R_PIV.y);
  trRot(E.browL, btx, btyL, -hBrowRot - vBrowRot + exprRotL, BROW_L_PIV.x, BROW_L_PIV.y);

  // NOSE + LIPS + BLUSH
  tr(E.nose,  ox * M.nose.x,  oy * M.nose.y);
  tr(E.lips,  ox * M.lips.x,  oy * M.lips.y);
  if (E.blush) tr(E.blush, ox * M.nose.x, oy * M.nose.y);

  // HAIR — inside clip, moves WITH face
  tr(E.hair, ox * M.hair.x, oy * M.hair.y);

  // HAIR BUN — outside clip, COUNTER face
  tr(E.hairBun, -ox * M.hairBun.x, -oy * M.hairBun.y);

  // EARS — counter both axes
  tr(E.ears, -ox * M.ears.x, -oy * M.ears.y);

  // NECK SHADE — counter both axes
  tr(E.neckShade, -ox * M.neckShade.x, -oy * M.neckShade.y);

  // BREATHING — subtle scale pulse on whole svg
  breathPhase += BREATH_RATE;
  const breathScale = 1 + Math.sin(breathPhase) * 0.006;
  if (E.svgRoot) {
    E.svgRoot.style.transform = `scale(${breathScale.toFixed(4)})`;
    E.svgRoot.style.transformOrigin = '50% 50%';
  }
}

// ── PUPIL DILATION ────────────────────────
// Scale only the black iris via transform (subtle, realistic).
// Uses transform-based scale around the iris center — same approach as file 4.
function applyPupilDilation(factor) {
  const scale = 1 + factor * 0.15 + 0; // subtle: max ~15% bigger at full proximity
  applyIrisDilation(E.irisR_black, 94.26, 134.98, scale);
  applyIrisDilation(E.irisL_black, 45.48, 134.99, scale);
}

function applyIrisDilation(el, cx, cy, scale) {
  if (!el) return;
  el.setAttribute('transform',
    `translate(${cx},${cy}) scale(${scale.toFixed(4)}) translate(${-cx},${-cy})`);
}

// ── BLUSH SYSTEM ──────────────────────────
function setBlushState(active) {
  blushActive = active;
  const svg = document.querySelector('#boahemaa-container svg');
  if (active) {
    // Cancel look-away, stop any blink
    lookAwayActive = false;
    if (isBlinking) { blinkY = 0; isBlinking = false; }
    // Hide ALL expression groups (including whichever open one is showing)
    if (svg) {
      Object.values(EXPRESSION_GROUPS).forEach(id => {
        const el = svg.querySelector('#' + CSS.escape(id));
        if (el) el.style.display = 'none';
      });
      // Show ONLY the closed-expressions (smile morph lives here)
      const closed = svg.querySelector('#lips-closed-expressions');
      if (closed) { closed.style.display = ''; closed.style.opacity = '1'; }
    }
  } else {
    // Reset smile immediately so stale progress doesn't bleed into the
    // incoming expression's lip morph while the blush fades out.
    smileProgress = 0;
    // Start fading blush opacity FIRST — before expression reset triggers
    // its own RAF, so the fade is already running and won't be cancelled.
    animateBlush();
    // Restore the expression that was set before blush —
    // but NOT during thinking states (those manage their own expression).
    if (svg && !window._thinkingStateActive) {
      // Re-apply the current expression (restores correct group)
      window.boahemaaExpression('neutral');
      if (window.resetExprButton) window.resetExprButton();
    }
  }
  // animateBlush already called above on deactivation path; call only for activation here
  if (active) {
    // If the current expression already has smile lips, seed smileProgress at 1
    // so animateBlush() doesn't reset from neutral (causing a visible lip snap).
    const activeDef = EXPRESSIONS[currentExpression];
    if (activeDef && activeDef.lipUpper === LIP_UPPER_SMILE) {
      smileProgress = 1;
    }
    animateBlush();
  }
}

function animateBlush() {
  if (blushRAF) cancelAnimationFrame(blushRAF);
  function step() {
    const target      = blushActive ? 1 : 0;
    const blushSpeed  = blushActive ? 0.04 : 0.018;
    const eyeSpeed    = blushActive ? 0.08 : 0.09;
    const smileSpeed  = blushActive ? 0.04 : 0.018;

    blushProgress  += (target - blushProgress)  * blushSpeed;
    smileProgress  += (target - smileProgress)  * smileSpeed;
    squintProgress += (target - squintProgress) * eyeSpeed;

    // Brows raise like happy as blush builds — only drive when no expression transition running
    if (exprT >= 1) {
      const exprBaseBrowY   = exprTo ? (exprTo.browY        || 0) : 0;
      const exprBaseBrowRot = exprTo ? (exprTo.browRotExtra || 0) : 0;
      const blushBrowY      = blushActive ? Math.min(exprBaseBrowY,   -2.5) : exprBaseBrowY;
      const blushBrowRot    = blushActive ? Math.max(exprBaseBrowRot,  12.0) : exprBaseBrowRot;
      exprBrowY   += (blushBrowY   - exprBrowY)   * blushSpeed;
      exprBrowRot += (blushBrowRot - exprBrowRot)  * blushSpeed;
    }

    // Blush pulse: when active, slowly oscillate opacity around base
    let finalBlushOpacity = blushProgress;
    if (blushActive && blushProgress > 0.5) {
      blushPulseT += BLUSH_PULSE_SPEED;
      const pulse = Math.sin(blushPulseT) * BLUSH_PULSE_DEPTH;
      finalBlushOpacity = Math.max(0, Math.min(1, blushProgress + pulse));
    } else if (!blushActive) {
      blushPulseT = 0;
    }

    // Blush opacity
    if (E.blush) {
      E.blush.style.opacity    = finalBlushOpacity.toFixed(3);
      E.blush.style.visibility = blushProgress > 0.01 ? 'visible' : 'hidden';
    }

    // Lip morph — ONLY when blush is building up.
    // On deactivation the expression system owns the lips; writing here would fight it.
    if (blushActive) {
      if (E.lipUpper) {
        const d = morphPath(LIP_UPPER_NEUTRAL, LIP_UPPER_SMILE, smileProgress);
        if (d) E.lipUpper.setAttribute('d', d);
      }
      if (E.lipLower) {
        const d = morphPath(LIP_LOWER_NEUTRAL, LIP_LOWER_BLUSH, smileProgress);
        if (d) E.lipLower.setAttribute('d', d);
      }
    }

    squintExtra = squintProgress * BLUSH_SQUINT_EXTRA;

    // Keep running while active (for pulse) even after lerp settles
    const lerpDone =
      Math.abs(blushProgress  - target) < 0.002 &&
      Math.abs(smileProgress  - target) < 0.002 &&
      Math.abs(squintProgress - target) < 0.002;

    if (!lerpDone || blushActive) {
      blushRAF = requestAnimationFrame(step);
    } else {
      blushProgress  = target;
      smileProgress  = target;
      squintProgress = target;
      squintExtra    = target * BLUSH_SQUINT_EXTRA;
      blushRAF = null;
    }
  }
  blushRAF = requestAnimationFrame(step);
}

// ── NOSE DRAG ─────────────────────────────
function mouseToSVG(mx, my) {
  const svg  = document.querySelector('#boahemaa-container svg');
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  const vb   = svg.viewBox.baseVal;
  return {
    x: (mx - rect.left) / rect.width  * vb.width,
    y: (my - rect.top)  / rect.height * vb.height,
  };
}

function onMouseDown(e) {
  // Nose drag disabled during thinking and typing states
  if (window._thinkingStateActive || window._typingStateActive) return;
  const pt = mouseToSVG(e.clientX, e.clientY);
  if (Math.hypot(pt.x - NOSE_CENTER.x, pt.y - NOSE_CENTER.y) <= NOSE_RADIUS) {
    isDragging = true;
    window.isDragging = true;
    setBlushState(true);
  }
}
function onMouseMove(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  lastMouseTime = Date.now();
  idleActive    = false;
  // If mouse moves, cancel any active look-away immediately — she looks back at cursor
  if (lookAwayActive) {
    lookAwayActive = false;
  }
}
function onMouseUp() {
  if (isDragging) { isDragging = false; window.isDragging = false; setBlushState(false); }
}

// ── ACCENT SYSTEM ─────────────────────────
let accentStyleEl  = null;
let accentCurrent  = '#f0f0f0';
let accentTarget   = '#f0f0f0';
let accentRaf      = null;

function hexToRgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}
function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex(ca[0]+(cb[0]-ca[0])*t, ca[1]+(cb[1]-ca[1])*t, ca[2]+(cb[2]-ca[2])*t);
}

function applyAccent(key) {
  accentTarget = ACCENT_COLORS[key] || ACCENT_COLORS.white;
  if (!accentStyleEl) {
    accentStyleEl = document.createElement('style');
    document.head.appendChild(accentStyleEl);
  }
  if (accentRaf) return;
  const startColor = accentCurrent;
  let progress = 0;
  function step() {
    progress = Math.min(progress + 0.06, 1);
    const c = lerpColor(startColor, accentTarget, progress);
    accentCurrent = c;
    // cls-4 is the highlight fill class in the new SVG
    accentStyleEl.textContent = `#boahemaa-container .cls-4 { fill: ${c} !important; }`;
    document.documentElement.style.setProperty('--accent-color', c);
    // Also update highlight elements directly
    [E.headHL, E.earHL, E.hairBunHL].filter(Boolean).forEach(el => {
      el.querySelector('.cls-4,path,polygon')
        ?.setAttribute('fill', c);
    });
    // Update glow filter flood colors
    [E.glowFlood1, E.glowFlood2, E.glowFlood3].filter(Boolean).forEach(el => {
      el.setAttribute('flood-color', c);
    });
    // Update chat frame border to match accent
    const cf = document.getElementById('chat-frame');
    if (cf) cf.style.borderColor = `color-mix(in srgb, ${c} 25%, rgba(255,255,255,0.06))`;
    if (progress < 1) {
      accentRaf = requestAnimationFrame(step);
    } else {
      accentCurrent = accentTarget;
      accentRaf = null;
    }
  }
  accentRaf = requestAnimationFrame(step);
}

// ── BLINK ─────────────────────────────────
let isBlinking = false;

// Normal blink — 20% chance of double blink built in, no separate timer
function schedBlink() {
  setTimeout(doBlink, 1500 + Math.random() * 5500);
}

function doBlink(isSecond = false) {
  if (isBlinking || squintProgress > 0.05 || blushActive) {
    if (!isSecond) schedBlink();
    return;
  }
  isBlinking = true;
  const frames = [0, 0.25, 0.6, 0.9, 1.0, 1.0, 0.85, 0.55, 0.2, 0];
  let f = 0;
  function step() {
    if (squintProgress > 0.05 || blushActive) { blinkY = 0; isBlinking = false; schedBlink(); return; }
    if (f >= frames.length) {
      blinkY = 0; isBlinking = false;
      // 20% chance of a double blink — fires once, never stacks
      if (!isSecond && Math.random() < 0.2) {
        setTimeout(() => doBlink(true), 120);
      } else {
        schedBlink();
      }
      return;
    }
    blinkY = frames[f++] * BLINK_TRAVEL;
    setTimeout(step, 26);
  }
  step();
}

// Click react — separate flag, never conflicts with isBlinking chain
// Silently skips if a blink is already running (no queueing)
// Only fires within 1 SVG-width of padding around the SVG bounds
function onClickReact(e) {
  if (clickReacting || isDragging) return;
  // Zone check: only within SVG bounds + 1 SVG-width padding each side
  const svg = document.querySelector('#boahemaa-container svg');
  if (svg) {
    const rect = svg.getBoundingClientRect();
    const svgW = rect.width;
    const svgH = rect.height;
    const inZone = e.clientX >= rect.left &&
                   e.clientX <= rect.right &&
                   e.clientY >= rect.top  &&
                   e.clientY <= rect.bottom;
    if (!inZone) return;
  }
  clickReacting = true;
  const reactFrames = [0, 0.5, 1.0, 1.0, 0.7, 0.3, 0.1, 0];
  let f = 0;
  function step() {
    if (f >= reactFrames.length) {
      blinkY = 0; clickReacting = false; return;
    }
    blinkY = reactFrames[f++] * BLINK_TRAVEL;
    setTimeout(step, f < 3 ? 18 : 32);
  }
  if (!isBlinking) step();
  else clickReacting = false; // blink already running — skip silently
}

// ── EARRING PHYSICS ───────────────────────
// Proper angular pendulum: earrings pivot around their lobe attachment point.
// Left earring pivot: (15.06, 158.1), Right earring pivot: (124.66, 158.1)
// Head acceleration in x pushes earrings in opposite direction (pendulum lag).
// Head acceleration in y (slide rise/drop) drives a symmetric outward swing.

// Vertical slide impulse — written by the slide IIFE each frame, consumed here.
let _slideVelPrev = 0;
window._boahemaaSlideImpulse = function(velPx) {
  // velPx = change in slideY per frame (positive = moving down, negative = rising).
  // Rising fast (neg velPx) → earrings lag behind → swing outward (+angle).
  // Dropping fast (pos velPx) → earrings overshoot → swing inward (−angle).
  const VERT_DRIVE = 0.32;
  const accelY = (velPx - _slideVelPrev) * VERT_DRIVE;
  _slideVelPrev = velPx;
  earringVelocity += -accelY;
};

function updateEarrings(ox) {
  const accel = (ox - prevOX) * EARRING_DRIVE;
  prevOX = ox;
  // Spring-damper
  earringVelocity += -earringAngle * EARRING_SPRING + accel;
  earringVelocity *= EARRING_DAMPING;
  earringAngle    += earringVelocity;
  // Clamp to reasonable swing range
  earringAngle = Math.max(-18, Math.min(18, earringAngle));

  // Apply as rotation around the top of the earring drop
  if (E.earringL) {
    E.earringL.setAttribute('transform',
      `rotate(${earringAngle.toFixed(3)},15.06,158.1)`);
  }
  if (E.earringR) {
    E.earringR.setAttribute('transform',
      `rotate(${(-earringAngle).toFixed(3)},124.66,158.1)`);
  }
}

// ── IDLE MICRO-MOVEMENT ───────────────────
// Simulates subtle human head fidget — quick small positional snaps, not slow drift.
// Think: shifting weight slightly, a tiny involuntary head adjust. Fast and small.
let microSnapTargetX = 0, microSnapTargetY = 0;
let microSnapTimer   = 0;
const MICRO_SNAP_INTERVAL = 800; // ms between fidget snaps
const MICRO_SNAP_RANGE    = 0.022; // max displacement in normalized units (very small)

function updateMicroMovement() {
  const now    = Date.now();
  const isIdle = (now - lastMouseTime) > 2500;

  if (!isIdle) {
    // Decay quickly back to zero when not idle
    microX *= 0.88; microY *= 0.88;
    microSnapTargetX = 0; microSnapTargetY = 0;
    return;
  }

  // Periodically snap to a new tiny random offset
  if (now - microSnapTimer > MICRO_SNAP_INTERVAL) {
    microSnapTimer = now;
    // Sometimes return to near-center, sometimes a tiny nudge
    if (Math.random() < 0.35) {
      microSnapTargetX = 0;
      microSnapTargetY = 0;
    } else {
      microSnapTargetX = (Math.random() - 0.5) * 2 * MICRO_SNAP_RANGE;
      microSnapTargetY = (Math.random() - 0.5) * 2 * MICRO_SNAP_RANGE * 0.6;
    }
  }

  // Fast lerp toward snap target — quick movement like a human fidget, not a drift
  microX += (microSnapTargetX - microX) * 0.22;
  microY += (microSnapTargetY - microY) * 0.22;
}

// ── LOOK-AWAY ─────────────────────────────
// During idle: she glances toward where the mouse last was, holds, returns to center.
// Only fires when mouse is idle. Mouse movement cancels it immediately.
function schedLookAway() {
  // Vary the gap between glances — sometimes soon, sometimes a while
  lookAwayTimer = setTimeout(tryLookAway, 4000 + Math.random() * 9000);
}
function tryLookAway() {
  const isIdle = (Date.now() - lastMouseTime) > IDLE_TIMEOUT;
  if (!isIdle || lookAwayActive || squintProgress > 0.05) {
    schedLookAway(); return;
  }
  // 40% chance to skip this cycle — not every idle period triggers a glance
  if (Math.random() < 0.4) { schedLookAway(); return; }
  lookAwayActive = true;
  // Glance toward the last known mouse position (not random) —
  // she's still aware the pointer is there, just tired of staring
  const el   = document.getElementById('boahemaa-container');
  const rect = el.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  const r    = Math.max(window.innerWidth, window.innerHeight) * 0.7;
  // Use last known mouse position, scaled down so it's a brief glance not full track
  lookAwayTgt.x = Math.max(-0.8, Math.min(0.8, (mouse.x - cx) / r)) * 0.65;
  lookAwayTgt.y = Math.max(-0.6, Math.min(0.6, (mouse.y - cy) / r)) * 0.65;
  // Hold the glance for a random duration — 2 to 5 seconds
  const holdTime = 2000 + Math.random() * 3000;
  setTimeout(() => { lookAwayActive = false; schedLookAway(); }, holdTime);
}

// ── PROXIMITY UTILS ───────────────────────
// Convert screen px to SVG-space distance from face center
function screenToSVGDist(mx, my) {
  const svg = document.querySelector('#boahemaa-container svg');
  if (!svg) return 999;
  const rect = svg.getBoundingClientRect();
  const vb   = svg.viewBox.baseVal;
  const scaleX = vb.width  / rect.width;
  const scaleY = vb.height / rect.height;
  const svgX = (mx - rect.left) * scaleX;
  const svgY = (my - rect.top)  * scaleY;
  // Face center ~(69.86, 133.08) — eye midpoint
  const faceCX = 69.86;
  const faceCY = 115.0;
  return { dist: Math.hypot(svgX - faceCX, svgY - faceCY), svgX, svgY };
}

// ── MAIN TICK ─────────────────────────────
function tick() {
  if (!ready) { requestAnimationFrame(tick); return; }

  const el   = document.getElementById('boahemaa-container');
  const rect = el.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  const dx   = mouse.x - cx;
  const dy   = mouse.y - cy;

  // ── SUBSYSTEMS ────────────────────────
  updateMicroMovement();

  // ── IDLE CHECK ────────────────────────
  const timeSinceMove = Date.now() - lastMouseTime;
  idleActive = timeSinceMove > IDLE_TIMEOUT;

  const r  = Math.max(window.innerWidth, window.innerHeight) * 0.7;
  const mouseTgtX = Math.max(-1, Math.min(1, dx / r));
  const mouseTgtY = Math.max(-1, Math.min(1, dy / r));

  // Wave intro: lock gaze to center, no mouse tracking
  if (window._waveIntroActive) {
    tgt.x = 0; tgt.y = 0;
    cur.x += (tgt.x - cur.x) * LERP_TRACK;
    cur.y += (tgt.y - cur.y) * LERP_TRACK;
    updateEarrings(cur.x);
    apply(cur.x + microX, cur.y + microY);
    requestAnimationFrame(tick);
    return;
  }

  // Thinking states: disable mouse tracking and blushing.
  // The expression system drives pupils via exprPupilOX/OY; eyes return to center.
  if (window._thinkingStateActive) {
    tgt.x = 0; tgt.y = 0;
    cur.x += (0 - cur.x) * 0.08;
    cur.y += (0 - cur.y) * 0.08;
    // Suppress blush — call setBlushState(false) once, which uses the existing
    // animateBlush() fade-out path (safe, idempotent, no RAF multiplication).
    if (blushActive && !isDragging) {
      setBlushState(false);
    }
    updateEarrings(cur.x);
    apply(cur.x + microX, cur.y + microY);
    requestAnimationFrame(tick);
    return;
  }

  // Decline active: suppress mouse tracking and blush, skip tgt/cur updates entirely.
  // ox/oy are driven by window._declineOX/OY; finalOX/OY assignment is below.
  if (window._declineActive) {
    if (blushActive) {
      blushActive = false;
      blushProgress = 0;
      smileProgress = 0;
      squintProgress = 0;
      squintExtra = 0;
      isDragging = false;
      window.isDragging = false;
      if (E.blush) { E.blush.style.opacity = '0'; E.blush.style.visibility = 'hidden'; }
    }
  } else {
  // Look-away overrides mouse tracking
  if (lookAwayActive) {
    // Natural glance movement — not a snap, more like eyes casually drifting over
    lookAwayCur.x += (lookAwayTgt.x - lookAwayCur.x) * 0.06;
    lookAwayCur.y += (lookAwayTgt.y - lookAwayCur.y) * 0.06;
    tgt.x = lookAwayCur.x;
    tgt.y = lookAwayCur.y;
  } else if (idleActive) {
    // Snap back to center fast — like losing interest, not slowly drifting
    tgt.x = 0; tgt.y = 0;
  } else if (!window._typingStateActive) {
    // Typing state: skip direct mouse tracking — look-away and idle-return still work above.
    lookAwayCur.x = mouseTgtX;
    lookAwayCur.y = mouseTgtY;
    tgt.x = mouseTgtX; tgt.y = mouseTgtY;
  }

  // Typing state: suppress blush
  if (window._typingStateActive && blushActive && !isDragging) {
    setBlushState(false);
  }

  // Fast lerp during idle return, normal lerp when tracking mouse
  const activeLerp = lookAwayActive ? LERP_TRACK : (idleActive ? 0.22 : LERP_TRACK);
  cur.x += (tgt.x - cur.x) * activeLerp;
  cur.y += (tgt.y - cur.y) * activeLerp;
  } // end else (not _declineActive)

  // Composite tracking + micro-drift
  // Decline active: override ox/oy entirely with scripted values
  let finalOX, finalOY;
  if (window._declineActive) {
    finalOX = window._declineOX;
    finalOY = window._declineOY;
    // Force cur to track decline values so there's no snap when it ends
    cur.x = window._declineOX;
    cur.y = window._declineOY;
  } else {
    finalOX = cur.x + microX;
    finalOY = cur.y + microY;
  }

  // ── PROXIMITY ─────────────────────────
  const { dist: proxDist, svgX: svgMX, svgY: svgMY } = screenToSVGDist(mouse.x, mouse.y);
  proxTarget = 1 - Math.max(0, Math.min(1, (proxDist - PROX_NEAR_SVG) / (PROX_FAR_SVG - PROX_NEAR_SVG)));
  proxCur   += (proxTarget - proxCur) * 0.08;

  // ── CROSS-EYE CONVERGENCE ─────────────
  // When cursor enters the rectangle between the inner sclera edges (nose bridge),
  // from brow down to chin: pupils cross-track the mouse within that zone.
  // convergeFactor 0→1 as cursor enters, smoothly.
  // When mouse is idle, convergence fades out even if cursor is in zone.
  const inConvergeX = svgMX >= CONVERGE_X_MIN && svgMX <= CONVERGE_X_MAX;
  const inConvergeY = svgMY >= CONVERGE_Y_MIN && svgMY <= CONVERGE_Y_MAX;
  if (inConvergeX && inConvergeY && !idleActive) {
    // Fade in at the edges of the rectangle for smooth entry
    const xCenter  = (CONVERGE_X_MIN + CONVERGE_X_MAX) / 2;
    const xHalf    = (CONVERGE_X_MAX - CONVERGE_X_MIN) / 2;
    const xFalloff = 1 - Math.pow(Math.abs(svgMX - xCenter) / xHalf, 1.5);
    // Fade in over 8px at top (brow), stay full through rest
    const yFadeTop = Math.min(1, (svgMY - CONVERGE_Y_MIN) / 8);
    convergeTarget = Math.max(0, xFalloff) * yFadeTop;
    // Store normalised mouse position within the rectangle for tracking
    // svgMX_norm: -1 (left edge) to +1 (right edge), svgMY_norm: -1 (top) to +1 (bottom)
    convergeMX = (svgMX - xCenter) / xHalf;          // -1..1 horizontal
    convergeMY = (svgMY - CONVERGE_Y_MIN) / (CONVERGE_Y_MAX - CONVERGE_Y_MIN) * 2 - 1; // -1..1 vertical
  } else {
    convergeTarget = 0;
  }
  convergeFactor += (convergeTarget - convergeFactor) * 0.12;

  // ── EARRING PHYSICS ───────────────────
  updateEarrings(cur.x);

  // ── STARTLE CHECK ─────────────────────
  apply(finalOX, finalOY);

  if (_debugDot) _debugDot.className = 'on';
  if (_debugDbg) _debugDbg.textContent =
    `ox ${cur.x.toFixed(2)} · oy ${cur.y.toFixed(2)} · prox ${proxCur.toFixed(2)} · conv ${convergeFactor.toFixed(2)}`;

  requestAnimationFrame(tick);
}

// ── INIT ──────────────────────────────────
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mousedown', e => { onMouseDown(e); onClickReact(e); });
document.addEventListener('mouseup',   onMouseUp);
// Click anywhere → startle blink (only inside SVG — handled in onMouseDown)
loadSVG();

// Cache debug element refs once (accessed every rAF tick)
var _debugDot = document.getElementById('dot');
var _debugDbg = document.getElementById('dbg');

window.boahemaaAccent = applyAccent;
window.boahemaaBlush  = setBlushState;

// Apply default white accent on load so chat-frame border is set immediately
applyAccent('white');

// ── EXPRESSION API ────────────────────────
window.boahemaaExpression = function(name) {
  const svg = document.querySelector('#boahemaa-container svg');
  if (!svg) return;
  const normName = name.toLowerCase().trim();
  const def = EXPRESSIONS[normName];
  if (!def) {
    console.warn('[Boahemaa] Unknown expression:', name,
      '— valid:', Object.keys(EXPRESSIONS).join(', '));
    return;
  }

  // Snap from current live values so transition starts seamlessly
  // If coming from a lipGroup expression, use its defined morph targets as the from-path
  // (the closed-group path may be stale/hidden — the expression definition is authoritative)
  const prevDef = EXPRESSIONS[currentExpression] || EXPRESSIONS['neutral'];
  const fromLipU = prevDef.lipUpper || (E.lipUpper ? E.lipUpper.getAttribute('d') : null) || LIP_UPPER_NEUTRAL;
  const fromLipL = prevDef.lipLower || (E.lipLower ? E.lipLower.getAttribute('d') : null) || LIP_LOWER_NEUTRAL;
  exprFrom = {
    browY: exprBrowY, browRotExtra: exprBrowRot,
    browAsymR: exprBrowAsyR, browAsymL: exprBrowAsyL,
    browTiltL: exprBrowTiltL, browTiltR: exprBrowTiltR,
    lidDrop: exprLidDrop,
    lipUpper: fromLipU,
    lipLower: fromLipL,
    lipGroup: currentExprLipGroup,
    blushLevel: def.blushLevel !== undefined ? blushProgress : 0,
    pupilOX: exprPupilOX, pupilOY: exprPupilOY,
  };
  exprTo   = def;
  exprT    = 0;
  currentExpression = normName;
  currentExprLipGroup = def.lipGroup || null;

  // Handle blush-range expressions — drive blush system
  if (def.blushLevel !== undefined) {
    // Blush expressions: set blush to their level without toggling drag
    blushActive = true;
    const targetLevel = def.blushLevel;
    blushProgress  = Math.max(blushProgress, targetLevel * 0.1);
    animateBlushTo(targetLevel);
  } else if (blushActive && !isDragging) {
    // Switching away from a blush expression via the API
    blushActive = false;
    animateBlush();
  }

  const fromHasGroup = !!exprFrom.lipGroup;
  const toHasGroup   = !!def.lipGroup;
  // group→group: swap directly, no morph through closed
  const directSwap   = fromHasGroup && toHasGroup;

  // Hide all groups first
  Object.values(EXPRESSION_GROUPS).forEach(id => {
    const el = svg.querySelector('#' + CSS.escape(id));
    if (el) { el.style.display = 'none'; el.style.opacity = '0'; }
  });
  const closedGroup = svg.querySelector('#lips-closed-expressions');

  if (directSwap) {
    // Show the FROM group during transition — no morph, direct swap at end
    const fromGroupEl = svg.querySelector('#' + CSS.escape(exprFrom.lipGroup));
    if (fromGroupEl) { fromGroupEl.style.display = 'block'; fromGroupEl.style.opacity = '1'; }
    if (closedGroup)  { closedGroup.style.display = 'none'; }
  } else {
    // At least one side is closed-expression — morph through closed path
    if (closedGroup) { closedGroup.style.display = ''; closedGroup.style.opacity = '1'; }
    // Pre-set closed path to FROM shape so morph starts correctly
    if (E.lipUpper) E.lipUpper.setAttribute('d', exprFrom.lipUpper || LIP_UPPER_NEUTRAL);
    if (E.lipLower) E.lipLower.setAttribute('d', exprFrom.lipLower || LIP_LOWER_NEUTRAL);
  }

  // Run the transition
  if (exprRaf) cancelAnimationFrame(exprRaf);
  function step() {
    exprT = Math.min(exprT + EXPR_SPEED, 1);
    const t = exprT < 1 ? 1 - Math.pow(1 - exprT, 3) : 1; // ease-out cubic

    // Brow overrides
    exprBrowY    = lerp(exprFrom.browY || 0,        exprTo.browY        || 0, t);
    exprBrowRot  = lerp(exprFrom.browRotExtra || 0,  exprTo.browRotExtra || 0, t);
    exprBrowAsyR = lerp(exprFrom.browAsymR || 0,     exprTo.browAsymR    || 0, t);
    exprBrowAsyL = lerp(exprFrom.browAsymL || 0,     exprTo.browAsymL    || 0, t);
    exprBrowTiltL = lerp(exprFrom.browTiltL || 0,    exprTo.browTiltL    || 0, t);
    exprBrowTiltR = lerp(exprFrom.browTiltR || 0,    exprTo.browTiltR    || 0, t);
    exprLidDrop  = lerp(exprFrom.lidDrop || 0,       exprTo.lidDrop      || 0, t);
    exprDilate   = lerp(exprFrom.exprDilate || 0,    exprTo.exprDilate   || 0, t);
    exprPupilOX  = lerp(exprFrom.pupilOX || 0,       exprTo.pupilOX      || 0, t);
    exprPupilOY  = lerp(exprFrom.pupilOY || 0,       exprTo.pupilOY      || 0, t);

    // Lip morph — only when not a direct group swap and not driven by blush system
    if (!directSwap) {
      const fromU = exprFrom.lipUpper || LIP_UPPER_NEUTRAL;
      const fromL = exprFrom.lipLower || LIP_LOWER_NEUTRAL;
      const toU   = exprTo.lipUpper   || LIP_UPPER_NEUTRAL;
      const toL   = exprTo.lipLower   || LIP_LOWER_NEUTRAL;
      if (E.lipUpper) {
        const d = morphPath(fromU, toU, t);
        if (d) E.lipUpper.setAttribute('d', d);
      }
      if (E.lipLower) {
        const d = morphPath(fromL, toL, t);
        if (d) E.lipLower.setAttribute('d', d);
      }
    }


    // At end of transition: show only target
    if (exprT >= 1) {
      const svg2 = document.querySelector('#boahemaa-container svg');
      if (svg2) {
        Object.values(EXPRESSION_GROUPS).forEach(id => {
          const el = svg2.querySelector('#' + CSS.escape(id));
          if (el) { el.style.display = 'none'; el.style.opacity = '0'; }
        });
        const closedG = svg2.querySelector('#lips-closed-expressions');
        if (def.lipGroup) {
          if (closedG) { closedG.style.display = 'none'; closedG.style.opacity = '0'; }
          const target = svg2.querySelector('#' + CSS.escape(def.lipGroup));
          if (target) { target.style.display = 'block'; target.style.opacity = '1'; }
        } else {
          if (closedG) { closedG.style.display = ''; closedG.style.opacity = '1'; }
        }
      }
      exprRaf = null;
      return;
    }
    exprRaf = requestAnimationFrame(step);
  }
  exprRaf = requestAnimationFrame(step);
};

// Animate blush to a specific level (for blush-range expressions)
function animateBlushTo(targetLevel) {
  if (blushRAF) cancelAnimationFrame(blushRAF);
  function step() {
    const speed = 0.035;
    blushProgress  += (targetLevel - blushProgress)  * speed;
    smileProgress  += ((exprTo.lipUpper === LIP_UPPER_SMILE ? 1.0 : 0) - smileProgress)  * speed;
    squintProgress += (targetLevel * 0.6 - squintProgress) * 0.06;

    let finalBlushOpacity = blushProgress;
    if (blushProgress > 0.3) {
      blushPulseT += BLUSH_PULSE_SPEED;
      const pulse = Math.sin(blushPulseT) * BLUSH_PULSE_DEPTH;
      finalBlushOpacity = Math.max(0, Math.min(1, blushProgress + pulse));
    }

    if (E.blush) {
      E.blush.style.opacity    = finalBlushOpacity.toFixed(3);
      E.blush.style.visibility = blushProgress > 0.01 ? 'visible' : 'hidden';
    }
    if (E.lipUpper && blushActive) {
      const d = morphPath(LIP_UPPER_NEUTRAL, exprTo.lipUpper || LIP_UPPER_NEUTRAL, smileProgress);
      if (d) E.lipUpper.setAttribute('d', d);
    }
    if (E.lipLower && blushActive) {
      const d = morphPath(LIP_LOWER_NEUTRAL, LIP_LOWER_BLUSH, smileProgress);
      if (d) E.lipLower.setAttribute('d', d);
    }
    squintExtra = squintProgress * BLUSH_SQUINT_EXTRA;

    const done = Math.abs(blushProgress - targetLevel) < 0.005;
    if (!done || blushActive) blushRAF = requestAnimationFrame(step);
    else blushRAF = null;
  }
  blushRAF = requestAnimationFrame(step);
}


// ╔══════════════════════════════════════════════════════════
// ║  EXPR PANEL UI BUTTONS
// ╚══════════════════════════════════════════════════════════
let _activeExpr = 'neutral';

function setActiveBtn(name) {
  // Only touch expression buttons — body-state buttons manage their own active state
  document.querySelectorAll('.expr-btn:not(.body-state-btn)').forEach(b => b.classList.remove('active'));
  if (name !== 'neutral') {
    document.querySelectorAll('.expr-btn:not(.body-state-btn)').forEach(b => {
      if (b.onclick && b.onclick.toString().includes(`'${name}'`)) {
        b.classList.add('active');
      }
    });
  }
}

function setExpr(name) {
  // Buttons are locked during wave intro — only excited is active then
  if (window._waveIntroActive) return;
  if (_activeExpr === name) {
    // Pressing active expression again — toggle back to neutral
    _activeExpr = 'neutral';
    window.boahemaaExpression('neutral');
    setActiveBtn('neutral');
  } else {
    _activeExpr = name;
    window.boahemaaExpression(name);
    setActiveBtn(name);
  }
}

// Called by blush system when expression resets to neutral after blush
window.resetExprButton = function() {
  _activeExpr = 'neutral';
  setActiveBtn('neutral');
};

// ── BODY STATE TEST BUTTONS ───────────────────────────────
// TEMP — remove this function when chat integration is live.
// Active state is tracked separately from expression buttons
// so the two systems never interfere with each other.
let _activeBodyState = 'idle';

function setBodyStateBtn(name) {
  document.querySelectorAll('.body-state-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  // 'idle' has no persistent highlight — it is the default resting state
  if (name !== 'idle') {
    document.querySelectorAll('.body-state-btn').forEach(function(b) {
      if (b.onclick && b.onclick.toString().includes("'" + name + "'")) {
        b.classList.add('active');
      }
    });
  }
}
// Expose so the body state controller can sync the button on auto-switch
window._setBodyStateBtn = setBodyStateBtn;

function setBodyState(name) {
  if (window._waveIntroActive) return;

  // If pressing the active looping state again — treat as deactivate → go back to idle
  if (_activeBodyState === name && (name === 'typing' || name === 'thinking-left' || name === 'thinking-right')) {
    _activeBodyState = 'idle';
    window.boahemaaBodyState('idle');
    setBodyStateBtn('idle');
    return;
  }

  // If pressing idle-static again while it's active — deactivate back to idle
  if (_activeBodyState === name && name === 'idle-static') {
    _activeBodyState = 'idle';
    window.boahemaaBodyState('idle');
    setBodyStateBtn('idle');
    return;
  }

  _activeBodyState = name;
  window.boahemaaBodyState(name);
  setBodyStateBtn(name);
}


// ╔══════════════════════════════════════════════════════════
// ║  BODY SLIDE SYSTEM
// ╚══════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────
//  BODY SLIDE SYSTEM
//
//  The body SVG (#body-inner) sits inside #body-clip-area.
//  When the user has not hovered anywhere on #character-root
//  for 3 seconds, the body slides DOWN by 38.21px.
//  The head (#boahemaa-container) is absolutely positioned
//  inside #character-root at top:0, so it moves with the
//  document flow — but we also translateY it the SAME amount
//  so head and body descend together.
//
//  Timing: 15 frames at 60fps = 250ms.
//  Easing: ease-in curve (slow start, fast finish) to sell
//  the "sinking" weight — matches a character settling down.
//
//  Slide is applied via translateY on BOTH #body-inner
//  (inside the clip) AND #boahemaa-container (the head).
//  The clip window (#body-clip-area / #character-root overflow:hidden)
//  crops whatever exits the bottom edge.
//
//  On any mouse/touch entry back over #character-root the
//  character snaps back up (same 15-frame timing, ease-out).
//
//  IMPORTANT: The slide moves the body content INSIDE the clip.
//  #body-inner already has its base position (top: -166.78px).
//  translateY adds on top of that — CSS transform doesn't
//  disturb the positioned layout, so the base offset is preserved.
// ─────────────────────────────────────────────────────────

(function() {
  // Slide derived from the peep SVG reference:
  // In the 384x288 SVG space, the body top (neck_joint_circle top = y 219.51)
  // slides to y 257.72 in the peep → 30.28px from clip bottom (288).
  // In our HTML the body renders at 660px (scale 1.71875).
  // Body top sits at 210.50px inside character-root (idle).
  // To land 52.04px (30.28 * 1.71875) from clip bottom (328px):
  //   required slide = 352 - 210.50 - 52.04 = 89.45px
  const SLIDE_PX      = 89.45;
  const SLIDE_FRAMES  = 15;
  const SLIDE_MS      = (SLIDE_FRAMES / 60) * 1000;  // 250ms

  const bodyEl = document.getElementById('body-inner');
  const headEl = document.getElementById('boahemaa-container');
  const rootEl = document.getElementById('character-root');

  // Current slide state
  let slideY     = 0;   // current translated Y (0=up, SLIDE_PX=down)
  let slideRAF   = null;
  let isSlid     = false;
  let idleTimer  = null;
  const IDLE_DELAY = 3000;  // 3 seconds before sliding

  // ── EASING ──────────────────────────────────────────────
  // ease-in cubic for slide down (gravity pull)
  function easeIn(t)  { return t * t * t; }
  // ease-out cubic for return (spring back)
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ── APPLY TRANSFORM ─────────────────────────────────────
  // Sets translateY on both body and head so they move together.
  // Body base position is already set via CSS (top: -166.78px).
  // CSS transform is additive on top — does not change layout position.
  let _prevSlideY = 0;
  function applySlide(y) {
    const t = `translateY(${y.toFixed(3)}px)`;
    if (bodyEl) bodyEl.style.transform = t;
    // Only move head in sync when slide system is in control (idle state).
    // During chat states (_bodyStateActive=true), head transform is managed
    // by the body state controller — don't overwrite it.
    if (!window._bodyStateActive && headEl) headEl.style.transform = t;
    // Feed vertical velocity into earring physics each frame
    if (typeof window._boahemaaSlideImpulse === 'function') {
      window._boahemaaSlideImpulse(y - _prevSlideY);
    }
    _prevSlideY = y;
  }

  // ── ANIMATE ─────────────────────────────────────────────
  function animateTo(targetY, easeFn, onDone) {
    if (slideRAF) cancelAnimationFrame(slideRAF);
    const startY   = slideY;
    const delta    = targetY - startY;
    const startMs  = performance.now();

    function step(now) {
      const elapsed = now - startMs;
      const rawT    = Math.min(elapsed / SLIDE_MS, 1);
      const easedT  = easeFn(rawT);
      slideY = startY + delta * easedT;
      applySlide(slideY);

      if (rawT < 1) {
        slideRAF = requestAnimationFrame(step);
      } else {
        slideY   = targetY;
        slideRAF = null;
        if (onDone) onDone();
      }
    }
    slideRAF = requestAnimationFrame(step);
  }

  // ── SLIDE DOWN (idle) ────────────────────────────────────
  function slideDown() {
    if (isSlid) return;
    isSlid = true;
    animateTo(SLIDE_PX, easeIn);
  }

  // ── SLIDE UP (active) ────────────────────────────────────
  function slideUp() {
    if (!isSlid) return;
    isSlid = false;
    animateTo(0, easeOut);
  }

  // ── IDLE TIMER ───────────────────────────────────────────
  // Rise immediately when cursor enters — clear any pending slide-down.
  function onEnter() {
    clearTimeout(idleTimer);

    // If hover greet hasn't played yet, let it take over.
    // _triggerHoverGreet returns true when it takes ownership.
    // In that case we suppress the normal slide-up — the character
    // is already up during hover greet, and the slide system resumes
    // when _onHoverGreetDone is called.
    if (typeof window._triggerHoverGreet === 'function') {
      if (window._triggerHoverGreet()) return;
    }

    // Normal enter: trigger grabbing hands reverse BEFORE slideUp so they sync
    if (typeof window._grabHandsOnEnter === 'function') {
      window._grabHandsOnEnter();
    }
    if (isSlid) slideUp();
  }

  // Start slide-down countdown only after cursor leaves the character.
  function onLeave() {
    clearTimeout(idleTimer);
    // If hover greet is currently playing, don't start the slide-down timer yet.
    // The timer will start naturally after hover greet completes via _onHoverGreetDone.
    if (window._hoverGreetActive) return;
    // If an API body state is active, the slide system is suppressed entirely.
    if (window._bodyStateActive) return;

    idleTimer = setTimeout(function () {
      // Trigger grabbing hands forward AT THE SAME MOMENT body starts sliding
      if (typeof window._grabHandsOnLeave === 'function') {
        window._grabHandsOnLeave();
      }
      slideDown();
    }, IDLE_DELAY);
  }

  // Called by hover greet controller when animation finishes.
  // At this point the idle body is back — start normal idle countdown.
  window._onHoverGreetDone = function() {
    // Character is currently up (hover greet just finished).
    // If user is still hovering, start the leave timer; if they have
    // already left, start slide-down immediately.
    onLeave();
    // Flush any chat state that was queued while hover greet was playing
    if (typeof window._onChatStatePendingFlush === 'function') {
      window._onChatStatePendingFlush();
    }
  };

  // Expose slide-up-then-callback for body state controller
  // If body is currently slid down, slides it up then calls cb.
  // If already up, calls cb immediately.
  window._slideUpThenCall = function(cb) {
    if (!isSlid) { cb(); return; }
    // Cancel idle timer so it doesn't fight us
    clearTimeout(idleTimer);
    // Trigger grabbing hands backward in sync with slide-up
    if (typeof window._grabHandsOnEnter === 'function') {
      window._grabHandsOnEnter();
    }
    isSlid = false;
    // Temporarily allow head to move with body during this slide-up
    // We do this by calling the real animateTo but also moving head
    const headEl2 = document.getElementById('boahemaa-container');
    const startY2 = slideY;
    const delta2  = 0 - startY2;
    const startMs2 = performance.now();
    if (slideRAF) cancelAnimationFrame(slideRAF);

    function step2(now) {
      const elapsed = now - startMs2;
      const rawT    = Math.min(elapsed / SLIDE_MS, 1);
      const easedT  = easeOut(rawT);
      slideY = startY2 + delta2 * easedT;
      const t2 = `translateY(${slideY.toFixed(3)}px)`;
      if (bodyEl) bodyEl.style.transform = t2;
      if (headEl2) headEl2.style.transform = t2;
      if (rawT < 1) {
        slideRAF = requestAnimationFrame(step2);
      } else {
        slideY = 0;
        slideRAF = null;
        if (bodyEl) bodyEl.style.transform = 'translateY(0px)';
        if (headEl2) headEl2.style.transform = 'translateY(0px)';
        cb();
      }
    }
    slideRAF = requestAnimationFrame(step2);
  };

  // Force body to top position with no animation (used when entering chat states)
  window._forceSlideUp = function() {
    if (slideRAF) cancelAnimationFrame(slideRAF);
    clearTimeout(idleTimer);
    isSlid = false;
    slideY = 0;
    if (bodyEl) bodyEl.style.transform = 'translateY(0px)';
    if (headEl) headEl.style.transform = 'translateY(0px)';
  };

  // Expose current slide state for body state controller
  window._isBodySlid = function() { return isSlid; };

  // Expose onLeave so body state controller can restart the idle countdown
  window._slideSystemOnLeave = function() { onLeave(); };

  // Events gate on _idleSystemReady — wave intro owns the head until swap is done.
  rootEl.addEventListener('mouseenter', function() { if (window._idleSystemReady && !window._bodyStateActive) onEnter(); }, { passive: true });
  rootEl.addEventListener('mouseleave', function() { if (window._idleSystemReady && !window._bodyStateActive) onLeave(); }, { passive: true });
  rootEl.addEventListener('touchstart', function() { if (window._idleSystemReady && !window._bodyStateActive) onEnter(); }, { passive: true });
  rootEl.addEventListener('touchend',   function() { if (window._idleSystemReady && !window._bodyStateActive) onLeave(); }, { passive: true });

  // Wait for wave intro to complete, then kick off the idle timer
  (function waitForSwap() {
    if (window._idleSystemReady) { if (!window._bodyStateActive) onLeave(); }
    else { setTimeout(waitForSwap, 50); }
  })();

})();


// ╔══════════════════════════════════════════════════════════
// ║  WAVE INTRO BODY + HEAD CONSTRAINT
// ╚══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  WAVE INTRO BODY + HEAD CONSTRAINT
//
//  The wave Lottie sits in the exact same coordinate space as
//  #body-inner (left:-239.94px, top:-166.78px, 660x495px).
//  The head constraint writes translateY + rotate onto
//  #boahemaa-container each frame to follow the torso/hip.
//
//  On animation complete — INSTANT swap, no fade:
//    #lottie-body    display:none
//    #body-inner     display:block
//    #grabbing-hands display:block
//    #boahemaa-container transform cleared
//    window._idleSystemReady = true  (unlocks slide system)
// ════════════════════════════════════════════════════════════

window._idleSystemReady  = false;
window._waveIntroActive  = true;   // disables mouse tracking during wave intro

(function() {

function bezier(x1, y1, x2, y2) {
  return function(x) {
    if (x === 0 || x === 1) return x;
    let t = x;
    for (let i = 0; i < 5; i++) {
      let currentX = 3 * Math.pow(1-t,2)*t*x1 + 3*(1-t)*Math.pow(t,2)*x2 + Math.pow(t,3);
      let slope = 3*Math.pow(1-t,2)*x1 + 6*(1-t)*t*(x2-x1) + 3*Math.pow(t,2)*(1-x2);
      if (Math.abs(currentX - x) < 0.001) break;
      if (slope === 0) break;
      t -= (currentX - x) / slope;
    }
    return 3*Math.pow(1-t,2)*t*y1 + 3*(1-t)*Math.pow(t,2)*y2 + Math.pow(t,3);
  };
}

const stdEase = bezier(0.333, 0, 0.667, 1);

const TORSO_KF = [
  {t:0,   s:0,    ease: stdEase},
  {t:16,  s:0,    ease: stdEase},
  {t:37,  s:-1,   ease: stdEase},
  {t:59,  s:0.9,  ease: stdEase},
  {t:86,  s:-0.7, ease: stdEase},
  {t:115, s:0.5,  ease: stdEase},
  {t:148, s:-0.3, ease: stdEase},
  {t:197, s:0.2,  ease: stdEase},
  {t:254, s:0}
];

const HIP_KF = [
  {t:0,   y:367.125, ease: bezier(0.897,0,0.667,1)},
  {t:20,  y:265.875, ease: bezier(0.333,0.333,0.682,0.682)},
  {t:208, y:265.875, ease: bezier(0.404,0,0.731,0.518)},
  {t:240, y:328.875, ease: bezier(0,1,1,0)},
  {t:420, y:328.895, ease: bezier(0.65,0.622,0.686,1)},
  {t:435, y:384.201}
];

const LOTTIE_SCALE  = 1.718319;
const TORSO_PIVOT_X = 90.006;
const TORSO_PIVOT_Y = 399.510;
const HIP_REST_Y    = 265.875;

function interpKF(kfs, frame, key) {
  if (frame <= kfs[0].t) return kfs[0][key];
  for (let i = 1; i < kfs.length; i++) {
    if (frame <= kfs[i].t) {
      const t0 = kfs[i-1].t, t1 = kfs[i].t;
      const v0 = kfs[i-1][key], v1 = kfs[i][key];
      const raw = (frame - t0) / (t1 - t0);
      const alpha = kfs[i-1].ease ? kfs[i-1].ease(raw) : raw;
      return v0 + (v1 - v0) * alpha;
    }
  }
  return kfs[kfs.length-1][key];
}

function applyHeadConstraint(anim, done) {
  const frame     = done ? anim.totalFrames - 1 : anim.currentFrame;
  const torsoRot  = interpKF(TORSO_KF, frame, 's');
  // hipDeltaY is relative to HIP_REST_Y in Lottie comp units, scaled to px.
  // In the widget, #boahemaa-container sits at top:0 in a 180x328 root.
  // At HIP_REST_Y the Lottie neck joint in the widget root = 146.346px.
  // The head neck joint in container local space = 254.78px.
  // Offset to align them: 254.78 - 146.346 = 108.434px (subtract from hipDeltaY).
  const hipDeltaY = Math.min((interpKF(HIP_KF, frame, 'y') - HIP_REST_Y) * LOTTIE_SCALE - 108.434, 50);
  const el        = document.getElementById('boahemaa-container');
  el.style.transformOrigin = TORSO_PIVOT_X + 'px ' + TORSO_PIVOT_Y + 'px';
  el.style.transform       = 'translateY(' + hipDeltaY.toFixed(3) + 'px) rotate(' + torsoRot.toFixed(4) + 'deg)';
  el.style.opacity         = '1';
}

function doBodySwap() {
  document.getElementById('lottie-body').style.display = 'none';
  document.getElementById('body-inner').style.display = 'block';
  document.getElementById('grabbing-hands').style.display = 'block';

  // Restore head clip overflow
  document.getElementById('head-clip-area').style.overflow = 'hidden';

  // Clear constraint transform
  const el = document.getElementById('boahemaa-container');
  el.style.transform = '';
  el.style.transformOrigin = '';
  
  // ADD THIS LINE TO FIX THE DISAPPEARING HEAD:
  el.style.opacity = '1'; 

  window._idleSystemReady = true;
  window._waveIntroActive = false;
}

let anim = null, animDone = false;

// ── SESSION / PERSISTENCE FLAGS ─────────────────────────
// Wave intro and hover greet each play once per "fresh visit".
// A fresh visit = user hasn't seen it within the last 2 hours.
// localStorage stores the timestamp of last play.
const INTRO_TTL_MS = 2 * 60 * 60 * 1000;  // 2 hours

function _isFreshVisit(lsKey) {
  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return true;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return true;
    return (Date.now() - ts) > INTRO_TTL_MS;
  } catch(e) { return true; }
}

function _markPlayed(lsKey) {
  try { localStorage.setItem(lsKey, String(Date.now())); } catch(e) {}
}

const WAVE_INTRO_SHOULD_PLAY      = _isFreshVisit('boahemaa_wave_ts');
window._hoverGreetShouldPlay      = _isFreshVisit('boahemaa_hover_ts');

function initLottie() {
  if (!WAVE_INTRO_SHOULD_PLAY) {
    // Skip wave intro entirely — go straight to idle body
    doBodySwap();
    // Ensure expression is neutral (no wave intro means no excited was set,
    // but guard against stale state from a previous session within the TTL window)
    if (typeof window.boahemaaExpression === 'function') {
      window.boahemaaExpression('neutral');
    }
    if (typeof setActiveBtn === 'function') setActiveBtn('neutral');
    _activeExpr = 'neutral';
    var _ep0 = document.getElementById('expr-panel'); if (_ep0) _ep0.classList.remove('wave-locked');
    return;
  }

  // Mark as played immediately so a rapid refresh doesn't replay it
  _markPlayed('boahemaa_wave_ts');

  anim = lottie.loadAnimation({
    container: document.getElementById('lottie-body'),
    renderer:  'svg',
    loop:      false,
    autoplay:  false,
    path: _boahemaaBase + 'lottie/wave_intro.json',
  });
  anim.addEventListener('DOMLoaded',  function() { applyHeadConstraint(anim, false); anim.play(); window.boahemaaExpression('excited'); setActiveBtn('excited'); _activeExpr = 'excited'; var _ep1 = document.getElementById('expr-panel'); if (_ep1) _ep1.classList.add('wave-locked'); });
  anim.addEventListener('enterFrame', function() { if (!animDone) applyHeadConstraint(anim, false); });
  anim.addEventListener('complete',   function() { animDone = true; applyHeadConstraint(anim, true); doBodySwap(); window.boahemaaExpression('neutral'); setActiveBtn('neutral'); _activeExpr = 'neutral'; var _ep2 = document.getElementById('expr-panel'); if (_ep2) _ep2.classList.remove('wave-locked'); });
}

function boot() {
  if (typeof lottie === 'undefined') { setTimeout(boot, 50); return; }
  initLottie();
}
boot();

})();


// ╔══════════════════════════════════════════════════════════
// ║  HOVER GREET CONTROLLER
// ╚══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  HOVER GREET CONTROLLER
//
//  Plays hover_greet.json ONCE — on the user's very first hover
//  after the wave intro (or idle body if wave was skipped).
//
//  State lifecycle:
//    idle body shown → user hovers → [_hoverGreetShouldPlay?]
//      YES: hide idle body + grabbing hands, show lottie-hover-greet,
//           play animation, lock slide system (_hoverGreetActive=true)
//      NO:  normal slide-up as usual
//
//  On hover greet complete:
//    hide lottie-hover-greet, show idle body + grabbing hands,
//    _hoverGreetActive = false, _hoverGreetShouldPlay = false,
//    mark played in localStorage.
//
//  The slide system checks window._hoverGreetActive before
//  executing slideUp/slideDown — it waits for hover greet to finish.
// ════════════════════════════════════════════════════════════

(function() {
  window._hoverGreetActive = false;

  let hgAnim  = null;
  let hgLoaded = false;

  function _finishHoverGreet() {
    // Swap back to idle body
    document.getElementById('lottie-hover-greet').style.display = 'none';
    document.getElementById('body-inner').style.display         = 'block';
    document.getElementById('grabbing-hands').style.display     = 'block';

    window._hoverGreetActive     = false;
    window._hoverGreetShouldPlay = false;

    // Clear smile expression back to neutral when hover greet ends
    if (typeof window.boahemaaExpression === 'function') {
      window.boahemaaExpression('neutral');
    }

    // Mark as played (2-hour TTL)
    try { localStorage.setItem('boahemaa_hover_ts', String(Date.now())); } catch(e) {}

    // Notify slide system that hover greet is done
    if (typeof window._onHoverGreetDone === 'function') {
      window._onHoverGreetDone();
    }
  }

  // Pre-load animation as soon as idle system is ready, so no delay on first hover.
  function preloadHoverGreet() {
    if (!window._hoverGreetShouldPlay) return;

    hgAnim = lottie.loadAnimation({
      container: document.getElementById('lottie-hover-greet'),
      renderer:  'svg',
      loop:      false,
      autoplay:  false,
      path: _boahemaaBase + 'lottie/hover_greet.json',
    });

    hgAnim.addEventListener('DOMLoaded', function() {
      hgLoaded = true;
    });

    hgAnim.addEventListener('complete', function() {
      _finishHoverGreet();
    });
  }

  // Called by slide IIFE's onEnter on the user's first hover.
  // Returns true if hover greet took over (slide system should suppress normal slideUp).
  window._triggerHoverGreet = function() {
    if (!window._hoverGreetShouldPlay) return false;
    if (window._hoverGreetActive) return true;

    window._hoverGreetActive = true;

    // Swap idle body -> hover greet layer and begin playback.
    // Only called once the character is fully risen (slideY = 0).
    function doSwapAndPlay() {
      document.getElementById('body-inner').style.display         = 'none';
      document.getElementById('grabbing-hands').style.display     = 'none';
      document.getElementById('lottie-hover-greet').style.display = 'block';
      // Apply smile expression for the duration of the hover greet
      if (typeof window.boahemaaExpression === 'function') {
        window.boahemaaExpression('smile');
      }

      if (hgLoaded && hgAnim) {
        hgAnim.goToAndStop(0, true);
        hgAnim.play();
      } else if (hgAnim) {
        (function waitAndPlay() {
          if (hgLoaded) { hgAnim.goToAndStop(0, true); hgAnim.play(); }
          else { requestAnimationFrame(waitAndPlay); }
        })();
      } else {
        hgAnim = lottie.loadAnimation({
          container: document.getElementById('lottie-hover-greet'),
          renderer:  'svg',
          loop:      false,
          autoplay:  false,
          path: _boahemaaBase + 'lottie/hover_greet.json',
        });
        hgAnim.addEventListener('DOMLoaded', function() {
          hgLoaded = true;
          hgAnim.play();
        });
        hgAnim.addEventListener('complete', function() {
          _finishHoverGreet();
        });
      }
    }

    // If the body is currently slid down, slide it up first so the character
    // rises into view before the hover greet animation begins.
    // _slideUpThenCall handles grabbing-hands sync and fires cb when fully risen.
    if (typeof window._slideUpThenCall === 'function' && window._isBodySlid && window._isBodySlid()) {
      window._slideUpThenCall(doSwapAndPlay);
    } else {
      doSwapAndPlay();
    }

    return true;
  };

  // Pre-load as soon as idle system is ready
  (function waitForIdle() {
    if (window._idleSystemReady) { preloadHoverGreet(); }
    else { setTimeout(waitForIdle, 50); }
  })();

})();


// ╔══════════════════════════════════════════════════════════
// ║  GRABBING HANDS LOTTIE CONTROLLER
// ╚══════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────
//  GRABBING HANDS LOTTIE CONTROLLER
//
//  Paired with #body-inner (the idle body SVG). When the body
//  is swapped for a Lottie body, remove both this and the
//  #grabbing-hands element together — they are a matched pair.
//
//  Behaviour:
//  ┌─ User is hovering ──────────────────────────────────────┐
//  │  Body is risen. JSON frozen at RELEASE_FRAME.           │
//  └─────────────────────────────────────────────────────────┘
//  ┌─ User stops hovering → 3s idle → body slides DOWN ──────┐
//  │  JSON scrubs FORWARD from RELEASE_FRAME → last frame    │
//  │  in 250ms to match body slide-down.                     │
//  │  After reaching last frame: freezes there.              │
//  └─────────────────────────────────────────────────────────┘
//  ┌─ User hovers again → body slides UP ────────────────────┐
//  │  JSON scrubs BACKWARD from last frame → RELEASE_FRAME.  │
//  │  in 250ms to match body slide-up.                       │
//  │  After reaching RELEASE_FRAME: freezes there.           │
//  └─────────────────────────────────────────────────────────┘
//
//  Implementation notes:
//  - lottie.loadAnimation with autoplay:false, loop:false
//  - Forward scrub: manual rAF scrub from current frame to 195 in 250ms
//  - Backward scrub: manual rAF scrub from current frame to 0 in 250ms
//  - We hook into the body slide system via two window-exposed
//    callbacks: window._grabHandsOnLeave() and
//    window._grabHandsOnEnter() called from the slide IIFE below.
// ─────────────────────────────────────────────────────────

(function () {
  const TOTAL_FRAMES = 190;   // op from JSON (60fps, 3.25s) - adjust to prevent disappearing
  const RELEASE_FRAME = 184; // frame where hands are in release position
  const SLIDE_MS     = 250;   // must match body slide SLIDE_MS

  let anim      = null;
  let reverseRAF = null;
  let reverseFrom = TOTAL_FRAMES;
  let currentFrame = 0;       // tracked so reverse knows where to start

  // ── INIT ────────────────────────────────────────────────
  function init() {
    anim = lottie.loadAnimation({
      container:     document.getElementById('grabbing-hands-lottie'),
      renderer:      'svg',
      loop:          false,
      autoplay:      false,
      path: _boahemaaBase + 'lottie/grabbing_hands_overlay.json',
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        clearCanvas: false
      }
    });

    anim.addEventListener('DOMLoaded', function () {
      anim.goToAndStop(RELEASE_FRAME, true);   // freeze at release frame on load
      currentFrame = RELEASE_FRAME;
    });

    // Track current frame so reverse always starts from correct position
    anim.addEventListener('enterFrame', function (e) {
      currentFrame = e.currentTime;
    });

    // When forward play completes, pause at last frame
    anim.addEventListener('complete', function () {
      currentFrame = TOTAL_FRAMES;
      anim.goToAndStop(TOTAL_FRAMES, true);
    });
  }

  // ── FORWARD (body sliding down) ─────────────────────────
  // Scrub from currentFrame → 195 in exactly SLIDE_MS milliseconds.
  function playForward() {
    cancelReverse();
    // If forward play is running, stop it first
    anim.pause();

    const startFrame = currentFrame;
    if (startFrame >= TOTAL_FRAMES) {
      anim.goToAndStop(TOTAL_FRAMES, true);
      currentFrame = TOTAL_FRAMES;
      return;
    }

    const startMs = performance.now();

    function step(now) {
      const t = Math.min((now - startMs) / SLIDE_MS, 1);
      // ease-out cubic to match body slide-up easing
      const easedT = 1 - Math.pow(1 - t, 3);
      const frame  = startFrame + (TOTAL_FRAMES - startFrame) * easedT;
      anim.goToAndStop(frame, true);
      currentFrame = frame;

      if (t < 1) {
        reverseRAF = requestAnimationFrame(step);
      } else {
        anim.goToAndStop(TOTAL_FRAMES, true);
        currentFrame = TOTAL_FRAMES;
        reverseRAF = null;
      }
    }
    reverseRAF = requestAnimationFrame(step);
  }

  // ── BACKWARD (body sliding up) ──────────────────────────
  // Scrub from currentFrame → RELEASE_FRAME in exactly SLIDE_MS milliseconds.
  function playBackward() {
    cancelReverse();
    // If forward play is running, stop it first
    anim.pause();

    const startFrame = currentFrame;
    if (startFrame <= RELEASE_FRAME) {
      anim.goToAndStop(RELEASE_FRAME, true);
      currentFrame = RELEASE_FRAME;
      return;
    }

    const startMs = performance.now();

    function step(now) {
      const t = Math.min((now - startMs) / SLIDE_MS, 1);
      // ease-out cubic to match body slide-up easing
      const easedT = 1 - Math.pow(1 - t, 3);
      const frame  = startFrame + (RELEASE_FRAME - startFrame) * easedT;
      anim.goToAndStop(frame, true);
      currentFrame = frame;

      if (t < 1) {
        reverseRAF = requestAnimationFrame(step);
      } else {
        anim.goToAndStop(RELEASE_FRAME, true);
        currentFrame = RELEASE_FRAME;
        reverseRAF = null;
      }
    }
    reverseRAF = requestAnimationFrame(step);
  }

  function cancelReverse() {
    if (reverseRAF) {
      cancelAnimationFrame(reverseRAF);
      reverseRAF = null;
    }
  }

  // ── EXPOSE TO SLIDE IIFE ────────────────────────────────
  // The body slide IIFE calls these at the right moments.
  window._grabHandsOnLeave  = playForward;   // user left → body will slide down
  window._grabHandsOnEnter  = playBackward;  // user entered → body sliding up

  // Reset hands to release-frame silently (no animation) — used before showing idle
  window._grabHandsReset = function() {
    if (!anim) return;
    cancelReverse();
    anim.goToAndStop(RELEASE_FRAME, true);
    currentFrame = RELEASE_FRAME;
  };

  // Init once DOM is ready AND lottie is available
  function tryInit() {
    if (typeof lottie === 'undefined') {
      setTimeout(tryInit, 50);
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();


// ╔══════════════════════════════════════════════════════════
// ║  API-DRIVEN BODY STATE CONTROLLER
// ╚══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  API-DRIVEN BODY STATE CONTROLLER  v10 (SYNCHRONOUS SWAP)
// ════════════════════════════════════════════════════════════

(function() {

  // ── CONSTANTS ─────────────────────────────────────────────
  const THINK_KF = [
    { t: 0,   s: 0,    io: [0.207, 0],    ii: [0.281, 1] },
    { t: 40,  s: 1.51, io: [0.167, 0],    ii: [0.281, 1] },
    { t: 370, s: 1.51, io: [0.719, 0],    ii: [0.793, 1] },
    { t: 410, s: 0,    io: null,           ii: null       },
  ];
  // Head-relative tilt: head tilts OPPOSITE to body lean (thinking gesture).
  // thinking-left  → body leans left  → head tilts RIGHT (direction = -1)
  // thinking-right → body leans right → head tilts LEFT  (direction = +1)
  // Peak of ~3.5° at the same hold region as the torso, fades in/out smoothly.
  const HEAD_TILT_KF = [
    { t: 0,   s: 0,   io: [0.207, 0],    ii: [0.281, 1] },
    { t: 55,  s: 3.5, io: [0.167, 0],    ii: [0.281, 1] },
    { t: 355, s: 3.5, io: [0.719, 0],    ii: [0.793, 1] },
    { t: 410, s: 0,   io: null,           ii: null       },
  ];
  const THINK_TOTAL_FRAMES = 410;
  const TYPING_TOTAL_FRAMES = 360; 

  const HEAD_PIVOT_X = 90.060;
  const HEAD_PIVOT_Y = 398.474;

  // ── ELEMENT REFS ──────────────────────────────────────────
  const EL = {
    idleBody    : document.getElementById('body-inner'),
    grabbingHands: document.getElementById('grabbing-hands'),
    typing      : document.getElementById('lottie-typing'),
    thinkLBase  : document.getElementById('lottie-thinking-left-base'),
    thinkLFore  : document.getElementById('lottie-thinking-left-forearm'),
    thinkRBase  : document.getElementById('lottie-thinking-right-base'),
    thinkRFore  : document.getElementById('lottie-thinking-right-forearm'),
    headEl      : document.getElementById('boahemaa-container'),
  };

  const ANIMS = { typing: null, thinkLBase: null, thinkLFore: null, thinkRBase: null, thinkRFore: null };
  const LOADED = { typing: false, thinkLBase: false, thinkLFore: false, thinkRBase: false, thinkRFore: false };

  let currentState  = 'idle';
  let pendingState  = null;   
  let swapLocked    = false;  
  let thinkConstraintRAF = null;

  // ── BEZIER HELPER ─────────────────────────────────────────
  function cubicBezier(x1, y1, x2, y2) {
    return function(x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const cx = 3 * Math.pow(1-t,2)*t*x1 + 3*(1-t)*Math.pow(t,2)*x2 + Math.pow(t,3);
        const slope = 3*Math.pow(1-t,2)*x1 + 6*(1-t)*t*(x2-x1) + 3*Math.pow(t,2)*(1-x2);
        if (Math.abs(cx - x) < 0.0005) break;
        if (slope === 0) break;
        t -= (cx - x) / slope;
      }
      return 3*Math.pow(1-t,2)*t*y1 + 3*(1-t)*Math.pow(t,2)*y2 + Math.pow(t,3);
    };
  }

  // ── THINKING KEYFRAME INTERPOLATION ───────────────────────
  function getThinkRotation(frame, direction) {
    const kfs = THINK_KF;
    if (frame <= kfs[0].t) return kfs[0].s * direction;
    for (let i = 1; i < kfs.length; i++) {
      if (frame <= kfs[i].t) {
        const t0 = kfs[i-1].t, t1 = kfs[i].t;
        const v0 = kfs[i-1].s, v1 = kfs[i].s;
        const raw = (frame - t0) / (t1 - t0);
        let alpha = raw;
        if (kfs[i-1].io && kfs[i].ii) {
          const ease = cubicBezier(kfs[i-1].io[0], kfs[i-1].io[1], kfs[i].ii[0], kfs[i].ii[1]);
          alpha = ease(raw);
        }
        return (v0 + (v1 - v0) * alpha) * direction;
      }
    }
    return kfs[kfs.length-1].s * direction;
  }

  // Returns the head-relative tilt angle for the current frame.
  // direction: +1 = tilt right, -1 = tilt left (opposite to torso lean).
  function getHeadTilt(frame, direction) {
    const kfs = HEAD_TILT_KF;
    if (frame <= kfs[0].t) return kfs[0].s * direction;
    for (let i = 1; i < kfs.length; i++) {
      if (frame <= kfs[i].t) {
        const t0 = kfs[i-1].t, t1 = kfs[i].t;
        const v0 = kfs[i-1].s, v1 = kfs[i].s;
        const raw = (frame - t0) / (t1 - t0);
        let alpha = raw;
        if (kfs[i-1].io && kfs[i].ii) {
          const ease = cubicBezier(kfs[i-1].io[0], kfs[i-1].io[1], kfs[i].ii[0], kfs[i].ii[1]);
          alpha = ease(raw);
        }
        return (v0 + (v1 - v0) * alpha) * direction;
      }
    }
    return kfs[kfs.length-1].s * direction;
  }

  // ── HEAD CONSTRAINT ───────────────────────────────────────
  // Torso tilt — rotates the whole container around the body neck-joint pivot.
  // HEAD_PIVOT_X/Y are in #boahemaa-container CSS-pixel space.
  function applyHeadConstraint(rotDeg) {
    if (!EL.headEl) return;
    EL.headEl.style.transformOrigin = HEAD_PIVOT_X + 'px ' + HEAD_PIVOT_Y + 'px';
    EL.headEl.style.transform = 'rotate(' + rotDeg.toFixed(4) + 'deg)';
  }

  function clearHeadConstraint() {
    if (!EL.headEl) return;
    EL.headEl.style.transform = '';
    EL.headEl.style.transformOrigin = '';
    clearHeadTilt();
  }

  // Head-only tilt — rotates the SVG element inside the container around
  // the neck joint in head CSS-pixel space: (90.01px, 254.78px).
  // This is applied to the <svg> child, NOT the container, so it composes
  // cleanly on top of the torso tilt without moving the pivot.
  const HEAD_NECK_PX = 90.01;   // neck joint x in head CSS pixels
  const HEAD_NECK_PY = 254.78;  // neck joint y in head CSS pixels
  function applyHeadTilt(deg) {
    const svg = EL.headEl ? EL.headEl.querySelector('svg') : null;
    if (!svg) return;
    svg.style.transformOrigin = HEAD_NECK_PX + 'px ' + HEAD_NECK_PY + 'px';
    svg.style.transform = 'rotate(' + deg.toFixed(4) + 'deg)';
  }
  function clearHeadTilt() {
    const svg = EL.headEl ? EL.headEl.querySelector('svg') : null;
    if (!svg) return;
    svg.style.transform = '';
    svg.style.transformOrigin = '';
  }

  function stopConstraintRAF() {
    if (thinkConstraintRAF) {
      cancelAnimationFrame(thinkConstraintRAF);
      thinkConstraintRAF = null;
    }
  }

  function loadAnim(container, path, loop, onReady) {
    const anim = lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: loop,
      autoplay: false,
      path: path,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', clearCanvas: false },
    });
    anim.addEventListener('DOMLoaded', function() { if (onReady) onReady(anim); });
    return anim;
  }

  function hideAllStateLayers() {
    hideOtherStateLayers([]);
  }

  function hideOtherStateLayers(keepEls) {
    var all = [EL.typing, EL.thinkLBase, EL.thinkLFore, EL.thinkRBase, EL.thinkRFore];
    all.forEach(function(el) {
      if (keepEls.indexOf(el) === -1) el.style.display = 'none';
    });
    Object.keys(ANIMS).forEach(function(key) {
      var a = ANIMS[key];
      if (!a) return;
      var elForKey = { typing: EL.typing, thinkLBase: EL.thinkLBase, thinkLFore: EL.thinkLFore, thinkRBase: EL.thinkRBase, thinkRFore: EL.thinkRFore }[key];
      if (keepEls.indexOf(elForKey) === -1) a.pause();
    });
  }

  function pauseOtherStates(keepKeys) {
    Object.keys(ANIMS).forEach(function(key) {
      if (keepKeys.indexOf(key) === -1 && ANIMS[key]) {
        ANIMS[key].pause();
      }
    });
  }

  function setSlideActive(active) {
    window._bodyStateActive = active;
  }

  function snapHeadUp() {
    setSlideActive(true);
  }

  function showIdleStatic() {
    window._thinkingStateActive = false;
    window._typingStateActive = false;
    setSlideActive(true);
    stopConstraintRAF(); 
    clearHeadConstraint();
    if (typeof window._forceSlideUp === 'function') window._forceSlideUp();
    EL.grabbingHands.style.display = 'none';
    EL.idleBody.style.display = 'block';
    hideAllStateLayers();
    currentState = 'idle-static';
    swapLocked = false;
    pendingState = null;
    // Clear any thinking expression back to neutral
    if (typeof window.boahemaaExpression === 'function') {
      window.boahemaaExpression('neutral');
    }
  }

  function showIdle() {
    window._thinkingStateActive = false;
    window._typingStateActive = false;
    stopConstraintRAF(); 
    clearHeadConstraint();
    if (typeof window._grabHandsReset === 'function') window._grabHandsReset();
    if (typeof window._forceSlideUp === 'function') window._forceSlideUp();
    EL.idleBody.style.display      = 'block';
    EL.grabbingHands.style.display = 'block';
    hideAllStateLayers();
    currentState = 'idle';
    swapLocked = false;
    pendingState = null;
    setSlideActive(false);
    // Clear any thinking expression back to neutral
    if (typeof window.boahemaaExpression === 'function') {
      window.boahemaaExpression('neutral');
    }
    if (typeof window._slideSystemOnLeave === 'function') {
      window._slideSystemOnLeave();
    }
  }

  function executePending() {
    swapLocked = false;
    const target = pendingState;
    pendingState = null;
    if (target) _doEnterState(target);
  }

  function enterTyping() {
    setSlideActive(true);
    // DO NOT stop the old constraint here. Keep it running to freeze the head
    // onto the old paused body until the 2-frame swap finishes!
    pauseOtherStates(['typing']);
    EL.typing.style.display = 'block';
    EL.grabbingHands.style.display = 'none';
    currentState = 'typing';

    function startPlay(a) {
      a.goToAndStop(0, true);
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (currentState !== 'typing') return;
          a.play();
          
          // Now that the new typing body is visible, clear the head safely
          window._thinkingStateActive = false;
          window._typingStateActive = true;
          stopConstraintRAF(); 
          clearHeadConstraint();
          // Apply thinking expression for typing state
          if (typeof window.boahemaaExpression === 'function') {
            window.boahemaaExpression('thinking');
          }
          
          hideOtherStateLayers([EL.typing]);
          EL.idleBody.style.display = 'none';
        });
      });
    }

    if (ANIMS.typing && LOADED.typing) {
      startPlay(ANIMS.typing);
    } else if (!ANIMS.typing) {
      ANIMS.typing = loadAnim(EL.typing, _boahemaaBase + 'lottie/typing.json', false, function(a) {
        LOADED.typing = true;
        if (currentState === 'typing') {
          startPlay(a);
        }
      });

      ANIMS.typing.addEventListener('complete', function() {
        if (currentState !== 'typing') return;
        if (pendingState) {
          executePending();
        } else {
          ANIMS.typing.goToAndStop(0, true);
          ANIMS.typing.play();
        }
      });
    } else {
      (function waitTyping() {
        if (LOADED.typing) { startPlay(ANIMS.typing); }
        else { requestAnimationFrame(waitTyping); }
      })();
    }
  }

  function startThinkConstraint(baseAnimKey, direction) {
    // direction: +1 for thinking-left, -1 for thinking-right.
    // Head tilt uses the SAME sign as direction:
    //   thinking-left  (direction=+1) → head tilts RIGHT (+deg) ✓
    //   thinking-right (direction=-1) → head tilts LEFT  (-deg) ✓
    // Applied as a separate transform on the SVG element (not the container)
    // so the neck joint stays locked to the body.
    stopConstraintRAF();
    function tick() {
      const a = ANIMS[baseAnimKey];
      if (!a) { thinkConstraintRAF = requestAnimationFrame(tick); return; }
      const frame = a.currentFrame || 0;
      applyHeadConstraint(getThinkRotation(frame, direction));
      applyHeadTilt(getHeadTilt(frame, direction));
      thinkConstraintRAF = requestAnimationFrame(tick);
    }
    thinkConstraintRAF = requestAnimationFrame(tick);
  }

  function enterThinking(side) {
    const isLeft   = side === 'left';
    const direction = isLeft ? 1 : -1;  
    const baseKey  = isLeft ? 'thinkLBase'  : 'thinkRBase';
    const foreKey  = isLeft ? 'thinkLFore'  : 'thinkRFore';
    const baseEl   = isLeft ? EL.thinkLBase : EL.thinkRBase;
    const foreEl   = isLeft ? EL.thinkLFore : EL.thinkRFore;
    const basePath = isLeft ? _boahemaaBase + 'lottie/thinking_left.json' : _boahemaaBase + 'lottie/thinking_right.json';
    const forePath = isLeft ? _boahemaaBase + 'lottie/thinking_left_forearm (overlay).json' : _boahemaaBase + 'lottie/thinking_right_forearm (overlay).json';
    const stateName = isLeft ? 'thinking-left' : 'thinking-right';
    const nextSide  = isLeft ? 'right' : 'left';

    setSlideActive(true);

    pauseOtherStates([baseKey, foreKey]); // Pauses the old body, old constraint keeps head perfectly frozen
    baseEl.style.display = 'block';
    foreEl.style.display = 'block';
    EL.grabbingHands.style.display = 'none';
    currentState = stateName;
    window._thinkingStateActive = true;
    window._typingStateActive = false;

    let baseReady = false;
    let foreReady = false;
    let playTriggered = false;

    function tryStartPair() {
      if (playTriggered || !baseReady || !foreReady || currentState !== stateName) return;
      playTriggered = true;

      // Force to frame 0 but DO NOT play yet. Hold them here for the 2 frames!
      ANIMS[baseKey].goToAndStop(0, true);
      ANIMS[foreKey].goToAndStop(0, true);
      
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (currentState !== stateName) return;
          
          // Starts the new animation and the head tracking on the EXACT same frame
          ANIMS[baseKey].play();
          ANIMS[foreKey].play();
          startThinkConstraint(baseKey, direction);

          // Apply matching face expression for this thinking direction
          if (typeof window.boahemaaExpression === 'function') {
            window.boahemaaExpression(stateName);
          }

          hideOtherStateLayers([baseEl, foreEl]);
          EL.idleBody.style.display = 'none';
        });
      });
    }

    if (!ANIMS[baseKey]) {
      ANIMS[baseKey] = loadAnim(baseEl, basePath, false, function(a) {
        LOADED[baseKey] = true;
        baseReady = true;
        tryStartPair();
      });

      ANIMS[baseKey].addEventListener('complete', function() {
        if (currentState !== stateName) return;

        // DO NOT clear constraint here. Let it run so the head stays locked 
        // to frame 0 while the next animation prepares!
        if (pendingState) {
          executePending();
        } else {
          _doEnterState('thinking-' + nextSide);
        }
      });
    } else if (LOADED[baseKey]) {
      baseReady = true;
    } else {
      (function waitBase() {
        if (LOADED[baseKey]) { baseReady = true; tryStartPair(); }
        else { requestAnimationFrame(waitBase); }
      })();
    }

    if (!ANIMS[foreKey]) {
      ANIMS[foreKey] = loadAnim(foreEl, forePath, false, function(a) {
        LOADED[foreKey] = true;
        foreReady = true;
        tryStartPair();
      });
      ANIMS[foreKey].addEventListener('complete', function() {
        if (currentState === stateName && ANIMS[foreKey]) {
          ANIMS[foreKey].goToAndStop(0, true);
          ANIMS[foreKey].play();
        }
      });
    } else if (LOADED[foreKey]) {
      foreReady = true;
    } else {
      (function waitFore() {
        if (LOADED[foreKey]) { foreReady = true; tryStartPair(); }
        else { requestAnimationFrame(waitFore); }
      })();
    }

    tryStartPair();
  }

  function _doEnterState(state) {
    if (typeof window._setBodyStateBtn === 'function') {
      window._setBodyStateBtn(state);
    }
    switch (state) {
      case 'typing':        enterTyping();          break;
      case 'thinking-left': enterThinking('left');  break;
      case 'thinking-right':enterThinking('right'); break;
      case 'idle-static':   showIdleStatic();       break;
      case 'idle':
      default:              showIdle();             break;
    }
  }

  const LOOPING_STATES = ['typing', 'thinking-left', 'thinking-right'];
  const CHAT_STATES = ['typing', 'thinking-left', 'thinking-right', 'idle-static'];

  function _enterStateAfterSlideUp(state) {
    if (typeof window._slideUpThenCall === 'function') {
      window._slideUpThenCall(function() {
        _doEnterState(state);
        setSlideActive(true);
      });
    } else {
      _doEnterState(state);
      setSlideActive(true);
    }
  }

  window.boahemaaBodyState = function(state) {
    if (!window._idleSystemReady) {
      pendingState = state;
      return;
    }

    if (window._hoverGreetActive) {
      pendingState = state;
      return;
    }

    const isCurrentlyLooping = LOOPING_STATES.indexOf(currentState) !== -1;
    const isSameState = (state === currentState);

    if (isCurrentlyLooping) {
      if (isSameState) {
        pendingState = 'idle';
        swapLocked = true;
        return;
      }
      pendingState = state;
      swapLocked = true;
      return;
    }

    if (state === 'idle') {
      _doEnterState('idle');
      setSlideActive(false);
      return;
    }

    if (currentState === 'idle' && CHAT_STATES.indexOf(state) !== -1) {
      setSlideActive(true);
      if (window._isBodySlid && window._isBodySlid()) {
        _enterStateAfterSlideUp(state);
      } else {
        _doEnterState(state);
      }
      return;
    }

    _doEnterState(state);
    setSlideActive(state !== 'idle');
  };

  window._onChatStatePendingFlush = function() {
    if (pendingState) {
      const s = pendingState;
      pendingState = null;
      window.boahemaaBodyState(s);
    }
  };

  (function waitForIdle() {
    if (window._idleSystemReady) {
      if (pendingState) {
        const s = pendingState;
        pendingState = null;
        window.boahemaaBodyState(s);
      }
    } else {
      setTimeout(waitForIdle, 50);
    }
  })();

})();


// ╔══════════════════════════════════════════════════════════
// ║  DECLINE EXPRESSION CONTROLLER
// ╚══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  DECLINE EXPRESSION CONTROLLER
//
//  A scripted head-shake expression that runs on top of the
//  idle-static body. Uses the exact same lateral translation
//  system as mouse tracking (apply's ox/oy) — no new body
//  asset needed.
//
//  Sequence per cycle:
//    1. Look down slightly  (oy goes positive briefly)
//    2. Eyes close          (blink held via declineLidOverride)
//    3. Head left           (ox negative, fast)
//    4. Head right          (ox positive, fast)
//    5. Head left           (ox negative, fast)
//    6. Return to center    (ease-out slow, eyes open simultaneously)
//    7. Brief pause, then repeat
//
//  Rules:
//  - Only activatable when currentState === 'idle-static'
//  - While active: mouse tracking disabled, blush disabled
//  - Cancels immediately when idle-static deactivates
//  - Button greyed out and disabled unless idle-static is active
//  - Decline expression (brows up, lips slight-frown-ish) set on start,
//    neutral restored on cancel
// ════════════════════════════════════════════════════════════

(function() {

  // Timings in milliseconds
  const LOOK_DOWN_DUR  = 120;  // brief downward glance before shake
  const SHAKE_DUR      = 160;  // each individual "no" sweep
  const EASE_BACK_DUR  = 460;  // slow ease-out return to center
  const LOOP_PAUSE_MS  = 520;  // pause between full cycles
  const BLINK_HOLD_DUR = LOOK_DOWN_DUR + SHAKE_DUR * 3; // eyes stay closed through the 3 shakes

  // How far the head translates in normalized units (same space as mouse ox)
  const SHAKE_AMPLITUDE   = 0.85;  // how far left each "no" snaps
  const REBOUND_AMPLITUDE = 0.44;  // how far right the rebound swings (smaller than the snap)
  const LOOK_DOWN_OY      = 0.28;  // slight downward before the shake

  // State
  let declineActive     = false;
  let declineRAF        = null;
  let declinePauseTimer = null;

  // These override the normal mouse-driven ox/oy in the tick loop
  // while decline is active. Written each frame by the decline controller.
  window._declineOX = 0;
  window._declineOY = 0;
  window._declineActive = false;

  // Lid override: when > 0, forces lids closed on top of normal system.
  // Written by decline controller; consumed in apply() via a new check.
  window._declineLidClose = 0;  // 0=open, 1=fully closed (added to blinkY externally)

  // ── EASING ──────────────────────────────────────────────
  function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn2(t)  { return t * t; }

  // ── SINGLE CYCLE ────────────────────────────────────────
  // Returns a Promise that resolves when one full cycle completes.
  function runCycle() {
    return new Promise(function(resolve) {
      if (!declineActive) { resolve(); return; }

      let startTime = null;

      // Phase offsets (cumulative ms)
      // Phase 0: look down + close eyes
      // Phase 1: first no (left)
      // Phase 2: second no (right)
      // Phase 3: third no (left)
      // Phase 4: ease back to center + open eyes
      const P0_END = LOOK_DOWN_DUR;
      // Phase layout:
      // P0: look down + eyes close (wind-up)
      // P1: snap to LEFT (no 1)
      // P2: rebound to RIGHT
      // P3: snap to LEFT (no 2)
      // P4: rebound to RIGHT
      // P5: snap to LEFT (no 3)
      // P6: ease back to center, eyes open
      const REBOUND_DUR = SHAKE_DUR * 0.75; // rebound is slightly quicker than the snap
      const P1_END = P0_END + SHAKE_DUR;
      const P2_END = P1_END + REBOUND_DUR;
      const P3_END = P2_END + SHAKE_DUR;
      const P4_END = P3_END + REBOUND_DUR;
      const P5_END = P4_END + SHAKE_DUR;
      const P6_END = P5_END + EASE_BACK_DUR;

      function frame(now) {
        if (!declineActive) { resolve(); return; }
        if (!startTime) startTime = now;

        const elapsed = now - startTime;

        let ox = 0;
        let oy = 0;
        let lidClose = 0;

        if (elapsed < P0_END) {
          // Phase 0: look down, eyes close
          const t = elapsed / P0_END;
          oy = easeIn2(t) * LOOK_DOWN_OY;
          lidClose = easeIn2(t);

        } else if (elapsed < P1_END) {
          // Phase 1: snap LEFT — no 1
          const t = (elapsed - P0_END) / SHAKE_DUR;
          ox = -SHAKE_AMPLITUDE * t;
          oy = LOOK_DOWN_OY * (1 - t * 0.5);
          lidClose = 1;

        } else if (elapsed < P2_END) {
          // Phase 2: rebound RIGHT
          const t = (elapsed - P1_END) / REBOUND_DUR;
          ox = -SHAKE_AMPLITUDE + (SHAKE_AMPLITUDE + REBOUND_AMPLITUDE) * t;
          lidClose = 1;

        } else if (elapsed < P3_END) {
          // Phase 3: snap LEFT — no 2
          const t = (elapsed - P2_END) / SHAKE_DUR;
          ox = REBOUND_AMPLITUDE - (SHAKE_AMPLITUDE + REBOUND_AMPLITUDE) * t;
          lidClose = 1;

        } else if (elapsed < P4_END) {
          // Phase 4: rebound RIGHT
          const t = (elapsed - P3_END) / REBOUND_DUR;
          ox = -SHAKE_AMPLITUDE + (SHAKE_AMPLITUDE + REBOUND_AMPLITUDE) * t;
          lidClose = 1;

        } else if (elapsed < P5_END) {
          // Phase 5: snap LEFT — no 3 (eases in — slows as it arrives, feels like the last one)
          const t = (elapsed - P4_END) / SHAKE_DUR;
          const easedT = easeOut3(t); // ease-out on t = slow arrival at full left
          ox = REBOUND_AMPLITUDE - (SHAKE_AMPLITUDE + REBOUND_AMPLITUDE) * easedT;
          lidClose = 1;

        } else if (elapsed < P6_END) {
          // Phase 6: ease back to center from full left, eyes open
          const t = (elapsed - P5_END) / EASE_BACK_DUR;
          const easedT = easeOut3(t);
          ox = -SHAKE_AMPLITUDE * (1 - easedT);
          lidClose = 1 - easedT;

        } else {
          // Cycle complete
          window._declineOX = 0;
          window._declineOY = 0;
          window._declineLidClose = 0;
          resolve();
          return;
        }

        window._declineOX = ox;
        window._declineOY = oy;
        window._declineLidClose = lidClose;

        declineRAF = requestAnimationFrame(frame);
      }

      declineRAF = requestAnimationFrame(frame);
    });
  }

  // ── LOOP ────────────────────────────────────────────────
  async function runLoop() {
    while (declineActive) {
      await runCycle();
      if (!declineActive) break;
      // Pause between cycles
      await new Promise(function(res) {
        declinePauseTimer = setTimeout(res, LOOP_PAUSE_MS);
      });
    }
    // Cleanup
    window._declineOX = 0;
    window._declineOY = 0;
    window._declineLidClose = 0;
    window._declineActive = false;
  }

  // ── START ────────────────────────────────────────────────
  function startDecline() {
    if (declineActive) return;
    declineActive = true;
    window._declineActive = true;

    // Kill blush immediately
    if (typeof window.boahemaaBlush === 'function') {
      window.boahemaaBlush(false);
    }

    // Set the decline expression: brows raised, lips between neutral and slight frown
    if (typeof window.boahemaaExpression === 'function') {
      window.boahemaaExpression('decline');
    }

    // Mark button active
    const btn = document.getElementById('btn-decline');
    if (btn) btn.classList.add('active');

    runLoop();
  }

  // ── STOP ─────────────────────────────────────────────────
  function stopDecline() {
    if (!declineActive) return;
    declineActive = false;

    if (declineRAF) { cancelAnimationFrame(declineRAF); declineRAF = null; }
    if (declinePauseTimer) { clearTimeout(declinePauseTimer); declinePauseTimer = null; }

    window._declineOX = 0;
    window._declineOY = 0;
    window._declineLidClose = 0;
    window._declineActive = false;

    // Return to neutral expression
    if (typeof window.boahemaaExpression === 'function') {
      window.boahemaaExpression('neutral');
    }
    if (typeof window.resetExprButton === 'function') window.resetExprButton();

    // Reset button
    const btn = document.getElementById('btn-decline');
    if (btn) btn.classList.remove('active');
  }

  // ── PUBLIC TOGGLE ────────────────────────────────────────
  window.toggleDecline = function() {
    if (declineActive) {
      stopDecline();
    } else {
      startDecline();
    }
  };

  // ── CANCEL ON STATE CHANGE ───────────────────────────────
  // Hook _setBodyStateBtn — called by _doEnterState for EVERY state transition,
  // including executePending → _doEnterState which bypasses boahemaaBodyState.
  // This is the only reliable intercept point for all code paths.
  const _origSetBodyStateBtn = window._setBodyStateBtn;
  window._setBodyStateBtn = function(state) {
    // Cancel decline if leaving idle-static
    if (state !== 'idle-static' && declineActive) {
      stopDecline();
    }
    const btn = document.getElementById('btn-decline');
    if (btn) {
      if (state === 'idle-static') {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        // Restore active class if decline was already triggered while
        // waiting for idle-static to become the live state
        if (declineActive) btn.classList.add('active');
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
        btn.classList.remove('active');
      }
    }
    if (_origSetBodyStateBtn) _origSetBodyStateBtn(state);
  };

})();


// ╔══════════════════════════════════════════════════════════
// ║  BOAHEMAA CHAT PANEL CONTROLLER
// ╚══════════════════════════════════════════════════════════
// ============================================================
//  BOAHEMAA CHAT PANEL CONTROLLER
//
//  Depends on: js/boahemaa-persistence.js (loaded in <head>)
//
//  Click discrimination:
//    Quick tap  (mousedown → mouseup < CLICK_THRESHOLD ms, no drag)
//               → openChat(), does NOT trigger blush
//    Hold/drag  (mousedown held > threshold OR mousemove on nose)
//               → blush system runs as normal (existing code)
//               → mouseup does NOT open chat
//
//  Persistence:
//    BoahemaaSession (sessionStorage) stores conversation history,
//    chat-open state, introduced flag, and conversation ID.
//    On every page load the init flow checks these flags to decide
//    whether to play the intro animation or restore a prior session.
//
//  Preloader integration:
//    If a #sitePreloader element exists on the page, the intro/restore
//    flow waits until it disappears before running. Falls back after
//    1500ms in case the observer never fires.
// ============================================================
(function () {
  'use strict';

  const CLICK_THRESHOLD = 180; // ms — below this = clean click
  const PARTICLE_COUNT  = 10;
  const FUNCTION_URL    = '/chat';

  // Full 20-variant opening pool (same as boahemaa-widget.js)
  const OPENING_MESSAGES = [
    "Hey! I'm Boahemaa, Eugene's AI assistant. Curious about his work? Ask me anything.",
    "Hi there! I'm Boahemaa. I know everything about Eugene and what he does. What would you like to know?",
    "Akwaaba! I'm Boahemaa. I'm here to help you get to know Eugene, his work, and how to work with him.",
    "Hey! I'm Boahemaa. Whether you're a potential client, collaborator, or just curious, I've got you covered.",
    "Hi! I'm Boahemaa, Eugene's assistant. Ask me about his skills, projects, or how to reach him.",
    "Hello! I'm Boahemaa. Eugene built me to help visitors like you learn more about him. What's on your mind?",
    "Hey there! I'm Boahemaa. I'm here to bridge the gap between you and Eugene's work. Where do you want to start?",
    "Hi! I'm Boahemaa. I know Eugene's work inside out. Ask me anything: skills, projects, collabs, you name it.",
    "Akwaaba! I'm Boahemaa. Think of me as your guide to everything Eugene Antwi. What are you looking for?",
    "Hey! I'm Boahemaa. Need to know if Eugene's the right fit for your project? Let's talk.",
    "Hi there! I'm Boahemaa. I live on this portfolio to help you understand who Eugene is and what he creates.",
    "Hello! I'm Boahemaa. I'm here to help you explore Eugene's work and figure out if you'd like to collaborate.",
    "Hey! I'm Boahemaa. From animation to branding to creative tech, I can tell you about all of it. What's up?",
    "Hi! I'm Boahemaa. Eugene built me so his portfolio could talk back. What do you want to know?",
    "Akwaaba! I'm Boahemaa. I'm here, I'm sharp, and I know Eugene's work well. Ask away.",
    "Hey! I'm Boahemaa. If you're trying to understand what Eugene does and whether he's right for you, I can help.",
    "Hi there! I'm Boahemaa, Eugene's AI assistant. Here to answer your questions and make this portfolio feel alive.",
    "Hello! I'm Boahemaa. Whether it's about Eugene's process, his tools, or his vision, I'm your person.",
    "Hey! I'm Boahemaa. I know Eugene's story, his skills, and what he's building. What would you like to know?",
    "Hi! I'm Boahemaa. Ask me about Eugene's animation work, his branding projects, or how to get in touch.",
  ];
  function randomOpening() { return OPENING_MESSAGES[Math.floor(Math.random() * OPENING_MESSAGES.length)]; }

  // Safe BoahemaaSession accessor — fails gracefully if persistence.js didn't load
  const Session = (typeof BoahemaaSession !== 'undefined') ? BoahemaaSession : null;

  let isChatOpen        = false;
  let isWaitingForReply = false;
  let pressStartTime    = 0;
  let pressWasDrag      = false;

  // ── DOM refs ─────────────────────────────────────────────
  const avatarFrame = document.getElementById('avatar-frame');
  const panelEl     = document.getElementById('boahemaa-panel');
  const messagesEl  = document.getElementById('boahemaa-messages');
  const inputEl     = document.getElementById('boahemaa-input');
  const sendBtn     = document.getElementById('boahemaa-send');
  const closeBtn    = document.getElementById('boahemaa-close');
  const newChatBtn  = document.getElementById('boahemaa-new-chat');
  const vfxRing     = document.getElementById('boahemaa-vfx');

  // Build VFX particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const dot = document.createElement('div');
    dot.className = 'boahemaa-vfx-particle';
    dot.style.setProperty('--angle', (360 / PARTICLE_COUNT * i) + 'deg');
    vfxRing.appendChild(dot);
  }

  // ── Click discrimination on avatar ───────────────────────
  avatarFrame.addEventListener('mousedown', function () {
    pressStartTime = Date.now();
    pressWasDrag   = false;
  });

  avatarFrame.addEventListener('mousemove', function () {
    if (window.isDragging) pressWasDrag = true;
  });

  avatarFrame.addEventListener('mouseup', function () {
    const duration = Date.now() - pressStartTime;
    const wasDrag  = pressWasDrag || (typeof window.isDragging !== 'undefined' && window.isDragging);
    if (!wasDrag && duration < CLICK_THRESHOLD) openChat();
    pressWasDrag = false;
  });

  // Touch support
  avatarFrame.addEventListener('touchstart', function () {
    pressStartTime = Date.now();
    pressWasDrag   = false;
  }, { passive: true });

  avatarFrame.addEventListener('touchend', function () {
    const duration = Date.now() - pressStartTime;
    if (!pressWasDrag && duration < CLICK_THRESHOLD) openChat();
  });

  // Keyboard accessibility
  avatarFrame.setAttribute('tabindex', '0');
  avatarFrame.setAttribute('role', 'button');
  avatarFrame.setAttribute('aria-label', 'Chat with Boahemaa');
  avatarFrame.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(); }
  });

  // ── API status check ─────────────────────────────────────
  function checkApiStatus() {
    var dot  = document.getElementById('boahemaa-status-dot');
    var text = document.getElementById('boahemaa-status-text');
    if (!dot || !text) return;
    fetch(FUNCTION_URL, { method: 'HEAD' })
      .then(function (res) {
        var ok = res.ok || res.status < 500;
        dot.className    = 'boahemaa-status-dot ' + (ok ? 'online' : 'offline');
        text.textContent = ok ? 'online' : 'offline';
      })
      .catch(function () {
        dot.className    = 'boahemaa-status-dot offline';
        text.textContent = 'offline';
      });
  }

  setTimeout(function () {
    checkApiStatus();
    setInterval(checkApiStatus, 20000);
  }, 800);

  // ── Open / Close ─────────────────────────────────────────
  function openChat() {
    if (isChatOpen) return;
    isChatOpen = true;

    // Activate idle-static so avatar freezes upright while chat is open
    if (typeof window.boahemaaBodyState === 'function') window.boahemaaBodyState('idle-static');

    avatarFrame.classList.add('bh-chat-open');
    checkApiStatus();
    fireVFX();
    panelEl.classList.add('open');

    // Persist open state so it can be restored on next page load
    if (Session) Session.setChatOpen(true);

    // Only show an opening message if the panel is genuinely empty
    // (restoreSession populates it for returning users, so we skip here)
    if (messagesEl.children.length === 0) {
      appendMessage('boahemaa', randomOpening(), false /* don't re-save to session */);
    }

    setTimeout(function () { if (inputEl) inputEl.focus(); }, 380);
  }

  function closeChat() {
    if (!isChatOpen) return;
    isChatOpen = false;
    panelEl.classList.remove('open');
    if (Session) Session.setChatOpen(false);

    // Deactivate idle-static — returns to normal idle so 3-sec countdown resumes
    if (typeof window.boahemaaBodyState === 'function') window.boahemaaBodyState('idle');

    setTimeout(function () {
      avatarFrame.classList.remove('bh-chat-open');
    }, 360);
  }

  // ── Panel controls ────────────────────────────────────────
  closeBtn.addEventListener('click', closeChat);

  newChatBtn.addEventListener('click', function () {
    // Wipe persisted history and start fresh
    if (Session) Session.resetConversation();
    messagesEl.innerHTML = '';
    appendMessage('boahemaa', randomOpening(), false);
    if (inputEl) { inputEl.value = ''; inputEl.style.height = 'auto'; inputEl.focus(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isChatOpen) closeChat();
  });

  // ── Messaging ────────────────────────────────────────────
  // save=true  → also writes the message to sessionStorage via BoahemaaSession
  // save=false → DOM only (used for opening greetings and restored history)
  function appendMessage(sender, text, save) {
    if (save === undefined) save = true;
    const wrap = document.createElement('div');
    wrap.className = 'boahemaa-message from-' + (sender === 'user' ? 'user' : 'boahemaa');
    const bub = document.createElement('div');
    bub.className = 'boahemaa-message-bubble';
    bub.textContent = text;
    wrap.appendChild(bub);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (save && Session) {
      Session.appendMessage(sender === 'user' ? 'user' : 'assistant', text);
    }
  }

  function showThinking() {
    const el = document.createElement('div');
    el.className = 'boahemaa-thinking';
    el.id = 'boahemaa-thinking-indicator';
    el.innerHTML =
      '<div class="boahemaa-thinking-dot"></div>' +
      '<div class="boahemaa-thinking-dot"></div>' +
      '<div class="boahemaa-thinking-dot"></div>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeThinking() {
    const el = document.getElementById('boahemaa-thinking-indicator');
    if (el) el.remove();
  }

  // ── Send message ─────────────────────────────────────────
  async function sendMessage() {
    if (!inputEl || isWaitingForReply) return;
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled  = true;
    isWaitingForReply = true;

    // Append to DOM and save to sessionStorage
    appendMessage('user', text, true);
    showThinking();

    // Build the full conversation history to send to chat.js
    const history         = Session ? Session.getConversation() : [{ role: 'user', content: text }];
    const conversationId  = Session ? Session.getConversationId() : null;

    try {
      const res  = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:             text,
          conversationId:      conversationId,
          conversationHistory: history,
          pageUrl:             window.location.href,
        }),
      });
      const data = await res.json();
      removeThinking();
      const reply = (data.success && data.reply)
        ? data.reply
        : "Something went wrong on my end. Try again in a moment.";
      // Append reply to DOM and save to sessionStorage
      appendMessage('boahemaa', reply, true);
    } catch (err) {
      removeThinking();
      appendMessage('boahemaa', "I couldn't connect right now. Check your connection and try again.", false);
    } finally {
      isWaitingForReply = false;
      sendBtn.disabled  = false;
      if (inputEl) inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  inputEl.addEventListener('input', function () {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  // ── Restore session (returning user) ─────────────────────
  // Re-populates the chat panel from sessionStorage history.
  // Called only when the user has already been introduced and has
  // prior conversation turns or left the panel open.
  function restoreSession() {
    if (!Session) return;
    const history = Session.getConversation();
    if (history.length > 0) {
      // Add a subtle divider so the user knows this is a restored conversation
      const note = document.createElement('div');
      note.className   = 'boahemaa-session-note';
      note.textContent = 'Continuing your conversation';
      messagesEl.appendChild(note);
      // Replay every turn into the DOM without re-saving to sessionStorage
      history.forEach(function (msg) {
        appendMessage(msg.role === 'user' ? 'user' : 'boahemaa', msg.content, false);
      });
    }
    // If the panel was open when the user navigated away, reopen it
    if (Session.isChatOpen()) openChat();
  }

  // ── Preloader-aware init ──────────────────────────────────
  // Decides whether to play the first-visit intro or restore a
  // returning user's session. Waits for #sitePreloader to clear
  // before doing anything visible. If no preloader exists, runs
  // immediately (or after the wave-intro body-swap settles).
  function onPreloaderDone() {
    const isReturning = Session && Session.hasBeenIntroduced();
    const hasHistory  = Session && Session.getConversation().length > 0;

    if (isReturning) {
      // Skip the wave intro — she's already been introduced this session
      if (hasHistory || (Session && Session.isChatOpen())) {
        restoreSession();
      }
    }
    // If NOT returning, nothing extra is needed here: the wave intro
    // animation (already in the page) plays naturally, and the
    // markIntroduced() call belongs in that flow.
    // Wire it to the wave-intro complete event so it fires at the
    // right moment — after doBodySwap() runs.
    if (!isReturning) {
      // Patch the existing doBodySwap completion to mark introduced.
      // We wait until _idleSystemReady flips, which happens inside doBodySwap().
      (function waitForIntroComplete() {
        if (window._idleSystemReady) {
          if (Session) Session.markIntroduced();
        } else {
          setTimeout(waitForIntroComplete, 100);
        }
      })();
    }
  }

  // Wait for preloader if it exists, else run immediately
  (function initWithPreloader() {
    var preloader = document.getElementById('sitePreloader');
    if (preloader) {
      var obs = new MutationObserver(function (mutations, observer) {
        var gone = preloader.style.display  === 'none'   ||
                   preloader.style.opacity  === '0'      ||
                   preloader.classList.contains('hidden') ||
                   !document.body.contains(preloader);
        if (gone) { observer.disconnect(); onPreloaderDone(); }
      });
      obs.observe(preloader, { attributes: true, childList: false });
      // Safety fallback — if observer never fires within 1500ms, proceed anyway
      setTimeout(function () { onPreloaderDone(); }, 1500);
    } else {
      onPreloaderDone();
    }
  })();

  // ── VFX ──────────────────────────────────────────────────
  function fireVFX() {
    if (!vfxRing) return;
    vfxRing.querySelectorAll('.boahemaa-vfx-particle').forEach(function (p) {
      p.classList.remove('burst');
      void p.offsetWidth;
      p.classList.add('burst');
    });
  }

  // ── Keep panel border in sync with accent colour ─────────
  var accentObserver = new MutationObserver(function () {
    var val = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    if (val) document.documentElement.style.setProperty('--green', val);
  });
  accentObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  (function () {
    var val = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    if (val) document.documentElement.style.setProperty('--green', val);
  })();

})();


// ╔══════════════════════════════════════════════════════════
// ║  HOVER TOOLTIP CONTROLLER
// ╚══════════════════════════════════════════════════════════
// ── HOVER TOOLTIP CONTROLLER ────────────────────────────────
// Shows "Chat with me" pill above the avatar on hover.
// Only activates after BOTH wave intro AND hover greet are done.
// Positions itself dynamically so it stays centred over the
// avatar regardless of screen size / responsive scale.
(function () {
  'use strict';

  var tooltip    = document.getElementById('boahemaa-hover-tooltip');
  var avatarEl   = document.getElementById('avatar-frame');
  var hideTimer  = null;

  if (!tooltip || !avatarEl) return;

  function isIntrosDone() {
    // Wave intro done  → window._idleSystemReady === true
    // Hover greet done → window._hoverGreetShouldPlay === false
    //                    AND window._hoverGreetActive === false
    return window._idleSystemReady === true &&
           window._hoverGreetShouldPlay === false &&
           !window._hoverGreetActive;
  }

  function positionTooltip() {
    var rect = avatarEl.getBoundingClientRect();
    // Sit to the LEFT of the avatar, vertically centred on it
    // 14px gap between tooltip right edge and avatar left edge
    var tx = rect.left - 14;
    var ty = rect.top  + rect.height / 2;
    tooltip.style.left      = tx + 'px';
    tooltip.style.top       = ty + 'px';
    tooltip.style.transform = 'translateX(-100%) translateY(-50%)';
  }

  function showTooltip() {
    if (!isIntrosDone()) return;
    // Don't show when chat panel is already open
    if (avatarEl.classList.contains('bh-chat-open')) return;
    clearTimeout(hideTimer);
    positionTooltip();
    // Reset to entry state first (in case mid-transition)
    // Slides in from the right (toward avatar), exits back right
    tooltip.style.transition = 'none';
    tooltip.style.opacity    = '0';
    tooltip.style.transform  = 'translateX(calc(-100% + 8px)) translateY(-50%)';
    // Force reflow then animate in
    void tooltip.offsetWidth;
    tooltip.style.transition = '';
    tooltip.style.opacity    = '1';
    tooltip.style.transform  = 'translateX(-100%) translateY(-50%)';
  }

  function hideTooltip() {
    clearTimeout(hideTimer);
    tooltip.style.opacity   = '0';
    tooltip.style.transform = 'translateX(calc(-100% + 8px)) translateY(-50%)';
  }

  // Hook into the existing rootEl mouseenter / mouseleave
  var rootEl = document.getElementById('character-root');
  if (!rootEl) return;

  rootEl.addEventListener('mouseenter', showTooltip, { passive: true });
  rootEl.addEventListener('mouseleave', hideTooltip, { passive: true });

  // Also hide if user clicks (chat is about to open)
  avatarEl.addEventListener('mouseup', function () {
    hideTooltip();
  });

  // Hide on touch start (mobile tap)
  rootEl.addEventListener('touchstart', hideTooltip, { passive: true });

})();


}); // end DOMContentLoaded