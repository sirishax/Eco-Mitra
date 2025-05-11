// --- SPA Navigation Helpers ---
function showSection(sectionId) {
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('report-section').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';

    // Animate report page
    if (sectionId === 'report-section') {
        triggerReportAnimations();
    }
}

function triggerReportAnimations() {
    // Animate card
    const card = document.querySelector('#report-section .analysis-card');
    if (card) {
        card.classList.remove('animate-report');
        void card.offsetWidth; // reflow
        card.classList.add('animate-report');
    }
    // Animate sections
    const sections = [
        document.querySelector('#report-section .rating-section'),
        document.querySelector('#report-section .justification-section'),
        document.querySelector('#report-section .alternatives-section')
    ];
    sections.forEach((sec, i) => {
        if (sec) {
            sec.classList.remove('animate-section');
            setTimeout(() => sec.classList.add('animate-section'), 200 + i * 180);
        }
    });
    // Animate only filled stars
    const stars = document.querySelectorAll('#report-section .star');
    let rating = 0;
    const ratingValue = document.querySelector('#report-section .rating-value');
    if (ratingValue && ratingValue.textContent) {
        const match = ratingValue.textContent.match(/(\d)/);
        if (match) rating = parseInt(match[1]);
    }
    stars.forEach((star, i) => {
        star.classList.remove('animated');
        if (i < rating) {
            setTimeout(() => star.classList.add('animated'), 400 + i * 120);
        }
    });
    // Animate alternatives
    const altItems = document.querySelectorAll('#report-section .alternative-item');
    altItems.forEach((item, i) => {
        item.classList.remove('animated');
        setTimeout(() => item.classList.add('animated'), 800 + i * 180);
    });
}

// --- Button Event Listeners for Navigation ---
document.addEventListener('DOMContentLoaded', () => {
    // Navigation buttons
    const getStartedBtn = document.getElementById('get-started-btn');
    const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
    const backToUploadBtn = document.getElementById('back-to-upload-btn');

    if (getStartedBtn) {
        getStartedBtn.onclick = () => showSection('upload-section');
    }
    if (backToWelcomeBtn) {
        backToWelcomeBtn.onclick = () => showSection('welcome-section');
    }
    if (backToUploadBtn) {
        backToUploadBtn.onclick = () => showSection('upload-section');
    }

    // Start on welcome page
    showSection('welcome-section');

    // --- Drag and Drop for Upload ---
    const dropArea = document.getElementById('drop-area');
    const imageInput = document.getElementById('image-upload');
    const fileBrowse = document.querySelector('.file-browse');
    const imagePreview = document.getElementById('image-preview');

    if (dropArea && imageInput) {
        // Highlight drop area on drag
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropArea.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropArea.classList.remove('dragover');
            });
        });
        // Handle file drop
        dropArea.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                imageInput.files = e.dataTransfer.files;
                const file = e.dataTransfer.files[0];
                showImagePreview(file);
            }
        });
        // Make "Browse" text open file dialog
        if (fileBrowse) {
            fileBrowse.addEventListener('click', (e) => {
                e.preventDefault();
                imageInput.click();
            });
        }
        // Show preview on file select
        imageInput.addEventListener('change', function() {
            const file = this.files[0];
            showImagePreview(file);
        });
    }

    function showImagePreview(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
    }
});

// Spinner helpers
function showSpinner() {
    document.getElementById('loading-spinner').style.display = 'block';
}
function hideSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
}

// Function to update the rating display
function updateRating(rating) {
    const stars = document.querySelectorAll('#report-section .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('filled');
            star.classList.remove('animated');
        } else {
            star.classList.remove('filled');
            star.classList.remove('animated');
        }
    });
    document.querySelector('#report-section .rating-value').textContent = `${rating}/5`;
}

// Function to update the justification text
function updateJustification(justification) {
    document.querySelector('#report-section .justification-text').textContent = justification;
}

// Function to create and append alternative items
function updateAlternatives(alternatives) {
    const alternativesList = document.querySelector('#report-section .alternatives-list');
    alternativesList.innerHTML = '';
    alternatives.forEach(alternative => {
        const alternativeItem = document.createElement('div');
        alternativeItem.className = 'alternative-item';
        const nameElement = document.createElement('div');
        nameElement.className = 'alternative-name';
        nameElement.textContent = alternative.name;
        const reasonElement = document.createElement('div');
        reasonElement.className = 'alternative-reason';
        reasonElement.textContent = alternative.reason;
        alternativeItem.appendChild(nameElement);
        alternativeItem.appendChild(reasonElement);
        alternativesList.appendChild(alternativeItem);
    });
}

// Function to update the product and material display
function updateProductAndMaterial(product, material) {
    document.getElementById('product-value').textContent = product || '-';
    document.getElementById('material-value').textContent = material || '-';
}

// Handle form submit for image upload
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
    const analyzeBtn = uploadForm.querySelector('button[type="submit"]');
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const imageInput = document.getElementById('image-upload');
        const file = imageInput.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        // Show loading state
        showSpinner();
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
        // Hide report section while analyzing
        document.getElementById('report-section').style.display = 'none';
        try {
            const response = await fetch('http://localhost:5000/analyze', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const productAnalysis = await response.json();
            updateProductAndMaterial(productAnalysis.product, productAnalysis.material);
            updateRating(productAnalysis.rating);
            updateJustification(productAnalysis.justification);
            updateAlternatives(productAnalysis.alternatives);
            showSection('report-section');
        } catch (error) {
            console.error('Error uploading or analyzing image:', error);
            updateJustification('Error analyzing image. Please try again.');
            showSection('report-section');
        } finally {
            hideSpinner();
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze';
        }
    });
}

// Initial fetch for default analysis (optional, can be removed if only upload is allowed)
async function fetchAndUpdateAnalysis() {
    try {
        console.log('Fetching analysis data...');
        showSpinner();
        const response = await fetch('http://localhost:5000/analyze');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const productAnalysis = await response.json();
        console.log('Received data:', productAnalysis);
        
        // Update UI with the fetched data
        updateRating(productAnalysis.rating);
        updateJustification(productAnalysis.justification);
        updateAlternatives(productAnalysis.alternatives);
    } catch (error) {
        console.error('Error fetching product analysis:', error);
        // You might want to show an error message to the user here
        document.querySelector('#report-section .justification-text').textContent = 'Error loading product analysis. Please try again later.';
    } finally {
        hideSpinner();
    }
}

// Call fetchAndUpdateAnalysis when the DOM is loaded
document.addEventListener('DOMContentLoaded', fetchAndUpdateAnalysis);

// Mobile menu functionality
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const icon = mobileMenuBtn.querySelector('i');
    if (navLinks.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-container') && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        const icon = mobileMenuBtn.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear user data from localStorage
            localStorage.removeItem('user');
            // Redirect to home page
            window.location.href = 'home.html';
        });
    }
}); 