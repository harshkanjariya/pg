// Manage Page JavaScript
let currentBed = null;
let bedsData = {};
let transactionsData = [];
let currentMonthTransactions = [];
let selectedFilesForBeds = {};

// Initialize the page
document.addEventListener("DOMContentLoaded", async function() {
    // Use shared authentication
    const authSuccess = await window.initializeProtectedPage();
    
    if (authSuccess) {
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        console.log('Authentication successful, initializing timeline...');
        
        // Load bed data and transactions
        await loadBedsData();
        await loadTransactionsData();
        
        // Show apartment layout
        const apartmentLayout = document.getElementById('apartmentLayout');
        if (apartmentLayout) {
            apartmentLayout.style.display = 'block';
            console.log('Apartment layout shown');
        }
        
        // Update bed display and transaction indicators
        updateBedDisplay();
        updateTransactionIndicators();
        console.log('Bed display and transaction indicators updated');
        
        // Authentication successful, initialize timeline
        initializeTimeline();
        
        console.log('Timeline initialized, page should be visible now');
        
        // Debug: Check if main content is visible
        const mainContent = document.querySelector('.manage-main');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
        } else {
            console.error('Main content not found!');
        }
    } else {
        // Authentication failed, show error
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="loading-spinner" style="border-top-color: #dc3545;"></div>
            <p style="color: #dc3545;">Authentication failed. Redirecting...</p>
        `;
    }
});

// Authentication is now handled by shared-auth.js

// Check for automatic checkouts
function checkAutomaticCheckouts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    let autoCheckouts = [];
    
    Object.keys(bedsData).forEach(bedId => {
        const bedData = bedsData[bedId];
        
        if (bedData.isOccupied && bedData.checkOutDate) {
            const checkoutDate = new Date(bedData.checkOutDate);
            checkoutDate.setHours(0, 0, 0, 0);
            
            // If checkout date has passed
            if (checkoutDate < today) {
                autoCheckouts.push({
                    bedId: bedId,
                    occupantName: bedData.occupantName,
                    room: bedData.room,
                    bedNumber: bedData.bedNumber,
                    checkoutDate: bedData.checkOutDate
                });
            }
        }
    });
    
    if (autoCheckouts.length > 0) {
        // Show notification about automatic checkouts
        const checkoutList = autoCheckouts.map(checkout => 
            `${checkout.occupantName} (${checkout.room.charAt(0).toUpperCase() + checkout.room.slice(1)} Bed ${checkout.bedNumber})`
        ).join('\n');
        
        const message = `Automatic checkout detected for ${autoCheckouts.length} occupant(s):\n\n${checkoutList}\n\nThese beds will be marked as available.`;
        
        if (confirm(message + '\n\nProceed with automatic checkout?')) {
            performAutomaticCheckouts(autoCheckouts);
        }
    }
}

async function performAutomaticCheckouts(autoCheckouts) {
    try {
        for (const checkout of autoCheckouts) {
            const bedData = bedsData[checkout.bedId];
            
            // Move to history before clearing the bed
            await moveToHistory(bedData, checkout.checkoutDate);
            
            // Clear the current bed
            const emptyBedData = {
                ...bedData,
                isOccupied: false,
                occupantName: "",
                occupantPhone: "",
                occupantEmail: "",
                deposit: 0,
                checkInDate: "",
                checkOutDate: "",
                expectedCollectionDate: null,
                notes: ""
            };
            
            // Update Firestore
            const bedRef = window.firestoreDoc(window.firebaseDB, "beds", checkout.bedId);
            await window.firestoreSetDoc(bedRef, emptyBedData);
            
            // Update local data
            bedsData[checkout.bedId] = emptyBedData;
        }
        
        // Update display
        updateBedDisplay();
        
        alert(`Successfully processed ${autoCheckouts.length} automatic checkout(s)! Data moved to history.`);
        
    } catch (error) {
        console.error("Error processing automatic checkouts:", error);
        alert("Error processing automatic checkouts. Please try again.");
    }
}

async function moveToHistory(bedData, actualCheckoutDate) {
    try {
        const historyData = {
            ...bedData,
            actualCheckoutDate: actualCheckoutDate,
            movedToHistoryDate: new Date().toISOString(),
            historyId: `${bedData.room}_bed${bedData.bedNumber}_${Date.now()}`
        };
        
        // Save to history collection
        const historyRef = window.firestoreDoc(window.firebaseDB, "history", historyData.historyId);
        await window.firestoreSetDoc(historyRef, historyData);
        
    } catch (error) {
        console.error("Error moving to history:", error);
        throw error;
    }
}

// Load transactions data from Firestore
async function loadTransactionsData() {
    try {
        const transactionsRef = window.firestoreCollection(window.firebaseDB, 'transactions');
        const snapshot = await window.firestoreGetDocs(transactionsRef);
        
        transactionsData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            transactionsData.push({
                id: doc.id,
                ...data
            });
        });
        
        updateCurrentMonthTransactions();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Update current month transactions based on current date
function updateCurrentMonthTransactions() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    currentMonthTransactions = transactionsData.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear &&
               transaction.type === 'collection';
    });
}

// Check collection status for bed (returns: 'collected', 'pending', 'overdue', or 'not_collected')
function getCollectionStatus(bedId) {
    const bedData = bedsData[bedId];
    if (!bedData || !bedData.isOccupied) {
        return 'not_applicable';
    }
    
    // PRIORITY 1: Check for current month collection first - if collected, always show green tick
    const hasCurrentMonth = currentMonthTransactions.some(transaction => transaction.bedId === bedId);
    
    if (hasCurrentMonth) {
        return 'collected';
    }
    
    // PRIORITY 2: Fallback for temporary occupants - if they have any collection, show green tick
    if (isTemporaryOccupant(bedData)) {
        return hasAnyCollectionTransaction(bedId) ? 'collected' : 'not_collected';
    }
    
    // PRIORITY 3: For permanent occupants, check expected collection date only if NOT collected
    if (bedData.expectedCollectionDate) {
        const expectedDatePassed = hasExpectedCollectionDatePassed(bedData);
        return expectedDatePassed ? 'overdue' : 'pending';
    }
    
    // No expected date set, use normal logic
    return 'not_collected';
}

// Legacy function for backward compatibility
function hasCurrentMonthCollection(bedId) {
    const status = getCollectionStatus(bedId);
    return status === 'collected';
}

// Check if occupant is temporary (reuses getBedStatus logic for consistency)
function isTemporaryOccupant(bedData) {
    return getBedStatus(bedData) === 'temporary';
}

// Check if bed has any collection transaction (not just current month)
function hasAnyCollectionTransaction(bedId) {
    return transactionsData.some(transaction => 
        transaction.bedId === bedId && 
        transaction.type === 'collection'
    );
}

// Check if expected collection date has passed for current month
function hasExpectedCollectionDatePassed(bedData) {
    if (!bedData.expectedCollectionDate) {
        return false; // No expected date set, use normal logic
    }
    
    const today = new Date();
    const currentDay = today.getDate();
    const expectedDay = parseInt(bedData.expectedCollectionDate);
    
    return currentDay > expectedDay;
}

// Update transaction indicators on all beds
function updateTransactionIndicators() {
    const beds = document.querySelectorAll('.bed');
    
    beds.forEach(bed => {
        const room = bed.getAttribute('data-room');
        const bedNumber = bed.getAttribute('data-bed');
        const bedId = `${room}_bed${bedNumber}`;
        
        // Remove existing indicator
        const existingIndicator = bed.querySelector('.bed-transaction-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Only show indicator for occupied beds
        if (bedsData[bedId] && bedsData[bedId].isOccupied) {
            const collectionStatus = getCollectionStatus(bedId);
            const bedData = bedsData[bedId];
            
            if (collectionStatus === 'collected') {
                // Create paid indicator (green checkmark)
                const indicator = document.createElement('div');
                indicator.className = 'bed-transaction-indicator paid';
                indicator.innerHTML = '✓';
                indicator.title = 'Collection received';
                bed.appendChild(indicator);
            } else if (collectionStatus === 'pending') {
                // Create pending indicator (clock icon)
                const indicator = document.createElement('div');
                indicator.className = 'bed-transaction-indicator pending';
                indicator.innerHTML = '⏰';
                indicator.title = `Collection pending - Expected on ${bedData.expectedCollectionDate}${getOrdinalSuffix(bedData.expectedCollectionDate)}`;
                bed.appendChild(indicator);
            } else if (collectionStatus === 'overdue') {
                // Create overdue indicator (red X)
                const indicator = document.createElement('div');
                indicator.className = 'bed-transaction-indicator unpaid';
                indicator.innerHTML = '✗';
                indicator.title = `Collection overdue - Expected on ${bedData.expectedCollectionDate}${getOrdinalSuffix(bedData.expectedCollectionDate)}`;
                bed.appendChild(indicator);
            } else {
                // Create unpaid indicator (red X) - for cases without expected date
                const indicator = document.createElement('div');
                indicator.className = 'bed-transaction-indicator unpaid';
                indicator.innerHTML = '✗';
                indicator.title = 'Collection not received';
                bed.appendChild(indicator);
            }
        } else {
        }
    });
}

// Load beds data from Firestore
async function loadBedsData() {
    try {
        const bedsRef = window.firestoreCollection(window.firebaseDB, "beds");
        const snapshot = await window.firestoreGetDocs(bedsRef);
        
        bedsData = {};
        snapshot.forEach((doc) => {
            bedsData[doc.id] = doc.data();
        });
        
        // Ensure all beds are initialized (not just the ones from Firestore)
        ensureAllBedsHaveData();
        
        // Check for automatic checkouts before updating display
        checkAutomaticCheckouts();
        
        updateBedDisplay();
    } catch (error) {
        console.error("Error loading beds data:", error);
        // Initialize with default data if Firestore fails
        initializeDefaultBeds();
    }
}

// Initialize default beds data
function initializeDefaultBeds() {
    const rooms = ["room1", "room2", "room3", "hall"];
    const bedCounts = { room1: 4, room2: 3, room3: 4, hall: 6 };
    
    // Define correct room pricing
    const roomPricing = {
        room1: 8000, // Bottom room - 4 beds sharing
        room2: 9000, // Middle room - 3 beds sharing
        room3: 8000, // Top room - 4 beds sharing
        hall: 6500   // Hall - 6 beds sharing
    };
    
    rooms.forEach(room => {
        for (let i = 1; i <= bedCounts[room]; i++) {
            const bedId = `${room}_bed${i}`;
            if (!bedsData[bedId]) {
                bedsData[bedId] = {
                    room: room,
                    bedNumber: i,
                    isOccupied: false,
                    occupantName: "",
                    occupantPhone: "",
                    occupantEmail: "",
                    price: roomPricing[room], // Use correct room pricing
                    deposit: 0,
                    checkInDate: "",
                    checkOutDate: "",
                    expectedCollectionDate: null,
                    notes: ""
                };
            }
        }
    });
    
    updateBedDisplay();
}

// Update bed display based on data
function updateBedDisplay() {
    Object.keys(bedsData).forEach(bedId => {
        const bedData = bedsData[bedId];
        const bedElement = document.querySelector(`[data-room="${bedData.room}"][data-bed="${bedData.bedNumber}"]`);
        
        if (bedElement) {
            // Remove all status classes
            bedElement.classList.remove('empty', 'permanent', 'temporary', 'extended');
            
            // Set up drag and drop attributes
            if (bedData.isOccupied) {
                bedElement.draggable = true;
                bedElement.setAttribute('data-bed-id', bedId);
                bedElement.classList.add('draggable');
            } else {
                bedElement.draggable = false;
                bedElement.removeAttribute('data-bed-id');
                bedElement.classList.remove('draggable');
                bedElement.classList.add('drop-target');
            }
            
            if (bedData.isOccupied) {
                const status = getBedStatus(bedData);
                bedElement.classList.add(status);
                bedElement.querySelector(".occupant-name").textContent = bedData.occupantName;
                bedElement.querySelector(".bed-price").textContent = `₹${bedData.price}`;
                if (bedData.deposit > 0) {
                    bedElement.querySelector(".bed-price").textContent += ` + ₹${bedData.deposit}`;
                }
            } else {
                bedElement.classList.add('empty');
                bedElement.querySelector(".occupant-name").textContent = "Available";
                bedElement.querySelector(".bed-price").textContent = `₹${bedData.price}`;
            }
        } else {
            console.error(`Could not find bed element for ${bedId} with room="${bedData.room}" bed="${bedData.bedNumber}"`);
        }
    });
    
    // Initialize drag and drop event listeners
    initializeDragAndDrop();
    
    // Update deposit summary
    updateDepositSummary();
    
    // Update transaction indicators
    updateTransactionIndicators();
}

// Get default room price based on room type
function getDefaultRoomPrice(room) {
    const roomPricing = {
        room1: 8000, // Bottom room - 4 beds sharing
        room2: 9000, // Middle room - 3 beds sharing
        room3: 8000, // Top room - 4 beds sharing
        hall: 6500   // Hall - 6 beds sharing
    };
    return roomPricing[room] || 6500;
}

// Ensure all beds have data initialized
function ensureAllBedsHaveData() {
    const rooms = ["room1", "room2", "room3", "hall"];
    const bedCounts = { room1: 4, room2: 3, room3: 4, hall: 6 };
    
    // Define correct room pricing
    const roomPricing = {
        room1: 8000, // Bottom room - 4 beds sharing
        room2: 9000, // Middle room - 3 beds sharing
        room3: 8000, // Top room - 4 beds sharing
        hall: 6500   // Hall - 6 beds sharing
    };
    
    rooms.forEach(room => {
        for (let i = 1; i <= bedCounts[room]; i++) {
            const bedId = `${room}_bed${i}`;
            if (!bedsData[bedId]) {
                bedsData[bedId] = {
                    room: room,
                    bedNumber: i,
                    isOccupied: false,
                    occupantName: "",
                    occupantPhone: "",
                    occupantEmail: "",
                    price: roomPricing[room], // Set correct default price
                    deposit: 0,
                    checkInDate: "",
                    checkOutDate: "",
                    expectedCollectionDate: null,
                    notes: ""
                };
            } else {
                // Only set default price for empty beds that don't have a price set
                if (!bedsData[bedId].isOccupied && (!bedsData[bedId].price || bedsData[bedId].price === 0)) {
                    bedsData[bedId].price = roomPricing[room];
                }
            }
        }
    });
}

// Determine bed status based on checkout date
function getBedStatus(bedData) {
    if (!bedData.isOccupied) {
        return 'empty';
    }
    
    // If no checkout date, it's permanent
    if (!bedData.checkOutDate || bedData.checkOutDate === '') {
        return 'permanent';
    }
    
    // Calculate days between check-in and checkout
    const checkInDate = new Date(bedData.checkInDate);
    const checkOutDate = new Date(bedData.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if checkout date has passed
    if (checkOutDate < today) {
        return 'overdue'; // New status for overdue checkouts
    }
    
    const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    // If more than 30 days, it's extended stay
    if (daysDiff > 30) {
        return 'extended';
    }
    
    // Otherwise, it's temporary
    return 'temporary';
}

// Handle bed click
function handleBedClick(bedElement) {
    const room = bedElement.getAttribute("data-room");
    const bedNumber = bedElement.getAttribute("data-bed");
    const bedId = `${room}_bed${bedNumber}`;
    
    currentBed = bedId;
    
    if (bedsData[bedId] && bedsData[bedId].isOccupied) {
        showOccupantDialog(bedsData[bedId]);
    } else {
        showOccupantForm(bedsData[bedId] || {
            room: room,
            bedNumber: parseInt(bedNumber),
            isOccupied: false,
            occupantName: "",
            occupantPhone: "",
            occupantEmail: "",
            price: 6500,
            checkInDate: "",
            checkOutDate: "",
            expectedCollectionDate: null,
            notes: ""
        });
    }
}

// Show occupant dialog for occupied beds
function showOccupantDialog(bedData) {
    const modal = document.getElementById("bedModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    
    const status = getBedStatus(bedData);
    const statusText = {
        'permanent': 'Permanent Occupant',
        'temporary': 'Temporary Occupant',
        'extended': 'Extended Stay'
    }[status];
    
    modalTitle.textContent = `Bed ${bedData.bedNumber} - ${bedData.room.charAt(0).toUpperCase() + bedData.room.slice(1)} (${statusText})`;
    
    // Calculate stay duration if checkout date exists
    let stayDuration = '';
    if (bedData.checkOutDate && bedData.checkInDate) {
        const checkInDate = new Date(bedData.checkInDate);
        const checkOutDate = new Date(bedData.checkOutDate);
        const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        stayDuration = `${daysDiff} days`;
    }
    
    modalBody.innerHTML = `
        <div class="occupant-info">
            <h4>Current Occupant</h4>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value" style="color: ${getStatusColor(status)}; font-weight: 600;">${statusText}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${bedData.occupantName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${bedData.occupantPhone}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${bedData.occupantEmail}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Monthly Rent:</span>
                <span class="info-value">₹${bedData.price}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Deposit:</span>
                <span class="info-value">₹${bedData.deposit || 0}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-in Date:</span>
                <span class="info-value">${bedData.checkInDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-out Date:</span>
                <span class="info-value">${bedData.checkOutDate || "Not specified (Permanent)"}</span>
            </div>
            ${bedData.expectedCollectionDate ? `<div class="info-row">
                <span class="info-label">Expected Collection Date:</span>
                <span class="info-value">${bedData.expectedCollectionDate}${getOrdinalSuffix(bedData.expectedCollectionDate)} of each month</span>
            </div>` : ''}
            ${stayDuration ? `<div class="info-row">
                <span class="info-label">Stay Duration:</span>
                <span class="info-value">${stayDuration}</span>
            </div>` : ''}
            <div class="info-row">
                <span class="info-label">Notes:</span>
                <span class="info-value">${bedData.notes || "No notes"}</span>
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn-primary" onclick="editOccupant()">Edit All Details</button>
            <button class="btn-secondary" onclick="quickEditPrice()">Quick Edit Rent</button>
            <button class="btn-secondary" onclick="quickEditDeposit()">Quick Edit Deposit</button>
            <button class="btn-info" onclick="viewOccupantDocuments()">📄 View Documents</button>
            <button class="btn-danger" onclick="vacateBed()">Vacate Bed</button>
        </div>
    `;
    
    modal.style.display = "block";
}

// Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
}

// Get color for status display
function getStatusColor(status) {
    const colors = {
        'permanent': '#f59e0b',
        'temporary': '#3b82f6',
        'extended': '#ec4899',
        'empty': '#22c55e'
    };
    return colors[status] || '#64748b';
}

// Show occupant form for available beds
function showOccupantForm(bedData) {
    // Ensure bed data is properly initialized
    if (!bedData) {
        console.error("No bed data provided to showOccupantForm");
        return;
    }
    
    // Store the bed data in bedsData if it doesn't exist
    if (!bedsData[currentBed]) {
        bedsData[currentBed] = bedData;
    }
    
    const modal = document.getElementById("bedModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    
    modalTitle.textContent = `Assign Bed ${bedData.bedNumber} - ${bedData.room.charAt(0).toUpperCase() + bedData.room.slice(1)}`;
    
    modalBody.innerHTML = `
        <form id="occupantForm" onsubmit="saveOccupant(event)">
            <div class="form-group">
                <label for="occupantName">Occupant Name *</label>
                <input type="text" id="occupantName" name="occupantName" required>
            </div>
            
            <div class="form-group">
                <label for="occupantPhone">Phone Number *</label>
                <input type="tel" id="occupantPhone" name="occupantPhone" required>
            </div>
            
            <div class="form-group">
                <label for="occupantEmail">Email Address</label>
                <input type="email" id="occupantEmail" name="occupantEmail">
            </div>
            
            <div class="form-group">
                <label for="price">Monthly Rent (₹) *</label>
                <input type="number" id="price" name="price" value="${bedData.price || getDefaultRoomPrice(bedData.room)}" required>
            </div>
            
            <div class="form-group">
                <label for="deposit">Deposit (₹)</label>
                <input type="number" id="deposit" name="deposit" value="${bedData.deposit || 0}" placeholder="Optional">
            </div>
            
            <div class="form-group">
                <label for="checkInDate">Check-in Date *</label>
                <input type="date" id="checkInDate" name="checkInDate" required>
            </div>
            
            <div class="form-group">
                <label for="checkOutDate">Check-out Date</label>
                <input type="date" id="checkOutDate" name="checkOutDate">
            </div>
            
            <div class="form-group">
                <label for="expectedCollectionDate">Expected Collection Date (1st-20th)</label>
                <select id="expectedCollectionDate" name="expectedCollectionDate">
                    <option value="">Select Collection Date</option>
                    <option value="1">1st</option>
                    <option value="2">2nd</option>
                    <option value="3">3rd</option>
                    <option value="4">4th</option>
                    <option value="5">5th</option>
                    <option value="6">6th</option>
                    <option value="7">7th</option>
                    <option value="8">8th</option>
                    <option value="9">9th</option>
                    <option value="10">10th</option>
                    <option value="11">11th</option>
                    <option value="12">12th</option>
                    <option value="13">13th</option>
                    <option value="14">14th</option>
                    <option value="15">15th</option>
                    <option value="16">16th</option>
                    <option value="17">17th</option>
                    <option value="18">18th</option>
                    <option value="19">19th</option>
                    <option value="20">20th</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3" placeholder="Any additional notes..."></textarea>
            </div>
            
            <button type="submit" class="btn-primary">Assign Bed</button>
        </form>
    `;
    
    modal.style.display = "block";
}

// Save occupant data
async function saveOccupant(event) {
    event.preventDefault();
    
    // Ensure currentBed is set and bed data exists
    if (!currentBed) {
        alert("Error: No bed selected. Please try again.");
        return;
    }
    
    // Initialize bed data if it doesn't exist
    if (!bedsData[currentBed]) {
        // Extract room and bed number from currentBed ID (format: "room1_bed1")
        const parts = currentBed.split('_');
        const room = parts[0]; // "room1", "room2", etc.
        const bedNumber = parseInt(parts[1].replace('bed', '')); // Extract number from "bed1"
        
        bedsData[currentBed] = {
            room: room,
            bedNumber: bedNumber,
            isOccupied: false,
            occupantName: "",
            occupantPhone: "",
            occupantEmail: "",
            price: 6500,
            checkInDate: "",
            checkOutDate: "",
            expectedCollectionDate: null,
            notes: ""
        };
    }
    
    const formData = new FormData(event.target);
    const bedData = {
        room: bedsData[currentBed].room,
        bedNumber: bedsData[currentBed].bedNumber,
        isOccupied: true,
        occupantName: formData.get("occupantName"),
        occupantPhone: formData.get("occupantPhone"),
        occupantEmail: formData.get("occupantEmail"),
        price: parseInt(formData.get("price")),
        deposit: parseInt(formData.get("deposit")) || 0,
        checkInDate: formData.get("checkInDate"),
        checkOutDate: formData.get("checkOutDate"),
        expectedCollectionDate: formData.get("expectedCollectionDate") || null,
        notes: formData.get("notes")
    };
    
    try {
        const bedRef = window.firestoreDoc(window.firebaseDB, "beds", currentBed);
        await window.firestoreSetDoc(bedRef, bedData);
        
        bedsData[currentBed] = bedData;
        updateBedDisplay();
        closeModal();
        
        alert("Bed assigned successfully!");
    } catch (error) {
        console.error("Error saving bed data:", error);
        alert("Error saving data. Please try again.");
    }
}

// Quick edit functions
function quickEditPrice() {
    const bedData = bedsData[currentBed];
    const newPrice = prompt(`Enter new monthly rent for ${bedData.occupantName}:`, bedData.price);
    
    if (newPrice !== null && !isNaN(newPrice) && newPrice > 0) {
        updateSingleField('price', parseInt(newPrice));
    }
}

function quickEditDeposit() {
    const bedData = bedsData[currentBed];
    const newDeposit = prompt(`Enter new deposit for ${bedData.occupantName}:`, bedData.deposit || 0);
    
    if (newDeposit !== null && !isNaN(newDeposit) && newDeposit >= 0) {
        updateSingleField('deposit', parseInt(newDeposit));
    }
}

async function updateSingleField(fieldName, value) {
    try {
        const bedData = {
            ...bedsData[currentBed],
            [fieldName]: value
        };
        
        const bedRef = window.firestoreDoc(window.firebaseDB, "beds", currentBed);
        await window.firestoreSetDoc(bedRef, bedData);
        
        bedsData[currentBed] = bedData;
        updateBedDisplay();
        
        // Refresh the dialog to show updated info
        showOccupantDialog(bedData);
        
        alert(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully!`);
    } catch (error) {
        console.error(`Error updating ${fieldName}:`, error);
        alert(`Error updating ${fieldName}. Please try again.`);
    }
}

