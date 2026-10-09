const modelView = document.getElementById("modelView");
const routeLine = document.getElementById("routeLine");
const startNavigationBtn = document.getElementById("startNavigationBtn");
const clearRouteBtn = document.getElementById("clearRouteBtn");
const locateBtn = document.getElementById("locateBtn");
const statusText = document.getElementById("statusText");

let entrancePoint = null;
let destinations = {};

// ---------- Hotspot helper ----------
function addHotspot(name, point, className, text) {
  const el = document.createElement(text ? "button" : "div");
  el.className = className;
  el.slot = `hotspot-${name}`;
  el.dataset.position = point.join(" ");
  el.dataset.normal = "0 1 0";
  if (text) {
    el.dataset.label = text;
    el.setAttribute("aria-label", text);
  }
  modelView.appendChild(el);
  return el;
}

// ---------- Load destinations from the server ----------
function rebuildDropdown() {
  const select = document.getElementById("toLocation");
  const current = select.value;
  select.innerHTML = "";
  Object.entries(destinations).forEach(([id, d]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = d.label;
    select.appendChild(opt);
  });
  if (destinations[current]) select.value = current;
}

function rebuildMarkers() {
  modelView.querySelectorAll(".marker").forEach((el) => el.remove());
  if (entrancePoint) {
    addHotspot("marker-entrance", entrancePoint, "marker", "Main Entrance");
  }
  Object.entries(destinations).forEach(([id, d]) => {
    if (d.route && d.route.length >= 1) {
      addHotspot(
        `marker-${id}`,
        d.route[d.route.length - 1],
        "marker",
        d.label,
      );
    }
  });
}

async function loadDestinations() {
  try {
    const res = await fetch("api/destination.php", { cache: "no-store" });
    const data = await res.json();
    entrancePoint = data.entrance;
    destinations = data.destinations || {};
    rebuildDropdown();
    rebuildMarkers();
  } catch (err) {
    statusText.textContent = "Could not load destinations.";
  }
}

// ---------- Drawing the route over the model ----------
let activeRouteNames = [];
let redrawQueued = false;

function drawRouteLine() {
  if (activeRouteNames.length === 0) {
    routeLine.setAttribute("points", "");
    return;
  }
  const pts = [];
  for (const name of activeRouteNames) {
    const hs = modelView.queryHotspot(`hotspot-${name}`);
    if (hs && hs.canvasPosition) {
      pts.push(`${hs.canvasPosition.x},${hs.canvasPosition.y}`);
    }
  }
  routeLine.setAttribute("points", pts.join(" "));
}

function queueRouteRedraw() {
  if (redrawQueued || activeRouteNames.length === 0) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    drawRouteLine();
  });
}

modelView.addEventListener("camera-change", queueRouteRedraw);
window.addEventListener("resize", queueRouteRedraw);

function clearRouteElements() {
  modelView.querySelectorAll(".route-dot").forEach((el) => el.remove());
  activeRouteNames = [];
  routeLine.setAttribute("points", "");
}

function showRoute(points) {
  clearRouteElements();
  points.forEach((point, i) => {
    addHotspot(`route${i}`, point, "route-dot");
    activeRouteNames.push(`route${i}`);
  });
  requestAnimationFrame(() => requestAnimationFrame(drawRouteLine));
}

// Closest point on a polyline (measured on the ground plane, X/Z).
// Returns the distance, the index of the segment, and the 3D point.
function nearestOnPolyline(points, p) {
  let best = { dist: Infinity, idx: 0, pt: points[0] };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const abx = b[0] - a[0];
    const abz = b[2] - a[2];
    const len2 = abx * abx + abz * abz;
    let t = len2 ? ((p.x - a[0]) * abx + (p.z - a[2]) * abz) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = a[0] + abx * t;
    const qz = a[2] + abz * t;
    const qy = a[1] + (b[1] - a[1]) * t;
    const d = Math.hypot(p.x - qx, p.z - qz);
    if (d < best.dist) best = { dist: d, idx: i, pt: [qx, qy, qz] };
  }
  return best;
}

