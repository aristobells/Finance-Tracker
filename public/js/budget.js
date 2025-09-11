document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const showBudgetFormBtn = document.getElementById('showBudgetForm');
    const budgetModal = document.getElementById('budgetModal');
    const closeModalBtn = document.querySelector('.close');
    const cancelBudgetBtn = document.getElementById('cancelBudget');
    const budgetForm = document.getElementById('budgetForm');
    const alertsContainer = document.getElementById('alertsContainer');
    const budgetsContainer = document.getElementById('budgetsContainer');
    
    // Event Listeners
    showBudgetFormBtn.addEventListener('click', showBudgetForm);
    closeModalBtn.addEventListener('click', closeBudgetForm);
    cancelBudgetBtn.addEventListener('click', closeBudgetForm);
    budgetForm.addEventListener('submit', handleBudgetSubmit);
    
    // Close modal if clicked outside
    window.addEventListener('click', function(event) {
        if (event.target === budgetModal) {
            closeBudgetForm();
        }
    });
    
    // Set default dates for the form
    setDefaultDates();
    
    // Load budget data
    loadBudgetAlerts();
    loadUserBudgets();
    
    // Function to show the budget form modal
    function showBudgetForm() {
        budgetModal.style.display = 'block';
    }
    
    // Function to close the budget form modal
    function closeBudgetForm() {
        budgetModal.style.display = 'none';
        budgetForm.reset();
        setDefaultDates();
    }
    
    // Function to set default dates (current month)
    function setDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('period_start').value = firstDay.toISOString().split('T')[0];
        document.getElementById('period_end').value = lastDay.toISOString().split('T')[0];
    }
    
    // Function to handle budget form submission
    async function handleBudgetSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(budgetForm);
        const budgetData = {
            category_id: formData.get('category_id') || null,
            amount: parseFloat(formData.get('amount')),
            period_start: formData.get('period_start'),
            period_end: formData.get('period_end')
        };
        
        try {
            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(budgetData)
            });
            
            if (response.ok) {
                const result = await response.json();
                alert('Budget created successfully!');
                closeBudgetForm();
                loadUserBudgets(); // Reload budgets
                loadBudgetAlerts(); // Reload alerts
            } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error('Error creating budget:', error);
            alert('Failed to create budget. Please try again.');
        }
    }
    
    // Function to load budget alerts
    async function loadBudgetAlerts() {
        try {
            const response = await fetch('/api/budgets/alerts', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const alerts = await response.json();
                displayBudgetAlerts(alerts);
            } else {
                console.error('Failed to load budget alerts');
            }
        } catch (error) {
            console.error('Error loading budget alerts:', error);
        }
    }
    
    // Function to display budget alerts
    function displayBudgetAlerts(alerts) {
        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert-card">
                    <h3>No Budget Alerts</h3>
                    <p>You don't have any budget alerts at this time.</p>
                </div>
            `;
            return;
        }
        
        alertsContainer.innerHTML = alerts.map(alert => {
            const percentUsed = (alert.spent / alert.limit_amount * 100).toFixed(1);
            const statusClass = alert.status === 'Exceeded' ? 'exceeded' : 'ok';
            const statusTextClass = alert.status === 'Exceeded' ? 'status-exceeded' : 'status-ok';
            
            return `
                <div class="alert-card ${statusClass}">
                    <h3>${alert.category_name || 'Overall Budget'}</h3>
                    <div class="alert-details">
                        <span class="alert-amount">$${alert.spent.toFixed(2)} / $${alert.limit_amount.toFixed(2)}</span>
                        <span class="alert-status ${statusTextClass}">${alert.status}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getProgressBarClass(percentUsed)}" style="width: ${Math.min(percentUsed, 100)}%"></div>
                    </div>
                    <div class="progress-text">${percentUsed}% used</div>
                </div>
            `;
        }).join('');
    }
    
    // Function to load user budgets
    async function loadUserBudgets() {
        try {
            const response = await fetch('/api/budgets', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const budgets = await response.json();
                displayUserBudgets(budgets);
            } else {
                console.error('Failed to load user budgets');
                budgetsContainer.innerHTML = '<p>Failed to load budgets. Please try again later.</p>';
            }
        } catch (error) {
            console.error('Error loading user budgets:', error);
            budgetsContainer.innerHTML = '<p>Error loading budgets. Please try again later.</p>';
        }
    }
    
    // Function to display user budgets
    async function displayUserBudgets(budgets) {
        if (budgets.length === 0) {
            budgetsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h3>No Budgets Yet</h3>
                    <p>Create your first budget to start tracking your spending limits.</p>
                </div>
            `;
            return;
        }
        
        // Load progress for each budget
        const budgetsWithProgress = await Promise.all(
            budgets.map(async budget => {
                try {
                    const progressResponse = await fetch(`/api/budgets/${budget.id}/progress`, {
                        headers: {
                            'Authorization': `Bearer ${getAuthToken()}`
                        }
                    });
                    
                    if (progressResponse.ok) {
                        const progress = await progressResponse.json();
                        return { ...budget, progress };
                    }
                    return budget;
                } catch (error) {
                    console.error('Error loading budget progress:', error);
                    return budget;
                }
            })
        );
        
        budgetsContainer.innerHTML = budgetsWithProgress.map(budget => {
            const hasProgress = budget.progress;
            const percentUsed = hasProgress ? budget.progress.percent_used : 0;
            const spent = hasProgress ? budget.progress.spent : 0;
            const remaining = hasProgress ? budget.progress.remaining : budget.amount;
            
            return `
                <div class="budget-card">
                    <div class="budget-header">
                        <h3 class="budget-title">${budget.category_id ? 'Category Budget' : 'Overall Budget'}</h3>
                        <span class="budget-amount">$${parseFloat(budget.amount).toFixed(2)}</span>
                    </div>
                    <div class="budget-period">
                        ${new Date(budget.period_start).toLocaleDateString()} - ${new Date(budget.period_end).toLocaleDateString()}
                    </div>
                    
                    ${hasProgress ? `
                        <div class="budget-details">
                            <div class="budget-detail">
                                <div class="detail-label">Spent</div>
                                <div class="detail-value spent">$${spent.toFixed(2)}</div>
                            </div>
                            <div class="budget-detail">
                                <div class="detail-label">Remaining</div>
                                <div class="detail-value remaining">$${remaining.toFixed(2)}</div>
                            </div>
                        </div>
                        
                        <div class="progress-bar">
                            <div class="progress-fill ${getProgressBarClass(percentUsed)}" style="width: ${Math.min(percentUsed, 100)}%"></div>
                        </div>
                        <div class="progress-text">${percentUsed}% used</div>
                    ` : '<p>Loading progress...</p>'}
                    
                    <div class="budget-actions">
                        <button class="btn btn-secondary btn-sm" onclick="deleteBudget(${budget.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Function to determine progress bar class based on percentage
    function getProgressBarClass(percent) {
        if (percent <= 70) return 'progress-ok';
        if (percent <= 90) return 'progress-warning';
        return 'progress-danger';
    }
    
    // Function to get authentication token
    function getAuthToken() {
        // This should be implemented based on how you store auth tokens
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
});

// Function to delete a budget (needs to be in global scope for onclick)
async function deleteBudget(budgetId) {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    try {
        const response = await fetch(`/api/budgets/${budgetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (response.ok) {
            alert('Budget deleted successfully!');
            location.reload(); // Reload the page to reflect changes
        } else {
            const error = await response.json();
            alert(`Error: ${error.message}`);
        }
    } catch (error) {
        console.error('Error deleting budget:', error);
        alert('Failed to delete budget. Please try again.');
    }
}

// Helper function to get auth token (global scope)
function getAuthToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}