// Edit occupant
function editOccupant() {
    const bedData = bedsData[currentBed];
    
    const modalBody = document.getElementById("modalBody");
    modalBody.innerHTML = `
        <form id="editForm" onsubmit="updateOccupant(event)">
            <div class="form-group">
                <label for="editOccupantName">Occupant Name *</label>
                <input type="text" id="editOccupantName" name="occupantName" value="${bedData.occupantName}" required>
            </div>
            
            <div class="form-group">
                <label for="editOccupantPhone">Phone Number *</label>
                <input type="tel" id="editOccupantPhone" name="occupantPhone" value="${bedData.occupantPhone}" required>
            </div>
            
            <div class="form-group">
                <label for="editOccupantEmail">Email Address</label>
                <input type="email" id="editOccupantEmail" name="occupantEmail" value="${bedData.occupantEmail}">
            </div>
            
            <div class="form-group">
                <label for="editPrice">Monthly Rent (₹) *</label>
                <input type="number" id="editPrice" name="price" value="${bedData.price}" required>
            </div>
            
            <div class="form-group">
                <label for="editDeposit">Deposit (₹)</label>
                <input type="number" id="editDeposit" name="deposit" value="${bedData.deposit || 0}" placeholder="Optional">
            </div>
            
            <div class="form-group">
                <label for="editCheckInDate">Check-in Date *</label>
                <input type="date" id="editCheckInDate" name="checkInDate" value="${bedData.checkInDate}" required>
            </div>
            
            <div class="form-group">
                <label for="editCheckOutDate">Check-out Date</label>
                <input type="date" id="editCheckOutDate" name="checkOutDate" value="${bedData.checkOutDate}">
            </div>
            
            <div class="form-group">
                <label for="editExpectedCollectionDate">Expected Collection Date (1st-20th)</label>
                <select id="editExpectedCollectionDate" name="expectedCollectionDate">
                    <option value="">Select Collection Date</option>
                    <option value="1" ${bedData.expectedCollectionDate == 1 ? 'selected' : ''}>1st</option>
                    <option value="2" ${bedData.expectedCollectionDate == 2 ? 'selected' : ''}>2nd</option>
                    <option value="3" ${bedData.expectedCollectionDate == 3 ? 'selected' : ''}>3rd</option>
                    <option value="4" ${bedData.expectedCollectionDate == 4 ? 'selected' : ''}>4th</option>
                    <option value="5" ${bedData.expectedCollectionDate == 5 ? 'selected' : ''}>5th</option>
                    <option value="6" ${bedData.expectedCollectionDate == 6 ? 'selected' : ''}>6th</option>
                    <option value="7" ${bedData.expectedCollectionDate == 7 ? 'selected' : ''}>7th</option>
                    <option value="8" ${bedData.expectedCollectionDate == 8 ? 'selected' : ''}>8th</option>
                    <option value="9" ${bedData.expectedCollectionDate == 9 ? 'selected' : ''}>9th</option>
                    <option value="10" ${bedData.expectedCollectionDate == 10 ? 'selected' : ''}>10th</option>
                    <option value="11" ${bedData.expectedCollectionDate == 11 ? 'selected' : ''}>11th</option>
                    <option value="12" ${bedData.expectedCollectionDate == 12 ? 'selected' : ''}>12th</option>
                    <option value="13" ${bedData.expectedCollectionDate == 13 ? 'selected' : ''}>13th</option>
                    <option value="14" ${bedData.expectedCollectionDate == 14 ? 'selected' : ''}>14th</option>
                    <option value="15" ${bedData.expectedCollectionDate == 15 ? 'selected' : ''}>15th</option>
                    <option value="16" ${bedData.expectedCollectionDate == 16 ? 'selected' : ''}>16th</option>
                    <option value="17" ${bedData.expectedCollectionDate == 17 ? 'selected' : ''}>17th</option>
                    <option value="18" ${bedData.expectedCollectionDate == 18 ? 'selected' : ''}>18th</option>
                    <option value="19" ${bedData.expectedCollectionDate == 19 ? 'selected' : ''}>19th</option>
                    <option value="20" ${bedData.expectedCollectionDate == 20 ? 'selected' : ''}>20th</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="editNotes">Notes</label>
                <textarea id="editNotes" name="notes" rows="3">${bedData.notes}</textarea>
            </div>
            
            <button type="submit" class="btn-primary">Update Details</button>
        </form>
    `;
}