startNavigationBtn.addEventListener("click", () => {
  const id = document.getElementById("toLocation").value;
  const fromId = document.getElementById("fromLocation").value;
  const dest = destinations[id];

  if (!dest || !dest.route || dest.route.length < 1 || !entrancePoint) {
    statusText.textContent = "This route hasn't been recorded yet.";
    return;
  }

  let path = [entrancePoint, ...dest.route];

  // Start from the user's real position: snap it onto the recorded path
  // and keep only the part of the path that is still ahead.
  if (fromId === "me") {
    startTracking();
    if (!userModelPos) {
      statusText.textContent =
        "Waiting for your GPS position. Tap Start Navigation again once the blue dot appears.";
      return;
    }
    const near = nearestOnPolyline(path, userModelPos);
    path = [near.pt, ...path.slice(near.idx + 1)];

    if (path.length < 2) {
      statusText.textContent = "You are already at " + dest.label + ".";
      showRoute(path);
      return;
    }

    let note = "";
    if (calFit && calFit.unitsPerMeter) {
      const meters = near.dist / calFit.unitsPerMeter;
      if (meters > 30) {
        note = ` You're about ${Math.round(meters)} m from the nearest path, so the route starts at the closest point on it.`;
      }
    }
    showRoute(path);
    statusText.textContent = "Navigating to " + dest.label + "." + note;
    return;
  }

  showRoute(path);
  statusText.textContent = "Navigating to " + dest.label;
});

clearRouteBtn.addEventListener("click", () => {
  clearRouteElements();
  statusText.textContent = "Route cleared.";
});

// ---------- Coordinate picker ----------
const coordText = document.getElementById("coordText");
const copyCoordBtn = document.getElementById("copyCoordBtn");
let lastCoord = "";
let modelLoaded = false;
let downPos = null;

modelView.addEventListener("load", () => {
  modelLoaded = true;
});

modelView.addEventListener("pointerdown", (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});

modelView.addEventListener("click", (event) => {
  if (!modelLoaded) {
    coordText.textContent = "Model is still loading...";
    return;
  }

  if (
    downPos &&
    Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) > 5
  )
    return;
  if (event.target.closest && event.target.closest(".marker")) return;

  const hit = modelView.positionAndNormalFromPoint(
    event.clientX,
    event.clientY,
  );
  if (!hit) {
    coordText.textContent = "No surface here. Click on the model itself.";
    return;
  }

  const { x, y, z } = hit.position;
  lastCoord = `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`;
  coordText.innerHTML = `X: ${x.toFixed(3)}<br>Y: ${y.toFixed(3)}<br>Z: ${z.toFixed(3)}`;

  let dot = modelView.querySelector(".pick-dot");
  if (!dot) {
    dot = document.createElement("div");
    dot.className = "pick-dot";
    dot.slot = "hotspot-pick";
    modelView.appendChild(dot);
  }
  dot.dataset.position = lastCoord;
  dot.dataset.normal = `${hit.normal.x} ${hit.normal.y} ${hit.normal.z}`;

  // Hook used by the admin page to record route points
  if (typeof window.onModelPick === "function") {
    window.onModelPick([
      Number(x.toFixed(3)),
      Number(y.toFixed(3)),
      Number(z.toFixed(3)),
    ]);
  }
});

copyCoordBtn.addEventListener("click", () => {
  if (lastCoord) {
    navigator.clipboard.writeText(lastCoord);
    copyCoordBtn.textContent = "Copied!";
    setTimeout(() => (copyCoordBtn.textContent = "Copy"), 1000);
  }
});

//calibrated points

const CALIBRATION = [
  {
    lat: 15.319624,
    lng: 119.984617,
    x: 255.456,
    z: -235.678,
  },
  {
    lat: 15.317007,
    lng: 119.983153,
    x: 150.254,
    z: -34.824,
  },
  {
    lat: 15.317766,
    lng: 119.982026,
    x: 63.836,
    z: -92.864,
  },
  {
    lat: 15.318291,
    lng:  ,
    x: 251.176,
    z: -132.017,
  },
  {
    lat: 15.318914,
    lng: 119.985006,
    x: 283.602,
    z: -180.196,
  },
];

const GROUND_Y_DEFAULT = 20.5; // used if the entrance has no height
const MAX_ACCURACY_M = 50; // ignore GPS fixes worse than this (meters)
const SMOOTHING = 0.4; // 0 = never move, 1 = no smoothing
const BOUNDS_MARGIN = 0.4; // how far outside the calibrated area counts as "on campus"
const ZOOM_FACTOR = 0.3; // zoom-in distance as a fraction of the normal camera distance (smaller = closer)

const calibrateMode = new URLSearchParams(location.search).has("calibrate");
const CAL_STORAGE_KEY = "campusCalibration";

function loadCalibrationPoints() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAL_STORAGE_KEY) || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {
    /* ignore bad saved data */
  }
  return CALIBRATION.slice();
}

function saveCalibrationPoints() {
  try {
    localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(calPoints));
  } catch (e) {
    /* storage may be blocked; the JSON box still works */
  }
}

