// Global variables
let bedsData = {};
let acReadingsData = [];
let acBillsData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// AC room configuration
const AC_ROOMS = {
    room1: { name: 'Room 1 (Bottom)', hasAC: true, bedCount: 4 },
    room3: { name: 'Room 3 (Top)', hasAC: true, bedCount: 4 }
};

const AC_RATE_PER_UNIT = 10; // ₹10 per unit

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing AC management...');
    
    // Use shared authentication
    const authSuccess = await window.initializeProtectedPage();
    
    if (authSuccess) {
        // Authentication successful, load data
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('acSummary').style.display = 'grid';
        
        // Initialize month/year dropdowns
        initializeMonthDropdowns();
        
        await loadBedsData();
        await loadACReadingsData();
        await loadACBillsData();
        
        updateACSummary();
        displayACRooms();
        displayACHistory();
        
    } else {
        // Authentication failed, show error
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="loading-spinner" style="border-top-color: #dc3545;"></div>
            <p style="color: #dc3545;">Authentication failed. Redirecting...</p>
        `;
    }
});

// Initialize month dropdowns
function initializeMonthDropdowns() {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const readingMonthSelect = document.getElementById('readingMonth');
    const historyMonthSelect = document.getElementById('historyMonth');
    
    months.forEach((month, index) => {
        const option1 = new Option(month, index);
        const option2 = new Option(month, index);
        
        if (index === currentMonth) {
            option1.selected = true;
        }
        
        readingMonthSelect.add(option1);
        historyMonthSelect.add(option2);
    });
    
    // Set current year
    document.getElementById('readingYear').value = currentYear;
    
    // Set today's date
    document.getElementById('readingDate').value = new Date().toISOString().split('T')[0];
}

// Load beds data
async function loadBedsData() {
    try {
        const bedsRef = window.firestoreCollection(window.firebaseDB, 'beds');
        const snapshot = await window.firestoreGetDocs(bedsRef);
        
        bedsData = {};
        snapshot.forEach(doc => {
            bedsData[doc.id] = doc.data();
        });
        
        console.log('Beds data loaded:', bedsData);
    } catch (error) {
        console.error("Error loading beds data:", error);
    }
}

// Load AC readings data
async function loadACReadingsData() {
    try {
        const readingsRef = window.firestoreCollection(window.firebaseDB, 'ac-readings');
        const snapshot = await window.firestoreGetDocs(readingsRef);
        
        acReadingsData = [];
        snapshot.forEach(doc => {
            acReadingsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by date (newest first)
        acReadingsData.sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate));
        
        console.log('AC readings data loaded:', acReadingsData);
    } catch (error) {
        console.error("Error loading AC readings data:", error);
    }
}

// Load AC bills data
async function loadACBillsData() {
    try {
        const billsRef = window.firestoreCollection(window.firebaseDB, 'ac-bills');
        const snapshot = await window.firestoreGetDocs(billsRef);
        
        acBillsData = [];
        snapshot.forEach(doc => {
            acBillsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('AC bills data loaded:', acBillsData);
    } catch (error) {
        console.error("Error loading AC bills data:", error);
    }
}

// Update AC summary
function updateACSummary() {
    const currentMonthData = getCurrentMonthData();
    
    let totalACBill = 0;
    let pendingCollections = 0;
    let totalUnitsConsumed = 0;
    
    // Calculate from current month data
    Object.keys(AC_ROOMS).forEach(roomId => {
        const room = AC_ROOMS[roomId];
        if (currentMonthData[roomId]) {
            const roomData = currentMonthData[roomId];
            totalACBill += roomData.totalBill;
            totalUnitsConsumed += roomData.unitsConsumed;
            
            // Check if bills are collected
            const occupiedBeds = getOccupiedBedsInRoom(roomId);
            const collectedBills = getCollectedACBills(roomId, currentMonth, currentYear);
            const totalCollectible = roomData.totalBill;
            pendingCollections += (totalCollectible - collectedBills);
        }
    });
    
    // Update UI
    document.getElementById('totalACBill').textContent = `₹${totalACBill.toLocaleString()}`;
    document.getElementById('acBillDetails').textContent = 'Total AC charges for current month';
    
    document.getElementById('pendingACCollections').textContent = `₹${pendingCollections.toLocaleString()}`;
    document.getElementById('pendingDetails').textContent = 'AC bills not yet collected';
    
    document.getElementById('totalUnitsConsumed').textContent = totalUnitsConsumed.toLocaleString();
    document.getElementById('unitsDetails').textContent = 'Total units used this month';
}

// Get current month data
function getCurrentMonthData() {
    const currentReading = acReadingsData.find(reading => 
        reading.month === currentMonth && reading.year === currentYear
    );
    
    if (!currentReading) {
        return {};
    }
    
    const data = {};
    
    Object.keys(AC_ROOMS).forEach(roomId => {
        const room = AC_ROOMS[roomId];
        const previousReading = getPreviousReading(roomId, currentMonth, currentYear);
        const currentUnits = currentReading[`${roomId}Current`] || 0;
        const previousUnits = previousReading || 0;
        const unitsConsumed = Math.max(0, currentUnits - previousUnits);
        const occupiedBeds = getOccupiedBedsInRoom(roomId);
        const totalBill = unitsConsumed * AC_RATE_PER_UNIT;
        const perPersonBill = occupiedBeds > 0 ? totalBill / occupiedBeds : 0;
        
        data[roomId] = {
            unitsConsumed,
            totalBill,
            perPersonBill,
            occupiedBeds,
            currentUnits,
            previousUnits
        };
    });
    
    return data;
}

// Get previous reading for a room
function getPreviousReading(roomId, month, year) {
    // Find the most recent reading before current month
    const previousReadings = acReadingsData.filter(reading => {
        const readingDate = new Date(reading.year, reading.month);
        const currentDate = new Date(year, month);
        return readingDate < currentDate;
    });
    
    if (previousReadings.length === 0) {
        return 0; // No previous reading
    }
    
    // Sort by date descending and get the most recent
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

// Get collected AC bills for a room
function getCollectedACBills(roomId, month, year) {
    return acBillsData.filter(bill => 
        bill.roomId === roomId && 
        bill.month === month && 
        bill.year === year && 
        bill.status === 'collected'
    ).reduce((sum, bill) => sum + bill.amount, 0);
}

// Display AC rooms
function displayACRooms() {
    const acRoomsGrid = document.getElementById('acRoomsGrid');
    acRoomsGrid.innerHTML = '';
    
    const currentMonthData = getCurrentMonthData();
    
    Object.keys(AC_ROOMS).forEach(roomId => {
        const room = AC_ROOMS[roomId];
        const roomCard = createACRoomCard(roomId, room, currentMonthData[roomId]);
        acRoomsGrid.appendChild(roomCard);
    });
}

// Create AC room card
function createACRoomCard(roomId, room, monthData) {
    const div = document.createElement('div');
    div.className = 'ac-room-card ac-room';
    
    const occupiedBeds = getOccupiedBedsInRoom(roomId);
    const occupantNames = getOccupantNamesInRoom(roomId);
    
    let cardContent = `
        <div class="room-header">
            <div class="room-title">${room.name}</div>
            <div class="room-status ac">
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
    `;
    
    if (monthData) {
        cardContent += `
            <div class="room-reading">
                <div class="reading-title">Current Month Reading</div>
                <div class="reading-details">
                    <div class="reading-item">
                        <div class="reading-label">Previous</div>
                        <div class="reading-value">${monthData.previousUnits}</div>
                    </div>
                    <div class="reading-item">
                        <div class="reading-label">Current</div>
                        <div class="reading-value">${monthData.currentUnits}</div>
                    </div>
                </div>
            </div>
            
            <div class="room-bill">
                <div class="bill-title">AC Bill (${monthData.unitsConsumed} units × ₹${AC_RATE_PER_UNIT})</div>
                <div class="bill-amount">₹${monthData.totalBill.toLocaleString()}</div>
                <div class="bill-per-person">₹${monthData.perPersonBill.toFixed(0)} per person (${monthData.occupiedBeds} occupants)</div>
            </div>
        `;
    } else {
        cardContent += `
            <div class="room-reading">
                <div class="reading-title">No reading available for current month</div>
                <div class="reading-details">
                    <div class="reading-item">
                        <div class="reading-label">Status</div>
                        <div class="reading-value">Pending</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    div.innerHTML = cardContent;
    return div;
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

// Display AC history
function displayACHistory() {
    const historyList = document.getElementById('acHistoryList');
    historyList.innerHTML = '';
    
    if (acReadingsData.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <p>No AC readings found. Add monthly readings to see history.</p>
            </div>
        `;
        return;
    }
    
    // Group readings by month/year
    const groupedReadings = {};
    acReadingsData.forEach(reading => {
        const key = `${reading.year}-${reading.month}`;
        if (!groupedReadings[key]) {
            groupedReadings[key] = [];
        }
        groupedReadings[key].push(reading);
    });
    
    // Display grouped readings
    Object.keys(groupedReadings).sort().reverse().forEach(key => {
        const readings = groupedReadings[key];
        const firstReading = readings[0];
        const monthName = new Date(firstReading.year, firstReading.month).toLocaleDateString('en-IN', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        let historyContent = `
            <div class="history-header">
                <div class="history-month">${monthName}</div>
                <div class="history-date">Reading Date: ${formatDate(firstReading.readingDate)}</div>
            </div>
            <div class="history-rooms">
        `;
        
        Object.keys(AC_ROOMS).forEach(roomId => {
            const room = AC_ROOMS[roomId];
            const reading = readings.find(r => r[`${roomId}Current`] !== undefined);
            if (reading) {
                const previousReading = getPreviousReading(roomId, firstReading.month, firstReading.year);
                const currentUnits = reading[`${roomId}Current`] || 0;
                const unitsConsumed = Math.max(0, currentUnits - previousReading);
                const totalBill = unitsConsumed * AC_RATE_PER_UNIT;
                
                historyContent += `
                    <div class="history-room">
                        <div class="history-room-title">${room.name}</div>
                        <div class="history-room-details">
                            Previous: ${previousReading} units<br>
                            Current: ${currentUnits} units<br>
                            Consumed: ${unitsConsumed} units<br>
                            Bill: ₹${totalBill.toLocaleString()}
                        </div>
                    </div>
                `;
            }
        });
        
        historyContent += `
            </div>
        `;
        
        historyItem.innerHTML = historyContent;
        historyList.appendChild(historyItem);
    });
}

// Filter AC rooms
function filterACRooms() {
    const filter = document.getElementById('roomFilter').value;
    const cards = document.querySelectorAll('.ac-room-card');
    
    cards.forEach(card => {
        // Since all rooms are AC rooms now, just show all
        card.style.display = 'block';
    });
}

// Filter AC history
function filterACHistory() {
    const monthFilter = document.getElementById('historyMonth').value;
    const roomFilter = document.getElementById('historyRoom').value;
    
    // This would filter the history display
    // Implementation depends on specific filtering requirements
    displayACHistory();
}

// Show add reading modal
function showAddReadingModal() {
    const modal = document.getElementById('addReadingModal');
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('addReadingForm').reset();
    
    // Set default values
    document.getElementById('readingMonth').value = currentMonth;
    document.getElementById('readingYear').value = currentYear;
    document.getElementById('readingDate').value = new Date().toISOString().split('T')[0];
    
    // Load previous readings
    loadPreviousReadings();
}

// Load previous readings
function loadPreviousReadings() {
    Object.keys(AC_ROOMS).forEach(roomId => {
        const previousReading = getPreviousReading(roomId, currentMonth, currentYear);
        document.getElementById(`${roomId}Previous`).value = previousReading;
    });
}

// Calculate room units
function calculateRoomUnits(roomId) {
    const previousInput = document.getElementById(`${roomId}Previous`);
    const currentInput = document.getElementById(`${roomId}Current`);
    const unitsInput = document.getElementById(`${roomId}Units`);
    
    const previous = parseFloat(previousInput.value) || 0;
    const current = parseFloat(currentInput.value) || 0;
    const units = Math.max(0, current - previous);
    
    unitsInput.value = units;
}

// Close add reading modal
function closeAddReadingModal() {
    document.getElementById('addReadingModal').style.display = 'none';
}

// Save AC reading
async function saveACReading(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const readingData = {
        month: parseInt(formData.get('month')),
        year: parseInt(formData.get('year')),
        readingDate: formData.get('readingDate'),
        notes: formData.get('notes') || '',
        createdAt: new Date().toISOString()
    };
    
    // Add room readings
    Object.keys(AC_ROOMS).forEach(roomId => {
        readingData[`${roomId}Previous`] = parseFloat(formData.get(`${roomId}Previous`)) || 0;
        readingData[`${roomId}Current`] = parseFloat(formData.get(`${roomId}Current`)) || 0;
        readingData[`${roomId}Units`] = parseFloat(formData.get(`${roomId}Units`)) || 0;
    });
    
    try {
        // Generate unique ID
        const readingId = `ac_reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Save to Firestore
        await window.firestoreSetDoc(window.firestoreDoc(window.firebaseDB, 'ac-readings', readingId), readingData);
        
        // Add to local data
        acReadingsData.push({...readingData, id: readingId});
        
        // Sort by date
        acReadingsData.sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate));
        
        // Create AC bills for occupied rooms
        await createACBillsForReading(readingData, readingId);
        
        // Update UI
        updateACSummary();
        displayACRooms();
        displayACHistory();
        
        // Close modal
        closeAddReadingModal();
        
        // Show success message
        alert('AC reading saved successfully!');
        
    } catch (error) {
        console.error('Error saving AC reading:', error);
        alert('Failed to save AC reading. Please try again.');
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

// Create AC bills for reading
async function createACBillsForReading(readingData, readingId) {
    try {
        Object.keys(AC_ROOMS).forEach(async (roomId) => {
            const previousReading = getPreviousReading(roomId, readingData.month, readingData.year);
            const currentUnits = readingData[`${roomId}Current`] || 0;
            const unitsConsumed = Math.max(0, currentUnits - previousReading);
            
            if (unitsConsumed > 0) {
                const occupiedBeds = getOccupiedBedsInRoom(roomId);
                const totalBill = unitsConsumed * AC_RATE_PER_UNIT;
                const perPersonBill = occupiedBeds > 0 ? totalBill / occupiedBeds : 0;
                
                // Create individual AC bills for each occupied bed
                Object.keys(bedsData).forEach(async (bedId) => {
                    const bed = bedsData[bedId];
                    if (bed.room === roomId && bed.isOccupied) {
                        const acBillData = {
                            readingId: readingId,
                            roomId: roomId,
                            roomName: AC_ROOMS[roomId].name,
                            bedId: bedId,
                            occupantName: bed.occupantName,
                            occupantPhone: bed.occupantPhone,
                            month: readingData.month,
                            year: readingData.year,
                            unitsConsumed: unitsConsumed,
                            totalBill: totalBill,
                            perPersonBill: perPersonBill,
                            amount: perPersonBill,
                            status: 'pending',
                            createdAt: new Date().toISOString()
                        };
                        
                        const acBillId = `ac_bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Save to Firestore
                        await window.firestoreSetDoc(window.firestoreDoc(window.firebaseDB, 'ac-bills', acBillId), acBillData);
                        
                        // Add to local data
                        acBillsData.push({...acBillData, id: acBillId});
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error creating AC bills:', error);
    }
}

// Sign out is handled by shared-auth.js
