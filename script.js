/**
 * JAVASCRIPT BASICS + API INTEGRATION
 * Demonstrates: Closures, Higher-Order Functions (map, filter, reduce), 
 * Arrays, Event Delegation, async/await, DOM manipulation, Destructuring.
 */

// ==========================================
// 1. GLOBAL STATE & VARIABLES
// ==========================================
// Mutability: 'let' is used because these values will change over time.
let isCelsius = true; // Primitive Type: Boolean
let searchHistory = []; // Reference Type: Array
let latestWeatherData = null; // Caching the object to allow easy unit toggling

// ==========================================
// 2. DOM TREE & SELECTORS
// ==========================================
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const errorMessage = document.getElementById('error-message');
const weatherDisplay = document.getElementById('weather-display');
const loadingIndicator = document.querySelector('#loading');
const unitToggleBtn = document.getElementById('unit-toggle');
const historyContainer = document.getElementById('search-history');

// Current Weather Elements
const cityNameEl = document.querySelector('#city-name');
const dateEl = document.querySelector('#date');
const weatherIconEl = document.querySelector('#weather-icon');
const tempValueEl = document.querySelector('#temp-value');
const tempUnitEl = document.querySelector('#temp-unit');
const weatherDescriptionEl = document.querySelector('#weather-description');
const humidityValueEl = document.querySelector('#humidity-value');
const windValueEl = document.querySelector('#wind-value');
const aqiValueEl = document.querySelector('#aqi-value');
const visibilityValueEl = document.querySelector('#visibility-value');

// Feature Containers
const forecastCardsContainer = document.getElementById('forecast-cards');
const barsWrapper = document.getElementById('bars-wrapper');
const recommendationList = document.getElementById('recommendation-list');


// ==========================================
// 3. CLOSURES (Function Factories)
// ==========================================
// Definition: A function that remembers the environment in which it was created.
// Practical Use: Creating a private 'activities' database that can't be modified globally.
function createRecommender() {
    // Private variable
    const activities = [
        { suggestion: "Wear sunglasses", condition: "Sunny", emoji: "🕶️" },
        { suggestion: "Take a walk in the park", condition: "Sunny", emoji: "🚶" },
        { suggestion: "Have a picnic", condition: "Mainly clear", emoji: "🧺" },
        { suggestion: "Grab an umbrella", condition: "Rain", emoji: "☔" },
        { suggestion: "Perfect day for reading indoors", condition: "Rain", emoji: "📚" },
        { suggestion: "Wear a light jacket", condition: "Partly cloudy", emoji: "🧥" },
        { suggestion: "Listen to a podcast on your commute", condition: "Overcast", emoji: "🎧" },
        { suggestion: "Enjoy a cup of hot coffee", maxTemp: 10, emoji: "☕" },
        { suggestion: "Bundle up, it's freezing!", maxTemp: 5, emoji: "🧤" },
        { suggestion: "Stay hydrated, it's hot!", minTemp: 30, emoji: "💧" },
        { suggestion: "Build a snowman", condition: "Snow", emoji: "⛄" },
        { suggestion: "Fly a kite!", minWind: 15, emoji: "🪁" } // Added wind-based suggestion
    ];

    // Return a function that retains access to 'activities'
    return function(currentCondition, currentTempInC, currentWindKm) {
        // Higher-Order Function: filter()
        return activities.filter(activity => {
            // Logical Operators (&&)
            let matchesCondition = activity.condition ? activity.condition.toLowerCase() === currentCondition.toLowerCase() : true;
            let matchesCold = activity.maxTemp ? currentTempInC <= activity.maxTemp : true;
            let matchesHot = activity.minTemp ? currentTempInC >= activity.minTemp : true;
            let matchesWind = activity.minWind ? currentWindKm >= activity.minWind : true;
            
            return matchesCondition && matchesCold && matchesHot && matchesWind;
        });
    }
}
const getRecommendations = createRecommender(); // Initialize the closure


