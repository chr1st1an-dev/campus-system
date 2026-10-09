<?php
session_start();
if (empty($_SESSION['is_admin'])) {
    header('Location: login.php');
    exit;
}
?>

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

        </select>

          <label for="toLocation">Destination</label>

          <select id="toLocation">
        
          </select>
          <button id="startNavigationBtn" class="action">🧭 Start Navigation</button>
          <button id="clearRouteBtn" class="secondary">Clear Route</button>

        </div>

        <div class="status">
          <strong>Status</strong>
          <p id="statusText">Select your destination and start navigation.</p>
        </div>

        <div class="navigation-box admin-box">
            <h2>Add Destination</h2>
            
            <label for="destName">Building name</label>
            <input type="text" id="destName" placeholder="e.g. Library">
            
            <p class="hint">Click the model along the path starting from the Main Entrance. The last click is where the pin goes.</p>
            <div id="pointCount">0 points recorded</div>

            <button id="undoPointBtn" class="secondary" type="button">Undo last point</button>
            <button id="savePointBtn" class="action" type="button">💾 Save destination</button>
            <button id="resetFormBtn" class="secondary" type="button">Reset</button>

  <h3>Existing destinations</h3>
  <ul id="destList"></ul>
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
<script src="js/admin.js"></script>
</body>
</html>