/* ==========================================================================
   EndoAware Application Logic
   Pattern Analysis Engine, LocalStorage Sync & Pitch Mode Simulator
   ========================================================================= */

// --- Application State ---
let appState = {
    logs: [],
    activeTab: 'dashboard'
};

// --- DOM References ---
const dom = {
    navItems: document.querySelectorAll('.nav-item'),
    tabViews: document.querySelectorAll('.tab-view'),
    viewTitle: document.getElementById('view-title'),
    
    // Form elements
    symptomForm: document.getElementById('symptomForm'),
    logDate: document.getElementById('logDate'),
    painSlider: document.getElementById('painSlider'),
    painBadge: document.getElementById('painBadge'),
    familyHistory: document.getElementById('familyHistory'),
    
    // Dashboard indicators
    gaugeIndicator: document.getElementById('gaugeIndicator'),
    txtRiskLevel: document.getElementById('txtRiskLevel'),
    txtRiskScore: document.getElementById('txtRiskScore'),
    txtRiskDesc: document.getElementById('txtRiskDesc'),
    riskAlertBox: document.getElementById('riskAlertBox'),
    riskAlertText: document.getElementById('riskAlertText'),
    statCycleCount: document.getElementById('statCycleCount'),
    statAvgPain: document.getElementById('statAvgPain'),
    statSymptomCluster: document.getElementById('statSymptomCluster'),
    tblLogsBody: document.getElementById('tblLogsBody'),
    
    // Trend view elements
    trendDirection: document.getElementById('trendDirection'),
    chartLines: document.getElementById('chartLines'),
    chartPoints: document.getElementById('chartPoints'),
    chartLabels: document.getElementById('chartLabels'),
    insightChronicity: document.getElementById('insightChronicity'),
    insightEscalation: document.getElementById('insightEscalation'),
    insightClustering: document.getElementById('insightClustering'),
    
    // Report elements
    reportGenDate: document.getElementById('reportGenDate'),
    repTrackingPeriod: document.getElementById('repTrackingPeriod'),
    repCycleCount: document.getElementById('repCycleCount'),
    repAvgPain: document.getElementById('repAvgPain'),
    repFamilyHistory: document.getElementById('repFamilyHistory'),
    repRiskLevel: document.getElementById('repRiskLevel'),
    repRiskRecommendation: document.getElementById('repRiskRecommendation'),
    repRiskBox: document.getElementById('repRiskBox'),
    repSymptomGrid: document.getElementById('repSymptomGrid'),
    repTableBody: document.getElementById('repTableBody'),
    prepMaxPain: document.getElementById('prepMaxPain'),
    
    // Pitch buttons
    btnLoadDemo: document.getElementById('btnLoadDemo'),
    btnClearDemo: document.getElementById('btnClearDemo')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadStateFromStorage();
    setupEventListeners();
    renderApp();
    
    // Set default date picker value to today
    const today = new Date().toISOString().split('T')[0];
    if (dom.logDate) dom.logDate.value = today;
    if (dom.reportGenDate) dom.reportGenDate.innerText = formatDate(today);
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Navigation items click handling
    dom.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // Pain Slider Badge update
    if (dom.painSlider) {
        dom.painSlider.addEventListener('input', (e) => {
            dom.painBadge.innerText = e.target.value;
            // Dynamic styling color change based on pain score
            const val = parseInt(e.target.value);
            if (val <= 3) {
                dom.painBadge.style.backgroundColor = 'var(--success)';
            } else if (val <= 6) {
                dom.painBadge.style.backgroundColor = 'var(--warning)';
            } else {
                dom.painBadge.style.backgroundColor = 'var(--danger)';
            }
        });
    }

    // Form submission
    if (dom.symptomForm) {
        dom.symptomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit();
        });
    }

    // Pitch demo hooks
    if (dom.btnLoadDemo) {
        dom.btnLoadDemo.addEventListener('click', loadDemoData);
    }
    if (dom.btnClearDemo) {
        dom.btnClearDemo.addEventListener('click', clearAppData);
    }
}

