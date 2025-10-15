// Firestore Export Script for Comfort Stays PG
// Comprehensive data export solution with multiple formats and options

// Global variables
let selectedCollections = new Set();
let collectionData = {};
let exportInProgress = false;
let currentExportFiles = [];

// Initialize the export interface
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Firebase
    const firebaseReady = await initializeFirebase();
    if (!firebaseReady) {
        showStatus('Firebase initialization failed', 'error');
        return;
    }

    // Check authentication
    const authResult = await checkOwnerAuthentication();
    if (!authResult.authenticated) {
        showStatus('Authentication required', 'error');
        return;
    }

    // Show export interface
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('exportInterface').style.display = 'block';

    // Load collections
    await loadCollections();

    // Setup event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Export type change
    document.getElementById('exportType').addEventListener('change', function() {
        const dateRangeOptions = document.getElementById('dateRangeOptions');
        if (this.value === 'dateRange') {
            dateRangeOptions.style.display = 'block';
        } else {
            dateRangeOptions.style.display = 'none';
        }
    });

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('endDate').value = today;
    document.getElementById('startDate').value = lastMonth;
}

// Load all collections from Firestore
async function loadCollections() {
    try {
        showStatus('Loading collections...', 'info');
        
        const collections = [
            { name: 'beds', description: 'Bed management and occupancy data', icon: '🛏️' },
            { name: 'ac-readings', description: 'AC meter readings and usage data', icon: '❄️' },
            { name: 'ac-bills', description: 'AC billing and payment records', icon: '💰' },
            { name: 'guest-documents', description: 'Guest document uploads and metadata', icon: '📄' },
            { name: 'transactions', description: 'Financial transactions and payments', icon: '💳' },
            { name: 'history', description: 'Historical data and audit logs', icon: '📊' }
        ];

        const collectionGrid = document.getElementById('collectionGrid');
        collectionGrid.innerHTML = '';

        for (const collection of collections) {
            try {
                const count = await getCollectionCount(collection.name);
                const card = createCollectionCard(collection, count);
                collectionGrid.appendChild(card);
            } catch (error) {
                console.error(`Error loading collection ${collection.name}:`, error);
                const card = createCollectionCard(collection, 'Error');
                collectionGrid.appendChild(card);
            }
        }

        showStatus('Collections loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading collections:', error);
        showStatus('Error loading collections: ' + error.message, 'error');
    }
}

// Get document count for a collection
async function getCollectionCount(collectionName) {
    try {
        const collectionRef = window.firestoreCollection(window.firebaseDB, collectionName);
        const snapshot = await window.firestoreGetDocs(collectionRef);
        return snapshot.size;
    } catch (error) {
        console.error(`Error counting documents in ${collectionName}:`, error);
        return 'Error';
    }
}

// Create collection card
function createCollectionCard(collection, count) {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.onclick = () => toggleCollection(collection.name, card);
    
    card.innerHTML = `
        <div class="collection-name">${collection.icon} ${collection.name}</div>
        <div class="collection-count">${count} documents</div>
        <div style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">
            ${collection.description}
        </div>
    `;
    
    return card;
}

// Toggle collection selection
function toggleCollection(collectionName, cardElement) {
    if (selectedCollections.has(collectionName)) {
        selectedCollections.delete(collectionName);
        cardElement.classList.remove('selected');
    } else {
        selectedCollections.add(collectionName);
        cardElement.classList.add('selected');
    }
    
    updateExportButton();
}

