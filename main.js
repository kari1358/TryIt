// main.js
// Import the Google Generative AI client
import { GoogleGenerativeAI } from "@google/generative-ai";

// Global Variables
let userData = {};
let DebugMenu;
let mapElement; // Declare mapElement as a global variable
let modelElement; // Declare modelElement as a global variable
let isDuckJumping = false;

// Access the environment variables
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const googleGeminiApiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

// Define the points for each city at the top with your other global variables
const CITY_ROUTES = {
  'San Francisco': {
    pointA: { lat: 37.79543308513136, lng: -122.39361334843221 },  // Ferry Building
    pointB: { lat: 37.799383474936754, lng: -122.39729187503059 },   // The Waterfront Restaurant
    pointC: { lat: 37.80868132329467, lng: -122.40981591306831 },   // Pier 39
    pointD: { lat: 37.80779371839239, lng: -122.41850672465118 }     // In-N-Out Burger
  },
  'New York': {
    pointA: { lat: 40.758026852884356, lng: -73.9855368349365 },  // Times Square
    pointB: { lat: 40.766629072315624, lng: -73.97862718783752 },  // JW Marriott Essex House New York
    pointC: { lat: 40.76771174318794, lng: -73.97198993582306 },  // Central Park Zoo
    pointD: { lat: 40.76029891365873, lng: -73.96515652391855 }   // LaVista Pizza (2nd Avenue)
  }
};

document.addEventListener('DOMContentLoaded', async function () {
  const loaded = await loadGoogleMapsScript();

  if (!loaded) {
    console.error("Failed to load Google Maps script");
    return;
  }

  initApp();
});