// Update occupant
async function updateOccupant(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const bedData = {
        ...bedsData[currentBed],
        occupantName: formData.get("occupantName"),
        occupantPhone: formData.get("occupantPhone"),
        occupantEmail: formData.get("occupantEmail"),
        price: parseInt(formData.get("price")),
        deposit: parseInt(formData.get("deposit")) || 0,
        checkInDate: formData.get("checkInDate"),
        checkOutDate: formData.get("checkOutDate"),
        expectedCollectionDate: formData.get("expectedCollectionDate") || null,
        notes: formData.get("notes")
    };
    
    try {
        const bedRef = window.firestoreDoc(window.firebaseDB, "beds", currentBed);
        await window.firestoreSetDoc(bedRef, bedData);
        
        bedsData[currentBed] = bedData;
        updateBedDisplay();
        closeModal();
        
        alert("Details updated successfully!");
    } catch (error) {
        console.error("Error updating bed data:", error);
        alert("Error updating data. Please try again.");
    }
}

// Vacate bed
async function vacateBed() {
    if (!confirm("Are you sure you want to vacate this bed?")) {
        return;
    }
    
    const bedData = {
        ...bedsData[currentBed],
        isOccupied: false,
        occupantName: "",
        occupantPhone: "",
        occupantEmail: "",
        deposit: 0,
        checkInDate: "",
        checkOutDate: "",
        expectedCollectionDate: null,
        notes: ""
    };
    
    try {
        const bedRef = window.firestoreDoc(window.firebaseDB, "beds", currentBed);
        await window.firestoreSetDoc(bedRef, bedData);
        
        bedsData[currentBed] = bedData;
        updateBedDisplay();
        closeModal();
        
        alert("Bed vacated successfully!");
    } catch (error) {
        console.error("Error vacating bed:", error);
        alert("Error vacating bed. Please try again.");
    }
}

