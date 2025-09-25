// Manage Page JavaScript
let currentBed = null;
let bedsData = {};

// Initialize the page
document.addEventListener("DOMContentLoaded", function() {
    
    // Wait for Firebase to be ready
    setTimeout(() => {
        if (window.firebaseAuth) {
            checkAuthentication();
        } else {
            console.error("Firebase Auth not ready after timeout");
            document.getElementById('loadingIndicator').innerHTML = `
                <div class="loading-spinner" style="border-top-color: #dc3545;"></div>
                <p style="color: #dc3545;">Firebase not ready. Redirecting...</p>
            `;
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        }
    }, 1000);
    
    // Initialize timeline with default date range
    initializeTimeline();
});

// Check if user is authenticated
async function checkAuthentication() {
    try {
        // Wait for auth state to be ready
        await new Promise((resolve) => {
            const unsubscribe = window.firebaseAuth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
        
        const user = window.firebaseAuth.currentUser;
        
        if (!user) {
            alert("Please sign in first. Redirecting to main page...");
            window.location.href = "index.html";
            return;
        }
        
        if (user.email !== "harshkanjariya.official@gmail.com") {
            alert("Access denied. Only the owner can access this page.");
            window.location.href = "index.html";
            return;
        }
        
        // User is authenticated and authorized
        
        // Hide loading indicator and show apartment layout
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('apartmentLayout').style.display = 'block';
        
        loadBedsData();
        
    } catch (error) {
        console.error("Authentication check failed:", error);
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="loading-spinner" style="border-top-color: #dc3545;"></div>
            <p style="color: #dc3545;">Authentication error. Redirecting...</p>
        `;
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
    }
}

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
                    price: 6500,
                    deposit: 0,
                    checkInDate: "",
                    checkOutDate: "",
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
}

// Ensure all beds have data initialized
function ensureAllBedsHaveData() {
    const rooms = ["room1", "room2", "room3", "hall"];
    const bedCounts = { room1: 4, room2: 3, room3: 4, hall: 6 };
    
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
                    price: 6500,
                    deposit: 0,
                    checkInDate: "",
                    checkOutDate: "",
                    notes: ""
                };
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
            <button class="btn-danger" onclick="vacateBed()">Vacate Bed</button>
        </div>
    `;
    
    modal.style.display = "block";
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
                <input type="number" id="price" name="price" value="${bedData.price || 6500}" required>
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

// Sign out user
async function signOutUser() {
    try {
        await window.firebaseSignOut(window.firebaseAuth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Sign out error:", error);
    }
}

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
    const timelineContent = document.getElementById('timelineContent');
    const dateMarksContainer = document.createElement('div');
    dateMarksContainer.className = 'timeline-date-marks';
    
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
    
    timelineContent.appendChild(dateMarksContainer);
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
    
    // Create timeline bar
    const bar = document.createElement('div');
    bar.className = 'timeline-bar';
    
    if (bedData.isOccupied) {
        const status = getBedStatus(bedData);
        bar.classList.add(status);
        
        if (status === 'permanent') {
            // Full width for permanent occupants
            bar.style.width = '100%';
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
        // Empty bed - full width green
        bar.classList.add('empty');
        bar.style.width = '100%';
        bar.textContent = 'Available';
    }
    
    barContainer.appendChild(bar);
    row.appendChild(barContainer);
    timelineContent.appendChild(row);
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
        
        // Display historical data on timeline
        displayHistoryOnTimeline(historyData, startDate, endDate);
        
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

function displayHistoryOnTimeline(historyData, startDate, endDate) {
    const timelineContent = document.getElementById('timelineContent');
    
    Object.keys(historyData).forEach(bedKey => {
        const historyEntries = historyData[bedKey];
        
        historyEntries.forEach(entry => {
            // Check if this historical entry overlaps with the selected date range
            if (isDateInRange(entry.checkInDate, entry.actualCheckoutDate || entry.checkOutDate, startDate, endDate)) {
                createHistoryTimelineRow(entry, startDate, endDate);
            }
        });
    });
}

function isDateInRange(checkInDate, checkOutDate, rangeStart, rangeEnd) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    
    // Check if the stay period overlaps with the selected range
    return (checkIn <= end && checkOut >= start);
}

function createHistoryTimelineRow(historyEntry, startDate, endDate) {
    const timelineContent = document.getElementById('timelineContent');
    
    const row = document.createElement('div');
    row.className = 'timeline-bed-row history-row';
    
    // Bed label with history indicator
    const label = document.createElement('div');
    label.className = 'timeline-bed-label';
    label.textContent = `${historyEntry.room.charAt(0).toUpperCase() + historyEntry.room.slice(1)} Bed ${historyEntry.bedNumber} (Past)`;
    row.appendChild(label);
    
    // Timeline bar container
    const barContainer = document.createElement('div');
    barContainer.className = 'timeline-bar-container';
    
    // Create timeline bar for historical data
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
    
    barContainer.appendChild(bar);
    row.appendChild(barContainer);
    timelineContent.appendChild(row);
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