async function loadGoogleMapsScript() {
  console.log("Loading Google Maps script...");
  if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
    console.log("Google Maps script is already in the document.");
    return;
  }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=maps3d&v=alpha`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  return true;
}

// Update initializePolyline to use the predefined points
async function initializePolyline(map, city) {
    try {
        // Wait for the map to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { Polyline3DElement } = await google.maps.importLibrary("maps3d");
        
        const polyline = document.createElement('gmp-polyline-3d');
        
        // Get the route points for the selected city
        const route = CITY_ROUTES[city];
        const path = [
            { lat: route.pointA.lat, lng: route.pointA.lng, altitude: 0.5 },
            { lat: route.pointB.lat, lng: route.pointB.lng, altitude: 0.5 },
            { lat: route.pointC.lat, lng: route.pointC.lng, altitude: 0.5 },
            { lat: route.pointD.lat, lng: route.pointD.lng, altitude: 0.5 }
        ];

        polyline.setAttribute('stroke-color', "rgba(52, 177, 226, 0.75)");
        polyline.setAttribute('stroke-width', '30');
        //polyline.setAttribute('stroke-opacity', '1.0');
        polyline.setAttribute('altitude-mode', 'clamp-to-ground');
        polyline.setAttribute('geodesic', 'true');

        console.log('Adding polyline to map');
        //console.log('Path:', path);
        console.log('Map element:', map);

        map.appendChild(polyline);

        const polyline2 = document.querySelector('gmp-polyline-3d');

        customElements.whenDefined(polyline2.localName).then(() => {
            polyline2.coordinates = path;
        });

        console.log('Polyline initialized successfully for', city);
    } catch (error) {
        console.error('Error initializing polyline:', error);
    }
    return true;
}

function initApp() {
  console.log("Initializing app...");
  const tripForm = document.getElementById('trip-form');
  if (!tripForm) {
    console.error("Trip form not found in the DOM!");
    return;
  }

  // Customize input styles for better UX
  const inputs = ['city'].map(id =>
    document.getElementById(id)
  );
  inputs.forEach(input => {
    input.style.fontSize = '30px';
    input.style.padding = '20px';
    input.style.margin = '20px';
    input.style.width = '80%';
    input.style.maxWidth = '800px';
  });

  // Update the form submission handler to handle async operations
  tripForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log("Trip form submitted");
    collectUserData();
    hideElement('trip-intake');
    showElement('map-container');
    
    // Load map and initialize elements
    await load3DMap(userData.city);
    const polylineLoaded = await initializePolyline(mapElement, userData.city);
    if (!polylineLoaded) {
        console.error("Failed to initialize polyline");
        return;
    }
    
    console.log('Map Element Attributes:', mapElement.attributes);
    console.log('Model Element Attributes:', modelElement.attributes);
  });

  // Add event listeners for Z and X keys
  document.addEventListener('keydown', function (e) {
    const mapElement = document.querySelector('gmp-map-3d');
    if (!mapElement) return;

    let currentHeading = parseFloat(mapElement.getAttribute('heading')) || 0;

    if (e.key === 'x' || e.key === 'X') {
      // Turn gaze to the left
      currentHeading = (currentHeading - 1 + 360) % 360; // Decrease heading, wrap around
      mapElement.setAttribute('heading', currentHeading);
    } else if (e.key === 'z' || e.key === 'Z') {
      // Turn gaze to the right
      currentHeading = (currentHeading + 1) % 360; // Increase heading, wrap around
      mapElement.setAttribute('heading', currentHeading);
    }
  });


  //Keyboard Controls
  document.addEventListener('keydown', function (e) {
  if (!modelElement) return;

  const positionAttr = modelElement.getAttribute('position');
  const currentPosition = positionAttr ? positionAttr.split(',').map(Number) : [0, 0];
  let [currentLat, currentLng] = currentPosition;

  // Get duck's orientation and add 90 degrees to compensate for the model's default orientation
  const orientationAttr = modelElement.getAttribute('orientation');
  const [_, yRotation] = orientationAttr.split(',').map(Number);
  
  // Convert heading to radians and add 90 degrees (π/2 radians)
  const headingRad = ((yRotation + 90) * Math.PI) / 180;
  const step = 0.0001;

  switch (e.key) {
    case 'ArrowDown': // Move backward from facing direction 
      currentLat += step * Math.cos(headingRad);
      currentLng += step * Math.sin(headingRad);
      break;
    case 'ArrowUp': // Move forward in facing direction
      currentLat -= step * Math.cos(headingRad);
      currentLng -= step * Math.sin(headingRad);
      break;
    case 'ArrowLeft': // Strafe left relative to facing direction
      currentLat -= step * Math.sin(headingRad);
      currentLng += step * Math.cos(headingRad);
      break;
    case 'ArrowRight': // Strafe right relative to facing direction
      currentLat += step * Math.sin(headingRad);
      currentLng -= step * Math.cos(headingRad);
      break;
    default:
      return;
  }

  modelElement.setAttribute('position', `${currentLat},${currentLng}`);
});

  // Add space key handler for duck jumping
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && modelElement) {
      e.preventDefault(); // Prevent page scrolling
      jumpDuck();
    }
  });

  // Set up an interval to update the debug window every second
 // setInterval(updateDebugWindow, 1000);

  updateDebugMenu();
}

function collectUserData() {
  const cityInput = document.getElementById('city');
  userData.city = cityInput.value.trim();
  console.log("User Data:", userData);
  updateDebugMenu();
}


/// 3D Map
async function load3DMap(city) {
    const cityRoute = CITY_ROUTES[city];
    if (!cityRoute) {
        console.error('City route not found');
        return;
    }

    //const { Map3DElement, Model3DElement } = await google.maps.importLibrary("maps3d");

    mapElement = document.createElement('gmp-map-3d');
    
    // Center on pointA of the selected city
    const center = cityRoute.pointA;
    const latitude = center.lat;
    const longitude = center.lng;
    mapElement.setAttribute('center', latitude + "," + longitude);
    mapElement.setAttribute('tilt', '75');
    mapElement.setAttribute('range', '200');
    mapElement.setAttribute('heading', '20');
    mapElement.setAttribute('roll', '0');
    mapElement.setAttribute('max-altitude', '63170000');
    mapElement.setAttribute('map-type-id', 'satellite');
    mapElement.setAttribute('default-labels-disabled', 'false');
    mapElement.setAttribute('default-ui-disabled', 'false');
    mapElement.style.height = '100%';
    mapElement.style.width = '100%';

    document.getElementById('map-container').appendChild(mapElement);

    // Initialize polyline with the selected city
    await initializePolyline(mapElement, city);

    // Update duck position to start at pointA
    modelElement = document.createElement('gmp-model-3d');
    modelElement.setAttribute('src', './rubber_duck_toy.glb');
    modelElement.setAttribute('position', `${center.lat},${center.lng}`);
    modelElement.setAttribute('scale', '70');
    modelElement.setAttribute('orientation', '180,270,0');
    mapElement.appendChild(modelElement);
    console.log("3D Map initialized with rubber duck model at:", center);
}

function hideElement(id) {
  document.getElementById(id).style.display = 'none';
}

function showElement(id) {
  const element = document.getElementById(id);
  if (id === 'map-container') {
    // Reset body and html styles to ensure full coverage
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    //document.body.style.overflow = 'hidden'; // Prevents scrollbars

    // Make map container fullscreen
    element.style.cssText = `
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      z-index: 999;
    `;
  } else {
    element.style.display = 'block';
  }
}  

  // Get mapElement properties
  let center = 'Not available';
  let tilt = 'Not available';
  let range = 'Not available';
  let heading = 'Not available';
  let roll = 'Not available';
  let altitude = 'Not available';

  if (mapElement) {
    center = mapElement.getAttribute('center') || 'Not available';
    tilt = mapElement.getAttribute('tilt') || 'Not available';
    range = mapElement.getAttribute('range') || 'Not available';
    heading = mapElement.getAttribute('heading') || 'Not available';
    roll = mapElement.getAttribute('roll') || 'Not available';
    altitude = mapElement.getAttribute('altitude') || 'Not available';
  }

/*
// Duck Jumping
async function jumpDuck() {
  // If duck is already jumping, ignore the new jump request
  console.log("Duck jumping:", isDuckJumping);
  if (!modelElement || isDuckJumping) return;

  // Import AltitudeMode from maps3d library
  const { AltitudeMode } = await google.maps.importLibrary("maps3d");
  
  const currentPosition = modelElement.getAttribute('position').split(',');
  const baseLatitude = currentPosition[0];
  const baseLongitude = currentPosition[1];
  const baseAltitude = parseFloat(currentPosition[2]) || 0;
  const jumpHeight = 8;
  const jumpDuration = 500;

  // Set the jumping flag to true
  isDuckJumping = true;

  modelElement.setAttribute('altitude-mode', AltitudeMode.RELATIVE_TO_GROUND);

  let startTime = null;
  function animate(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / jumpDuration, 1);

    const jumpProgress = Math.sin(progress * Math.PI);
    const currentHeight = baseAltitude + jumpHeight * jumpProgress;

    // Update position maintaining lat/lng but changing altitude
    modelElement.setAttribute('position', `${baseLatitude},${baseLongitude},${currentHeight}`);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Reset position and allow jumping again
      modelElement.setAttribute('position', `${baseLatitude},${baseLongitude},${baseAltitude}`);
      isDuckJumping = false; // Reset the jumping flag when animation is complete
    }
  }

  requestAnimationFrame(animate);
}

*/


// Add this function to create and update the debug menu
function updateDebugMenu() {
  // Create or get existing debug menu
  let debugMenu = document.getElementById('debug-menu');
  if (!debugMenu) {
    debugMenu = document.createElement('div');
    debugMenu.id = 'debug-menu';
    debugMenu.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      z-index: 1000;
    `;
    document.body.appendChild(debugMenu);
  }

  // Update content
  const city = userData.city || 'Not selected';
  const points = CITY_ROUTES[city] || {};
  
  debugMenu.innerHTML = `
    <div><strong>City:</strong> ${city}</div>
    <div><strong>Point A:</strong> ${formatPoint(points.pointA)}</div>
    <div><strong>Point B:</strong> ${formatPoint(points.pointB)}</div>
    <div><strong>Point C:</strong> ${formatPoint(points.pointC)}</div>
    <div><strong>Point D:</strong> ${formatPoint(points.pointD)}</div>
  `;
}