// Close modal
function closeModal() {
    document.getElementById("bedModal").style.display = "none";
    currentBed = null;
}

// Go back to main website
function goBack() {
    window.location.href = "index.html";
}

// Sign out is now handled by shared-auth.js

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("bedModal");
    if (event.target === modal) {
        closeModal();
    }
}

// Timeline Functions
function initializeTimeline() {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('startDate').value = formatDate(firstDay);
    document.getElementById('endDate').value = formatDate(lastDay);
    
    // Update timeline when beds data is loaded
    setTimeout(() => {
        if (Object.keys(bedsData).length > 0) {
            updateTimeline();
        }
    }, 2000);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function updateTimeline() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    const timelineContent = document.getElementById('timelineContent');
    timelineContent.innerHTML = '';
    
    // Generate date marks
    generateDateMarks(startDate, endDate);
    
    // Load and display historical data first, then current data
    loadAndDisplayHistory(startDate, endDate).then(() => {
        // Generate timeline for each bed after history is loaded
        const rooms = ["room1", "room2", "room3", "hall"];
        const bedCounts = { room1: 4, room2: 3, room3: 4, hall: 6 };
        
        rooms.forEach(room => {
            for (let i = 1; i <= bedCounts[room]; i++) {
                const bedId = `${room}_bed${i}`;
                const bedData = bedsData[bedId];
                
                if (bedData) {
                    createTimelineRow(bedId, bedData, startDate, endDate);
                }
            }
        });
    });
}

