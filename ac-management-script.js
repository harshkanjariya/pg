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

// Get current month data with fair calculation
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
        const totalBill = unitsConsumed * AC_RATE_PER_UNIT;
        
        // Get fair calculation data
        const fairCalculation = calculateFairACDistribution(roomId, currentMonth, currentYear, totalBill);
        
        data[roomId] = {
            unitsConsumed,
            totalBill,
            perPersonBill: fairCalculation.averagePerPerson, // Keep for backward compatibility
            occupiedBeds: fairCalculation.totalOccupants,
            currentUnits,
            previousUnits,
            fairCalculation: fairCalculation // New detailed calculation
        };
    });
    
    return data;
}

// Calculate fair AC distribution based on occupancy days
function calculateFairACDistribution(roomId, month, year, totalBill) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // Last day of month
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
        averagePerPerson: occupants.length > 0 ? totalBill / occupants.length : 0, // For backward compatibility
        fairShares: fairShares,
        dailyRatePerUnit: totalOccupancyDays > 0 ? totalBill / totalOccupancyDays : 0
    };
}

// Calculate how many days an occupant stayed in a specific month
function calculateOccupancyDaysInMonth(bed, month, year) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // Last day of month
    
    let occupancyStart, occupancyEnd;
    
    // Determine occupancy start date
    if (bed.checkInDate) {
        occupancyStart = new Date(bed.checkInDate);
    } else {
        // If no check-in date, assume they were there from start of month
        occupancyStart = monthStart;
    }
    
    // Determine occupancy end date
    if (bed.checkOutDate && bed.checkOutDate !== '') {
        occupancyEnd = new Date(bed.checkOutDate);
    } else {
        // If no checkout date, assume they're still there (permanent)
        occupancyEnd = monthEnd;
    }
    
    // Adjust dates to fit within the month
    const effectiveStart = occupancyStart < monthStart ? monthStart : occupancyStart;
    const effectiveEnd = occupancyEnd > monthEnd ? monthEnd : occupancyEnd;
    
    // Calculate days
    if (effectiveStart > effectiveEnd) {
        return 0; // No overlap with the month
    }
    
    const timeDiff = effectiveEnd.getTime() - effectiveStart.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    
    return Math.max(0, daysDiff);
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
            
            <div class="fair-calculation">
                <div class="calculation-title">📊 Fair Calculation Breakdown</div>
                <div class="calculation-summary">
                    <div class="summary-row">
                        <span class="summary-label">Total Occupancy Days:</span>
                        <span class="summary-value">${monthData.fairCalculation.totalOccupancyDays} days</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Daily Rate:</span>
                        <span class="summary-value">₹${monthData.fairCalculation.dailyRatePerUnit.toFixed(2)}/day</span>
                    </div>
                </div>
                <div class="occupant-breakdown">
                    ${monthData.fairCalculation.fairShares.map(occupant => `
                        <div class="occupant-item">
                            <div class="occupant-name">${occupant.occupantName}</div>
                            <div class="occupant-details">
                                <span class="occupancy-days">${occupant.occupancyDays} days</span>
                                <span class="fair-share">₹${occupant.fairShare.toFixed(0)}</span>
                                <span class="occupancy-period">${formatOccupancyPeriod(occupant.checkInDate, occupant.checkOutDate, occupant.isPermanent)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
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
                <div class="history-actions">
                    <button onclick="editHistoryReading('${firstReading.id}')" class="btn-edit-history" title="Edit this month's readings">
                        ✏️ Edit
                    </button>
                </div>
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

// Create AC bills for reading using fair calculation
async function createACBillsForReading(readingData, readingId) {
    try {
        Object.keys(AC_ROOMS).forEach(async (roomId) => {
            const previousReading = getPreviousReading(roomId, readingData.month, readingData.year);
            const currentUnits = readingData[`${roomId}Current`] || 0;
            const unitsConsumed = Math.max(0, currentUnits - previousReading);
            
            if (unitsConsumed > 0) {
                const totalBill = unitsConsumed * AC_RATE_PER_UNIT;
                
                // Get fair calculation for this room
                const fairCalculation = calculateFairACDistribution(roomId, readingData.month, readingData.year, totalBill);
                
                // Create individual AC bills for each occupant based on fair share
                fairCalculation.fairShares.forEach(async (occupant) => {
                    const acBillData = {
                        readingId: readingId,
                        roomId: roomId,
                        roomName: AC_ROOMS[roomId].name,
                        bedId: occupant.bedId,
                        occupantName: occupant.occupantName,
                        occupantPhone: bedsData[occupant.bedId].occupantPhone,
                        month: readingData.month,
                        year: readingData.year,
                        unitsConsumed: unitsConsumed,
                        totalBill: totalBill,
                        occupancyDays: occupant.occupancyDays,
                        fairShare: occupant.fairShare,
                        dailyRate: occupant.dailyRate,
                        isPermanent: occupant.isPermanent,
                        checkInDate: occupant.checkInDate,
                        checkOutDate: occupant.checkOutDate,
                        amount: occupant.fairShare, // Use fair share as the amount
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    
                    const acBillId = `ac_bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Save to Firestore
                    await window.firestoreSetDoc(window.firestoreDoc(window.firebaseDB, 'ac-bills', acBillId), acBillData);
                    
                    // Add to local data
                    acBillsData.push({...acBillData, id: acBillId});
                });
            }
        });
    } catch (error) {
        console.error('Error creating AC bills:', error);
    }
}