// Helper function to format point coordinates
function formatPoint(point) {
  if (!point) return 'N/A';
  return `(${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`;
}

document.addEventListener('keydown', function (e) {
  if (!modelElement) return;

  let currentOrientation = modelElement.getAttribute('orientation').split(',');
  let [x, y, z] = currentOrientation.map(Number);

  if (e.key === 'v' || e.key === 'v') {
    x = (x + 1) % 360;  // Increase y rotation
  } else if (e.key === 'c' || e.key === 'c') {
    x = (x - 1 + 360) % 360;  // Decrease y rotation
  }

  modelElement.setAttribute('orientation', `${x},${y},${z}`);
});

let animationFrameId = null;
let currentPathIndex = 0;
let lastTimestamp = null;
let isMoving = false;

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !isMoving) {
    isMoving = true;
    lastTimestamp = null;
    startDuckMovement();
  }
});


function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    lastTimestamp = timestamp;

    console.log("Animating duck... deltaTime:", deltaTime, "timestamp:", timestamp);

    // Get route points for selected city
    const route = [
      CITY_ROUTES[userData.city].pointA,
      CITY_ROUTES[userData.city].pointB,
      CITY_ROUTES[userData.city].pointC,
      CITY_ROUTES[userData.city].pointD
    ];

    if (currentPathIndex >= route.length - 1) {
      isMoving = false;
      return; // Stop at end of route
    }

    // Current and next points
    const currentPoint = route[currentPathIndex];
    const nextPoint = route[currentPathIndex + 1];

    // Calculate distance between points
    const dlat = nextPoint.lat - currentPoint.lat;
    const dlng = nextPoint.lng - currentPoint.lng;
    const distance = Math.sqrt(dlat * dlat + dlng * dlng);

    // Calculate movement for this frame (1 meter/second)
    const speed = 0.00001; // Approximate conversion of 1 meter to degrees
    const step = speed * deltaTime;
    const progress = step / distance;

    // Get current position
    const positionAttr = modelElement.getAttribute('position');
    let [currentLat, currentLng] = positionAttr.split(',').map(Number);

    // Move towards next point
    currentLat += dlat * progress;
    currentLng += dlng * progress;

    // Check if we've reached or passed the next point
    const distanceToNext = Math.sqrt(
      Math.pow(nextPoint[0] - currentLat, 2) + 
      Math.pow(nextPoint[1] - currentLng, 2)
    );

    if (distanceToNext < speed) {
      currentPathIndex++;
      currentLat = nextPoint[0];
      currentLng = nextPoint[1];
    }

    // Update duck position
    modelElement.setAttribute('position', `${currentLat},${currentLng}`);

    if (isMoving) {
      animationFrameId = requestAnimationFrame(animate);
    }
}

function startDuckMovement() {
  if (!modelElement) return;
  animationFrameId = requestAnimationFrame(animate);
}
