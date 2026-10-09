<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="css/style.css">
  <script
      type="module"
      src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
    ></script>
  <title>Campus Navigator</title>
</head>
<body>
  <div class="app">
    <nav class ="sidebar">
      <header class="top">
        <div class="logo">
          <span class="image">
            <img class="map" src="img/logo.png" alt="">
          </span>
        </div>
        <div class="header">
          <span class="name">Campus<br>Navigator</span>
        </div>
      </header>
      
      <aside class="panel">

        <div class="navigation-box">

          <h2>Navigation</h2>

          <label for="fromLocation">From</label>

          <select id="fromLocation">
            <option value="entrance">Main Entrance</option>
            <option value="me">📍 My Location</option>

        </select>

          <label for="toLocation">Destination</label>

          <select id="toLocation">
            <option value="ccit">CCIT Department</option>
            <option value="enr">ENR Department</option>
            <option value="nur">Nursing Department</option>
            <option value="admin">Admin Building</option>
            <option value="lib">I-Lab Building</option>
            <option value="annex">CAS-Annex Building</option>
            <option value="cas">CAS Building</option>
            <option value="reg">Registrar Building</option>
          </select>
          <button id="startNavigationBtn" class="action">🧭 Start Navigation</button>
          <button id="clearRouteBtn" class="secondary">Clear Route</button>
          <button id="locateBtn" class="secondary" type="button"> 📍 Show My Location</button>

        </div>

        <div class="status">
          <strong>Status</strong>
          <p id="statusText">Select your destination and start navigation.</p>
        </div>
      </aside>

      <div class="container">
        <form method="POST" action="">
          <button id="login" type="button" onclick = "window.location.href = 'login.php'">Login/Sign Up</button>
        </form>
      </div>
  </nav>
  <div class="viewer">

  <model-viewer
  id="modelView"
  src="model/TakeAMaap-small.glb"
  alt="3D model of the campus"
  camera-controls
  touch-action="none"
  camera-orbit="0deg 55deg auto"
  min-camera-orbit="auto 20deg auto"
  max-camera-orbit="auto 85deg auto"
  field-of-view="30deg"
  interaction-prompt="none"
  shadow-intensity="1">
</model-viewer>

  <svg id="routeLayer"><polyline id="routeLine" /></svg>

  <div id="coordBox">

  <strong>Coordinates</strong>

  <div id="coordText">Click the model to get a point.</div>

  <button id="copyCoordBtn" type="button">Copy</button>

  </div>

 </div>

</div>

<script src="js/app.js"></script>
</body>
</html>