// ==========================================
// 4. EVENT HANDLING, PROPAGATION & DELEGATION
// ==========================================
searchForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Form: Prevent default page reload
    let searchCity = cityInput.value.trim();
    if (!searchCity) return; // Control Flow: early return
    processSearch(searchCity);
});

// Event Delegation: Unit Toggle
unitToggleBtn.addEventListener('click', () => {
    isCelsius = !isCelsius; // Mutate boolean
    unitToggleBtn.textContent = isCelsius ? "°C / °F" : "°F / °C"; // Ternary Operator
    
    // If we have data, re-render immediately with new units
    if (latestWeatherData) {
        updateDashboard(latestWeatherData);
    }
});

// Event Delegation: Search History Chips
historyContainer.addEventListener('click', function(event) {
    // Capturing clicks on dynamically generated children
    if (event.target.classList.contains('history-chip')) {
        const cityToSearch = event.target.textContent;
        cityInput.value = cityToSearch; 
        processSearch(cityToSearch);
    }
});

// Event Delegation: Graph Bars
barsWrapper.addEventListener('click', function(event) {
    if (event.target.classList.contains('bar')) {
        alert(`Chance of Rain: ${event.target.textContent}`);
    }
}, false); // Event Bubbling


// ==========================================
// 5. ASYNC/AWAIT, FETCH, JSON HANDLING
// ==========================================
async function processSearch(city) {
    weatherDisplay.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');

    try {
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json(); 
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        // Destructuring
        const { name: cityName, latitude, longitude } = geoData.results[0];

        // Fetch Weather (Added visibility and precipitation probability)
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=6`);
        const weatherData = await weatherResponse.json();

        // Fetch AQI (Air Quality Index) via separate Open-Meteo endpoint
        let aqiVal = "N/A";
        try {
            const aqiResponse = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi`);
            const aqiData = await aqiResponse.json();
            if(aqiData.current && aqiData.current.european_aqi !== undefined) {
                aqiVal = aqiData.current.european_aqi;
            }
        } catch (e) {
            console.warn("AQI fetch failed", e);
        }

        const currentDetails = getWeatherDetails(weatherData.current.weather_code, weatherData.current.is_day);
        
        const forecastArray = [];
        
        // Loop Types: for loop
        for (let i = 1; i <= 5; i++) {
            const dateObj = new Date(weatherData.daily.time[i]);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayDetails = getWeatherDetails(weatherData.daily.weather_code[i], 1);
            
            // Object literal syntax
            forecastArray.push({
                day: dayName,
                max: Math.round(weatherData.daily.temperature_2m_max[i]),
                min: Math.round(weatherData.daily.temperature_2m_min[i]),
                precipChance: weatherData.daily.precipitation_probability_max[i] || 0,
                emoji: dayDetails.emoji
            });
        }

        // Format and store in Global State cache
        latestWeatherData = {
            cityName: cityName,
            current: {
                temp: Math.round(weatherData.current.temperature_2m),
                humidity: weatherData.current.relative_humidity_2m,
                wind: weatherData.current.wind_speed_10m,
                visibility: weatherData.current.visibility,
                aqi: aqiVal,
                condition: currentDetails.description,
                emoji: currentDetails.emoji
            },
            forecast: forecastArray
        };

        // Manage Search History (Arrays)
        updateSearchHistory(cityName);

        updateDashboard(latestWeatherData);
        loadingIndicator.classList.add('hidden');
    } catch (error) {
        errorMessage.textContent = "City not found or network error. Please try again.";
        errorMessage.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
}

// ==========================================
// 6. ARRAYS, MAP, AND DESTRUCTURING
// ==========================================
// Arrow Function with single-line return & Ternary Operator
const convertTemp = (tempC) => isCelsius ? tempC : Math.round((tempC * 9/5) + 32);

