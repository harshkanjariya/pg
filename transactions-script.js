// Global variables
let bedsData = {};
let transactionsData = [];

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing protected page...');
    
    // Use shared authentication
    const authSuccess = await window.initializeProtectedPage();
    
    if (authSuccess) {
        // Authentication successful, load data
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('transactionSummary').style.display = 'grid';
        
        await loadBedsData();
        await loadTransactionsData();
        updateTransactionSummary();
        displayTransactions();
    } else {
        // Authentication failed, show error
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="loading-spinner" style="border-top-color: #dc3545;"></div>
            <p style="color: #dc3545;">Authentication failed. Redirecting...</p>
        `;
    }
});

// Authentication is now handled by shared-auth.js

// Load beds data
async function loadBedsData() {
    try {
        const bedsRef = window.firestoreCollection(window.firebaseDB, 'beds');
        const snapshot = await window.firestoreGetDocs(bedsRef);
        
        bedsData = {};
        snapshot.forEach(doc => {
            bedsData[doc.id] = doc.data();
        });
        
    } catch (error) {
        console.error("Error loading beds data:", error);
    }
}

// Load transactions data
async function loadTransactionsData() {
    try {
        const transactionsRef = window.firestoreCollection(window.firebaseDB, 'transactions');
        const snapshot = await window.firestoreGetDocs(transactionsRef);
        
        transactionsData = [];
        snapshot.forEach(doc => {
            transactionsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by date (newest first)
        transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('Transactions data loaded:', transactionsData);
    } catch (error) {
        console.error("Error loading transactions data:", error);
    }
}

// Update transaction summary
function updateTransactionSummary() {
    let totalExpenses = 0;
    let totalCollections = 0;
    // Pending amount removed
    let occupiedBeds = 0;
    
    // Calculate from transactions data
    transactionsData.forEach(transaction => {
        if (transaction.type === 'expense') {
            totalExpenses += transaction.amount || 0;
        } else if (transaction.type === 'collection') {
            totalCollections += transaction.amount || 0;
        }
    });
    
    // Count occupied beds
    Object.values(bedsData).forEach(bed => {
        if (bed.isOccupied) {
            occupiedBeds++;
        }
    });
    
    // Calculate total potential revenue using hardcoded room pricing
    const roomPricing = {
        hall: 6500,   // Hall - 6 beds sharing
        room1: 8000,  // Top room - 4 beds sharing  
        room2: 9000,  // Middle room - 3 beds sharing
        room3: 8000   // Bottom room - 4 beds sharing
    };
    
    let totalPotentialRevenue = 0;
    Object.keys(bedsData).forEach(bedId => {
        const bedData = bedsData[bedId];
        const roomPrice = roomPricing[bedData.room] || 6500; // Use hardcoded price
        totalPotentialRevenue += roomPrice;
    });
    
    
    // Update UI
    document.getElementById('totalExpenses').textContent = `₹${totalExpenses.toLocaleString()}`;
    document.getElementById('expenseDetails').textContent = 'utilities, maintenance, etc.';
    
    document.getElementById('totalCollections').textContent = `₹${totalCollections.toLocaleString()}`;
    document.getElementById('collectionDetails').textContent = 'rent + deposits collected';
    
    // Pending amount card removed - updated
    
    document.getElementById('capacityInfo').textContent = `₹${totalPotentialRevenue.toLocaleString()}`;
    document.getElementById('capacityDetails').textContent = 'total potential revenue';
    
    // Update profit/loss calculation
    updateProfitLossCalculation(totalCollections, totalExpenses);
}

// Update profit/loss calculation
function updateProfitLossCalculation(totalCollections, totalExpenses) {
    // Calculate cook salary (you can modify this logic as needed)
    // For now, let's assume cook salary is a fixed amount or calculate from expenses
    const cookSalary = calculateCookSalary(totalExpenses);
    
    // Calculate net result
    const netResult = totalCollections - totalExpenses - cookSalary;
    
    // Update display
    document.getElementById('totalCollectionDisplay').textContent = `₹${totalCollections.toLocaleString()}`;
    document.getElementById('totalExpenseDisplay').textContent = `₹${totalExpenses.toLocaleString()}`;
    document.getElementById('cookSalaryDisplay').textContent = `₹${cookSalary.toLocaleString()}`;
    
    // Update net result with color coding
    const netResultElement = document.getElementById('netResultDisplay');
    if (netResult >= 0) {
        netResultElement.textContent = `+₹${netResult.toLocaleString()} (Profit)`;
        netResultElement.style.color = '#10b981'; // Green for profit
    } else {
        netResultElement.textContent = `₹${netResult.toLocaleString()} (Loss)`;
        netResultElement.style.color = '#ef4444'; // Red for loss
    }
}

// Calculate cook salary (you can modify this logic)
function calculateCookSalary(totalExpenses) {
    return 15000;
}

// Display transactions
function displayTransactions() {
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';
    
    if (transactionsData.length === 0) {
        transactionList.innerHTML = `
            <div class="no-transactions">
                <p>No transactions found. Add some transactions to see them here.</p>
                <button class="btn-primary" onclick="addTransaction()">Add Transaction</button>
            </div>
        `;
        return;
    }
    
    transactionsData.forEach(transaction => {
        const transactionElement = createTransactionElement(transaction);
        transactionList.appendChild(transactionElement);
    });
}

// Create transaction element
function createTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    
    const typeIcon = getTransactionIcon(transaction.type);
    const amountClass = getAmountClass(transaction.type);
    
    // Get bed display name and occupant name if bedId exists
    let bedDisplayName = '';
    let occupantName = '';
    
    if (transaction.bedId && bedsData[transaction.bedId]) {
        const bedData = bedsData[transaction.bedId];
        const roomName = bedData.room.charAt(0).toUpperCase() + bedData.room.slice(1);
        bedDisplayName = `${roomName} Bed ${bedData.bedNumber}`;
        
        // Add occupant name if bed is occupied
        if (bedData.isOccupied && bedData.occupantName) {
            occupantName = ` - ${bedData.occupantName}`;
        }
    }
    
    // Use note as description, or fallback to type
    const description = transaction.note || transaction.type;
    
    div.innerHTML = `
        <div class="transaction-icon">${typeIcon}</div>
        <div class="transaction-details">
            <div class="transaction-title">${description}</div>
            <div class="transaction-meta">
                <span class="transaction-date">${formatDate(transaction.date)}</span>
                ${bedDisplayName ? `<span class="transaction-bed">${bedDisplayName}${occupantName}</span>` : ''}
            </div>
        </div>
        <div class="transaction-amount ${amountClass}">
            ₹${(transaction.amount || 0).toLocaleString()}
        </div>
    `;
    
    return div;
}

// Get transaction icon
function getTransactionIcon(type) {
    switch(type) {
        case 'collection': return '💰';
        case 'expense': return '💸';
        default: return '📊';
    }
}

// Get status class
function getStatusClass(status) {
    switch(status) {
        case 'collected': return 'status-collected';
        case 'pending': return 'status-pending';
        case 'overdue': return 'status-overdue';
        default: return 'status-pending';
    }
}

// Get amount class
function getAmountClass(type) {
    switch(type) {
        case 'expense': return 'amount-expense';
        case 'collection': return 'amount-income';
        default: return 'amount-neutral';
    }
}

// Get bed display name
function getBedDisplayName(bedId) {
    if (bedsData[bedId]) {
        const bedData = bedsData[bedId];
        return `${bedData.room.charAt(0).toUpperCase() + bedData.room.slice(1)} Bed ${bedData.bedNumber}`;
    }
    return bedId;
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

// Filter transactions
function filterTransactions() {
    const type = document.getElementById('transactionType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    let filteredTransactions = transactionsData;
    
    // Filter by type
    if (type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
    }
    
    // Filter by date range
    if (startDate) {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= new Date(startDate));
    }
    
    if (endDate) {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= new Date(endDate));
    }
    
    // Display filtered transactions
    displayFilteredTransactions(filteredTransactions);
}

// Display filtered transactions
function displayFilteredTransactions(transactions) {
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="no-transactions">
                <p>No transactions match your filters.</p>
            </div>
        `;
        return;
    }
    
    // Calculate total amount for filtered transactions
    const totalAmount = transactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    
    // Create total summary element
    const totalSummary = document.createElement('div');
    totalSummary.className = 'filtered-total-summary';
    totalSummary.innerHTML = `
        <div class="total-summary-card">
            <div class="total-summary-content">
                <h4>Filtered Total</h4>
                <div class="total-summary-amount">₹${totalAmount.toLocaleString()}</div>
                <div class="total-summary-count">${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}</div>
            </div>
        </div>
    `;
    transactionList.appendChild(totalSummary);
    
    // Add transactions
    transactions.forEach(transaction => {
        const transactionElement = createTransactionElement(transaction);
        transactionList.appendChild(transactionElement);
    });
}