function generateDateMarks(startDate, endDate) {
    const dateMarksContainer = document.getElementById('timelineDateMarks');
    if (!dateMarksContainer) return;
    
    // Clear existing marks
    dateMarksContainer.innerHTML = '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Generate marks for every 7 days or at start/end
    for (let i = 0; i <= daysDiff; i += Math.max(1, Math.floor(daysDiff / 8))) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        
        const mark = document.createElement('div');
        mark.className = 'timeline-date-mark';
        mark.textContent = formatDate(currentDate);
        dateMarksContainer.appendChild(mark);
    }
}

function createTimelineRow(bedId, bedData, startDate, endDate) {
    const timelineContent = document.getElementById('timelineContent');
    
    const row = document.createElement('div');
    row.className = 'timeline-bed-row';
    
    // Bed label
    const label = document.createElement('div');
    label.className = 'timeline-bed-label';
    label.textContent = `${bedData.room.charAt(0).toUpperCase() + bedData.room.slice(1)} Bed ${bedData.bedNumber}`;
    row.appendChild(label);
    
    // Timeline bar container
    const barContainer = document.createElement('div');
    barContainer.className = 'timeline-bar-container';
    
    // Add historical bars first (so they appear behind current bars)
    const bedKey = bedId;
    if (window.bedHistoryMap && window.bedHistoryMap[bedKey]) {
        window.bedHistoryMap[bedKey].forEach(historyEntry => {
            const historyBar = createHistoryBar(historyEntry, startDate, endDate);
            barContainer.appendChild(historyBar);
        });
    }
    
    // Create current timeline bar
    const bar = document.createElement('div');
    bar.className = 'timeline-bar';
    
    if (bedData.isOccupied) {
        const status = getBedStatus(bedData);
        bar.classList.add(status);
        
        if (status === 'permanent') {
            // For permanent occupants, calculate position from check-in date and extend to end of timeline
            const hasHistory = window.bedHistoryMap && window.bedHistoryMap[bedKey] && window.bedHistoryMap[bedKey].length > 0;
            
            if (bedData.checkInDate) {
                // Calculate position from check-in date
                const position = calculateBarPosition(bedData.checkInDate, startDate, endDate);
                // Calculate width from check-in date to end of timeline
                const width = calculateBarWidth(bedData.checkInDate, endDate, startDate, endDate);
                
                bar.style.left = `${position}%`;
                bar.style.width = `${width}%`;
            } else {
                // Fallback to full width if no check-in date
                bar.style.width = '100%';
            }
            
            bar.style.opacity = hasHistory ? '0.8' : '1';
            bar.textContent = bedData.occupantName;
        } else if (bedData.checkInDate && bedData.checkOutDate) {
            // Calculate position and width based on dates
            const position = calculateBarPosition(bedData.checkInDate, startDate, endDate);
            const width = calculateBarWidth(bedData.checkInDate, bedData.checkOutDate, startDate, endDate);
            
            bar.style.left = `${position}%`;
            bar.style.width = `${width}%`;
            bar.textContent = bedData.occupantName;
        }
        
        // Add click handler to show bed details
        bar.onclick = () => {
            currentBed = bedId;
            showOccupantDialog(bedData);
        };
    } else {
        // Empty bed - show as available period, not full width
        bar.classList.add('empty');
        
        // If there's history, show available periods between historical entries
        if (window.bedHistoryMap && window.bedHistoryMap[bedKey] && window.bedHistoryMap[bedKey].length > 0) {
            // Show available periods between historical entries
            createAvailablePeriods(barContainer, startDate, endDate, window.bedHistoryMap[bedKey]);
            // Don't add the empty bar since we have available periods
        } else {
            // No history, show full width available
            bar.style.width = '100%';
            bar.textContent = 'Available';
            barContainer.appendChild(bar);
        }
    }
    
    // Only append bar if it was added (not for beds with history)
    if (bar.parentNode === barContainer) {
        // Bar was already appended
    } else if (!window.bedHistoryMap || !window.bedHistoryMap[bedKey] || window.bedHistoryMap[bedKey].length === 0) {
        // Only append if no history (for empty beds without history)
        barContainer.appendChild(bar);
    }
    
    row.appendChild(barContainer);
    timelineContent.appendChild(row);
}

function createAvailablePeriods(barContainer, startDate, endDate, historyEntries) {
    // Sort history entries by check-in date
    const sortedEntries = historyEntries.sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Create available periods
    let currentDate = start;
    
    sortedEntries.forEach((entry, index) => {
        const entryStart = new Date(entry.checkInDate);
        const entryEnd = new Date(entry.actualCheckoutDate || entry.checkOutDate);
        
        // If there's a gap before this entry, create an available period
        if (currentDate < entryStart) {
            const availableBar = document.createElement('div');
            availableBar.className = 'timeline-bar available-period';
            availableBar.style.left = `${calculateBarPosition(formatDate(currentDate), startDate, endDate)}%`;
            availableBar.style.width = `${calculateBarWidth(formatDate(currentDate), formatDate(entryStart), startDate, endDate)}%`;
            availableBar.textContent = 'Available';
            availableBar.onclick = () => {
                // Could show available period details
                console.log('Available period clicked');
            };
            barContainer.appendChild(availableBar);
        }
        
        // Update current date to after this entry
        currentDate = new Date(Math.max(currentDate.getTime(), entryEnd.getTime()));
    });
    
    // If there's a gap after the last entry, create an available period
    if (currentDate < end) {
        const availableBar = document.createElement('div');
        availableBar.className = 'timeline-bar available-period';
        availableBar.style.left = `${calculateBarPosition(formatDate(currentDate), startDate, endDate)}%`;
        availableBar.style.width = `${calculateBarWidth(formatDate(currentDate), formatDate(end), startDate, endDate)}%`;
        availableBar.textContent = 'Available';
        availableBar.onclick = () => {
            console.log('Available period clicked');
        };
        barContainer.appendChild(availableBar);
    }
}

