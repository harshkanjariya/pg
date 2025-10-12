// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variables
let bedsData = {};
let acReadingsData = [];
let firebaseDB = null;

// AC room configuration
const AC_ROOMS = {
    room1: { name: 'Room 1 (Bottom)', hasAC: true, bedCount: 4 },
    room3: { name: 'Room 3 (Top)', hasAC: true, bedCount: 4 }
};

const AC_RATE_PER_UNIT = 10; // ₹10 per unit

// Valid access key (you can change this or store it in Firestore)
const VALID_ACCESS_KEY = 'comfort-stays-2024'; // Change this to your secure key

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('AC Preview page loaded');
    
    // Parse query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accessKey = urlParams.get('key');
    const roomId = urlParams.get('room');
    const month = parseInt(urlParams.get('month'));
    const year = parseInt(urlParams.get('year'));
    
    // Validate access key
    if (!accessKey || accessKey !== VALID_ACCESS_KEY) {
        showError('Invalid or missing access key. Please check your link.');
        return;
    }
    
    // Validate parameters
    if (!roomId || isNaN(month) || isNaN(year)) {
        showError('Invalid parameters. Please check your link.');
        return;
    }
    
    // Validate room
    if (!AC_ROOMS[roomId]) {
        showError('Invalid room specified. Please check your link.');
        return;
    }
    
    try {
        // Initialize Firebase without authentication
        await initializeFirebaseForPreview();
        
        // Load data
        await loadBedsData();
        await loadACReadingsData();
        
        // Display the AC bill card
        displayACBillCard(roomId, month, year);
        
        // Hide loading, show content
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('previewContent').style.display = 'block';
        
        // Set generated timestamp
        document.getElementById('generatedTime').textContent = `Generated on ${new Date().toLocaleString('en-IN')}`;
        
    } catch (error) {
        console.error('Error loading AC bill:', error);
        showError('Failed to load AC bill details. Please try again later.');
    }
});

// Initialize Firebase for preview (no authentication required)
async function initializeFirebaseForPreview() {
    try {
        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCvIaT8x5lKq6yA5YW8OUyn_uC_uJLeuZE",
            authDomain: "comfort-stays.firebaseapp.com",
            projectId: "comfort-stays",
            storageBucket: "comfort-stays.firebasestorage.app",
            messagingSenderId: "187885851533",
            appId: "1:187885851533:web:5f82713f2ddd8fe889e3c4",
            measurementId: "G-KYZ4HX31C9"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        firebaseDB = getFirestore(app);
        
        console.log('Firebase initialized for preview (read-only mode)');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        throw new Error('Failed to initialize Firebase. Please check your internet connection.');
    }
}

// Load beds data
async function loadBedsData() {
    try {
        const bedsRef = collection(firebaseDB, 'beds');
        const snapshot = await getDocs(bedsRef);
        
        bedsData = {};
        snapshot.forEach(doc => {
            bedsData[doc.id] = doc.data();
        });
        
        console.log('Beds data loaded:', bedsData);
    } catch (error) {
        console.error("Error loading beds data:", error);
        throw error;
    }
}

