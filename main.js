// main.js
// Import the Google Generative AI client
import { GoogleGenerativeAI } from "@google/generative-ai";
// Global Variables
let hotels = [];
let currentHotelIndex = 0;
let userData = {};
let debugWindow;

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
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
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
    initMapAndFindHotels();
  });

// Update the debug window
updateDebugWindow();
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
}

function initMapAndFindHotels() {
    runPrompt();
    //geocodePointsOfInterest();
}

////GEMINI////
// Initialize the client with your API key
const genAI = new GoogleGenerativeAI(googleGeminiApiKey);

// Get the specific model you want to use
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Define an async function to run the prompt
async function runPrompt() {
  try {
    const prompt = `what is the address for Hotel Kabuki in ${userData.city}? Output only the address.`;
    // Generate text using the model and your prompt
    //const response = await model.generateText({ prompt: prompt });
    const response = await model.generateContent(prompt);
    //TODO: figure out how to get the text from the response

    // **Store the generated text in a variable**
    const hotelAddress = response.response.candidates[0].content.parts[0].text; 
    

    // **Now you can use hotelAddress in the rest of your code**
    console.log("The address for Hotel Kabuki is:", hotelAddress); 

  } catch (error) {
    console.error("Error generating text:", error);
  }
}

//TODO: Use hotelAddress in findHotels()

function initMapWithHotel(hotel) {
    runPrompt();
    //TODO: Confirm this is the right place for this function
  const center = {
    lat: hotel.geometry.location.lat,
    lng: hotel.geometry.location.lng,
  };

  const mapOptions = {
    center: center,
    zoom: 18, // High zoom level
    mapTypeId: 'satellite',
    tilt: 45
  };

  const map = new google.maps.Map(document.getElementById('map'), mapOptions);

  // Add a marker for the hotel
  new google.maps.Marker({
    position: center,
    map: map,
    title: hotel.name,
  });

  console.log("Map initialized with hotel:", hotel.name);
}

function hideElement(id) {
  document.getElementById(id).style.display = 'none';
}

function showElement(id) {
  document.getElementById(id).style.display = 'block';
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
    
    // Create a container for the debug info that we'll update later
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

  // Update the existing debug info div
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
}