function createHistoryBar(historyEntry, startDate, endDate) {
    const bar = document.createElement('div');
    bar.className = 'timeline-bar history-bar';
    
    // Calculate position and width based on dates
    const position = calculateBarPosition(historyEntry.checkInDate, startDate, endDate);
    const width = calculateBarWidth(historyEntry.checkInDate, historyEntry.actualCheckoutDate || historyEntry.checkOutDate, startDate, endDate);
    
    bar.style.left = `${position}%`;
    bar.style.width = `${width}%`;
    bar.textContent = historyEntry.occupantName;
    
    // Add click handler to show historical details
    bar.onclick = () => {
        showHistoryDialog(historyEntry);
    };
    
    return bar;
}

function calculateBarPosition(checkInDate, startDate, endDate) {
    const checkIn = new Date(checkInDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (checkIn < start) return 0;
    if (checkIn > end) return 100;
    
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const daysFromStart = Math.ceil((checkIn - start) / (1000 * 60 * 60 * 24));
    
    return (daysFromStart / totalDays) * 100;
}

function calculateBarWidth(checkInDate, checkOutDate, startDate, endDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Adjust dates to fit within the timeline range
    const effectiveStart = checkIn < start ? start : checkIn;
    const effectiveEnd = checkOut > end ? end : checkOut;
    
    if (effectiveStart >= effectiveEnd) return 0;
    
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const occupancyDays = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24));
    
    return Math.max(5, (occupancyDays / totalDays) * 100); // Minimum 5% width
}

