// main.js

// Global Variables
let map;
let hotels = [];
let currentHotelIndex = 0;
let userData = {};

// Access the environment variable
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Initialize the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  console.log("DOM fully loaded");
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
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// Google Maps callback function
window.initMap = function () {
  console.log("Google Maps API initialized");
  initApp();
};

function initApp() {
  console.log("Initializing app...");
  const tripForm = document.getElementById('trip-form');
  if (!tripForm) {
    console.error("Trip form not found in the DOM!");
    return;
  }

  // Trip Intake Form Submission
  tripForm.addEventListener('submit', function (e) {
    e.preventDefault();
    console.log("Trip form submitted");
    collectUserData();
    hideElement('trip-intake');
    showElement('map-container');
    initMapAndFindHotels();
  });
}

// Collect user input
function collectUserData() {
  userData.startDate = document.getElementById('start-date').value;
  userData.endDate = document.getElementById('end-date').value;
  userData.destinations = document.getElementById('destinations').value.split(',').map(s => s.trim());
  userData.budget = parseFloat(document.getElementById('budget').value);
  console.log("User Data:", userData);
}

// Initialize Map and Find Hotels
function initMapAndFindHotels() {
  const center = { lat: 40.7128, lng: -74.0060 }; // Default to NYC or use user's destination
  map = new google.maps.Map(document.getElementById('map'), {
    center: center,
    zoom: 16,
    heading: 0,
    tilt: 45,
    mapId: 'YOUR_MAP_ID' // Replace with your Map ID if you have one
  });

  console.log("Map initialized:", map);

  // Add WASD controls
  addKeyboardControls();

  // Use Places API to find hotels
  findHotels(center);
}

// Other utility functions remain unchanged...

// Helper Functions
function hideElement(id) {
  document.getElementById(id).style.display = 'none';
}

function showElement(id) {
  document.getElementById(id).style.display = 'block';
}