let calPoints = loadCalibrationPoints();
let calFit = null; // { origin, X, Z, unitsPerMeter, rmsMeters, bounds }

// GPS lat/lng -> flat meters (east, north) around the first calibration point
function toLocalMeters(lat, lng, origin) {
  const R = 6371000;
  const rad = Math.PI / 180;
  return {
    e: (lng - origin.lng) * rad * R * Math.cos(origin.lat * rad),
    n: (lat - origin.lat) * rad * R,
  };
}

// Solve a 3x3 linear system with Gaussian elimination
function solve3(M, b) {
  const A = M.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let r = i + 1; r < 3; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    }
    if (Math.abs(A[p][i]) < 1e-9) return null; // points in a straight line
    [A[i], A[p]] = [A[p], A[i]];
    for (let r = i + 1; r < 3; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c <= 3; c++) A[r][c] -= f * A[i][c];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = A[i][3];
    for (let c = i + 1; c < 3; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

// Least-squares fit of  x = a*e + b*n + c  and  z = d*e + f*n + g
function refitCalibration() {
  calFit = null;
  if (calPoints.length < 3) return;

  const origin = { lat: calPoints[0].lat, lng: calPoints[0].lng };
  const rows = calPoints.map((p) => {
    const l = toLocalMeters(p.lat, p.lng, origin);
    return [l.e, l.n, 1];
  });

  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const AtX = [0, 0, 0];
  const AtZ = [0, 0, 0];
  rows.forEach((r, k) => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) AtA[i][j] += r[i] * r[j];
      AtX[i] += r[i] * calPoints[k].x;
      AtZ[i] += r[i] * calPoints[k].z;
    }
  });

  const X = solve3(AtA, AtX);
  const Z = solve3(AtA, AtZ);
  if (!X || !Z) return;

  // model units per meter (size of the transform)
  const det = X[0] * Z[1] - X[1] * Z[0];
  const unitsPerMeter = Math.sqrt(Math.abs(det)) || 1;

  // how far the fit is from the points you gave it, in meters
  let sumSq = 0;
  rows.forEach((r, k) => {
    const px = X[0] * r[0] + X[1] * r[1] + X[2];
    const pz = Z[0] * r[0] + Z[1] * r[1] + Z[2];
    sumSq += (px - calPoints[k].x) ** 2 + (pz - calPoints[k].z) ** 2;
  });
  const rmsMeters = Math.sqrt(sumSq / calPoints.length) / unitsPerMeter;

  // rough campus area: calibration points plus a margin
  const xs = calPoints.map((p) => p.x);
  const zs = calPoints.map((p) => p.z);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...zs) - Math.min(...zs),
  );
  const m = span * BOUNDS_MARGIN;
  const bounds = {
    minX: Math.min(...xs) - m,
    maxX: Math.max(...xs) + m,
    minZ: Math.min(...zs) - m,
    maxZ: Math.max(...zs) + m,
  };

  calFit = { origin, X, Z, unitsPerMeter, rmsMeters, bounds };
}

function gpsToModel(lat, lng) {
  const l = toLocalMeters(lat, lng, calFit.origin);
  return {
    x: calFit.X[0] * l.e + calFit.X[1] * l.n + calFit.X[2],
    z: calFit.Z[0] * l.e + calFit.Z[1] * l.n + calFit.Z[2],
  };
}

function insideCampus(p) {
  const b = calFit.bounds;
  return p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;
}

// ---------- Live tracking ----------
let geoWatchId = null;
let lastFix = null; // latest raw GPS reading
let userModelPos = null; // smoothed position on the model { x, z }
let userDot = null;

function groundY() {
  return entrancePoint ? entrancePoint[1] : GROUND_Y_DEFAULT;
}

// The dot is drawn on the same flat overlay as the route line, so the 3D model
// can never hide it. An invisible hotspot follows the real 3D position and
// tells us where on screen to draw it.
let userGroup = null;

function showUserDot(x, z) {
  if (!userDot) {
    userDot = document.createElement("div"); // invisible anchor
    userDot.slot = "hotspot-user";
    userDot.dataset.normal = "0 1 0";
    userDot.style.cssText = "width:1px;height:1px;pointer-events:none;";
    modelView.appendChild(userDot);
  }
  if (!userGroup) {
    const ns = "http://www.w3.org/2000/svg";
    userGroup = document.createElementNS(ns, "g");
    const ring = document.createElementNS(ns, "circle");
    ring.setAttribute("r", "18");
    ring.setAttribute("fill", "rgba(26,115,232,0.25)");
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("r", "9");
    dot.setAttribute("fill", "#1a73e8");
    dot.setAttribute("stroke", "#fff");
    dot.setAttribute("stroke-width", "3");
    userGroup.append(ring, dot);
    userGroup.style.display = "none";
    document.getElementById("routeLayer").appendChild(userGroup);
  }
  userDot.dataset.position = `${x} ${groundY()} ${z}`;
  requestAnimationFrame(() => requestAnimationFrame(drawUserDot));
}