function updateDashboard(weatherObj) {
    // Object Destructuring
    const { cityName, current, forecast } = weatherObj;
    const { temp, humidity, wind, visibility, aqi, condition, emoji } = current;

    // Apply unit conversion
    const displayTemp = convertTemp(temp);

    // Read/write HTML
    cityNameEl.textContent = cityName;
    tempValueEl.textContent = displayTemp;
    tempUnitEl.textContent = isCelsius ? "°C" : "°F";
    
    // Template Literals
    humidityValueEl.textContent = `${humidity}%`;
    windValueEl.textContent = `${wind} km/h`;
    weatherDescriptionEl.textContent = condition;
    weatherIconEl.textContent = emoji;

    // Handle new metrics
    const visibilityKm = visibility ? (visibility / 1000).toFixed(1) + ' km' : 'N/A';
    visibilityValueEl.textContent = visibilityKm;

    let aqiText = aqi;
    if (aqi !== "N/A") {
        if (aqi <= 20) aqiText = `${aqi} (Good)`;
        else if (aqi <= 40) aqiText = `${aqi} (Fair)`;
        else if (aqi <= 60) aqiText = `${aqi} (Moderate)`;
        else aqiText = `${aqi} (Poor)`;
    }
    aqiValueEl.textContent = aqiText;

    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    updateBackground(condition);
    
    // Generate Suggestions based on CLOSURE
    renderRecommendations(condition, temp, wind);

    // Higher-Order Function: map()
    const convertedForecast = forecast.map(day => {
        return {
            day: day.day,
            emoji: day.emoji,
            max: convertTemp(day.max),
            min: convertTemp(day.min),
            precipChance: day.precipChance
        };
    });

    renderForecast(convertedForecast);
    renderGraph(convertedForecast);

    weatherDisplay.classList.remove('hidden');
}


// ==========================================
// 7. ARRAYS: UNSHIFT, SLICE, FINDINDEX
// ==========================================
function updateSearchHistory(city) {
    // Array Method: findIndex()
    const existingIndex = searchHistory.findIndex(item => item.toLowerCase() === city.toLowerCase());
    
    // Control Flow: if
    if (existingIndex !== -1) {
        searchHistory.splice(existingIndex, 1); // Remove it if it exists
    }
    
    // Array Method: unshift() adds to the beginning
    searchHistory.unshift(city);
    
    // Array Method: slice() limits history to top 5
    searchHistory = searchHistory.slice(0, 5);
    
    // Re-render
    historyContainer.innerHTML = '';
    searchHistory.forEach(historyCity => {
        const chip = document.createElement('div');
        chip.className = 'history-chip';
        chip.textContent = historyCity;
        historyContainer.appendChild(chip);
    });
}


// ==========================================
// 8. CREATING, APPENDING, DELETING NODES
// ==========================================
function renderRecommendations(condition, tempC, windKm) {
    recommendationList.innerHTML = ''; // Delete old nodes
    
    // Call our closure
    const suggestions = getRecommendations(condition, tempC, windKm);
    
    // Array Method: forEach
    suggestions.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.emoji}</span> ${item.suggestion}`;
        recommendationList.appendChild(li); // Append
    });
    
    // Fallback if no suggestions match
    if(suggestions.length === 0) {
        const li = document.createElement('li');
        li.textContent = "Enjoy your day!";
        recommendationList.appendChild(li);
    }
}

function renderForecast(forecastArray) {
    forecastCardsContainer.innerHTML = '';

    forecastArray.forEach((dayData) => {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="day">${dayData.day}</div>
            <div class="icon">${dayData.emoji}</div>
            <div class="temps">
                <span class="max">${dayData.max}°</span>
                <span class="min">${dayData.min}°</span>
            </div>
        `;
        forecastCardsContainer.appendChild(card);
    });
}