// Add transaction
function addTransaction() {
    showTransactionModal();
}

// Show transaction modal
function showTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (!modal) {
        createTransactionModal();
    }
    
    // Reset form
    document.getElementById('transactionForm').reset();
    document.getElementById('amount').value = '';
    document.getElementById('note').value = '';
    document.getElementById('note').required = false;
    document.getElementById('noteLabel').textContent = 'Note (Optional)';
    
    // Populate bed dropdown
    populateBedDropdown();
    
    // Show modal
    document.getElementById('transactionModal').style.display = 'block';
}

// Create transaction modal
function createTransactionModal() {
    const modalHTML = `
        <div id="transactionModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Transaction</h3>
                    <span class="close" onclick="closeTransactionModal()">&times;</span>
                </div>
                <form id="transactionForm" onsubmit="saveTransaction(event)">
                    <div class="form-group">
                        <label for="modalTransactionType">Transaction Type:</label>
                        <select id="modalTransactionType" name="transactionType" required onchange="updateTransactionType()">
                            <option value="">Select Type</option>
                            <option value="collection">Collection (Rent/Deposit)</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="bedSelectionGroup" style="display: none;">
                        <label for="bedSelection">Select Bed:</label>
                        <select id="bedSelection" name="bedSelection" onchange="updateAmountFromBed()">
                            <option value="">Select Bed</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="amount">Amount (₹):</label>
                        <input type="number" id="amount" name="amount" min="0" step="0.01" required onchange="checkAmountChange()">
                    </div>
                    
                    <div class="form-group">
                        <label for="note" id="noteLabel">Note (Optional):</label>
                        <textarea id="note" name="note" rows="3" placeholder="Enter transaction details..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="date">Date:</label>
                        <input type="date" id="date" name="date" required>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" onclick="closeTransactionModal()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Save Transaction</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set default date to today
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
}

// Populate bed dropdown
function populateBedDropdown() {
    const bedSelect = document.getElementById('bedSelection');
    if (!bedSelect) {
        return;
    }
    
    bedSelect.innerHTML = '<option value="">Select Bed</option>';
    
    // Add beds from bedsData
    Object.keys(bedsData).forEach(bedId => {
        const bedData = bedsData[bedId];
        const roomName = bedData.room.charAt(0).toUpperCase() + bedData.room.slice(1);
        const bedNumber = bedData.bedNumber;
        const occupantName = bedData.isOccupied ? ` - ${bedData.occupantName}` : ' - Available';
        
        const option = document.createElement('option');
        option.value = bedId;
        option.textContent = `${roomName} Bed ${bedNumber}${occupantName}`;
        option.dataset.price = bedData.price || 0;
        bedSelect.appendChild(option);
    });
}

// Update transaction type
function updateTransactionType() {
    const transactionType = document.getElementById('modalTransactionType').value;
    const bedSelectionGroup = document.getElementById('bedSelectionGroup');
    
    if (transactionType === 'collection') {
        bedSelectionGroup.style.display = 'block';
        // Repopulate dropdown when showing
        populateBedDropdown();
    } else {
        bedSelectionGroup.style.display = 'none';
        document.getElementById('bedSelection').value = '';
        document.getElementById('amount').value = '';
    }
}

// Update amount from selected bed
function updateAmountFromBed() {
    const bedSelect = document.getElementById('bedSelection');
    const amountInput = document.getElementById('amount');
    
    if (bedSelect.value) {
        const selectedOption = bedSelect.selectedOptions[0];
        const price = parseFloat(selectedOption.dataset.price) || 0;
        amountInput.value = price;
        
        // Clear any previous note requirement
        document.getElementById('note').required = false;
        document.getElementById('noteLabel').textContent = 'Note (Optional)';
    } else {
        amountInput.value = '';
    }
}

// Check if amount was changed from default
function checkAmountChange() {
    const bedSelect = document.getElementById('bedSelection');
    const amountInput = document.getElementById('amount');
    const noteInput = document.getElementById('note');
    const noteLabel = document.getElementById('noteLabel');
    
    if (bedSelect.value) {
        const selectedOption = bedSelect.selectedOptions[0];
        const defaultPrice = parseFloat(selectedOption.dataset.price) || 0;
        const currentAmount = parseFloat(amountInput.value) || 0;
        
        if (currentAmount !== defaultPrice) {
            // Amount was changed, make note required
            noteInput.required = true;
            noteLabel.textContent = 'Note (Required - Amount was changed)';
            noteLabel.style.color = '#dc3545';
        } else {
            // Amount is default, note is optional
            noteInput.required = false;
            noteLabel.textContent = 'Note (Optional)';
            noteLabel.style.color = '#374151';
        }
    }
}

// Save transaction
async function saveTransaction(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const transactionData = {
        type: formData.get('transactionType'),
        bedId: formData.get('bedSelection') || null,
        amount: parseFloat(formData.get('amount')),
        note: formData.get('note'),
        date: formData.get('date'),
        createdAt: new Date().toISOString()
    };
    
    // Check for duplicate collection transactions for same bed on same date
    if (transactionData.type === 'collection' && transactionData.bedId) {
        const existingTransaction = transactionsData.find(t => 
            t.type === 'collection' && 
            t.bedId === transactionData.bedId && 
            t.date === transactionData.date
        );
        
        if (existingTransaction) {
            alert(`A collection transaction for this bed already exists on ${transactionData.date}. Please choose a different date or bed.`);
            return;
        }
    }
    
    try {
        // Generate unique ID for the transaction
        const transactionId = `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Save to Firestore
        await window.firestoreSetDoc(window.firestoreDoc(window.firebaseDB, 'transactions', transactionId), transactionData);
        
        // Add to local transactionsData array
        transactionsData.push({...transactionData, id: transactionId});
        
        // Update UI
        updateTransactionSummary();
        displayTransactions();
        
        // Close modal
        closeTransactionModal();
        
        // Show success message
        alert('Transaction added successfully!');
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Failed to save transaction. Please try again.');
    }
}

// Close transaction modal
function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
}

// Sign out is now handled by shared-auth.js