// Toggle all collections
function toggleAllCollections() {
    const selectAll = document.getElementById('selectAll').checked;
    const cards = document.querySelectorAll('.collection-card');
    
    selectedCollections.clear();
    
    cards.forEach((card, index) => {
        const collectionName = card.querySelector('.collection-name').textContent.split(' ').slice(1).join(' ');
        if (selectAll) {
            selectedCollections.add(collectionName);
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    updateExportButton();
}

// Update export button state
function updateExportButton() {
    const exportBtn = document.getElementById('startExportBtn');
    const exportBtnText = document.getElementById('exportBtnText');
    
    if (selectedCollections.size === 0) {
        exportBtn.disabled = true;
        exportBtnText.textContent = '📥 Select Collections First';
    } else {
        exportBtn.disabled = false;
        exportBtnText.textContent = `📥 Export ${selectedCollections.size} Collections`;
    }
}

// Start export process
async function startExport() {
    if (exportInProgress) {
        showStatus('Export already in progress', 'error');
        return;
    }

    if (selectedCollections.size === 0) {
        showStatus('Please select at least one collection', 'error');
        return;
    }

    exportInProgress = true;
    updateExportUI(true);

    try {
        showStatus('Starting export process...', 'info');
        showProgress(0, 'Initializing export...');

        const exportFormat = document.getElementById('exportFormat').value;
        const exportType = document.getElementById('exportType').value;
        const includeStorage = document.getElementById('includeStorage').checked;
        const includeMetadata = document.getElementById('includeMetadata').checked;
        const cleanEmptyFields = document.getElementById('cleanEmptyFields').checked;

        // Get date range if needed
        let dateFilter = null;
        if (exportType === 'dateRange') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                dateFilter = {
                    start: new Date(startDate),
                    end: new Date(endDate)
                };
            }
        }

        // Export each selected collection
        const exportResults = {};
        const totalCollections = selectedCollections.size;
        let completedCollections = 0;

        for (const collectionName of selectedCollections) {
            showProgress(
                (completedCollections / totalCollections) * 100,
                `Exporting ${collectionName}...`
            );

            try {
                const data = await exportCollection(collectionName, dateFilter, includeMetadata);
                exportResults[collectionName] = data;
                
                // Export storage files if requested
                if (includeStorage && collectionName === 'guest-documents') {
                    await exportStorageFiles(data);
                }
                
                completedCollections++;
            } catch (error) {
                console.error(`Error exporting ${collectionName}:`, error);
                exportResults[collectionName] = { error: error.message };
                completedCollections++;
            }
        }

        showProgress(100, 'Finalizing export...');

        // Clean and generate export files
        let cleaningInfo = { totalFieldsRemoved: 0, collectionsCleaned: 0 };
        if (cleanEmptyFields) {
            cleaningInfo = await cleanExportData(exportResults);
        }
        
        const files = await generateExportFiles(exportResults, exportFormat);
        currentExportFiles = files; // Store files globally
        
        // Display results
        displayExportResults(files);
        
        // Show cleaning information
        if (cleanEmptyFields && cleaningInfo.totalFieldsRemoved > 0) {
            showStatus(`Export completed! Cleaned ${cleaningInfo.totalFieldsRemoved} empty fields across ${cleaningInfo.collectionsCleaned} collections. Generated ${files.length} files.`, 'success');
        } else if (cleanEmptyFields) {
            showStatus(`Export completed! No empty fields found to clean. Generated ${files.length} files.`, 'success');
        } else {
            showStatus(`Export completed successfully! Generated ${files.length} files. (Empty fields preserved as requested)`, 'success');
        }
        
    } catch (error) {
        console.error('Export failed:', error);
        showStatus('Export failed: ' + error.message, 'error');
    } finally {
        exportInProgress = false;
        updateExportUI(false);
        hideProgress();
    }
}

// Export a single collection
async function exportCollection(collectionName, dateFilter, includeMetadata) {
    try {
        const collectionRef = window.firestoreCollection(window.firebaseDB, collectionName);
        let snapshot;

        if (dateFilter) {
            // Apply date filter if provided
            // Note: This is a simplified version - you might need more complex querying
            snapshot = await window.firestoreGetDocs(collectionRef);
            // Filter by date in JavaScript (not ideal for large datasets)
            const filteredDocs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const docDate = data.timestamp || data.createdAt || data.date || new Date();
                if (docDate >= dateFilter.start && docDate <= dateFilter.end) {
                    filteredDocs.push({ id: doc.id, ...data });
                }
            });
            return filteredDocs;
        } else {
            snapshot = await window.firestoreGetDocs(collectionRef);
            const docs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (includeMetadata) {
                    docs.push({ 
                        id: doc.id, 
                        ...data,
                        _metadata: {
                            exportedAt: new Date().toISOString(),
                            collection: collectionName
                        }
                    });
                } else {
                    docs.push({ id: doc.id, ...data });
                }
            });
            return docs;
        }
    } catch (error) {
        console.error(`Error exporting collection ${collectionName}:`, error);
        throw error;
    }
}

