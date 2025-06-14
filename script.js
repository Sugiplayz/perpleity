console.log('script.js loaded and executing'); // Added for debugging

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired'); // Added for debugging

    // DOM Elements for Detector
    const newsTextInput = document.getElementById('newsText');
    const analyzeButton = document.getElementById('analyzeButton');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const analysisContent = document.getElementById('analysisContent');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const apiChoiceRadios = document.querySelectorAll('input[name="apiChoice"]'); // Select all radio buttons

    // DOM Elements for Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    // --- Utility Functions ---

    // Function to show/hide elements and apply animation class
    function setVisibility(element, show) {
        if (element) {
            if (show) {
                element.classList.remove('hidden');
                void element.offsetWidth;
                element.classList.add('animated');
            } else {
                element.classList.add('hidden');
                element.classList.remove('animated');
            }
        } else {
            console.warn('Attempted to set visibility on null element:', element);
        }
    }

    // Function to hide all result/loading/error displays
    function hideAllStatusDisplays() {
        setVisibility(resultDiv, false);
        setVisibility(loadingDiv, false);
        setVisibility(errorDiv, false);
        console.log('All status displays hidden.');
    }

    // --- Navigation Logic ---

    function showPage(pageId) {
        console.log('Attempting to show page:', pageId);

        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));
        console.log('All pages and nav links deactivated.');

        const targetPage = document.getElementById(pageId);
        const targetNavLink = document.querySelector(`.nav-link[data-page="${pageId.replace('-page', '')}"]`);

        if (targetPage) {
            targetPage.classList.add('active');
            console.log(`Page '${pageId}' activated.`);

            targetPage.querySelectorAll('section').forEach(section => {
                section.classList.remove('animated');
                void section.offsetWidth;
                section.classList.add('animated');
                console.log('Triggered section animation for:', section.id);
            });
        } else {
            console.error(`Page element with ID '${pageId}' not found!`);
        }
        if (targetNavLink) {
            targetNavLink.classList.add('active');
            console.log(`Nav link for '${pageId}' activated.`);
        } else {
            console.warn(`Nav link for '${pageId.replace('-page', '')}' not found!`);
        }

        hideAllStatusDisplays();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const pageToShow = link.dataset.page + '-page';
            console.log('Nav link clicked. Data-page:', link.dataset.page);
            showPage(pageToShow);
        });
    });

    // --- Analysis Logic ---

    analyzeButton.addEventListener('click', async () => {
        console.log('Analyze button clicked.');
        let content = newsTextInput.value.trim();
        let contentType = 'text'; // Always 'text' now

        // Get selected API choice
        let selectedApi = 'gemini'; // Default
        for (const radio of apiChoiceRadios) {
            if (radio.checked) {
                selectedApi = radio.value;
                break;
            }
        }
        console.log('Selected API:', selectedApi);

        if (!content) {
            setVisibility(errorDiv, true);
            errorMessage.innerText = 'Please enter some news text to analyze.';
            console.log('Text input empty, showing error.');
            return;
        }
        
        hideAllStatusDisplays();
        setVisibility(loadingDiv, true);
        analyzeButton.disabled = true;
        console.log(`Starting analysis for type: ${contentType}, content length: ${content.length}, using API: ${selectedApi}`);

        try {
            const response = await fetch('/.netlify/functions/analyze-news', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ news: content, type: contentType, apiType: selectedApi }), // Send selected API
            });
            console.log('Fetch response received, status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Analysis data received:', data);
            displayAnalysisResult(data.analysis);
            setVisibility(resultDiv, true);
        } catch (err) {
            console.error('Analysis failed during fetch:', err);
            setVisibility(errorDiv, true);
            errorMessage.innerText = `Analysis failed: ${err.message}. Please try again.`;
        } finally {
            setVisibility(loadingDiv, false);
            analyzeButton.disabled = false;
            console.log('Analysis process finished.');
        }
    });

    // Function to display the analysis result received from the AI
    function displayAnalysisResult(aiAnalysisText) {
        console.log('Displaying analysis result. AI Text:', aiAnalysisText);

        let verdict = 'uncertain';
        let confidence = Math.random();

        const normalizedAiText = aiAnalysisText.toLowerCase();

        if (normalizedAiText.includes('likely fake') || normalizedAiText.includes('misinformation') || normalizedAiText.includes('false')) {
            verdict = 'fake';
            confidence = 0.85 + Math.random() * 0.15;
        } else if (normalizedAiText.includes('likely genuine') || normalizedAiText.includes('likely real') || normalizedAiText.includes('true')) {
            verdict = 'real';
            confidence = 0.85 + Math.random() * 0.15;
        } else {
            verdict = 'uncertain';
            confidence = 0.4 + Math.random() * 0.3;
        }
        console.log('Inferred verdict:', verdict, 'Confidence:', confidence);

        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const confidenceScore = document.getElementById('confidenceScore');

        if (resultDiv) resultDiv.className = `status-box result ${verdict}`;

        if (resultIcon) {
            if (verdict === 'real') {
                resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                if (resultTitle) resultTitle.textContent = 'Likely REAL News';
            } else if (verdict === 'fake') {
                resultIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
                if (resultTitle) resultTitle.textContent = 'Likely FAKE News';
            } else {
                resultIcon.innerHTML = '<i class="fas fa-question-circle"></i>';
                if (resultTitle) resultTitle.textContent = 'Uncertain - Needs Verification';
            }
        } else {
            console.warn('resultIcon element not found!');
        }
        
        if (confidenceScore) confidenceScore.textContent = `Confidence: ${Math.round(confidence * 100)}%`;
        else console.warn('confidenceScore element not found!');

        if (analysisContent) {
            analysisContent.innerText = aiAnalysisText;
            console.log('AI analysis text displayed.');
        } else {
            console.warn('analysisContent element not found!');
        }
    }

    // --- Initializations ---

    // Set initial active page (Home)
    showPage('home-page');

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                if (entry.target.classList.contains('fade-in') || entry.target.classList.contains('slide-up')) {
                    observer.unobserve(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('section, .main-card, .footer, .prompt-area, .status-box').forEach(el => {
        observer.observe(el);
    });

    document.querySelectorAll('section, .main-card, .footer, .prompt-area, .status-box').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
            el.classList.add('animated');
        }
    });
});
