// main.js
// Import the Google Generative AI client
import { GoogleGenerativeAI } from "@google/generative-ai";

// Global Variables
let hotels = [];
let currentHotelIndex = 0;
let userData = {};
let debugWindow;
let hotelAddress; // Variable to store hotel address
let mapElement; // Declare mapElement as a global variable
let modelElement; // Declare modelElement as a global variable

// Access the environment variables
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const googleGeminiApiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

// Initialize the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  console.log("DOM fully loaded");
  updateDebugWindow();
  loadGoogleMapsScript();
});

function loadGoogleMapsScript() {
  console.log("Loading Google Maps script...");
  if (window.google && window.google.maps) {
    initApp(); // If already loaded, initialize the app
    return;
  }
  if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
    console.log("Google Maps script is already in the document.");
    return;
  }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=maps3d&v=alpha`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    console.log("Google Maps API script loaded");
    initApp();
  };
  document.head.appendChild(script);
}

function initApp() {
  console.log("Initializing app...");
  const tripForm = document.getElementById('trip-form');
  if (!tripForm) {
    console.error("Trip form not found in the DOM!");
    return;
  }

  // Customize input styles for better UX
  const inputs = ['city', 'start-date', 'end-date', 'poi1', 'poi2', 'poi3', 'budget'].map(id =>
    document.getElementById(id)
  );
  inputs.forEach(input => {
    input.style.fontSize = '30px';
    input.style.padding = '20px';
    input.style.margin = '20px';
    input.style.width = '80%';
    input.style.maxWidth = '800px';
  });

  // Form submission handler
  tripForm.addEventListener('submit', function (e) {
    e.preventDefault();
    console.log("Trip form submitted");
    collectUserData();
    hideElement('trip-intake');
    showElement('map-container');
    runPrompt();
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

  // Add event listener for arrow Keys
  document.addEventListener('keydown', function (e) {
    const mapElement = document.querySelector('gmp-map-3d');
    if (!mapElement) return;

    // Get current center or default to 0,0
    const centerAttr = mapElement.getAttribute('center');
    const currentCenter = centerAttr ? centerAttr.split(',').map(Number) : [0, 0];
    let [currentLat, currentLng] = currentCenter;

    const step = 0.0001; // Adjust step size for latitude and longitude changes

    switch (e.key) {
      case 'ArrowUp': // Move center north
        currentLat += step;
        break;
      case 'ArrowDown': // Move center south
        currentLat -= step;
        break;
      case 'ArrowLeft': // Move center west
        currentLng -= step;
        break;
      case 'ArrowRight': // Move center east
        currentLng += step;
        break;
      default:
        return; // Ignore other keys
    }

    // Update the center attribute of the map
    mapElement.setAttribute('center', `${currentLat},${currentLng}`);

    // Update the position attribute of the model to match the new center
    if (modelElement) {
      modelElement.setAttribute('position', `${currentLat},${currentLng}`);
    }
  });

  // Set up an interval to update the debug window every second
  setInterval(updateDebugWindow, 1000);
}

function collectUserData() {
  const cityInput = document.getElementById('city');
  const poi1Input = document.getElementById('poi1');
  const poi2Input = document.getElementById('poi2');
  const poi3Input = document.getElementById('poi3');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const budgetInput = document.getElementById('budget');

  userData.pointsOfInterest = [
    poi1Input.value.trim(),
    poi2Input.value.trim(),
    poi3Input.value.trim()
  ];
  userData.city = cityInput.value.trim();
  userData.startDate = startDateInput.value;
  userData.endDate = endDateInput.value;
  userData.budget = parseFloat(budgetInput.value);
  console.log("User Data:", userData);
  updateDebugWindow();
}

// GEMINI AI - Get hotel address
const genAI = new GoogleGenerativeAI(googleGeminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

async function runPrompt() {
  try {
    const prompt = `Recommend a hotel in ${userData.city} that costs less than ${userData.budget} per night. Select one that is convenient to the following points of interest: ${userData.pointsOfInterest.join(', ')}.Respond with the address only, in the format "Street address, City, State Zip Code". Don't include any other text. For example, "2101 Sutter St, San Francisco, CA 94115."is a good answer.`;
    const response = await model.generateContent(prompt);
    hotelAddress = response.response.candidates[0].content.parts[0].text;

    console.log("The address for the recommended hotel is:", hotelAddress);
    initMapWithHotel(hotelAddress);
  } catch (error) {
    console.error("Error generating text:", error);
  }
}