// --- Tab Switching Logic ---
function switchTab(tabId) {
    appState.activeTab = tabId;
    
    // Update active tab buttons visual state
    dom.navItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update active views
    dom.tabViews.forEach(view => {
        if (view.id === tabId) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    // Update main header title
    const titles = {
        dashboard: "Dashboard Overview",
        track: "Log Daily Pain & Symptoms",
        analysis: "Multi-Cycle Trend Analysis",
        report: "Clinician Assessment Summary",
        learn: "Education & Awareness Library"
    };
    dom.viewTitle.innerText = titles[tabId] || "EndoAware";

    // Perform specific tab refreshes (like drawing SVG charts)
    if (tabId === 'analysis') {
        drawTrendChart();
        renderPatternInsights();
    } else if (tabId === 'report') {
        renderMedicalReport();
    } else if (tabId === 'dashboard') {
        renderDashboard();
    }
}

// Make switchTab global so elements can call onclick="switchTab(...)"
window.switchTab = switchTab;

// --- Form Submission / Data Input ---
function handleFormSubmit() {
    const selectedSymptoms = [];
    document.querySelectorAll('input[name="symptoms"]:checked').forEach(chk => {
        selectedSymptoms.push(chk.value);
    });

    const isRegular = document.querySelector('input[name="painRegularity"]:checked').value === 'yes';

    const newLog = {
        id: 'log_' + Date.now(),
        date: dom.logDate.value,
        painScore: parseInt(dom.painSlider.value),
        painRegularity: isRegular,
        symptoms: selectedSymptoms,
        familyHistory: dom.familyHistory.checked
    };

    appState.logs.push(newLog);
    // Sort logs chronologically
    appState.logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    saveStateToStorage();
    renderApp();
    
    // Reset tracker form
    dom.symptomForm.reset();
    dom.painSlider.value = 5;
    dom.painBadge.innerText = 5;
    dom.painBadge.style.backgroundColor = 'var(--primary)';
    
    // Automatically switch back to Dashboard to show results
    switchTab('dashboard');
}

// --- Pattern Analysis Engine (Calculates Risk Indices) ---
function analyzeSymptomPatterns() {
    if (appState.logs.length === 0) {
        return { score: 0, level: 'NO DATA', desc: 'No logs recorded to evaluate risk.' };
    }

    // Points system based on Slide 7 Pattern Engine
    let totalPoints = 0;
    const maxPossiblePoints = 115; // 45 (extreme pain) + 15 (regularity) + 45 (all symptoms) + 10 (family history)

    // 1. Pain Intensity points (Max pain score in the timeline)
    const painScores = appState.logs.map(l => l.painScore);
    const maxPain = Math.max(...painScores);
    
    if (maxPain >= 9) totalPoints += 45;       // Severe impact
    else if (maxPain >= 7) totalPoints += 30;  // High pain
    else if (maxPain >= 4) totalPoints += 15;  // Moderate pain
    else totalPoints += 5;                     // Mild/low pain

    // 2. Pain Regularity / Chronicity points
    const regularLogs = appState.logs.filter(l => l.painRegularity).length;
    const regularityRatio = regularLogs / appState.logs.length;
    if (regularityRatio >= 0.5) {
        totalPoints += 15;
    } else if (appState.logs.some(l => l.painRegularity)) {
        totalPoints += 5;
    }

    // 3. Associated Symptoms points (Clustering)
    // Gather all symptoms ever reported
    const allSymptoms = new Set();
    appState.logs.forEach(l => {
        l.symptoms.forEach(s => allSymptoms.add(s));
    });

    if (allSymptoms.has('pelvic_pain')) totalPoints += 15;
    if (allSymptoms.has('gi_discomfort')) totalPoints += 10;
    if (allSymptoms.has('dyspareunia')) totalPoints += 15;
    if (allSymptoms.has('fatigue')) totalPoints += 5;

    // 4. Family History points
    const hasFamilyHistory = appState.logs.some(l => l.familyHistory);
    if (hasFamilyHistory) {
        totalPoints += 10;
    }

    // Normalize to percentage
    const percentage = Math.round((totalPoints / maxPossiblePoints) * 100);
    
    // Risk Level mapping
    let riskLevel = 'Low Risk';
    let riskDesc = 'Symptom levels suggest a low risk. Continue logging cycles if patterns change.';
    
    if (percentage >= 65) {
        riskLevel = 'Elevated Risk';
        riskDesc = 'Significant multi-cycle symptom clusters and pain escalation trends observed. We strongly suggest consulting a healthcare professional.';
    } else if (percentage >= 35) {
        riskLevel = 'Moderate Risk';
        riskDesc = 'Moderate persistent pelvic discomfort or pain logged. Recommended to monitor closely and note trends for your doctor.';
    }

    return {
        score: percentage,
        level: riskLevel,
        desc: riskDesc
    };
}

// --- Render Functions ---
function renderApp() {
    renderDashboard();
    // Render other tabs in case we're looking at them
    if (appState.activeTab === 'analysis') {
        drawTrendChart();
        renderPatternInsights();
    } else if (appState.activeTab === 'report') {
        renderMedicalReport();
    }
}

function renderDashboard() {
    const analysis = analyzeSymptomPatterns();
    
    // Update Stats Card elements
    dom.statCycleCount.innerText = appState.logs.length;
    
    if (appState.logs.length > 0) {
        const sumPain = appState.logs.reduce((sum, log) => sum + log.painScore, 0);
        const avgPain = (sumPain / appState.logs.length).toFixed(1);
        dom.statAvgPain.innerText = `${avgPain}/10`;
        
        // Find main symptom clusters
        const allSyms = [];
        appState.logs.forEach(l => allSyms.push(...l.symptoms));
        const frequency = {};
        allSyms.forEach(s => frequency[s] = (frequency[s] || 0) + 1);
        
        const mainSyms = Object.keys(frequency)
            .sort((a, b) => frequency[b] - frequency[a])
            .slice(0, 2)
            .map(s => s.replace('_', ' '));
        
        dom.statSymptomCluster.innerText = mainSyms.length > 0 ? mainSyms.join(', ') : 'None';
    } else {
        dom.statAvgPain.innerText = '0/10';
        dom.statSymptomCluster.innerText = 'None';
    }

    // Render Risk Status Indicator (Gauge Dasharray calculations)
    // Dasharray is 126 representing 100% of semi-circle arc (stroke-dashoffset from 126 to 0)
    // 0 points = 126 offset (empty), 100 points = 0 offset (full fill)
    dom.txtRiskLevel.innerText = analysis.level;
    
    if (analysis.level === 'NO DATA') {
        dom.txtRiskScore.innerText = 'Log cycles to analyze';
        dom.gaugeIndicator.setAttribute('stroke-dashoffset', '126');
        dom.gaugeIndicator.setAttribute('stroke', '#e5e7eb');
        dom.txtRiskLevel.style.color = 'var(--text-light)';
        dom.riskAlertBox.style.display = 'none';
    } else {
        dom.txtRiskScore.innerText = `${analysis.score}% Symptom Risk Assessment`;
        const offsetVal = 126 - (analysis.score / 100) * 126;
        dom.gaugeIndicator.setAttribute('stroke-dashoffset', offsetVal.toString());
        
        // Match color scheme
        if (analysis.level === 'Low Risk') {
            dom.gaugeIndicator.setAttribute('stroke', 'var(--success)');
            dom.txtRiskLevel.style.color = 'var(--success)';
            dom.riskAlertBox.style.display = 'none';
        } else if (analysis.level === 'Moderate Risk') {
            dom.gaugeIndicator.setAttribute('stroke', 'var(--warning)');
            dom.txtRiskLevel.style.color = 'var(--warning)';
            dom.riskAlertBox.style.display = 'flex';
            dom.riskAlertText.innerText = "Notice: Track persistent pain trends.";
            dom.riskAlertBox.style.borderColor = 'var(--warning)';
            dom.riskAlertBox.style.backgroundColor = '#fffbeb';
            dom.riskAlertBox.style.color = '#92400e';
        } else {
            dom.gaugeIndicator.setAttribute('stroke', 'var(--danger)');
            dom.txtRiskLevel.style.color = 'var(--danger)';
            dom.riskAlertBox.style.display = 'flex';
            dom.riskAlertText.innerText = "Persistent symptoms detected across multiple cycles. We recommend consulting a gynecologist for further evaluation.";
            dom.riskAlertBox.style.borderColor = 'var(--danger)';
            dom.riskAlertBox.style.backgroundColor = 'var(--accent-light)';
            dom.riskAlertBox.style.color = 'var(--danger)';
        }
    }
    
    dom.txtRiskDesc.innerText = analysis.desc;

    // Render Logs Table
    if (appState.logs.length === 0) {
        dom.tblLogsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">No logs recorded yet. Use the Log tab or Pitch Mode to generate data.</td>
            </tr>
        `;
    } else {
        dom.tblLogsBody.innerHTML = appState.logs.map(log => {
            const symList = log.symptoms.map(s => `<span class="badge badge-low" style="margin-right:0.25rem;">${s.replace('_', ' ')}</span>`).join('');
            let riskBadge = '<span class="badge badge-low">Low</span>';
            if (log.painScore >= 8) {
                riskBadge = '<span class="badge badge-high">Elevated</span>';
            } else if (log.painScore >= 5) {
                riskBadge = '<span class="badge badge-mod">Moderate</span>';
            }
            
            return `
                <tr>
                    <td><strong>${formatDate(log.date)}</strong></td>
                    <td><span class="highlight-val">${log.painScore}/10</span></td>
                    <td>${symList || '<span class="text-muted">None</span>'}</td>
                    <td>${log.familyHistory ? 'Yes (Maternal/Sibling)' : 'None reported'}</td>
                    <td>${riskBadge}</td>
                </tr>
            `;
        }).join('');
    }
}

// --- Trend Chart Rendering (Custom SVG Implementation) ---
function drawTrendChart() {
    if (appState.logs.length === 0) {
        dom.trendDirection.innerText = 'No Data';
        dom.trendDirection.className = 'badge';
        dom.chartLines.innerHTML = '';
        dom.chartPoints.innerHTML = '';
        dom.chartLabels.innerHTML = '';
        return;
    }

    const maxChartHeight = 150; // SVG space from Y=40 to Y=190
    const startY = 190;
    const startX = 60;
    const endX = 460;
    const chartWidth = endX - startX;
    
    // Draw points & connections
    const pointCount = appState.logs.length;
    const stepX = pointCount > 1 ? chartWidth / (pointCount - 1) : chartWidth;
    
    let pathData = '';
    let symPathData = '';
    let pointGroupContent = '';
    let labelGroupContent = '';

    appState.logs.forEach((log, index) => {
        const x = startX + index * stepX;
        
        // Calculate Pain VAS Y coordinate (scale 1-10 mapped to 190-40)
        // 1 = 190, 10 = 40. Diff is 150. Y = 190 - ((val - 1) / 9) * 150
        const y = startY - ((log.painScore - 1) / 9) * maxChartHeight;
        
        // Calculate Symptom density Y coordinate (number of symptoms/4 mapped to 190-40)
        const symCount = log.symptoms.length;
        const symY = startY - (symCount / 4) * maxChartHeight;

        // Construct lines path
        if (index === 0) {
            pathData = `M ${x} ${y}`;
            symPathData = `M ${x} ${symY}`;
        } else {
            pathData += ` L ${x} ${y}`;
            symPathData += ` L ${x} ${symY}`;
        }

        // Draw points for Pain (Red circles)
        pointGroupContent += `
            <circle cx="${x}" cy="${y}" r="6" fill="var(--danger)" stroke="#ffffff" stroke-width="2" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" />
        `;
        
        // Draw points for Symptoms (Purple circles)
        if (symCount > 0) {
            pointGroupContent += `
                <circle cx="${x}" cy="${symY}" r="4" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5" />
            `;
        }

        // Draw date labels on X axis
        const shortDate = formatDate(log.date, true);
        labelGroupContent += `
            <text x="${x}" y="215" class="chart-label-text" text-anchor="middle">${shortDate}</text>
        `;
    });

    // Draw lines inside SVG
    let lineGroupContent = '';
    if (pointCount > 1) {
        lineGroupContent += `
            <path d="${pathData}" fill="none" stroke="var(--danger)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${symPathData}" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
        `;
    }

    dom.chartLines.innerHTML = lineGroupContent;
    dom.chartPoints.innerHTML = pointGroupContent;
    dom.chartLabels.innerHTML = labelGroupContent;

    // Detect Trend Direction
    if (pointCount > 1) {
        const firstPain = appState.logs[0].painScore;
        const lastPain = appState.logs[pointCount - 1].painScore;
        const diff = lastPain - firstPain;
        
        if (diff > 0) {
            dom.trendDirection.innerText = 'Escalating';
            dom.trendDirection.className = 'badge badge-high';
        } else if (diff < 0) {
            dom.trendDirection.innerText = 'Monitoring Progress';
            dom.trendDirection.className = 'badge badge-mod';
        } else {
            dom.trendDirection.innerText = 'Stable';
            dom.trendDirection.className = 'badge badge-mod';
        }
    } else {
        dom.trendDirection.innerText = 'Baseline set';
        dom.trendDirection.className = 'badge badge-low';
    }
}

// --- Pattern Insights rendering ---
function renderPatternInsights() {
    const analysis = analyzeSymptomPatterns();
    
    // Chronicity calculation
    const isRegular = appState.logs.filter(l => l.painRegularity).length;
    const isRegularRatio = isRegular / appState.logs.length;
    const dotChronicity = dom.insightChronicity.querySelector('.insight-dot');
    const txtChronicity = dom.insightChronicity.querySelector('.insight-desc');
    
    if (appState.logs.length === 0) {
        dotChronicity.className = 'insight-dot';
        txtChronicity.innerText = "No logs recorded yet. Start tracking to establish baseline chronicity.";
    } else if (isRegularRatio >= 0.5) {
        dotChronicity.className = 'insight-dot red';
        txtChronicity.innerHTML = `<strong>High Persistence Flagged:</strong> Pain reported regular and persistent in ${Math.round(isRegularRatio*100)}% of cycles. In chronic endometriosis, pain is frequently recurrent due to cyclic bleeding outside the uterine cavity.`;
    } else {
        dotChronicity.className = 'insight-dot green';
        txtChronicity.innerText = "Normal persistence: Pain logged occurs occasionally or is not persistent across cycles.";
    }

    // Escalation trend
    const dotEscalation = dom.insightEscalation.querySelector('.insight-dot');
    const txtEscalation = dom.insightEscalation.querySelector('.insight-desc');
    
    if (appState.logs.length < 2) {
        dotEscalation.className = 'insight-dot';
        txtEscalation.innerText = "Requires at least 2 cycles logged to analyze escalation gradients.";
    } else {
        const firstVal = appState.logs[0].painScore;
        const lastVal = appState.logs[appState.logs.length - 1].painScore;
        const change = lastVal - firstVal;
        
        if (change > 2) {
            dotEscalation.className = 'insight-dot red';
            txtEscalation.innerHTML = `<strong>Escalation Warning:</strong> Pain ratings have increased by +${change} points since your baseline. This suggests active symptom progression and requires assessment.`;
        } else if (change >= 0) {
            dotEscalation.className = 'insight-dot amber';
            txtEscalation.innerText = "Stable pattern: Symptom levels are steady cycle-over-cycle. Keep monitoring.";
        } else {
            dotEscalation.className = 'insight-dot green';
            txtEscalation.innerText = "Improving pattern: Pain thresholds are downward trending since baseline.";
        }
    }

    // Symptom Clustering (Weighted Red-Flag)
    const dotClustering = dom.insightClustering.querySelector('.insight-dot');
    const txtClustering = dom.insightClustering.querySelector('.insight-desc');
    
    if (appState.logs.length === 0) {
        dotClustering.className = 'insight-dot';
        txtClustering.innerText = "Evaluates overlapping conditions. Add a log entry.";
    } else {
        const allSyms = new Set();
        appState.logs.forEach(l => l.symptoms.forEach(s => allSyms.add(s)));
        
        let clusters = [];
        if (allSyms.has('pelvic_pain')) clusters.push("Pelvic Discomfort");
        if (allSyms.has('gi_discomfort')) clusters.push("GI/Bowel Disturbance");
        if (allSyms.has('dyspareunia')) clusters.push("Deep Dyspareunia");
        
        if (clusters.length >= 2) {
            dotClustering.className = 'insight-dot red';
            txtClustering.innerHTML = `<strong>High Correlation Pattern:</strong> Co-occurrence of: <em>${clusters.join(', ')}</em> observed. These multiple non-menstrual parameters are recognized clinical co-factors that warrant discussion with a specialist.`;
        } else if (clusters.length === 1) {
            dotClustering.className = 'insight-dot amber';
            txtClustering.innerText = `Moderate clustering: Only 1 primary co-factor (${clusters[0]}) observed alongside periodic pain.`;
        } else {
            dotClustering.className = 'insight-dot green';
            txtClustering.innerText = "No clustering observed: Pain logged contains no secondary pelvic indicators.";
        }
    }
}

// --- Medical Report tab rendering ---
function renderMedicalReport() {
    const analysis = analyzeSymptomPatterns();
    
    // 1. Report Header info
    if (appState.logs.length > 0) {
        const dates = appState.logs.map(l => new Date(l.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        dom.repTrackingPeriod.innerText = `${formatDate(minDate.toISOString().split('T')[0])} to ${formatDate(maxDate.toISOString().split('T')[0])}`;
    } else {
        dom.repTrackingPeriod.innerText = 'No logs registered';
    }

    dom.repCycleCount.innerText = `${appState.logs.length} cycle(s)`;
    
    // Calculate Average Pain
    if (appState.logs.length > 0) {
        const sumPain = appState.logs.reduce((sum, log) => sum + log.painScore, 0);
        const avgPain = (sumPain / appState.logs.length).toFixed(1);
        dom.repAvgPain.innerText = `${avgPain}/10`;
        
        const painScores = appState.logs.map(l => l.painScore);
        dom.prepMaxPain.innerText = Math.max(...painScores);
    } else {
        dom.repAvgPain.innerText = '0/10';
        dom.prepMaxPain.innerText = '0';
    }

    // Family History status
    const hasFamilyHistory = appState.logs.some(l => l.familyHistory);
    dom.repFamilyHistory.innerText = hasFamilyHistory ? 'Yes (Indicated in Maternal/Sibling line)' : 'No family history indicated';

    // Risk Box Styling
    dom.repRiskLevel.innerText = analysis.level.toUpperCase();
    dom.repRiskRecommendation.innerText = analysis.desc;
    
    dom.repRiskBox.className = 'report-status-box';
    if (analysis.level === 'Low Risk') {
        dom.repRiskBox.classList.add('risk-low');
    } else if (analysis.level === 'Moderate Risk') {
        dom.repRiskBox.classList.add('risk-mod');
    } else if (analysis.level === 'Elevated Risk') {
        dom.repRiskBox.classList.add('risk-high');
    }

    // Symptoms Card grids
    const symptomFrequencies = {};
    appState.logs.forEach(l => {
        l.symptoms.forEach(s => {
            symptomFrequencies[s] = (symptomFrequencies[s] || 0) + 1;
        });
    });

    const uniqueSymptoms = Object.keys(symptomFrequencies);
    if (uniqueSymptoms.length === 0) {
        dom.repSymptomGrid.innerHTML = `<p class="text-muted" style="grid-column: 1/-1;">No associated symptoms reported.</p>`;
    } else {
        dom.repSymptomGrid.innerHTML = uniqueSymptoms.map(sym => {
            const prettyName = sym.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const freq = symptomFrequencies[sym];
            return `
                <div class="rep-sym-card">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <div>
                        <strong>${prettyName}</strong>
                        <small style="display:block;color:var(--text-muted);font-size:0.7rem;">Logged in ${freq} cycle(s)</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Report table listing
    if (appState.logs.length === 0) {
        dom.repTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">No cycles registered.</td>
            </tr>
        `;
    } else {
        dom.repTableBody.innerHTML = appState.logs.map(log => {
            const symText = log.symptoms.map(s => s.replace('_', ' ')).join(', ');
            return `
                <tr>
                    <td><strong>${formatDate(log.date)}</strong></td>
                    <td><span class="highlight-val">${log.painScore}/10</span></td>
                    <td>${symText || 'None'}</td>
                    <td>${log.painRegularity ? 'Persistent Every Cycle' : 'Occasional/Varying'}</td>
                </tr>
            `;
        }).join('');
    }
}

// --- Pitch Mode Demo Handler ---
function loadDemoData() {
    // slide 6 pattern: escalating severe pain & symptoms over 3 cycles
    appState.logs = [
        {
            id: 'demo_1',
            date: '2026-04-12',
            painScore: 5,
            painRegularity: true,
            symptoms: ['pelvic_pain'],
            familyHistory: true
        },
        {
            id: 'demo_2',
            date: '2026-05-10',
            painScore: 7,
            painRegularity: true,
            symptoms: ['pelvic_pain', 'gi_discomfort'],
            familyHistory: true
        },
        {
            id: 'demo_3',
            date: '2026-06-08',
            painScore: 9,
            painRegularity: true,
            symptoms: ['pelvic_pain', 'gi_discomfort', 'dyspareunia', 'fatigue'],
            familyHistory: true
        }
    ];

    saveStateToStorage();
    renderApp();
    
    // Alert feedback
    alert("Ideathon Demo Data successfully loaded! \n- Chronicity: Active (Recurring over 3 cycles)\n- Escalation: Active (Pain 5 -> 7 -> 9)\n- Clustering: Active (4 symptoms overlapping)\n- Risk level is evaluated as Elevated Risk.");
    
    // Default switch back to dashboard
    switchTab('dashboard');
}

function clearAppData() {
    if (confirm("Are you sure you want to reset the EndoAware prototype database?")) {
        appState.logs = [];
        saveStateToStorage();
        renderApp();
        switchTab('dashboard');
    }
}

// --- Helper Functions ---
function formatDate(dateString, short = false) {
    const options = short 
        ? { month: 'short', day: 'numeric' } 
        : { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function saveStateToStorage() {
    localStorage.setItem('endoaware_state_logs', JSON.stringify(appState.logs));
}

function loadStateFromStorage() {
    const saved = localStorage.getItem('endoaware_state_logs');
    if (saved) {
        try {
            appState.logs = JSON.parse(saved);
        } catch (e) {
            appState.logs = [];
        }
    }
}
