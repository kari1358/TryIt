// main.js

// Global Variables
let map;
let hotels = [];
let currentHotelIndex = 0;
let userData = {};

// Access the environment variable
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Initialize the application after the Google Maps API is loaded
window.initMap = function() {
  // This function is called by the Google Maps API once it's loaded
  initApp();
};

function initApp() {
  // Trip Intake Form Submission
  document.getElementById('trip-form').addEventListener('submit', function(e) {
    e.preventDefault();
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

  // Implement WASD controls
  addKeyboardControls();

  // Use Places API to find hotels
  findHotels(center);
}

// Add Keyboard Controls
function addKeyboardControls() {
  document.addEventListener('keydown', function(event) {
    const moveSpeed = 0.0001;
    const headingSpeed = 1;

    switch(event.key) {
      case 'w':
      case 'ArrowUp':
        moveCamera(moveSpeed);
        break;
      case 's':
      case 'ArrowDown':
        moveCamera(-moveSpeed);
        break;
      case 'a':
      case 'ArrowLeft':
        rotateCamera(-headingSpeed);
        break;
      case 'd':
      case 'ArrowRight':
        rotateCamera(headingSpeed);
        break;
    }
  });
}

function moveCamera(distance) {
  const heading = map.getHeading() || 0;
  const latLng = google.maps.geometry.spherical.computeOffset(map.getCenter(), distance * 1000, heading);
  map.setCenter(latLng);
}

function rotateCamera(angle) {
  const heading = map.getHeading() || 0;
  map.setHeading(heading + angle);
}

// Find Hotels Using Places API
function findHotels(location) {
  const service = new google.maps.places.PlacesService(map);
  const request = {
    location: location,
    radius: '1500',
    type: ['lodging'],
    minPriceLevel: 0,
    maxPriceLevel: 4
  };

  service.nearbySearch(request, function(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
      hotels = selectHotels(results);
      startHotelExperience();
    } else {
      alert('No hotels found.');
    }
  });
}

// Select 3 Hotels At Least 5 Blocks Apart
function selectHotels(hotelResults) {
  // Filter hotels at least 500 meters apart
  const selectedHotels = [];
  hotelResults.forEach(hotel => {
    if (selectedHotels.length < 3) {
      if (selectedHotels.every(selectedHotel => {
        return google.maps.geometry.spherical.computeDistanceBetween(
          hotel.geometry.location,
          selectedHotel.location
        ) > 500; // Approximately 5 blocks
      })) {
        selectedHotels.push({
          name: hotel.name,
          location: hotel.geometry.location,
          price: getRandomPrice(),
          savings: 0,
          totalCost: 0,
          rating: 0
        });
      }
    }
  });
  return selectedHotels;
}

// Start the Experience with the Current Hotel
function startHotelExperience() {
  if (currentHotelIndex < hotels.length) {
    const hotel = hotels[currentHotelIndex];
    map.setCenter(hotel.location);
    map.setZoom(18);
    // Update hotel name in the rating container
    document.getElementById('hotel-name').textContent = hotel.name;
    // Start the walking experience
    simulateWalkingWithCoupons(hotel);
  } else {
    showSummaryPage();
  }
}

// Simulate Walking with Coupons
function simulateWalkingWithCoupons(hotel) {
  // Use Places API to find nearby businesses
  findNearbyBusinesses(hotel.location, function(couponOffers) {
    let offerIndex = 0;

    function showNextCoupon() {
      if (offerIndex < couponOffers.length) {
        const coupon = couponOffers[offerIndex];
        displayCoupon(coupon, function(accepted) {
          if (accepted) {
            hotel.savings += coupon.averagePrice * 0.10;
          }
          offerIndex++;
          showNextCoupon();
        });
      } else {
        // After all coupons, ask for experience rating
        askForExperienceRating(hotel);
      }
    }

    showNextCoupon();
  });
}

// Find Nearby Businesses Using Places API
function findNearbyBusinesses(location, callback) {
  const service = new google.maps.places.PlacesService(map);
  const request = {
    location: location,
    radius: '500',
    type: ['restaurant', 'cafe', 'bar', 'store']
  };

  service.nearbySearch(request, function(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
      const businesses = results.map(place => {
        return {
          name: place.name,
          averagePrice: getRandomPrice(10, 50)
        };
      });
      callback(businesses);
    } else {
      callback([]);
    }
  });
}

// Display Coupon Popup
function displayCoupon(coupon, callback) {
  document.getElementById('coupon-text').textContent = `10% Off at ${coupon.name}`;
  showElement('coupon-popup');

  document.getElementById('accept-coupon').onclick = function() {
    hideElement('coupon-popup');
    callback(true);
  };

  document.getElementById('decline-coupon').onclick = function() {
    hideElement('coupon-popup');
    callback(false);
  };
}

// Ask for Experience Rating
function askForExperienceRating(hotel) {
  showElement('rating-container');
  const starContainer = document.getElementById('star-rating');
  starContainer.innerHTML = '';

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.classList.add('star');
    star.textContent = '☆';
    star.dataset.value = i;
    star.onclick = function() {
      hotel.rating = i;
      updateStarRating(i);
    };
    starContainer.appendChild(star);
  }

  document.getElementById('next-hotel').onclick = function() {
    if (hotel.rating > 0) {
      hideElement('rating-container');
      currentHotelIndex++;
      startHotelExperience();
    } else {
      alert('Please select a rating.');
    }
  };
}

// Update Star Rating Display
function updateStarRating(rating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.textContent = star.dataset.value <= rating ? '★' : '☆';
  });
}

// Show Summary Page
function showSummaryPage() {
  hideElement('map-container');
  showElement('summary-page');

  // Populate the summary table
  hotels.forEach((hotel, index) => {
    const priceId = `hotel-${String.fromCharCode(97 + index)}-price`;
    const savingsId = `hotel-${String.fromCharCode(97 + index)}-savings`;
    const totalId = `hotel-${String.fromCharCode(97 + index)}-total`;
    const ratingId = `hotel-${String.fromCharCode(97 + index)}-rating`;

    document.getElementById(priceId).textContent = `$${hotel.price.toFixed(2)}`;
    document.getElementById(savingsId).textContent = `$${hotel.savings.toFixed(2)}`;
    hotel.totalCost = hotel.price - hotel.savings;
    document.getElementById(totalId).textContent = `$${hotel.totalCost.toFixed(2)}`;
    document.getElementById(ratingId).textContent = '★'.repeat(hotel.rating) + '☆'.repeat(5 - hotel.rating);
  });
}

// Helper Functions
function getRandomPrice(min = 100, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hideElement(id) {
  document.getElementById(id).style.display = 'none';
}

function showElement(id) {
  document.getElementById(id).style.display = 'block';
}

// Create and load the Google Maps script
function loadGoogleMapsScript() {
    if (window.google && window.google.maps) {
      // Google Maps API is already loaded
      initApp();
      return;
    }
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      // Script is already in the document but not yet loaded
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  
  // Call this when your app initializes
  document.addEventListener('DOMContentLoaded', function() {
    loadGoogleMapsScript();
  });