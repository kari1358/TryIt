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
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&v=alpha&libraries=maps3d`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    console.log("Google Maps API script loaded");
    initApp();
  };
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

  // Make inputs 10x bigger
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const destinationsInput = document.getElementById('destinations');
  const budgetInput = document.getElementById('budget');

  [startDateInput, endDateInput, destinationsInput, budgetInput].forEach(input => {
    input.style.fontSize = '30px';
    input.style.padding = '20px';
    input.style.margin = '20px';
    input.style.width = '80%';
    input.style.maxWidth = '800px';
  });

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
  // Get form elements
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const destinationsInput = document.getElementById('destinations');
  const budgetInput = document.getElementById('budget');

  // Collect the data
  userData.startDate = startDateInput.value;
  userData.endDate = endDateInput.value;
  userData.destinations = destinationsInput.value.split(',').map(s => s.trim());
  userData.budget = parseFloat(budgetInput.value);
  console.log("User Data:", userData);
}

// Initialize Map and Find Hotels
function initMapAndFindHotels() {
  const firstDestination = userData.destinations[0];
  const geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: firstDestination }, (results, status) => {
    if (status === 'OK') {
      const center = {
        lat: results[0].geometry.location.lat(),
        lng: results[0].geometry.location.lng()
      };
      
      const mapElement = document.createElement('gmp-map-3d');
      mapElement.setAttribute('center', `${center.lat},${center.lng}`);
      mapElement.setAttribute('tilt', '67.5');
      mapElement.style.height = '100%';
      mapElement.style.width = '100%';
      document.getElementById('map').appendChild(mapElement);

      console.log("3D Map initialized:", mapElement);

      // Use Places API to find hotels
      findHotels(center);
    } else {
      console.error('Geocode was not successful for the following reason: ' + status);
    }
  });
}

// Other utility functions remain unchanged...

// Helper Functions
function hideElement(id) {
  document.getElementById(id).style.display = 'none';
}

function showElement(id) {
  document.getElementById(id).style.display = 'block';
}