async function loadAndDisplayHistory(startDate, endDate) {
    try {
        console.log("Loading history data...");
        const historyRef = window.firestoreCollection(window.firebaseDB, "history");
        const snapshot = await window.firestoreGetDocs(historyRef);
        
        const historyData = {};
        snapshot.forEach((doc) => {
            const data = doc.data();
            const bedKey = `${data.room}_bed${data.bedNumber}`;
            
            if (!historyData[bedKey]) {
                historyData[bedKey] = [];
            }
            historyData[bedKey].push(data);
        });
        
        displayHistoryOnTimeline(historyData, startDate, endDate);
        
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

function displayHistoryOnTimeline(historyData, startDate, endDate) {
    const bedHistoryMap = {};
    
    Object.keys(historyData).forEach(bedKey => {
        const historyEntries = historyData[bedKey];

        historyEntries.forEach(entry => {
            // Check if this historical entry overlaps with the selected date range
            if (isDateInRange(entry.checkInDate, entry.actualCheckoutDate || entry.checkOutDate, startDate, endDate)) {
                
                if (!bedHistoryMap[bedKey]) {
                    bedHistoryMap[bedKey] = [];
                }
                bedHistoryMap[bedKey].push(entry);
            } else {
                console.log("Entry is not in range");
            }
        });
    });
    
    // Store the history data globally so it can be used when creating timeline rows
    window.bedHistoryMap = bedHistoryMap;
}

function isDateInRange(checkInDate, checkOutDate, rangeStart, rangeEnd) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const overlaps = (checkIn <= end && checkOut >= start);
    
    return overlaps;
}

function showHistoryDialog(historyEntry) {
    const modal = document.getElementById("bedModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    
    modalTitle.textContent = `Historical Record - ${historyEntry.room.charAt(0).toUpperCase() + historyEntry.room.slice(1)} Bed ${historyEntry.bedNumber}`;
    
    modalBody.innerHTML = `
        <div class="occupant-info">
            <h4>Past Occupant</h4>
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${historyEntry.occupantName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${historyEntry.occupantPhone}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${historyEntry.occupantEmail}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Monthly Rent:</span>
                <span class="info-value">₹${historyEntry.price}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Deposit:</span>
                <span class="info-value">₹${historyEntry.deposit || 0}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-in Date:</span>
                <span class="info-value">${historyEntry.checkInDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Planned Check-out:</span>
                <span class="info-value">${historyEntry.checkOutDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Actual Check-out:</span>
                <span class="info-value">${historyEntry.actualCheckoutDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Moved to History:</span>
                <span class="info-value">${new Date(historyEntry.movedToHistoryDate).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Notes:</span>
                <span class="info-value">${historyEntry.notes || "No notes"}</span>
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem;">
            <button class="btn-secondary" onclick="closeModal()">Close</button>
        </div>
    `;
    
    modal.style.display = "block";
}

// Drag and Drop Functions
function initializeDragAndDrop() {
    // Remove existing event listeners to avoid duplicates
    document.querySelectorAll('.bed').forEach(bed => {
        bed.removeEventListener('dragstart', handleDragStart);
        bed.removeEventListener('dragover', handleDragOver);
        bed.removeEventListener('drop', handleDrop);
        bed.removeEventListener('dragend', handleDragEnd);
        bed.removeEventListener('dragenter', handleDragEnter);
        bed.removeEventListener('dragleave', handleDragLeave);
    });
    
    // Add event listeners to all beds
    document.querySelectorAll('.bed').forEach(bed => {
        bed.addEventListener('dragstart', handleDragStart);
        bed.addEventListener('dragover', handleDragOver);
        bed.addEventListener('drop', handleDrop);
        bed.addEventListener('dragend', handleDragEnd);
        bed.addEventListener('dragenter', handleDragEnter);
        bed.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedBedId = null;

function handleDragStart(e) {
    const bedElement = e.target;
    draggedBedId = bedElement.getAttribute('data-bed-id');
    
    if (draggedBedId) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', bedElement.outerHTML);
        bedElement.classList.add('dragging');
    } else {
        e.preventDefault();
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const bedElement = e.target;
    
    // Only highlight if it's an empty bed (drop target)
    if (bedElement.classList.contains('drop-target')) {
        bedElement.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const bedElement = e.target;
    bedElement.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const targetBed = e.target;
    
    // Remove drag-over class
    targetBed.classList.remove('drag-over');
    
    // Only allow dropping on empty beds
    if (!targetBed.classList.contains('drop-target')) {
        return;
    }
    
    if (draggedBedId) {
        const sourceBedId = draggedBedId;
        const targetRoom = targetBed.getAttribute('data-room');
        const targetBedNumber = parseInt(targetBed.getAttribute('data-bed'));
        const targetBedId = `${targetRoom}_bed${targetBedNumber}`;
        
        // Confirm the move
        const sourceBedData = bedsData[sourceBedId];
        const confirmMessage = `Move ${sourceBedData.occupantName} from ${sourceBedData.room.charAt(0).toUpperCase() + sourceBedData.room.slice(1)} Bed ${sourceBedData.bedNumber} to ${targetRoom.charAt(0).toUpperCase() + targetRoom.slice(1)} Bed ${targetBedNumber}?`;
        
        if (confirm(confirmMessage)) {
            moveOccupant(sourceBedId, targetBedId);
        }
    }
}

function handleDragEnd(e) {
    const bedElement = e.target;
    bedElement.classList.remove('dragging');
    
    // Remove drag-over class from all beds
    document.querySelectorAll('.bed').forEach(bed => {
        bed.classList.remove('drag-over');
    });
    
    draggedBedId = null;
}

async function moveOccupant(sourceBedId, targetBedId) {
    try {
        const sourceBedData = bedsData[sourceBedId];
        
        // Create new bed data for target bed
        const targetBedData = {
            room: bedsData[targetBedId].room,
            bedNumber: bedsData[targetBedId].bedNumber,
            isOccupied: true,
            occupantName: sourceBedData.occupantName,
            occupantPhone: sourceBedData.occupantPhone,
            occupantEmail: sourceBedData.occupantEmail,
            price: sourceBedData.price,
            deposit: sourceBedData.deposit,
            checkInDate: sourceBedData.checkInDate,
            checkOutDate: sourceBedData.checkOutDate,
            expectedCollectionDate: sourceBedData.expectedCollectionDate,
            notes: sourceBedData.notes
        };
        
        // Create empty bed data for source bed
        const emptyBedData = {
            room: sourceBedData.room,
            bedNumber: sourceBedData.bedNumber,
            isOccupied: false,
            occupantName: "",
            occupantPhone: "",
            occupantEmail: "",
            price: sourceBedData.price, // Keep the same rent for the bed
            deposit: 0,
            checkInDate: "",
            checkOutDate: "",
            expectedCollectionDate: null,
            notes: ""
        };
        
        // Update Firestore
        const sourceBedRef = window.firestoreDoc(window.firebaseDB, "beds", sourceBedId);
        const targetBedRef = window.firestoreDoc(window.firebaseDB, "beds", targetBedId);
        
        await window.firestoreSetDoc(sourceBedRef, emptyBedData);
        await window.firestoreSetDoc(targetBedRef, targetBedData);
        
        // Update local data
        bedsData[sourceBedId] = emptyBedData;
        bedsData[targetBedId] = targetBedData;
        
        // Update display
        updateBedDisplay();
        
        alert(`Successfully moved ${sourceBedData.occupantName} to ${targetBedData.room.charAt(0).toUpperCase() + targetBedData.room.slice(1)} Bed ${targetBedData.bedNumber}!`);
        
    } catch (error) {
        console.error("Error moving occupant:", error);
        alert("Error moving occupant. Please try again.");
    }
}

// Deposit Summary Functions
function updateDepositSummary() {
    let totalDeposits = 0;
    let occupantsWithDeposits = 0;
    let occupiedBeds = 0;
    let totalMonthlyRevenue = 0;
    
    // Calculate totals from current beds data
    Object.keys(bedsData).forEach(bedId => {
        const bedData = bedsData[bedId];
        
        if (bedData.isOccupied) {
            occupiedBeds++;
            totalMonthlyRevenue += bedData.price || 0;
            
            if (bedData.deposit && bedData.deposit > 0) {
                totalDeposits += bedData.deposit;
                occupantsWithDeposits++;
            }
        }
    });
    
    // Update the UI
    document.getElementById('totalDeposits').textContent = `₹${totalDeposits.toLocaleString()}`;
    document.getElementById('depositDetails').textContent = `${occupantsWithDeposits} occupants with deposits`;
    
    document.getElementById('occupancyCount').textContent = `${occupiedBeds}/17`;
    document.getElementById('occupancyDetails').textContent = 'beds occupied';
    
    document.getElementById('monthlyRevenue').textContent = `₹${totalMonthlyRevenue.toLocaleString()}`;
    document.getElementById('revenueDetails').textContent = 'from current occupants';
}

// Navigate timeline by day (smooth scrolling)
function navigateTimeline(direction) {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    let startDate = new Date(startDateInput.value);
    let endDate = new Date(endDateInput.value);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        // If no dates are set, use current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    if (direction === 'prev') {
        // Move back by 1 day
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
    } else if (direction === 'next') {
        // Move forward by 1 day
        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
    }
    
    // Update the date inputs smoothly
    startDateInput.value = formatDateForInput(startDate);
    endDateInput.value = formatDateForInput(endDate);
    
    // Update the timeline smoothly without page reload
    updateTimelineSmooth();
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Smooth timeline update without page reload
function updateTimelineSmooth() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
        return;
    }
    
    // Update timeline bars smoothly without recreating the entire structure
    updateTimelineBarsOnly(startDate, endDate);
}

// Update only the timeline bars without recreating the structure
function updateTimelineBarsOnly(startDate, endDate) {
    const timelineContent = document.getElementById('timelineContent');
    if (!timelineContent) return;
    
    // Get all existing bed rows
    const bedRows = timelineContent.querySelectorAll('.timeline-bed-row');
    
    bedRows.forEach(row => {
        const barContainer = row.querySelector('.timeline-bar-container');
        if (!barContainer) return;
        
        // Get bed ID from the row
        const bedLabel = row.querySelector('.timeline-bed-label');
        if (!bedLabel) return;
        
        const labelText = bedLabel.textContent;
        const roomMatch = labelText.match(/(\w+) Bed (\d+)/);
        if (!roomMatch) return;
        
        const room = roomMatch[1].toLowerCase();
        const bedNumber = parseInt(roomMatch[2]);
        const bedId = `${room}_bed${bedNumber}`;
        
        const bedData = bedsData[bedId];
        if (!bedData) return;
        
        // Clear existing bars
        barContainer.innerHTML = '';
        
        // Add historical bars first
        if (window.bedHistoryMap && window.bedHistoryMap[bedId]) {
            window.bedHistoryMap[bedId].forEach(historyEntry => {
                const historyBar = createHistoryBar(historyEntry, startDate, endDate);
                barContainer.appendChild(historyBar);
            });
        }
        
        // Create current timeline bar
        const bar = document.createElement('div');
        bar.className = 'timeline-bar';
        
        if (bedData.isOccupied) {
            const status = getBedStatus(bedData);
            bar.classList.add(status);
            
            if (status === 'permanent') {
                const hasHistory = window.bedHistoryMap && window.bedHistoryMap[bedId] && window.bedHistoryMap[bedId].length > 0;
                
                if (bedData.checkInDate) {
                    const position = calculateBarPosition(bedData.checkInDate, startDate, endDate);
                    const width = calculateBarWidth(bedData.checkInDate, endDate, startDate, endDate);
                    
                    bar.style.left = `${position}%`;
                    bar.style.width = `${width}%`;
                } else {
                    bar.style.width = '100%';
                }
                
                bar.style.opacity = hasHistory ? '0.8' : '1';
                bar.textContent = bedData.occupantName;
            } else if (bedData.checkInDate && bedData.checkOutDate) {
                const position = calculateBarPosition(bedData.checkInDate, startDate, endDate);
                const width = calculateBarWidth(bedData.checkInDate, bedData.checkOutDate, startDate, endDate);
                
                bar.style.left = `${position}%`;
                bar.style.width = `${width}%`;
                bar.textContent = bedData.occupantName;
            }
            
            // Add click handler
            bar.onclick = () => {
                currentBed = bedId;
                showOccupantDialog(bedData);
            };
        } else {
            bar.classList.add('empty');
            
            if (window.bedHistoryMap && window.bedHistoryMap[bedId] && window.bedHistoryMap[bedId].length > 0) {
                createAvailablePeriods(barContainer, startDate, endDate, window.bedHistoryMap[bedId]);
            } else {
                bar.style.width = '100%';
                bar.textContent = 'Available';
                barContainer.appendChild(bar);
            }
        }
        
        // Only append bar if it was added (not for beds with history)
        if (bar.parentNode === null) {
            barContainer.appendChild(bar);
        }
        
        // Apply toggle state
        const toggle = document.getElementById('hidePermanentToggle');
        if (toggle && toggle.checked) {
            // Hide permanent occupants that span the full width of current visible timeline
            if (bedData.isOccupied && getBedStatus(bedData) === 'permanent') {
                const isFullWidth = isPermanentFullWidth(bedData, startDate, endDate);
                if (isFullWidth) {
                    row.classList.add('hidden-permanent');
                } else {
                    row.classList.remove('hidden-permanent');
                }
            } else {
                row.classList.remove('hidden-permanent');
            }
        } else {
            // Show all rows
            row.classList.remove('hidden-permanent');
        }
    });
}

// Update date marks for smooth timeline navigation
function updateDateMarks(startDate, endDate) {
    // Simply regenerate date marks in the dedicated container
    generateDateMarks(startDate, endDate);
}

// Check if a permanent occupant spans the full width of the current timeline
function isPermanentFullWidth(bedData, startDate, endDate) {
    if (!bedData.isOccupied || getBedStatus(bedData) !== 'permanent') {
        return false;
    }
    
    // If no check-in date, it spans full width
    if (!bedData.checkInDate) {
        return true;
    }
    
    // Convert dates to Date objects for comparison
    const timelineStart = new Date(startDate);
    const timelineEnd = new Date(endDate);
    const checkInDate = new Date(bedData.checkInDate);
    
    // If check-in date is before or at the start of timeline, it spans full width
    return checkInDate <= timelineStart;
}

// Toggle permanent occupant rows visibility
function togglePermanentRows() {
    const toggle = document.getElementById('hidePermanentToggle');
    const timelineContent = document.getElementById('timelineContent');
    
    if (!timelineContent) return;
    
    // Get current timeline dates
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) return;
    
    const bedRows = timelineContent.querySelectorAll('.timeline-bed-row');
    
    bedRows.forEach(row => {
        const bedLabel = row.querySelector('.timeline-bed-label');
        if (!bedLabel) return;
        
        const labelText = bedLabel.textContent;
        const roomMatch = labelText.match(/(\w+) Bed (\d+)/);
        if (!roomMatch) return;
        
        const room = roomMatch[1].toLowerCase();
        const bedNumber = parseInt(roomMatch[2]);
        const bedId = `${room}_bed${bedNumber}`;
        
        const bedData = bedsData[bedId];
        if (!bedData) return;
        
        if (toggle.checked) {
            // Hide permanent occupants that span the full width of current timeline
            if (bedData.isOccupied && getBedStatus(bedData) === 'permanent') {
                const isFullWidth = isPermanentFullWidth(bedData, startDate, endDate);
                if (isFullWidth) {
                    row.classList.add('hidden-permanent');
                } else {
                    row.classList.remove('hidden-permanent');
                }
            } else {
                row.classList.remove('hidden-permanent');
            }
        } else {
            // Show all rows
            row.classList.remove('hidden-permanent');
        }
    });
}


// Document Upload Functions
function toggleUploadForm() {
    const uploadForm = document.getElementById('uploadForm');
    const toggleBtn = document.getElementById('toggleUploadBtn');
    
    if (uploadForm.style.display === 'none' || uploadForm.style.display === '') {
        uploadForm.style.display = 'block';
        toggleBtn.textContent = '− Hide Form';
        toggleBtn.classList.add('btn-secondary');
        toggleBtn.classList.remove('btn-primary');
    } else {
        uploadForm.style.display = 'none';
        toggleBtn.textContent = '+ Add Document';
        toggleBtn.classList.add('btn-primary');
        toggleBtn.classList.remove('btn-secondary');
        resetUploadForm();
    }
}

function resetUploadForm() {
    document.getElementById('guestEmail').value = '';
    document.getElementById('documentType').value = '';
    document.getElementById('documentName').value = '';
    document.getElementById('documentFile').value = '';
    document.getElementById('documentNotes').value = '';
    
    // Hide progress bar
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.style.display = 'none';
    
    // Reset upload button
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = false;
    uploadBtn.textContent = '📤 Upload Document';
}

async function uploadDocument() {
    const guestEmail = document.getElementById('guestEmail').value.trim();
    const documentType = document.getElementById('documentType').value;
    const documentName = document.getElementById('documentName').value.trim();
    const documentFile = document.getElementById('documentFile').files[0];
    const documentNotes = document.getElementById('documentNotes').value.trim();
    
    // Validation
    if (!guestEmail || !documentType || !documentFile) {
        alert('Please fill in all required fields (Email, Document Type, and File).');
        return;
    }
    
    // File size validation (10MB limit)
    if (documentFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        return;
    }
    
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(documentFile.type)) {
        alert('Please select a valid file type (JPG, PNG, or PDF).');
        return;
    }
    
    try {
        // Show progress bar
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const uploadBtn = document.getElementById('uploadBtn');
        
        progressDiv.style.display = 'block';
        uploadBtn.disabled = true;
        uploadBtn.textContent = '⏳ Uploading...';
        
        // Update progress
        progressFill.style.width = '20%';
        progressText.textContent = 'Preparing file...';
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = documentFile.name.split('.').pop();
        const fileName = `${guestEmail.replace('@', '_at_')}_${documentType}_${timestamp}.${fileExtension}`;
        
        // Create Firebase Storage reference
        const storage = firebase.storage();
        const storageRef = storage.ref();
        const documentRef = storageRef.child(`documents/${fileName}`);
        
        // Update progress
        progressFill.style.width = '40%';
        progressText.textContent = 'Uploading to Firebase Storage...';
        
        // Upload file to Firebase Storage
        const uploadTask = documentRef.put(documentFile);
        
        // Monitor upload progress
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressFill.style.width = `${40 + (progress * 0.4)}%`;
                progressText.textContent = `Uploading... ${Math.round(progress)}%`;
            },
            (error) => {
                console.error('Upload error:', error);
                alert('Upload failed: ' + error.message);
                resetUploadForm();
            },
            async () => {
                try {
                    // Get download URL
                    progressFill.style.width = '80%';
                    progressText.textContent = 'Getting download URL...';
                    
                    const downloadURL = await window.storageGetDownloadURL(documentRef);
                    
                    // Update progress
                    progressFill.style.width = '90%';
                    progressText.textContent = 'Saving document information...';
                    
                    // Save document metadata to Firestore
                    const db = firebase.firestore();
                    const documentData = {
                        guestEmail: guestEmail,
                        documentType: documentType,
                        documentName: documentName || `${documentType.replace('_', ' ').toUpperCase()}`,
                        fileName: fileName,
                        originalFileName: documentFile.name,
                        downloadURL: downloadURL,
                        fileSize: documentFile.size,
                        fileType: documentFile.type,
                        notes: documentNotes,
                        uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
                        uploadedBy: firebase.auth().currentUser.email
                    };
                    
                    await db.collection('documents').add(documentData);
                    
                    // Complete progress
                    progressFill.style.width = '100%';
                    progressText.textContent = 'Upload completed successfully!';
                    
                    // Show success message
                    setTimeout(() => {
                        alert('Document uploaded successfully!');
                        resetUploadForm();
                        toggleUploadForm();
                        
                        // Refresh documents list if on documents page
                        if (typeof refreshDocuments === 'function') {
                            refreshDocuments();
                        }
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error saving document metadata:', error);
                    alert('Document uploaded but failed to save metadata: ' + error.message);
                    resetUploadForm();
                }
            }
        );
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
        resetUploadForm();
    }
}

// Function to get all documents for a specific guest
async function getGuestDocuments(guestEmail) {
    try {
        const db = firebase.firestore();
        const documentsRef = db.collection('documents')
            .where('guestEmail', '==', guestEmail)
            .orderBy('uploadDate', 'desc');
        
        const snapshot = await documentsRef.get();
        const documents = [];
        
        snapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return documents;
    } catch (error) {
        console.error('Error fetching guest documents:', error);
        return [];
    }
}

// Function to delete a document
async function deleteDocument(documentId, fileName) {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Delete from Firebase Storage
        const storage = firebase.storage();
        const storageRef = storage.ref();
        const documentRef = storageRef.child(`documents/${fileName}`);
        await documentRef.delete();
        
        // Delete from Firestore
        const db = firebase.firestore();
        await db.collection('documents').doc(documentId).delete();
        
        alert('Document deleted successfully!');
        
        // Refresh documents list if on documents page
        if (typeof refreshDocuments === 'function') {
            refreshDocuments();
        }
        
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document: ' + error.message);
    }
}


// Function to view documents for current occupant
function viewOccupantDocuments() {
    const bedData = bedsData[currentBed];
    
    // Use mobile number as primary identifier, email as secondary
    const phoneNumber = bedData.occupantPhone;
    const emailAddress = bedData.occupantEmail;
    
    if (!phoneNumber) {
        alert('No mobile number found for this occupant. Please add a mobile number first.');
        return;
    }
    
    // Close current modal
    document.getElementById('bedModal').style.display = 'none';
    
    // Navigate to documents page with pre-filled phone number and email
    let url = `documents.html?phone=${encodeURIComponent(phoneNumber)}`;
    if (emailAddress) {
        url += `&email=${encodeURIComponent(emailAddress)}`;
    }
    window.location.href = url;
}