function drawUserDot() {
  if (!userGroup) return;
  const hs = modelView.queryHotspot("hotspot-user");
  if (hs && hs.canvasPosition) {
    userGroup.setAttribute(
      "transform",
      `translate(${hs.canvasPosition.x},${hs.canvasPosition.y})`,
    );
    userGroup.style.display = "";
  } else {
    userGroup.style.display = "none";
  }
}

let userRedrawQueued = false;
function queueUserRedraw() {
  if (userRedrawQueued || !userGroup) return;
  userRedrawQueued = true;
  requestAnimationFrame(() => {
    userRedrawQueued = false;
    drawUserDot();
  });
}
modelView.addEventListener("camera-change", queueUserRedraw);
window.addEventListener("resize", queueUserRedraw);

function hideUserDot() {
  if (userDot) {
    userDot.remove();
    userDot = null;
  }
  if (userGroup) {
    userGroup.remove();
    userGroup = null;
  }
}

// ---------- Camera zoom ----------
let zoomOnNextFix = false; // set when the button is pressed, used by the first good fix
let savedView = null; // camera before zooming, so we can zoom back out

function zoomToUser() {
  if (!userModelPos) return;
  const orbit = modelView.getCameraOrbit();
  if (!savedView) {
    const t = modelView.getCameraTarget();
    savedView = {
      target: `${t.x}m ${t.y}m ${t.z}m`,
      orbit: `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`,
      radius: orbit.radius,
    };
  }
  // keep the current viewing angle, just move the target and come closer
  modelView.cameraTarget = `${userModelPos.x}m ${groundY()}m ${userModelPos.z}m`;
  modelView.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${savedView.radius * ZOOM_FACTOR}m`;
}

function resetView() {
  if (!savedView) return;
  modelView.cameraTarget = savedView.target;
  modelView.cameraOrbit = savedView.orbit;
  savedView = null;
}

function onGeoFix(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  lastFix = { lat, lng, accuracy };
  updateCalibratePanel();

  if (!calFit) {
    statusText.textContent = calibrateMode
      ? "GPS is working. Add at least 3 calibration points."
      : "GPS is working, but the map isn't calibrated yet.";
    return;
  }

  if (accuracy > MAX_ACCURACY_M) {
    statusText.textContent = `GPS signal is weak (about ${Math.round(accuracy)} m). Try moving to an open area.`;
    return;
  }

  const m = gpsToModel(lat, lng);

  if (!calibrateMode && !insideCampus(m)) {
    hideUserDot();
    userModelPos = null;
    statusText.textContent = "You appear to be outside the campus.";
    return;
  }

  // smooth out GPS jitter
  if (!userModelPos) {
    userModelPos = { x: m.x, z: m.z };
  } else {
    userModelPos.x += (m.x - userModelPos.x) * SMOOTHING;
    userModelPos.z += (m.z - userModelPos.z) * SMOOTHING;
  }

  showUserDot(userModelPos.x, userModelPos.z);
  if (zoomOnNextFix) {
    zoomOnNextFix = false;
    zoomToUser();
  }
  if (/GPS|location|campus|Finding/i.test(statusText.textContent)) {
    statusText.textContent = `You are here (accuracy about ${Math.round(accuracy)} m).`;
  }
}

function onGeoError(err) {
  const msgs = {
    1: "Location permission was denied. Allow location access for this site in your browser settings.",
    2: "Your position is unavailable right now.",
    3: "Getting your position timed out. Trying again...",
  };
  statusText.textContent = msgs[err.code] || "Could not get your location.";
}

function startTracking() {
  if (geoWatchId !== null) return;
  if (!("geolocation" in navigator)) {
    statusText.textContent = "This device doesn't support GPS.";
    return;
  }
  if (!window.isSecureContext) {
    statusText.textContent =
      "GPS only works on HTTPS (or localhost). Open the site with https://.";
    return;
  }
  statusText.textContent = "Finding your location...";
  geoWatchId = navigator.geolocation.watchPosition(onGeoFix, onGeoError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 15000,
  });
  locateBtn.textContent = "📍 Stop Tracking";
}

function stopTracking() {
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = null;
  userModelPos = null;
  hideUserDot();
  zoomOnNextFix = false;
  resetView();
  locateBtn.textContent = "📍 Show My Location";
  statusText.textContent = "Location tracking stopped.";
}

locateBtn.addEventListener("click", () => {
  if (geoWatchId === null) {
    zoomOnNextFix = true; // zoom in as soon as the first good GPS fix arrives
    startTracking();
  } else if (userModelPos && !savedView) {
    zoomToUser(); // already tracking (e.g. started from the From dropdown)
  } else {
    stopTracking();
  }
});

// choosing "My Location" in the From dropdown turns tracking on
document.getElementById("fromLocation").addEventListener("change", (e) => {
  if (e.target.value === "me") startTracking();
});

// ---------- Calibration panel (?calibrate=1) ----------
function parseLatLng(text) {
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
}

function updateCalibratePanel() {
  if (!calibrateMode) return;
  const gps = document.getElementById("calibGps");
  const info = document.getElementById("calibInfo");
  const json = document.getElementById("calibJson");
  if (!gps) return;

  gps.textContent = lastFix
    ? `GPS: ${lastFix.lat.toFixed(6)}, ${lastFix.lng.toFixed(6)} (±${Math.round(lastFix.accuracy)} m)`
    : "GPS: waiting for a fix...";

  let text = `${calPoints.length} point(s). `;
  if (calPoints.length < 3) text += "Need at least 3.";
  else if (!calFit)
    text += "Points are in a straight line. Add one off that line.";
  else text += `Fit error: about ${calFit.rmsMeters.toFixed(1)} m.`;
  info.textContent = text;

  json.value = JSON.stringify(
    calPoints.map((p) => ({
      lat: Number(p.lat.toFixed(6)),
      lng: Number(p.lng.toFixed(6)),
      x: p.x,
      z: p.z,
    })),
    null,
    2,
  );
}

function buildCalibratePanel() {
  const box = document.createElement("div");
  box.id = "calibBox";
  box.innerHTML = `
    <strong>Calibration</strong>
    <div id="calibGps">GPS: waiting for a fix...</div>
    <p class="hint">1) Click the spot on the model.<br>
      2) Stand on that spot, or paste its lat, lng below (right-click it in Google Maps to copy).<br>
      3) Tap Add point. Repeat for 3 to 6 spread-out spots.</p>
    <input type="text" id="calibManual" placeholder="lat, lng (optional, instead of GPS)">
    <button id="calibAdd" type="button" class="action">Add point</button>
    <button id="calibUndo" type="button" class="secondary">Undo last</button>
    <button id="calibClear" type="button" class="secondary">Clear all</button>
    <div id="calibInfo"></div>
    <p class="hint">When the fit error is small, copy this into CALIBRATION in app.js:</p>
    <textarea id="calibJson" readonly></textarea>`;
  document.querySelector(".viewer").appendChild(box);

  const manualInput = document.getElementById("calibManual");
  const info = document.getElementById("calibInfo");

  document.getElementById("calibAdd").addEventListener("click", () => {
    if (!lastCoord) {
      info.textContent = "Click a spot on the model first.";
      return;
    }
    let pos = parseLatLng(manualInput.value.trim());
    if (!pos) {
      if (!lastFix) {
        info.textContent = "No GPS fix yet. Wait for one, or paste lat, lng.";
        return;
      }
      pos = { lat: lastFix.lat, lng: lastFix.lng };
    }
    const [x, , z] = lastCoord.split(" ").map(Number);
    calPoints.push({ lat: pos.lat, lng: pos.lng, x, z });
    manualInput.value = "";
    saveCalibrationPoints();
    refitCalibration();
    updateCalibratePanel();
  });

  document.getElementById("calibUndo").addEventListener("click", () => {
    calPoints.pop();
    saveCalibrationPoints();
    refitCalibration();
    updateCalibratePanel();
  });

  document.getElementById("calibClear").addEventListener("click", () => {
    calPoints = [];
    try {
      localStorage.removeItem(CAL_STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
    refitCalibration();
    hideUserDot();
    userModelPos = null;
    updateCalibratePanel();
  });

  updateCalibratePanel();
}

refitCalibration();
if (calibrateMode) {
  buildCalibratePanel();
  startTracking();
}

// Shared with admin.js
window.campus = {
  showRoute,
  clearRouteElements,
  loadDestinations,
  getDestinations: () => destinations,
  getEntrance: () => entrancePoint,
  getUserPosition: () => userModelPos,
};

loadDestinations();