// Load AC readings data
async function loadACReadingsData() {
    try {
        const readingsRef = collection(firebaseDB, 'ac-readings');
        const snapshot = await getDocs(readingsRef);
        
        acReadingsData = [];
        snapshot.forEach(doc => {
            acReadingsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('AC readings data loaded:', acReadingsData);
    } catch (error) {
        console.error("Error loading AC readings data:", error);
        throw error;
    }
}

// Display AC bill card
function displayACBillCard(roomId, month, year) {
    const room = AC_ROOMS[roomId];
    const monthData = getMonthData(roomId, month, year);
    
    if (!monthData) {
        showError(`No AC reading found for ${room.name} in ${getMonthName(month)} ${year}.`);
        return;
    }
    
    const acRoomCard = document.getElementById('acRoomCard');
    const occupiedBeds = getOccupiedBedsInRoom(roomId);
    const occupantNames = getOccupantNamesInRoom(roomId);
    
    let cardContent = `
        <div class="room-header">
            <div class="room-title">${room.name}</div>
            <div class="room-status">
                AC Room
            </div>
        </div>
        
        <div class="room-occupants">
            <div class="occupant-count">${occupiedBeds}/${room.bedCount} beds occupied</div>
            <div class="occupant-list">
    `;
    
    occupantNames.forEach(name => {
        cardContent += `<span class="occupant-tag">${name}</span>`;
    });
    
    cardContent += `
            </div>
        </div>
        
        <div class="room-reading">
            <div class="reading-title">${getMonthName(month)} ${year} Reading</div>
            <div class="reading-details">
                <div class="reading-item">
                    <div class="reading-label">Previous</div>
                    <div class="reading-value">${monthData.previousUnits.toFixed(1)}</div>
                </div>
                <div class="reading-item">
                    <div class="reading-label">Current</div>
                    <div class="reading-value">${monthData.currentUnits.toFixed(1)}</div>
                </div>
            </div>
        </div>
        
        <div class="room-bill">
            <div class="bill-title">AC Bill (${monthData.unitsConsumed.toFixed(1)} units × ₹${AC_RATE_PER_UNIT})</div>
            <div class="bill-amount">₹${monthData.totalBill.toFixed(1)}</div>
            <div class="bill-per-person">₹${monthData.perPersonBill.toFixed(1)} per person (${monthData.occupiedBeds} occupants)</div>
        </div>
        
        <div class="fair-calculation">
            <div class="calculation-title">📊 Fair Calculation Breakdown</div>
            <div class="calculation-summary">
                <div class="summary-row">
                    <span class="summary-label">Total Occupancy Days:</span>
                    <span class="summary-value">${monthData.fairCalculation.totalOccupancyDays} days</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Daily Rate:</span>
                    <span class="summary-value">₹${monthData.fairCalculation.dailyRatePerUnit.toFixed(1)}/day</span>
                </div>
            </div>
            <div class="occupant-breakdown">
                ${monthData.fairCalculation.fairShares.map(occupant => `
                    <div class="occupant-item">
                        <div class="occupant-name">${occupant.occupantName}</div>
                        <div class="occupant-details">
                            <span class="occupancy-days">${occupant.occupancyDays} days</span>
                            <span class="fair-share">₹${occupant.fairShare.toFixed(1)}</span>
                            <span class="occupancy-period">${formatOccupancyPeriod(occupant.checkInDate, occupant.checkOutDate, occupant.isPermanent)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    acRoomCard.innerHTML = cardContent;
}

// Get month data with fair calculation
function getMonthData(roomId, month, year) {
    const currentReading = acReadingsData.find(reading => 
        reading.month === month && reading.year === year
    );
    
    if (!currentReading) {
        return null;
    }
    
    const previousReading = getPreviousReading(roomId, month, year);
    const currentUnits = currentReading[`${roomId}Current`] || 0;
    const previousUnits = previousReading || 0;
    const unitsConsumed = Math.max(0, currentUnits - previousUnits);
    const totalBill = unitsConsumed * AC_RATE_PER_UNIT;
    
    // Get fair calculation data
    const fairCalculation = calculateFairACDistribution(roomId, month, year, totalBill);
    
    return {
        unitsConsumed,
        totalBill,
        perPersonBill: fairCalculation.averagePerPerson,
        occupiedBeds: fairCalculation.totalOccupants,
        currentUnits,
        previousUnits,
        fairCalculation: fairCalculation
    };
}

// Calculate fair AC distribution based on occupancy days
function calculateFairACDistribution(roomId, month, year, totalBill) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const totalDaysInMonth = monthEnd.getDate();
    
    const occupants = [];
    let totalOccupancyDays = 0;
    
    // Get all beds in this room
    Object.keys(bedsData).forEach(bedId => {
        const bed = bedsData[bedId];
        if (bed.room === roomId && bed.isOccupied) {
            const occupancyDays = calculateOccupancyDaysInMonth(bed, month, year);
            
            if (occupancyDays > 0) {
                occupants.push({
                    bedId: bedId,
                    occupantName: bed.occupantName,
                    checkInDate: bed.checkInDate,
                    checkOutDate: bed.checkOutDate,
                    occupancyDays: occupancyDays,
                    isPermanent: !bed.checkOutDate || bed.checkOutDate === ''
                });
                totalOccupancyDays += occupancyDays;
            }
        }
    });
    
    // Calculate fair share for each occupant
    const fairShares = occupants.map(occupant => {
        const fairShare = totalOccupancyDays > 0 ? 
            (occupant.occupancyDays / totalOccupancyDays) * totalBill : 0;
        
        return {
            ...occupant,
            fairShare: fairShare,
            dailyRate: occupant.occupancyDays > 0 ? fairShare / occupant.occupancyDays : 0
        };
    });
    
    return {
        totalOccupants: occupants.length,
        totalOccupancyDays: totalOccupancyDays,
        totalDaysInMonth: totalDaysInMonth,
        averagePerPerson: occupants.length > 0 ? totalBill / occupants.length : 0,
        fairShares: fairShares,
        dailyRatePerUnit: totalOccupancyDays > 0 ? totalBill / totalOccupancyDays : 0
    };
}

// Calculate how many days an occupant stayed in a specific month
function calculateOccupancyDaysInMonth(bed, month, year) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    let occupancyStart, occupancyEnd;
    
    // Determine occupancy start date
    if (bed.checkInDate) {
        occupancyStart = new Date(bed.checkInDate);
    } else {
        occupancyStart = monthStart;
    }
    
    // Determine occupancy end date
    if (bed.checkOutDate && bed.checkOutDate !== '') {
        occupancyEnd = new Date(bed.checkOutDate);
    } else {
        occupancyEnd = monthEnd;
    }
    
    // Adjust dates to fit within the month
    const effectiveStart = occupancyStart < monthStart ? monthStart : occupancyStart;
    const effectiveEnd = occupancyEnd > monthEnd ? monthEnd : occupancyEnd;
    
    // Calculate days
    if (effectiveStart > effectiveEnd) {
        return 0;
    }
    
    const timeDiff = effectiveEnd.getTime() - effectiveStart.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(0, daysDiff);
}

// Get previous reading for a room
function getPreviousReading(roomId, month, year) {
    const previousReadings = acReadingsData.filter(reading => {
        const readingDate = new Date(reading.year, reading.month);
        const currentDate = new Date(year, month);
        return readingDate < currentDate;
    });
    
    if (previousReadings.length === 0) {
        return 0;
    }
    
    previousReadings.sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate));
    return previousReadings[0][`${roomId}Current`] || 0;
}

// Get occupied beds in a room
function getOccupiedBedsInRoom(roomId) {
    let count = 0;
    Object.keys(bedsData).forEach(bedId => {
        const bed = bedsData[bedId];
        if (bed.room === roomId && bed.isOccupied) {
            count++;
        }
    });
    return count;
}

// Get occupant names in a room
function getOccupantNamesInRoom(roomId) {
    const names = [];
    Object.keys(bedsData).forEach(bedId => {
        const bed = bedsData[bedId];
        if (bed.room === roomId && bed.isOccupied && bed.occupantName) {
            names.push(bed.occupantName);
        }
    });
    return names;
}

// Format occupancy period for display
function formatOccupancyPeriod(checkInDate, checkOutDate, isPermanent) {
    if (isPermanent) {
        return `Since ${formatDate(checkInDate)} (Permanent)`;
    } else if (checkInDate && checkOutDate) {
        return `${formatDate(checkInDate)} - ${formatDate(checkOutDate)}`;
    } else if (checkInDate) {
        return `Since ${formatDate(checkInDate)}`;
    } else {
        return 'Full month';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Get month name
function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
}

// Show error
function showError(message) {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('previewContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorText').textContent = message;
}