async function initMapWithHotel(hotelAddress) {
  // Using Google Maps Places API to geocode the address into latitude, longitude, and altitude
  const geocoder = new google.maps.Geocoder();
  try {
    const result = await geocoder.geocode({ address: hotelAddress });
    if (result && result.results.length > 0) {
      const location = result.results[0].geometry.location;

      // Defining latitude, longitude, and setting an arbitrary altitude for the 3D map
      const hotelLatLngAlt = {
        lat: location.lat(),
        lng: location.lng(),
        altitude: 2 // Set to an arbitrary altitude in meters
      };

      load3DMap(hotelLatLngAlt);
    } else {
      console.error("Geocoding failed, no results found.");
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
}

async function load3DMap(center) {
  // Import the maps3d library
  const { Map3DElement, Model3DElement } = await google.maps.importLibrary("maps3d");

  // Create the 3D Map as a Web Component
  mapElement = document.createElement('gmp-map-3d'); // Assign to the global mapElement
  mapElement.setAttribute('center', `${center.lat},${center.lng}`);
  mapElement.setAttribute('tilt', '45');
  mapElement.setAttribute('range', '35');
  mapElement.setAttribute('heading', '0');
  mapElement.setAttribute('roll', '0');
  mapElement.setAttribute('max-altitude', '63170000');
  mapElement.setAttribute('map-type-id', 'satellite');
  mapElement.setAttribute('default-labels-disabled', 'false');
  mapElement.setAttribute('default-ui-disabled', 'false');
  mapElement.style.height = '100%';
  mapElement.style.width = '100%';

  document.getElementById('map-container').appendChild(mapElement);

  // Create the Model3DElement (gmp-model-3d) for the rubber duck
  modelElement = document.createElement('gmp-model-3d'); // Assign to global variable

  // Set the 'src' attribute to the GLTF file
  modelElement.setAttribute('src', './rubber_duck_toy.glb');
  //modelElement.setAttribute('src', './BlenderCube.glb');
  // Set the 'position' attribute to match the map's center
  const centerPosition = `${center.lat},${center.lng}`;
  modelElement.setAttribute('position', centerPosition);

  // Set scale if needed
  modelElement.setAttribute('scale', '2000');

  // Append the model to the map
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
    document.body.style.overflow = 'hidden'; // Prevents scrollbars

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

function updateDebugWindow() {
  if (!debugWindow) {
    debugWindow = document.createElement('div');

    // Add test fill button
    const testFillButton = document.createElement('button');
    testFillButton.textContent = 'Fill Test Data (SF)';
    testFillButton.style.cssText = `
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 10px;
      font-family: sans-serif;
    `;
    testFillButton.onclick = fillTestData;

    debugWindow.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 14px;
      max-width: 300px;
      z-index: 1000;
    `;

    const debugInfo = document.createElement('div');
    debugInfo.id = 'debug-info';

    debugWindow.appendChild(testFillButton);
    debugWindow.appendChild(debugInfo);
    document.body.appendChild(debugWindow);
  }

  const hotelList = (hotels || []).map((hotel, index) => {
    return `
Hotel ${index + 1}:
  Name: ${hotel?.name || 'Not available'}
  Address: ${hotel?.formatted_address || 'Not available'}
    `;
  }).join('\n') || 'No hotels found';

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

  const debugInfo = debugWindow.querySelector('#debug-info');
  debugInfo.innerHTML = `
    <h3>Debug Info:</h3>
    <pre>
User Input:
  Points of Interest:
    1. ${(userData?.pointsOfInterest?.[0]) || 'Not set'}
    2. ${(userData?.pointsOfInterest?.[1]) || 'Not set'}
    3. ${(userData?.pointsOfInterest?.[2]) || 'Not set'}
  Start: ${userData?.startDate || 'Not set'}
  End: ${userData?.endDate || 'Not set'}
  Budget: ${userData?.budget || 'Not set'}

Hotels Found:
${hotelList}

Map Properties:
  Center: ${center}
  Tilt: ${tilt}
  Range: ${range}
  Heading: ${heading}
  Roll: ${roll}
  Altitude: ${altitude}
    </pre>
  `;
}

function fillTestData() {
  document.getElementById('city').value = 'San Francisco';
  document.getElementById('poi1').value = 'Golden Gate Bridge';
  document.getElementById('poi2').value = 'Fisherman\'s Wharf';
  document.getElementById('poi3').value = 'Painted Ladies';
  document.getElementById('start-date').value = '2024-12-25';
  document.getElementById('end-date').value = '2024-12-27';
  document.getElementById('budget').value = '300';
  collectUserData();
}