// Edit history reading
function editHistoryReading(readingId) {
    const reading = acReadingsData.find(r => r.id === readingId);
    if (!reading) {
        alert('Reading not found!');
        return;
    }
    
    // Show confirmation dialog
    const monthName = new Date(reading.year, reading.month).toLocaleDateString('en-IN', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    if (!confirm(`Are you sure you want to edit the AC readings for ${monthName}?\n\nThis will recalculate all AC bills for this month.`)) {
        return;
    }
    
    showEditReadingModal(reading);
}

// Show edit reading modal
function showEditReadingModal(reading) {
    const modal = document.getElementById('editReadingModal');
    if (!modal) {
        createEditReadingModal();
    }
    
    // Populate form with existing data
    document.getElementById('editReadingMonth').value = reading.month;
    document.getElementById('editReadingYear').value = reading.year;
    document.getElementById('editReadingDate').value = reading.readingDate;
    document.getElementById('editReadingNotes').value = reading.notes || '';
    
    // Populate room readings
    Object.keys(AC_ROOMS).forEach(roomId => {
        document.getElementById(`edit${roomId}Previous`).value = reading[`${roomId}Previous`] || 0;
        document.getElementById(`edit${roomId}Current`).value = reading[`${roomId}Current`] || 0;
        document.getElementById(`edit${roomId}Units`).value = reading[`${roomId}Units`] || 0;
    });
    
    // Store reading ID for saving
    document.getElementById('editReadingModal').setAttribute('data-reading-id', reading.id);
    
    // Show modal
    document.getElementById('editReadingModal').style.display = 'flex';
}

// Create edit reading modal
function createEditReadingModal() {
    const modalHTML = `
        <div id="editReadingModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✏️ Edit AC Reading</h3>
                    <span class="close" onclick="closeEditReadingModal()">&times;</span>
                </div>
                <form id="editReadingForm" onsubmit="saveEditedReading(event)">
                    <div class="form-group">
                        <label for="editReadingMonth">Month:</label>
                        <select id="editReadingMonth" name="month" required>
                            <option value="">Select Month</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="editReadingYear">Year:</label>
                        <input type="number" id="editReadingYear" name="year" min="2024" max="2030" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editReadingDate">Reading Date:</label>
                        <input type="date" id="editReadingDate" name="readingDate" required>
                    </div>
                    
                    <div class="ac-readings-section">
                        <h4>AC Room Readings</h4>
                        <div class="reading-inputs">
                            <div class="reading-input">
                                <label for="editroom1Previous">Room 1 (Bottom) - Previous Reading:</label>
                                <input type="number" id="editroom1Previous" name="room1Previous" min="0" step="1">
                            </div>
                            <div class="reading-input">
                                <label for="editroom1Current">Room 1 (Bottom) - Current Reading:</label>
                                <input type="number" id="editroom1Current" name="room1Current" min="0" step="1" onchange="calculateEditRoomUnits('room1')">
                            </div>
                            <div class="reading-input">
                                <label for="editroom1Units">Room 1 Units Consumed:</label>
                                <input type="number" id="editroom1Units" name="room1Units" readonly>
                            </div>
                        </div>
                        
                        <div class="reading-inputs">
                            <div class="reading-input">
                                <label for="editroom3Previous">Room 3 (Top) - Previous Reading:</label>
                                <input type="number" id="editroom3Previous" name="room3Previous" min="0" step="1">
                            </div>
                            <div class="reading-input">
                                <label for="editroom3Current">Room 3 (Top) - Current Reading:</label>
                                <input type="number" id="editroom3Current" name="room3Current" min="0" step="1" onchange="calculateEditRoomUnits('room3')">
                            </div>
                            <div class="reading-input">
                                <label for="editroom3Units">Room 3 Units Consumed:</label>
                                <input type="number" id="editroom3Units" name="room3Units" readonly>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editReadingNotes">Notes (Optional):</label>
                        <textarea id="editReadingNotes" name="notes" rows="3" placeholder="Any additional notes about the readings..."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" onclick="closeEditReadingModal()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize month dropdown
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthSelect = document.getElementById('editReadingMonth');
    months.forEach((month, index) => {
        const option = new Option(month, index);
        monthSelect.add(option);
    });
}

// Calculate room units for edit modal
function calculateEditRoomUnits(roomId) {
    const previousInput = document.getElementById(`edit${roomId}Previous`);
    const currentInput = document.getElementById(`edit${roomId}Current`);
    const unitsInput = document.getElementById(`edit${roomId}Units`);
    
    const previous = parseFloat(previousInput.value) || 0;
    const current = parseFloat(currentInput.value) || 0;
    const units = Math.max(0, current - previous);
    
    unitsInput.value = units;
}

// Close edit reading modal
function closeEditReadingModal() {
    document.getElementById('editReadingModal').style.display = 'none';
}

// Save edited reading
async function saveEditedReading(event) {
    event.preventDefault();
    
    const readingId = document.getElementById('editReadingModal').getAttribute('data-reading-id');
    if (!readingId) {
        alert('Error: Reading ID not found!');
        return;
    }
    
    const formData = new FormData(event.target);
    const readingData = {
        month: parseInt(formData.get('month')),
        year: parseInt(formData.get('year')),
        readingDate: formData.get('readingDate'),
        notes: formData.get('notes') || '',
        updatedAt: new Date().toISOString()
    };
    
    // Add room readings
    Object.keys(AC_ROOMS).forEach(roomId => {
        readingData[`${roomId}Previous`] = parseFloat(formData.get(`${roomId}Previous`)) || 0;
        readingData[`${roomId}Current`] = parseFloat(formData.get(`${roomId}Current`)) || 0;
        readingData[`${roomId}Units`] = parseFloat(formData.get(`${roomId}Units`)) || 0;
    });
    
    try {
        // Show loading
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        // Update in Firestore
        await window.firestoreSetDoc(window.firestoreDoc(window.firebaseDB, 'ac-readings', readingId), readingData);
        
        // Update local data
        const readingIndex = acReadingsData.findIndex(r => r.id === readingId);
        if (readingIndex !== -1) {
            acReadingsData[readingIndex] = {...acReadingsData[readingIndex], ...readingData};
        }
        
        // Delete old AC bills for this reading
        await deleteACBillsForReading(readingId);
        
        // Create new AC bills with updated readings
        await createACBillsForReading(readingData, readingId);
        
        // Update UI
        updateACSummary();
        displayACRooms();
        displayACHistory();
        
        // Close modal
        closeEditReadingModal();
        
        // Show success message
        alert('AC reading updated successfully! All bills have been recalculated.');
        
    } catch (error) {
        console.error('Error updating AC reading:', error);
        alert('Failed to update AC reading. Please try again.');
        
        // Reset button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

// Delete AC bills for a specific reading
async function deleteACBillsForReading(readingId) {
    try {
        const billsToDelete = acBillsData.filter(bill => bill.readingId === readingId);
        
        for (const bill of billsToDelete) {
            await window.firestoreDeleteDoc(window.firestoreDoc(window.firebaseDB, 'ac-bills', bill.id));
        }
        
        // Update local data
        acBillsData = acBillsData.filter(bill => bill.readingId !== readingId);
        
    } catch (error) {
        console.error('Error deleting AC bills:', error);
        throw error;
    }
}

// Sign out is handled by shared-auth.js