function renderGraph(forecastArray) {
    barsWrapper.innerHTML = '';

    // Loop Types: for...of
    for (const dayData of forecastArray) {
        // Precipitation is a percentage out of 100
        const precipVal = dayData.precipChance;
        const heightPercent = Math.max(precipVal, 10); // Minimum 10% so empty bars are visible

        const col = document.createElement('div');
        col.className = 'bar-column';

        const bar = document.createElement('div');
        bar.className = 'bar';
        
        // Applying CSS through JS
        bar.style.height = `${heightPercent}%`;
        bar.textContent = `${precipVal}%`;

        // Control Flow: if statement to change color based on rain chance
        if (precipVal > 50) {
            bar.style.background = 'linear-gradient(to top, rgba(0,242,254,0.5), #4facfe)';
            bar.style.color = '#fff';
            bar.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        }

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = dayData.day;

        col.appendChild(bar);
        col.appendChild(label);
        barsWrapper.appendChild(col);
    }
}

// Control Flow: Switch statement
function updateBackground(condition) {
    let bgGradient;
    switch (condition.toLowerCase()) {
        case 'sunny':
        case 'clear sky':
        case 'mainly clear':
            bgGradient = 'linear-gradient(135deg, #2980B9 0%, #6DD5FA 100%)';
            break;
        case 'rain':
        case 'slight rain':
        case 'moderate rain':
        case 'heavy rain':
        case 'light drizzle':
        case 'moderate drizzle':
        case 'dense drizzle':
        case 'thunderstorm':
            bgGradient = 'linear-gradient(135deg, #16222A 0%, #3A6073 100%)';
            break;
        case 'partly cloudy':
        case 'overcast':
        case 'fog':
        case 'rime fog':
            bgGradient = 'linear-gradient(135deg, #536976 0%, #292E49 100%)';
            break;
        case 'slight snow':
        case 'moderate snow':
        case 'heavy snow':
            bgGradient = 'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)';
            break;
        default:
            bgGradient = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
    }
    document.body.style.background = bgGradient;
}

// Helper: Convert WMO Code to Readable Text & Emoji
function getWeatherDetails(code, isDay) {
    const codes = {
        0: { desc: 'Clear sky', dayObj: '☀️', nightObj: '🌙' },
        1: { desc: 'Mainly clear', dayObj: '☀️', nightObj: '🌑' },
        2: { desc: 'Partly cloudy', dayObj: '⛅', nightObj: '☁️' },
        3: { desc: 'Overcast', dayObj: '☁️', nightObj: '☁️' },
        45: { desc: 'Fog', dayObj: '🌫️', nightObj: '🌫️' },
        48: { desc: 'Rime fog', dayObj: '🌫️', nightObj: '🌫️' },
        51: { desc: 'Light drizzle', dayObj: '🌧️', nightObj: '🌧️' },
        53: { desc: 'Moderate drizzle', dayObj: '🌧️', nightObj: '🌧️' },
        55: { desc: 'Dense drizzle', dayObj: '🌧️', nightObj: '🌧️' },
        61: { desc: 'Slight rain', dayObj: '🌦️', nightObj: '🌧️' },
        63: { desc: 'Moderate rain', dayObj: '🌧️', nightObj: '🌧️' },
        65: { desc: 'Heavy rain', dayObj: '🌧️', nightObj: '🌧️' },
        71: { desc: 'Slight snow', dayObj: '🌨️', nightObj: '🌨️' },
        73: { desc: 'Moderate snow', dayObj: '❄️', nightObj: '❄️' },
        75: { desc: 'Heavy snow', dayObj: '❄️', nightObj: '❄️' },
        95: { desc: 'Thunderstorm', dayObj: '⛈️', nightObj: '⛈️' },
    };

    const condition = codes[code] || { desc: 'Unknown', dayObj: '✨', nightObj: '✨' };
    return {
        description: condition.desc,
        emoji: isDay ? condition.dayObj : condition.nightObj
    };
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    cityInput.value = 'London';
    searchForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    cityInput.value = '';
});