// Export Firebase Storage files
async function exportStorageFiles(guestDocuments) {
    try {
        showStatus('Exporting storage files...', 'info');
        
        for (const doc of guestDocuments) {
            if (doc.storagePath && doc.downloadURL) {
                try {
                    // Create a download link for the file
                    const link = document.createElement('a');
                    link.href = doc.downloadURL;
                    link.download = doc.fileName || 'document';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    // Note: Actual download would require user interaction
                    document.body.removeChild(link);
                } catch (error) {
                    console.error(`Error processing storage file ${doc.fileName}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error exporting storage files:', error);
    }
}

// Generate export files in different formats
async function generateExportFiles(exportResults, format) {
    const files = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
        if (format === 'json') {
            // Generate individual JSON files for each collection
            for (const [collectionName, data] of Object.entries(exportResults)) {
                if (data.error) continue;
                
                const fileName = `${collectionName}_${timestamp}.json`;
                const jsonData = JSON.stringify(data, null, 2);
                files.push({
                    name: fileName,
                    data: jsonData,
                    type: 'application/json',
                    size: new Blob([jsonData]).size
                });
            }
            
            // Generate combined JSON file with cleaned data
            const combinedFileName = `complete_export_${timestamp}.json`;
            const combinedData = JSON.stringify(exportResults, null, 2);
            files.push({
                name: combinedFileName,
                data: combinedData,
                type: 'application/json',
                size: new Blob([combinedData]).size
            });
            
        } else if (format === 'csv') {
            // Generate CSV files for each collection
            for (const [collectionName, data] of Object.entries(exportResults)) {
                if (data.error) continue;
                
                const fileName = `${collectionName}_${timestamp}.csv`;
                const csvData = convertToCSV(data);
                files.push({
                    name: fileName,
                    data: csvData,
                    type: 'text/csv',
                    size: new Blob([csvData]).size
                });
            }
            
        } else if (format === 'excel') {
            // Generate Excel file (simplified - would need a library like SheetJS for full support)
            const fileName = `complete_export_${timestamp}.xlsx`;
            // For now, create a JSON file with .xlsx extension
            // In a real implementation, you'd use SheetJS to create actual Excel files
            const excelData = JSON.stringify(exportResults, null, 2);
            files.push({
                name: fileName,
                data: excelData,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: new Blob([excelData]).size
            });
        }
        
        return files;
    } catch (error) {
        console.error('Error generating export files:', error);
        throw error;
    }
}

// Clean JSON data by removing fields that are empty for all entries
function cleanJSONData(data) {
    if (!data || data.length === 0) return { cleanedData: data, removedFields: 0 };
    
    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });
    
    // Find keys that have at least one non-empty value
    const nonEmptyKeys = Array.from(allKeys).filter(key => {
        return data.some(item => {
            const value = item[key];
            return value !== null && 
                   value !== undefined && 
                   value !== '' && 
                   !(Array.isArray(value) && value.length === 0) &&
                   !(typeof value === 'object' && Object.keys(value).length === 0);
        });
    });
    
    const removedFieldsCount = allKeys.size - nonEmptyKeys.size;
    
    // Filter each object to only include non-empty keys
    const cleanedData = data.map(item => {
        const cleanedItem = {};
        nonEmptyKeys.forEach(key => {
            cleanedItem[key] = item[key];
        });
        return cleanedItem;
    });
    
    return { cleanedData, removedFields: removedFieldsCount };
}

// Clean export data and return statistics
async function cleanExportData(exportResults) {
    let totalFieldsRemoved = 0;
    let collectionsCleaned = 0;
    
    for (const [collectionName, data] of Object.entries(exportResults)) {
        if (data.error) continue;
        
        const cleaningResult = cleanJSONData(data);
        if (cleaningResult.removedFields > 0) {
            // Replace the data with cleaned version
            exportResults[collectionName] = cleaningResult.cleanedData;
            totalFieldsRemoved += cleaningResult.removedFields;
            collectionsCleaned++;
        }
    }
    
    return { totalFieldsRemoved, collectionsCleaned };
}

// Convert data to CSV format
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });
    
    const keys = Array.from(allKeys);
    
    // Remove columns that are completely empty
    const nonEmptyKeys = keys.filter(key => {
        return data.some(item => {
            const value = item[key];
            return value !== null && 
                   value !== undefined && 
                   value !== '' && 
                   !(Array.isArray(value) && value.length === 0) &&
                   !(typeof value === 'object' && Object.keys(value).length === 0);
        });
    });
    
    // Create CSV header
    const header = nonEmptyKeys.join(',');
    
    // Create CSV rows
    const rows = data.map(item => {
        return nonEmptyKeys.map(key => {
            const value = item[key];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });
    
    return [header, ...rows].join('\n');
}

// Display export results
function displayExportResults(files) {
    const exportResults = document.getElementById('exportResults');
    const fileList = document.getElementById('fileList');
    
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const sizeKB = Math.round(file.size / 1024);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${sizeKB} KB</div>
            </div>
            <button class="download-btn" data-file-index="${index}">
                📥 Download
            </button>
        `;
        
        // Add event listener to the button
        const downloadBtn = fileItem.querySelector('.download-btn');
        downloadBtn.addEventListener('click', () => {
            const fileToDownload = currentExportFiles[index];
            if (fileToDownload) {
                downloadFile(fileToDownload.name, fileToDownload.data, fileToDownload.type);
            }
        });
        
        fileList.appendChild(fileItem);
    });
    
    exportResults.style.display = 'block';
}

// Download file
function downloadFile(fileName, data, type) {
    try {
        const blob = new Blob([data], { type: type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatus(`Downloaded ${fileName}`, 'success');
    } catch (error) {
        console.error('Download failed:', error);
        showStatus(`Download failed: ${error.message}`, 'error');
    }
}

// Preview data
async function previewData() {
    if (selectedCollections.size === 0) {
        showStatus('Please select at least one collection to preview', 'error');
        return;
    }
    
    try {
        showStatus('Loading preview data...', 'info');
        
        const previewData = {};
        for (const collectionName of selectedCollections) {
            const data = await exportCollection(collectionName, null, false);
            previewData[collectionName] = data.slice(0, 5); // Show first 5 documents
        }
        
        // Create preview modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 80%; max-height: 80%; overflow-y: auto;">
                <h3 style="margin-bottom: 20px;">📊 Data Preview</h3>
                <pre style="background: #f8f9fa; padding: 20px; border-radius: 10px; overflow-x: auto;">
${JSON.stringify(previewData, null, 2)}
                </pre>
                <button onclick="this.closest('.modal').remove()" class="btn" style="margin-top: 20px;">
                    Close Preview
                </button>
            </div>
        `;
        
        modal.className = 'modal';
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Preview failed:', error);
        showStatus(`Preview failed: ${error.message}`, 'error');
    }
}

// Schedule export (placeholder)
function scheduleExport() {
    showStatus('Scheduled export feature coming soon!', 'info');
}

// Show export history (placeholder)
function showExportHistory() {
    showStatus('Export history feature coming soon!', 'info');
}

// Update export options
function updateExportOptions() {
    // Placeholder for future options
}

// Update export UI state
function updateExportUI(exporting) {
    const exportBtn = document.getElementById('startExportBtn');
    const exportBtnText = document.getElementById('exportBtnText');
    
    if (exporting) {
        exportBtn.disabled = true;
        exportBtnText.innerHTML = '<span class="loading-spinner"></span> Exporting...';
    } else {
        exportBtn.disabled = false;
        exportBtnText.textContent = `📥 Export ${selectedCollections.size} Collections`;
    }
}

// Show progress
function showProgress(percentage, message) {
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressSection.style.display = 'block';
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = message;
}

// Hide progress
function hideProgress() {
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'none';
}

// Show status message
function showStatus(message, type) {
    const statusMessages = document.getElementById('statusMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message status-${type}`;
    messageDiv.textContent = message;
    
    statusMessages.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        const authResult = await window.signInWithGoogle();
        if (authResult.authenticated) {
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('exportInterface').style.display = 'block';
            await loadCollections();
            setupEventListeners();
        } else {
            showStatus('Authentication failed', 'error');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showStatus('Sign in failed: ' + error.message, 'error');
    }
}

// Sign out user
async function signOutUser() {
    try {
        await window.signOutUser();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Sign out error:', error);
        showStatus('Sign out failed: ' + error.message, 'error');
    }
}

// Make functions globally available
window.startExport = startExport;
window.toggleCollection = toggleCollection;
window.toggleAllCollections = toggleAllCollections;
window.updateExportOptions = updateExportOptions;
window.previewData = previewData;
window.scheduleExport = scheduleExport;
window.showExportHistory = showExportHistory;
window.downloadFile = downloadFile;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
