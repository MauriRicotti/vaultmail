class VaultMail {
    constructor() {
        this.accounts = [];
        this.filteredAccounts = [];
        this.currentEditingId = null;
        this.showOnlyFavorites = false;
        this.showPasswordsGlobally = false;
        this.showOnlyArchived = false;
        this.viewMode = 'cards'; // 'cards' or 'table'
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.initAuth();
    }

    initAuth() {
        // Check if user is authenticated
        const isAuthenticated = localStorage.getItem('vaultmail_authenticated');
        if (!isAuthenticated) {
            this.showLoginModal();
        } else {
            this.init();
        }
    }

    showLoginModal() {
        // Show login screen fullscreen
        const loginScreen = document.getElementById('loginScreen');
        loginScreen.classList.remove('d-none');
        
        // Forzar tema oscuro en la pantalla de login
        document.body.classList.remove('light-mode');
        
        // Ocultar scrollbar del body
        document.body.style.overflow = 'hidden';

        // Setup login form
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Toggle password visibility
        document.getElementById('toggleLoginPassword').addEventListener('click', (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('loginPassword');
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
        });

        // Password strength indicator
        document.getElementById('loginPassword').addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
        
        // Focus on password input
        document.getElementById('loginPassword').focus();
    }

    updatePasswordStrength(password) {
        const strengthContainer = document.querySelector('.login-screen-password-strength');
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (password.length === 0) {
            strengthContainer.classList.add('d-none');
            return;
        }

        strengthContainer.classList.remove('d-none');

        // Calculate strength
        let strength = 0;
        let strengthLabel = 'Débil';
        let strengthClass = 'weak';

        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) {
            strengthLabel = 'Débil';
            strengthClass = 'weak';
        } else if (strength <= 3) {
            strengthLabel = 'Regular';
            strengthClass = 'fair';
        } else {
            strengthLabel = 'Fuerte';
            strengthClass = 'good';
        }

        // Update UI
        strengthFill.className = `strength-fill ${strengthClass}`;
        strengthText.textContent = `Seguridad: ${strengthLabel}`;
    }

    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('loginPassword').value;
        const storedPassword = localStorage.getItem('vaultmail_master_password');
        const submitBtn = document.querySelector('.login-screen-btn-submit');
        
        // Disable button during loading
        submitBtn.disabled = true;
        
        // Quick validation
        if (!storedPassword) {
            // First login - set master password
            localStorage.setItem('vaultmail_master_password', this.hashPassword(password));
            localStorage.setItem('vaultmail_authenticated', 'true');
            document.getElementById('loginForm').reset();
            this.accessDashboard();
        } else {
            // Verify password
            if (this.verifyPassword(password, storedPassword)) {
                localStorage.setItem('vaultmail_authenticated', 'true');
                document.getElementById('loginForm').reset();
                document.getElementById('loginError').classList.add('d-none');
                
                // Show success message
                const errorDiv = document.getElementById('loginError');
                errorDiv.textContent = '¡Acceso concedido!';
                errorDiv.classList.remove('d-none', 'login-screen-alert-error');
                errorDiv.classList.add('login-screen-alert-success');
                
                // Access dashboard after short delay
                setTimeout(() => {
                    this.accessDashboard();
                }, 1000);
            } else {
                // Re-enable button
                submitBtn.disabled = false;
                
                document.getElementById('loginError').textContent = 'Contraseña incorrecta';
                document.getElementById('loginError').classList.remove('d-none', 'login-screen-alert-success');
                document.getElementById('loginError').classList.add('login-screen-alert-error');
            }
        }
    }

    accessDashboard() {
        document.getElementById('loginScreen').classList.add('d-none');
        document.body.style.overflow = 'auto';
        // Restaurar tema guardado al entrar al dashboard
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        this.init();
    }

    hashPassword(password) {
        // Simple hash using btoa (base64 encoding with a salt)
        const salt = 'vaultmail_2025';
        return btoa(password + salt);
    }

    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    openChangePasswordModal() {
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();

        // Setup toggle password visibility buttons
        document.getElementById('toggleCurrentPassword').addEventListener('click', () => {
            const input = document.getElementById('currentPassword');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        document.getElementById('toggleNewPassword').addEventListener('click', () => {
            const input = document.getElementById('newPassword');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        document.getElementById('toggleConfirmPassword').addEventListener('click', () => {
            const input = document.getElementById('confirmPassword');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        document.getElementById('changePasswordSubmitBtn').addEventListener('click', () => this.handleChangePassword());
    }

    handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const storedPassword = localStorage.getItem('vaultmail_master_password');

        document.getElementById('changePasswordError').classList.add('d-none');
        document.getElementById('changePasswordSuccess').classList.add('d-none');

        // Verify current password
        if (!this.verifyPassword(currentPassword, storedPassword)) {
            document.getElementById('changePasswordError').textContent = 'La contraseña actual es incorrecta';
            document.getElementById('changePasswordError').classList.remove('d-none');
            return;
        }

        // Check if new password is empty
        if (!newPassword) {
            document.getElementById('changePasswordError').textContent = 'La nueva contraseña no puede estar vacía';
            document.getElementById('changePasswordError').classList.remove('d-none');
            return;
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            document.getElementById('changePasswordError').textContent = 'Las nuevas contraseñas no coinciden';
            document.getElementById('changePasswordError').classList.remove('d-none');
            return;
        }

        // Check if new password is the same as the old one
        if (newPassword === currentPassword) {
            document.getElementById('changePasswordError').textContent = 'La nueva contraseña debe ser diferente a la actual';
            document.getElementById('changePasswordError').classList.remove('d-none');
            return;
        }

        // Update password
        localStorage.setItem('vaultmail_master_password', this.hashPassword(newPassword));

        // Show success message
        document.getElementById('changePasswordSuccess').textContent = 'Contraseña cambiada exitosamente';
        document.getElementById('changePasswordSuccess').classList.remove('d-none');

        // Reset form and close modal after 2 seconds
        setTimeout(() => {
            document.getElementById('changePasswordForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        }, 2000);
    }

    handleLogout() {
        // Show logout confirmation modal instead of confirm dialog
        this.showLogoutConfirmModal();
    }

    showLogoutConfirmModal() {
        const modal = document.getElementById('logoutConfirmModal');
        modal.classList.remove('d-none');
        
        // Cancel button
        document.getElementById('cancelLogoutBtn').addEventListener('click', () => {
            modal.classList.add('d-none');
        }, { once: true });
        
        // Confirm button
        document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
            this.performLogout();
        }, { once: true });
        
        // Close on overlay click
        document.querySelector('.modal-logout-overlay').addEventListener('click', () => {
            modal.classList.add('d-none');
        }, { once: true });
    }

    handleEmailInput(e) {
        const emailInput = e.target;
        const emailSuffix = document.getElementById('emailSuffix');
        const value = emailInput.value;
        
        // Si el valor contiene @, ocultar el sufijo
        if (value.includes('@')) {
            emailSuffix.classList.add('hidden');
        } else {
            emailSuffix.classList.remove('hidden');
        }
    }

    performLogout() {
        localStorage.removeItem('vaultmail_authenticated');
        document.getElementById('logoutConfirmModal').classList.add('d-none');
        document.getElementById('loginScreen').classList.remove('d-none');
        document.body.style.overflow = 'hidden';
        this.accounts = [];
        this.filteredAccounts = [];
        document.getElementById('accountsContainer').innerHTML = '';
        document.getElementById('loginPassword').value = '';
        this.showLoginModal();
    }

    init() {
        this.initTheme();
        this.loadAccounts();
        this.checkAndUpdateInactiveAccounts(); // Check on load
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.loadSidebarState();
        this.renderAccounts();
        this.updateStats();
        this.initializeTooltips(); // Initialize tooltips only if sidebar is collapsed
    }

    setupEventListeners() {
        // Sidebar controls
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarClose').addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebarCollapseBtn').addEventListener('click', () => this.toggleSidebarCollapse());

        // Sidebar navigation buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSidebarViewClick(e));
        });

        // Sidebar category buttons
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSidebarCategoryClick(e));
        });

        // Sidebar action buttons
        document.getElementById('sidebarNewAccountBtn').addEventListener('click', () => {
            this.hideAllTooltips();
            this.openNewAccountModal();
            this.closeSidebar();
        });
        document.getElementById('sidebarChangePasswordBtn').addEventListener('click', () => {
            this.hideAllTooltips();
            this.openChangePasswordModal();
            this.closeSidebar();
        });
        document.getElementById('sidebarExportBtn').addEventListener('click', () => {
            this.hideAllTooltips();
            this.exportAccounts();
            this.closeSidebar();
        });
        document.getElementById('sidebarImportBtn').addEventListener('click', () => {
            this.hideAllTooltips();
            document.getElementById('importFileInput').click();
            this.closeSidebar();
        });
        document.getElementById('sidebarHelpBtn').addEventListener('click', () => {
            this.hideAllTooltips();
            this.openHelpModal();
            this.closeSidebar();
        });

        // Modal controls
        document.getElementById('newAccountBtn').addEventListener('click', () => this.openNewAccountModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('closeViewModal').addEventListener('click', () => this.closeViewModal());
        document.getElementById('closeViewBtn').addEventListener('click', () => this.closeViewModal());

        // Form submit
        document.getElementById('accountForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Email input - handle @gmail.com suffix visibility
        document.getElementById('email').addEventListener('input', (e) => this.handleEmailInput(e));
        document.getElementById('email').addEventListener('focus', (e) => this.handleEmailInput(e));

        // Status checkbox - toggle inactive until field
        document.getElementById('status').addEventListener('change', (e) => {
            const inactiveUntilGroup = document.getElementById('inactiveUntilGroup');
            if (!e.target.checked) {
                inactiveUntilGroup.style.display = 'block';
            } else {
                inactiveUntilGroup.style.display = 'none';
                document.getElementById('inactiveUntil').value = '';
            }
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.updateClearSearchButton(e.target.value);
            this.updateSearchBarHint(e.target.value);
            this.filterAccounts();
        });
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.updateClearSearchButton('');
            this.updateSearchBarHint('');
            this.filterAccounts();
        });
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterAccounts());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterAccounts());

        // Delete button in view modal
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteAccount());
        document.getElementById('editBtn').addEventListener('click', () => this.saveViewAccountChanges());

        // Theme toggle
        document.getElementById('themeToggleSidebar').addEventListener('click', () => {
            this.hideAllTooltips();
            this.toggleTheme();
        });

        // Logout button
        document.getElementById('sidebarLogoutBtn').addEventListener('click', () => {
            this.hideAllTooltips();
            this.handleLogout();
        });

        // Export/Import buttons
        document.getElementById('exportBtn').addEventListener('click', () => this.exportAccounts());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.importAccounts(e));

        // Favorites button
        document.getElementById('showFavoritesBtn').addEventListener('click', () => this.toggleShowOnlyFavorites());

        // Toggle view button
        document.getElementById('toggleViewBtn').addEventListener('click', () => this.toggleViewMode());

        // Toggle password visibility button
        document.getElementById('togglePasswordVisibilityBtn').addEventListener('click', () => this.togglePasswordVisibility());

        // Toggle archived accounts button
        document.getElementById('showArchivedBtn').addEventListener('click', () => this.toggleShowOnlyArchived());

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Help modal
        document.getElementById('closeHelpModal').addEventListener('click', () => this.closeHelpModal());

        // Help tab switching
        document.querySelectorAll('.help-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchHelpTab(e));
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('accountModal');
            const viewModal = document.getElementById('viewModal');
            const helpModal = document.getElementById('helpModal');
            if (e.target === modal) modal.classList.remove('active');
            if (e.target === viewModal) viewModal.classList.remove('active');
            if (e.target === helpModal) helpModal.classList.remove('active');
        });

        // Check for accounts that should be reactivated
        setInterval(() => this.checkAndUpdateInactiveAccounts(), 60000); // Check every minute

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupKeyboardShortcuts() {
        // This method initializes keyboard shortcut listeners
        // Keyboard shortcuts are handled in handleKeyboardShortcuts()
        // Called from init() to ensure DOM is ready
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+B: Toggle sidebar collapse
        if (e.ctrlKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            this.toggleSidebarCollapse();
        }
        // Ctrl+A: Add new account
        else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            this.openNewAccountModal();
        }
        // Ctrl+K: Focus search bar and scroll to top
        else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.getElementById('searchInput').focus();
        }
        // Ctrl+T: Toggle theme
        else if (e.ctrlKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            this.toggleTheme();
        }
        // Ctrl+F: Show favorites
        else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            this.toggleShowOnlyFavorites();
        }
        // Ctrl+Alt+ArrowLeft: Previous page
        else if (e.ctrlKey && e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navigatePaginationPrevious();
        }
        // Ctrl+Alt+ArrowRight: Next page
        else if (e.ctrlKey && e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            this.navigatePaginationNext();
        }
    }

    formatDateString(dateString) {
        // Convierte una fecha en formato YYYY-MM-DD a una fecha legible sin problemas de zona horaria
        if (!dateString) return '';
        const parts = dateString.split('-');
        const date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    calculateDaysUntilDate(dateString) {
        // Calcula los días restantes hasta una fecha específica
        if (!dateString) return 0;
        const parts = dateString.split('-');
        const targetDate = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const timeDiff = targetDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        return Math.max(daysDiff, 0); // Retorna 0 si la fecha ya pasó
    }

    openHelpModal() {
        document.getElementById('helpModal').classList.add('active');
        // Set first tab as active
        this.switchHelpTab({ target: document.querySelector('[data-tab="inicio"]') });
    }

    closeHelpModal() {
        document.getElementById('helpModal').classList.remove('active');
    }

    switchHelpTab(e) {
        const tabName = e.target.closest('.help-tab-btn').dataset.tab;
        
        // Remove active from all tabs and sections
        document.querySelectorAll('.help-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.help-section').forEach(section => section.classList.remove('active'));
        
        // Add active to clicked tab and corresponding section
        e.target.closest('.help-tab-btn').classList.add('active');
        document.querySelector(`[data-section="${tabName}"]`).classList.add('active');
    }

    openNewAccountModal() {
        this.currentEditingId = null;
        document.getElementById('accountForm').reset();
        
        // Resetear el estado del grupo de fecha inactiva
        const inactiveUntilGroup = document.getElementById('inactiveUntilGroup');
        const statusCheckbox = document.getElementById('status');
        inactiveUntilGroup.style.display = 'none';
        document.getElementById('inactiveUntil').value = '';
        
        document.querySelector('.modal-header h2').textContent = 'Agregar Nueva Cuenta';
        document.querySelector('.modal-description').textContent = 'Completa los datos de tu cuenta de Gmail';
        // Mostrar el sufijo @gmail.com cuando se abre el modal
        const emailSuffix = document.getElementById('emailSuffix');
        if (emailSuffix) {
            emailSuffix.classList.remove('hidden');
        }
        document.getElementById('accountModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('accountModal').classList.remove('active');
        this.currentEditingId = null;
    }

    closeViewModal() {
        document.getElementById('viewModal').classList.remove('active');
    }

    handleFormSubmit(e) {
        e.preventDefault();

        let email = document.getElementById('email').value.trim();
        
        // Si el email no contiene @, agregar @gmail.com automáticamente
        if (!email.includes('@')) {
            email = email + '@gmail.com';
        }
        
        const statusCheckbox = document.getElementById('status').checked;
        const inactiveUntilValue = document.getElementById('inactiveUntil').value;

        // Validar que no exista otro correo igual (si es una nueva cuenta o si el email cambió)
        let isDuplicate = false;
        
        if (!this.currentEditingId) {
            // Es una nueva cuenta, verificar si el email ya existe
            const emailExists = this.accounts.some(a => a.email.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                isDuplicate = true;
            }
        } else {
            // Es una edición, verificar si el email cambió y si el nuevo email ya existe
            const currentAccount = this.accounts.find(a => a.id === this.currentEditingId);
            if (currentAccount.email.toLowerCase() !== email.toLowerCase()) {
                const emailExists = this.accounts.some(a => a.email.toLowerCase() === email.toLowerCase());
                if (emailExists) {
                    isDuplicate = true;
                }
            }
        }

        // Si hay duplicado, mostrar modal de confirmación
        if (isDuplicate) {
            this.showDuplicateConfirmation(email);
            return;
        }

        // Si no hay duplicado, proceder con el guardado
        this.saveAccount(email, statusCheckbox, inactiveUntilValue);
    }

    showDuplicateConfirmation(email) {
        // Set account name in modal
        document.getElementById('duplicateConfirmAccountName').querySelector('strong').textContent = email;
        
        // Agregar información de categoría
        const category = document.getElementById('category').value;
        const categoryLabel = this.getCategoryLabel(category);
        const categoryColor = this.getCategoryColor(category);
        const categoryBadge = document.querySelector('.duplicate-confirm-category');
        
        if (categoryBadge) {
            categoryBadge.innerHTML = `<i class="bi ${this.getCategoryIcon(category)}"></i> ${categoryLabel}`;
            categoryBadge.style.backgroundColor = categoryColor;
        }

        // Show the confirmation modal
        const duplicateModal = new bootstrap.Modal(document.getElementById('duplicateConfirmModal'));
        duplicateModal.show();

        // Handle confirm duplicate button
        const confirmBtn = document.getElementById('confirmDuplicateBtn');
        confirmBtn.onclick = () => {
            const statusCheckbox = document.getElementById('status').checked;
            const inactiveUntilValue = document.getElementById('inactiveUntil').value;
            this.saveAccount(email, statusCheckbox, inactiveUntilValue);
            duplicateModal.hide();
        };
    }

    saveAccount(email, statusCheckbox, inactiveUntilValue) {
        const account = {
            id: this.currentEditingId || Date.now(),
            email: email,
            password: document.getElementById('password').value,
            notes: document.getElementById('notes').value,
            category: document.getElementById('category').value,
            status: statusCheckbox ? 'activa' : 'inactiva',
            inactiveUntil: !statusCheckbox && inactiveUntilValue ? inactiveUntilValue : null,
            createdAt: this.currentEditingId ? this.accounts.find(a => a.id === this.currentEditingId).createdAt : new Date().toISOString(),
            isFavorite: this.currentEditingId ? this.accounts.find(a => a.id === this.currentEditingId).isFavorite : false,
            isArchived: this.currentEditingId ? this.accounts.find(a => a.id === this.currentEditingId).isArchived : false
        };

        if (this.currentEditingId) {
            const index = this.accounts.findIndex(a => a.id === this.currentEditingId);
            this.accounts[index] = account;
            
            // Update filtered accounts if the edited account is in the filtered list
            const filteredIndex = this.filteredAccounts.findIndex(a => a.id === this.currentEditingId);
            if (filteredIndex !== -1) {
                this.filteredAccounts[filteredIndex] = account;
            }
        } else {
            this.accounts.push(account);
            // Add new account to filtered accounts if no active filters or it matches filters
            const filterAccounts = () => {
                const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
                const categoryFilter = document.getElementById('categoryFilter').value.trim();
                const statusFilter = document.getElementById('statusFilter').value.trim();
                
                const matchesSearch = !searchTerm || 
                                    account.email.toLowerCase().includes(searchTerm) ||
                                    (account.notes && account.notes.toLowerCase().includes(searchTerm));
                const matchesCategory = !categoryFilter || account.category === categoryFilter;
                const matchesStatus = !statusFilter || account.status === statusFilter;
                
                return matchesSearch && matchesCategory && matchesStatus;
            };
            
            if (filterAccounts()) {
                this.filteredAccounts.push(account);
            }
        }

        this.saveAccounts();
        this.renderAccounts();
        this.updateStats();
        this.closeModal();
        this.showNotification(this.currentEditingId ? 'Cuenta actualizada' : 'Cuenta guardada exitosamente');
    }

    deleteAccount() {
        // Show delete confirmation modal
        const account = this.accounts.find(a => a.id === this.currentEditingId);
        if (!account) return;

        // Set account name and category info in modal
        const modalBody = document.querySelector('.delete-confirm-body');
        document.getElementById('deleteConfirmAccountName').querySelector('strong').textContent = account.email;
        
        // Agregar información de categoría
        const categoryLabel = this.getCategoryLabel(account.category);
        const categoryColor = this.getCategoryColor(account.category);
        const categoryBadge = document.querySelector('.delete-confirm-category');
        
        if (categoryBadge) {
            categoryBadge.innerHTML = `<i class="bi ${this.getCategoryIcon(account.category)}"></i> ${categoryLabel}`;
            categoryBadge.style.backgroundColor = categoryColor;
        }

        // Show the confirmation modal
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        deleteModal.show();

        // Handle confirm delete button
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        confirmBtn.onclick = () => {
            this.performDelete();
            deleteModal.hide();
        };
    }

    performDelete() {
        this.showSkeletonLoader();
        
        // Simulate delete operation with delay
        setTimeout(() => {
            this.accounts = this.accounts.filter(a => a.id !== this.currentEditingId);
            this.filteredAccounts = this.filteredAccounts.filter(a => a.id !== this.currentEditingId);
            this.saveAccounts();
            this.hideSkeletonLoader();
            this.renderAccounts();
            this.updateStats();
            this.closeViewModal();
            this.showNotification('Cuenta eliminada correctamente');
        }, 600);
    }

    editAccount() {
        const account = this.accounts.find(a => a.id === this.currentEditingId);
        this.currentEditingId = account.id;

        document.getElementById('email').value = account.email;
        document.getElementById('password').value = account.password;
        document.getElementById('notes').value = account.notes;
        document.getElementById('category').value = account.category;
        document.getElementById('status').checked = account.status === 'activa';
        document.getElementById('inactiveUntil').value = account.inactiveUntil || '';

        // Show/hide inactiveUntil field based on status
        const inactiveUntilGroup = document.getElementById('inactiveUntilGroup');
        if (account.status === 'inactiva') {
            inactiveUntilGroup.style.display = 'block';
        } else {
            inactiveUntilGroup.style.display = 'none';
        }

        document.querySelector('.modal-header h2').textContent = 'Editar Cuenta';
        document.querySelector('.modal-description').textContent = 'Actualiza los datos de tu cuenta';
        this.closeViewModal();
        document.getElementById('accountModal').classList.add('active');
    }

    updateClearSearchButton(value) {
        const clearBtn = document.getElementById('clearSearchBtn');
        if (value.trim().length > 0) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }
    }

    updateSearchBarHint(value) {
        const hint = document.getElementById('searchBarHint');
        if (value.trim().length > 0) {
            hint.style.display = 'none';
        } else {
            hint.style.display = 'block';
        }
    }

    filterAccounts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value.trim();
        const statusFilter = document.getElementById('statusFilter').value.trim();

        this.filteredAccounts = this.accounts.filter(account => {
            const matchesSearch = !searchTerm || 
                                account.email.toLowerCase().includes(searchTerm) ||
                                (account.notes && account.notes.toLowerCase().includes(searchTerm));
            const matchesCategory = !categoryFilter || account.category === categoryFilter;
            const matchesStatus = !statusFilter || account.status === statusFilter;
            const matchesArchive = this.showOnlyArchived ? account.isArchived : !account.isArchived;

            return matchesSearch && matchesCategory && matchesStatus && matchesArchive;
        });

        this.renderAccounts();
        this.updateStats();
    }

    renderAccounts() {
        this.currentPage = 1; // Reset to page 1 when filters change
        const container = document.getElementById('accountsContainer');
        const searchTerm = document.getElementById('searchInput').value.trim();
        const categoryFilter = document.getElementById('categoryFilter').value.trim();
        const statusFilter = document.getElementById('statusFilter').value.trim();
        const hasActiveFilters = searchTerm || categoryFilter || statusFilter;

        // If there are active filters, use filteredAccounts, otherwise use all accounts
        let accountsToRender = hasActiveFilters ? this.filteredAccounts : this.accounts;

        // Apply archive filter
        if (!this.showOnlyArchived) {
            accountsToRender = accountsToRender.filter(a => !a.isArchived);
        } else {
            accountsToRender = accountsToRender.filter(a => a.isArchived);
        }

        // Filter only favorites if showOnlyFavorites is enabled
        if (this.showOnlyFavorites) {
            accountsToRender = accountsToRender.filter(a => a.isFavorite);
        }

        if (accountsToRender.length === 0) {
            container.classList.remove('table-view');
            container.innerHTML = `
                <div class="empty-state card">
                    <div class="empty-state-content">
                        <i class="bi bi-envelope-heart empty-state-icon"></i>
                        <h3>No hay cuentas ${this.showOnlyFavorites ? 'favoritas' : this.showOnlyArchived ? 'archivadas' : 'guardadas'}</h3>
                        <p>Comienza agregando tu primera cuenta de Gmail</p>
                    </div>
                </div>
            `;
            // Remove pagination if empty
            const wrapper = document.getElementById('accountsWrapper');
            const existingPagination = wrapper.querySelector('.pagination-container');
            if (existingPagination) {
                existingPagination.remove();
            }
            return;
        }

        if (this.viewMode === 'table') {
            this.renderTableView(container, accountsToRender);
        } else {
            this.renderCardsView(container, accountsToRender);
        }
    }

    renderCardsView(container, accountsToRender) {
        const wrapper = document.getElementById('accountsWrapper');
        container.classList.remove('table-view');
        
        // Reset to page 1 if the number of accounts has changed
        const totalPages = Math.ceil(accountsToRender.length / this.itemsPerPage);
        if (this.currentPage > totalPages) {
            this.currentPage = 1;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedAccounts = accountsToRender.slice(startIndex, endIndex);

        // Render cards
        container.innerHTML = paginatedAccounts.map(account => this.createAccountCard(account)).join('');
        
        // Remove existing pagination if it exists
        const existingPagination = wrapper.querySelector('.pagination-container');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        // Add pagination bar if there are multiple pages
        if (totalPages > 1) {
            const paginationHtml = this.createPaginationBar(totalPages, this.currentPage);
            const paginationDiv = document.createElement('div');
            paginationDiv.innerHTML = paginationHtml;
            wrapper.appendChild(paginationDiv.firstChild);
        }
        
        // Add event listeners to cards
        container.querySelectorAll('.account-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.account-actions') && !e.target.closest('.account-actions-footer') && !e.target.closest('.btn-copy') && !e.target.closest('.btn-show-password') && !e.target.closest('.btn-archive') && !e.target.closest('.btn-gmail') && !e.target.closest('.btn-delete')) {
                    this.viewAccount(card.dataset.id);
                }
            });
        });

        // Add edit and delete button listeners
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentEditingId = parseInt(btn.dataset.id, 10);
                this.deleteAccount();
            });
        });

        // Add favorite button listeners
        container.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountId = btn.dataset.id;
                this.toggleFavorite(accountId, btn);
            });
        });

        // Add Gmail button listeners
        container.querySelectorAll('.btn-gmail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const email = btn.dataset.email;
                this.openGmail(email);
            });
        });

        // Add archive button listeners
        container.querySelectorAll('.btn-archive').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const button = e.target.closest('.btn-archive');
                const accountId = button.dataset.id;
                this.archiveAccount(accountId);
            });
        });

        // Add show password button listeners
        container.querySelectorAll('.btn-show-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const passwordField = btn.previousElementSibling;
                const isShowing = passwordField.textContent !== '••••••••';
                if (isShowing) {
                    passwordField.textContent = '••••••••';
                    btn.innerHTML = '<i class="bi bi-eye"></i>';
                } else {
                    passwordField.textContent = btn.dataset.password;
                    btn.innerHTML = '<i class="bi bi-eye-slash"></i>';
                }
            });
        });

        // Add copy button listeners
        container.querySelectorAll('.btn-copy:not(.btn-show-password)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = btn.dataset.text || btn.previousElementSibling.textContent;
                this.copyToClipboard(text, btn);
            });
        });

        // Add pagination button listeners
        const paginationBtns = wrapper.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const page = parseInt(btn.dataset.page, 10);
                this.currentPage = page;
                this.animatePaginationChange(container, accountsToRender);
            });
        });
    }

    createPaginationBar(totalPages, currentPage) {
        let html = '<div class="pagination-container">';
        
        // Previous button
        if (currentPage > 1) {
            html += `<button class="pagination-btn pagination-prev" data-page="${currentPage - 1}" title="Página anterior">
                        <i class="bi bi-chevron-left"></i>
                    </button>`;
        } else {
            html += `<button class="pagination-btn pagination-prev" disabled title="Página anterior">
                        <i class="bi bi-chevron-left"></i>
                    </button>`;
        }

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Show first page and dots if needed
        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-dots">...</span>`;
            }
        }

        // Show page numbers
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            html += `<button class="pagination-btn ${isActive ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        // Show last page and dots if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-dots">...</span>`;
            }
            html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (currentPage < totalPages) {
            html += `<button class="pagination-btn pagination-next" data-page="${currentPage + 1}" title="Página siguiente">
                        <i class="bi bi-chevron-right"></i>
                    </button>`;
        } else {
            html += `<button class="pagination-btn pagination-next" disabled title="Página siguiente">
                        <i class="bi bi-chevron-right"></i>
                    </button>`;
        }

        html += '</div>';
        
        // Add pagination shortcut hint
        html += '<div class="pagination-shortcut-hint"><small>Usa <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <i class="bi bi-chevron-left"></i> / <i class="bi bi-chevron-right"></i> para navegar</small></div>';
        
        return html;
    }

    renderTableView(container, accountsToRender) {
        const wrapper = document.getElementById('accountsWrapper');
        container.classList.add('table-view');
        
        // Remove pagination if exists
        const existingPagination = wrapper.querySelector('.pagination-container');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        const tableHTML = `
            <table class="accounts-table">
                <thead>
                    <tr>
                        <th>Correo</th>
                        <th>Categoría</th>
                        <th>Estado</th>
                        <th>Fecha de Creación</th>
                        <th style="text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${accountsToRender.map(account => this.createTableRow(account)).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        
        // Add event listeners to table rows
        container.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.table-actions')) {
                    this.viewAccount(row.dataset.id);
                }
            });
        });

        // Add action button listeners
        container.querySelectorAll('.btn-table-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountId = btn.dataset.id;
                this.toggleFavorite(accountId, btn);
            });
        });

        container.querySelectorAll('.btn-table-gmail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const email = btn.dataset.email;
                this.openGmail(email);
            });
        });

        container.querySelectorAll('.btn-table-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentEditingId = parseInt(btn.dataset.id, 10);
                this.deleteAccount();
            });
        });

        container.querySelectorAll('.btn-table-archive').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const button = e.target.closest('.btn-table-archive');
                const accountId = button.dataset.id;
                this.archiveAccount(accountId);
            });
        });
    }

    createTableRow(account) {
        const date = new Date(account.createdAt);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        return `
            <tr class="table-row" data-id="${account.id}">
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="bi bi-envelope" style="color: var(--primary-color);"></i>
                        <span class="table-email">${this.escapeHtml(account.email)}</span>
                    </div>
                </td>
                <td>
                    <span class="table-category">
                        <i class="bi bi-tag"></i>
                        ${this.getCategoryLabel(account.category)}
                    </span>
                </td>
                <td>
                    <span class="table-status ${account.status}">
                        <i class="bi ${account.status === 'activa' ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
                        ${account.status === 'activa' ? 'En uso' : 'En desuso'}
                    </span>
                </td>
                <td>${formattedDate}</td>
                <td>
                    <div class="table-actions" style="justify-content: center;">
                        <button type="button" class="btn-action btn-table-favorite" data-id="${account.id}" title="${account.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                            <i class="bi bi-star${account.isFavorite ? '-fill' : ''}"></i>
                        </button>
                        <button type="button" class="btn-action btn-table-gmail" data-email="${this.escapeHtml(account.email)}" title="Abrir en Gmail">
                            <i class="bi bi-box-arrow-up-right"></i>
                        </button>
                        <button type="button" class="btn-action btn-table-archive" data-id="${account.id}" title="${account.isArchived ? 'Desarchivar' : 'Archivar'}">
                            <i class="bi bi-archive${account.isArchived ? '-fill' : ''}"></i>
                        </button>
                        <button type="button" class="btn-action btn-table-delete" data-id="${account.id}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    createAccountCard(account) {
        const date = new Date(account.createdAt);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        let inactiveUntilHtml = '';
        if (account.status === 'inactiva' && account.inactiveUntil) {
            const formattedInactiveDate = this.formatDateString(account.inactiveUntil);
            const daysUntilActive = this.calculateDaysUntilDate(account.inactiveUntil);
            const daysText = daysUntilActive === 1 ? 'día' : 'días';
            inactiveUntilHtml = `<div class="account-inactive-until"><i class="bi bi-calendar"></i> En uso dentro de ${daysUntilActive} ${daysText}</div>`;
        }

        return `
            <div class="account-card" data-id="${account.id}">
                <div class="account-header">
                    <div class="account-email-section">
                        <i class="bi ${this.getCategoryIcon(account.category)} account-email-icon"></i>
                        <div class="account-email">${this.escapeHtml(account.email)}</div>
                    </div>
                    <div class="account-actions">
                        <button type="button" class="btn-action btn-favorite" data-id="${account.id}" title="${account.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                            <i class="bi bi-star${account.isFavorite ? '-fill' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="account-tags">
                    <span class="account-category">
                        <i class="bi bi-tag"></i>
                        ${this.getCategoryLabel(account.category)}
                    </span>
                    <span class="account-status ${account.status}">
                        <i class="bi ${account.status === 'activa' ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
                        ${account.status === 'activa' ? 'En uso' : 'En desuso'}
                    </span>
                    ${account.isArchived ? '<span class="account-archived"><i class="bi bi-archive-fill"></i> Archivada</span>' : ''}
                </div>
                ${inactiveUntilHtml}
                ${account.notes ? `
                <div class="account-notes-preview">
                    <i class="bi bi-sticky"></i>
                    <span class="notes-text">${this.escapeHtml(account.notes.substring(0, 80))}${account.notes.length > 80 ? '...' : ''}</span>
                </div>
                ` : ''}
                <div class="account-details">
                    <div class="account-detail">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${this.escapeHtml(account.email)}</span>
                        <button type="button" class="btn-copy" data-text="${this.escapeHtml(account.email)}" title="Copiar">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                    <div class="account-detail">
                        <span class="detail-label">Contraseña</span>
                        <span class="detail-value password-field" data-password="${this.escapeHtml(account.password)}">${this.showPasswordsGlobally ? this.escapeHtml(account.password) : '••••••••'}</span>
                        <button type="button" class="btn-copy btn-show-password" data-password="${this.escapeHtml(account.password)}" title="${this.showPasswordsGlobally ? 'Ocultar' : 'Mostrar'} contraseña">
                            <i class="bi bi-${this.showPasswordsGlobally ? 'eye-slash' : 'eye'}"></i>
                        </button>
                    </div>
                </div>
                <div class="account-actions-footer">
                    <button type="button" class="btn-action btn-gmail" data-email="${this.escapeHtml(account.email)}" title="Abrir en Gmail">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </button>
                    <button type="button" class="btn-action btn-archive" data-id="${account.id}" title="${account.isArchived ? 'Desarchivar' : 'Archivar'}">
                        <i class="bi bi-archive${account.isArchived ? '-fill' : ''}"></i>
                    </button>
                    <button type="button" class="btn-action btn-delete" data-id="${account.id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    viewAccount(id) {
        const account = this.accounts.find(a => a.id == id);
        if (!account) return;

        this.currentEditingId = account.id;
        const date = new Date(account.createdAt);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const content = `
            <div class="account-detail-item">
                <div class="account-detail-label">Correo electrónico</div>
                <div class="account-detail-value">${this.escapeHtml(account.email)}</div>
            </div>
            <div class="account-detail-item">
                <div class="account-detail-label">Contraseña</div>
                <div class="account-detail-value" id="passwordField">••••••••
                    <button type="button" class="btn btn-secondary" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" id="togglePassword">Mostrar</button>
                </div>
            </div>
            <div class="account-detail-item">
                <div class="account-detail-label">Categoría</div>
                <div class="account-detail-value">${this.getCategoryLabel(account.category)}</div>
            </div>
            <div class="account-detail-item">
                <div class="account-detail-label">Estado</div>
                <div class="form-group-checkbox" style="margin: 0;">
                    <label style="margin: 0;">
                        <input type="checkbox" id="viewStatus" ${account.status === 'activa' ? 'checked' : ''} />
                        <span>Cuenta en uso</span>
                    </label>
                </div>
            </div>
            <div class="account-detail-item" id="viewInactiveUntilGroup" style="display: ${account.status === 'inactiva' ? 'block' : 'none'};">
                <div class="account-detail-label account-detail-label-required">En desuso hasta</div>
                <input 
                    type="date" 
                    id="viewInactiveUntil" 
                    value="${account.inactiveUntil || ''}"
                    class="account-detail-input"
                    required
                />
            </div>
            ${account.notes ? `
            <div class="account-detail-item">
                <div class="account-detail-label">Notas</div>
                <div class="account-detail-value">${this.escapeHtml(account.notes)}</div>
            </div>
            ` : ''}
            <div class="account-detail-item">
                <div class="account-detail-label">Fecha de creación</div>
                <div class="account-detail-value">${formattedDate}</div>
            </div>
        `;

        document.getElementById('viewAccountContent').innerHTML = content;
        
        // Add status change handler
        const statusCheckbox = document.getElementById('viewStatus');
        const updateInactiveUntilVisibility = () => {
            const inactiveUntilGroup = document.getElementById('viewInactiveUntilGroup');
            if (!statusCheckbox.checked) {
                inactiveUntilGroup.style.display = 'block';
            } else {
                inactiveUntilGroup.style.display = 'none';
                document.getElementById('viewInactiveUntil').value = '';
            }
        };

        statusCheckbox.addEventListener('change', updateInactiveUntilVisibility);

        // Add toggle password functionality
        let isPasswordVisible = false;
        const toggleBtn = document.getElementById('togglePassword');
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isPasswordVisible = !isPasswordVisible;
            const passwordField = document.getElementById('passwordField');
            if (isPasswordVisible) {
                passwordField.textContent = this.escapeHtml(account.password) + ' ';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary';
                btn.style.marginLeft = '0.5rem';
                btn.style.padding = '0.25rem 0.5rem';
                btn.style.fontSize = '0.8rem';
                btn.textContent = 'Ocultar';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    isPasswordVisible = false;
                    document.getElementById('passwordField').innerHTML = '••••••••<button type="button" class="btn btn-secondary" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">Mostrar</button>';
                });
                passwordField.appendChild(btn);
            }
        });

        document.getElementById('viewModal').classList.add('active');
    }

    saveViewAccountChanges() {
        const account = this.accounts.find(a => a.id === this.currentEditingId);
        if (!account) return;

        const statusCheckbox = document.getElementById('viewStatus');
        const newStatus = statusCheckbox.checked ? 'activa' : 'inactiva';
        const inactiveUntilInput = document.getElementById('viewInactiveUntil');
        const inactiveUntilValue = inactiveUntilInput ? inactiveUntilInput.value : null;

        // Validar que si está en desuso, debe tener una fecha válida
        if (newStatus === 'inactiva' && !inactiveUntilValue) {
            this.showNotification('Debes seleccionar una fecha de desuso válida', 'error');
            return;
        }

        // Validar que la fecha de desuso sea en el futuro
        if (newStatus === 'inactiva' && inactiveUntilValue) {
            const today = new Date().toISOString().split('T')[0];
            if (inactiveUntilValue <= today) {
                this.showNotification('La fecha debe ser posterior a hoy', 'error');
                return;
            }
        }

        // Update account
        account.status = newStatus;
        account.inactiveUntil = newStatus === 'inactiva' && inactiveUntilValue ? inactiveUntilValue : null;

        // Update filtered accounts if exists
        const filteredAccount = this.filteredAccounts.find(a => a.id === this.currentEditingId);
        if (filteredAccount) {
            filteredAccount.status = newStatus;
            filteredAccount.inactiveUntil = account.inactiveUntil;
        }

        this.saveAccounts();
        this.renderAccounts();
        this.updateStats();
        this.closeViewModal();
        this.showNotification('Cambios guardados correctamente');
    }

    updateStats() {
        const searchTerm = document.getElementById('searchInput').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const hasFilters = searchTerm || categoryFilter || statusFilter;

        // If there are active filters, show stats for filtered accounts, otherwise show total stats
        const accountsToCount = hasFilters && this.filteredAccounts.length > 0 ? this.filteredAccounts : this.accounts;
        
        const total = accountsToCount.length;
        const active = accountsToCount.filter(a => a.status === 'activa').length;
        const inactive = accountsToCount.filter(a => a.status === 'inactiva').length;

        document.getElementById('totalAccounts').textContent = total;
        document.getElementById('activeAccounts').textContent = active;
        document.getElementById('inactiveAccounts').textContent = inactive;

        // Update sidebar stats
        this.updateSidebarStats();
    }

    checkAndUpdateInactiveAccounts() {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;

        this.accounts.forEach(account => {
            if (account.status === 'inactiva' && account.inactiveUntil) {
                if (today > account.inactiveUntil) {
                    account.status = 'activa';
                    account.inactiveUntil = null;
                    hasChanges = true;
                    
                    // Update in filtered accounts too
                    const filteredAccount = this.filteredAccounts.find(a => a.id === account.id);
                    if (filteredAccount) {
                        filteredAccount.status = 'activa';
                        filteredAccount.inactiveUntil = null;
                    }
                }
            }
        });

        if (hasChanges) {
            this.saveAccounts();
            this.renderAccounts();
            this.updateStats();
        }
    }

    getCategoryLabel(category) {
        const labels = {
            'streaming': 'Streaming',
            'redes-sociales': 'Redes Sociales',
            'billetera-virtual': 'Billetera Virtual',
            'trabajo': 'Trabajo',
            'app': 'App',
            'video-juego': 'Video Juego',
            'personal': 'Personal',
            'otros': 'Otros'
        };
        return labels[category] || category;
    }

    getCategoryIcon(category) {
        const icons = {
            'streaming': 'bi-play-circle-fill',
            'redes-sociales': 'bi-share-fill',
            'billetera-virtual': 'bi-wallet-fill',
            'trabajo': 'bi-briefcase-fill',
            'app': 'bi-phone',
            'video-juego': 'bi-controller',
            'personal': 'bi-person-circle',
            'otros': 'bi-box-seam'
        };
        return icons[category] || 'bi-envelope';
    }

    getCategoryColor(category) {
        const colors = {
            'streaming': '#E50914',           // Netflix Red
            'redes-sociales': '#0EA5E9',      // Sky Blue (Social)
            'billetera-virtual': '#10B981',   // Emerald (Money)
            'trabajo': '#8B5CF6',             // Violet (Professional)
            'app': '#F59E0B',                 // Amber (Apps)
            'video-juego': '#EC4899',         // Pink (Gaming)
            'personal': '#6366F1',            // Indigo (Personal)
            'otros': '#6B7280'                // Gray (Others)
        };
        return colors[category] || '#7C3AED';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check"></i>';
            this.showNotification('Copiado al portapapeles');
            setTimeout(() => {
                button.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => {
            this.showNotification('Error al copiar', 'error');
        });
    }

    saveAccounts() {
        localStorage.setItem('vaultmail_accounts', JSON.stringify(this.accounts));
    }

    loadAccounts() {
        const data = localStorage.getItem('vaultmail_accounts');
        this.accounts = data ? JSON.parse(data) : [];
        
        // Ensure all accounts have the isArchived property
        this.accounts = this.accounts.map(account => ({
            ...account,
            isArchived: account.isArchived || false
        }));
        
        this.filteredAccounts = [...this.accounts];
    }

    toggleTheme() {
        const body = document.body;
        const themeToggleSidebar = document.getElementById('themeToggleSidebar');
        const iconElement = themeToggleSidebar.querySelector('i');
        
        // Agregar clase para efecto de transición
        body.classList.add('theme-transitioning');
        
        body.classList.toggle('light-mode');
        
        // Cambiar el icono
        if (body.classList.contains('light-mode')) {
            iconElement.className = 'bi bi-sun';
            localStorage.setItem('theme', 'light');
        } else {
            iconElement.className = 'bi bi-moon';
            localStorage.setItem('theme', 'dark');
        }
        
        // Remover la clase de transición después de completarla
        setTimeout(() => {
            body.classList.remove('theme-transitioning');
        }, 300);
    }

    initTheme() {
        // No aplicar tema si estamos en la pantalla de login
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && !loginScreen.classList.contains('d-none')) {
            document.body.classList.remove('light-mode');
            return;
        }
        
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const body = document.body;
        const themeToggleSidebar = document.getElementById('themeToggleSidebar');
        const iconElement = themeToggleSidebar.querySelector('i');
        
        if (savedTheme === 'light') {
            body.classList.add('light-mode');
            iconElement.className = 'bi bi-sun';
        } else {
            body.classList.remove('light-mode');
            iconElement.className = 'bi bi-moon';
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? '#ef4444' : '#10b981';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 2000;
            animation: slideInRight 0.3s ease-out;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    toggleFavorite(accountId, btn) {
        const account = this.accounts.find(a => a.id == accountId);
        if (!account) return;

        account.isFavorite = !account.isFavorite;
        this.saveAccounts();

        // Update button icon
        const icon = btn.querySelector('i');
        if (account.isFavorite) {
            icon.classList.remove('bi-star');
            icon.classList.add('bi-star-fill');
            btn.title = 'Quitar de favoritos';
        } else {
            icon.classList.remove('bi-star-fill');
            icon.classList.add('bi-star');
            btn.title = 'Agregar a favoritos';
        }

        this.showNotification(account.isFavorite ? 'Agregado a favoritos' : 'Quitado de favoritos');
    }

    openGmail(email) {
        // Google's account selector URL that opens Gmail for the specified email
        const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(email)}`;
        window.open(gmailUrl, '_blank');
    }

    exportAccounts() {
        if (this.accounts.length === 0) {
            this.showNotification('No hay cuentas para exportar', 'error');
            return;
        }

        const dataToExport = JSON.stringify(this.accounts, null, 2);
        const blob = new Blob([dataToExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vaultmail-backup-${new Date().getTime()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Cuentas exportadas exitosamente');
    }

    importAccounts(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedAccounts = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedAccounts)) {
                    throw new Error('El archivo no contiene un array válido');
                }

                // Validate accounts structure
                const isValid = importedAccounts.every(acc => 
                    acc.email && acc.password && acc.category && typeof acc.id === 'number'
                );

                if (!isValid) {
                    throw new Error('El archivo contiene un formato inválido');
                }

                // Merge with existing accounts (avoid duplicates by ID)
                const existingIds = new Set(this.accounts.map(a => a.id));
                let importedCount = 0;

                importedAccounts.forEach(importedAccount => {
                    if (!existingIds.has(importedAccount.id)) {
                        this.accounts.push({
                            ...importedAccount,
                            isFavorite: importedAccount.isFavorite || false
                        });
                        importedCount++;
                    }
                });

                this.saveAccounts();
                this.renderAccounts();
                this.updateStats();
                this.showNotification(`${importedCount} cuenta(s) importada(s) exitosamente`);
            } catch (error) {
                this.showNotification(`Error al importar: ${error.message}`, 'error');
            }
        };

        reader.readAsText(file);
        // Reset file input
        event.target.value = '';
    }

    toggleShowOnlyFavorites() {
        this.showOnlyFavorites = !this.showOnlyFavorites;
        const btn = document.getElementById('showFavoritesBtn');
        
        if (this.showOnlyFavorites) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="bi bi-star-fill"></i><span>Favoritos</span>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="bi bi-star"></i><span>Favoritos</span>';
        }

        this.renderAccounts();
    }

    navigatePaginationNext() {
        const container = document.getElementById('accountsContainer');
        const searchTerm = document.getElementById('searchInput').value.trim();
        const categoryFilter = document.getElementById('categoryFilter').value.trim();
        const statusFilter = document.getElementById('statusFilter').value.trim();
        const hasActiveFilters = searchTerm || categoryFilter || statusFilter;

        let accountsToRender = hasActiveFilters ? this.filteredAccounts : this.accounts;

        if (!this.showOnlyArchived) {
            accountsToRender = accountsToRender.filter(a => !a.isArchived);
        } else {
            accountsToRender = accountsToRender.filter(a => a.isArchived);
        }

        if (this.showOnlyFavorites) {
            accountsToRender = accountsToRender.filter(a => a.isFavorite);
        }

        const totalPages = Math.ceil(accountsToRender.length / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.animatePaginationChange(container, accountsToRender);
        }
    }

    navigatePaginationPrevious() {
        const container = document.getElementById('accountsContainer');
        const searchTerm = document.getElementById('searchInput').value.trim();
        const categoryFilter = document.getElementById('categoryFilter').value.trim();
        const statusFilter = document.getElementById('statusFilter').value.trim();
        const hasActiveFilters = searchTerm || categoryFilter || statusFilter;

        let accountsToRender = hasActiveFilters ? this.filteredAccounts : this.accounts;

        if (!this.showOnlyArchived) {
            accountsToRender = accountsToRender.filter(a => !a.isArchived);
        } else {
            accountsToRender = accountsToRender.filter(a => a.isArchived);
        }

        if (this.showOnlyFavorites) {
            accountsToRender = accountsToRender.filter(a => a.isFavorite);
        }

        if (this.currentPage > 1) {
            this.currentPage--;
            this.animatePaginationChange(container, accountsToRender);
        }
    }

    animatePaginationChange(container, accountsToRender) {
        // Add fade-out animation
        container.classList.add('pagination-fade-out');
        
        // Wait for animation to complete, then render and animate in
        setTimeout(() => {
            this.renderCardsView(container, accountsToRender);
            container.classList.remove('pagination-fade-out');
            container.classList.add('pagination-fade-in');
            
            // Remove fade-in class after animation and scroll to view controls bar
            setTimeout(() => {
                container.classList.remove('pagination-fade-in');
                
                // Scroll to view controls bar smoothly
                const viewControlsBar = document.querySelector('.view-controls-bar');
                if (viewControlsBar) {
                    viewControlsBar.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 300);
        }, 150);
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'cards' ? 'table' : 'cards';
        const btn = document.getElementById('toggleViewBtn');
        
        if (this.viewMode === 'table') {
            btn.classList.add('active');
            btn.innerHTML = '<i class="bi bi-list-check"></i><span>Vista Tabla</span>';
            btn.title = 'Cambiar a vista cards';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="bi bi-grid-3x3"></i><span>Vista Cards</span>';
            btn.title = 'Cambiar a vista tabla';
        }
        
        this.renderAccounts();
    }

    togglePasswordVisibility() {
        this.showPasswordsGlobally = !this.showPasswordsGlobally;
        const btn = document.getElementById('togglePasswordVisibilityBtn');
        
        if (this.showPasswordsGlobally) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="bi bi-eye-slash"></i><span>Ocultar Contraseñas</span>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="bi bi-eye"></i><span>Ver Contraseñas</span>';
        }

        this.renderAccounts();
    }

    toggleShowOnlyArchived() {
        this.showOnlyArchived = !this.showOnlyArchived;
        const btn = document.getElementById('showArchivedBtn');
        
        if (this.showOnlyArchived) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="bi bi-archive-fill"></i><span>Archivadas</span>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="bi bi-archive"></i><span>Archivadas</span>';
        }

        this.filterAccounts();
    }

    archiveAccount(accountId) {
        const id = parseInt(accountId, 10);
        const account = this.accounts.find(a => a.id === id);
        if (account) {
            account.isArchived = !account.isArchived;
            this.saveAccounts();
            this.renderAccounts();
            this.updateStats();
            const message = account.isArchived ? 'Cuenta archivada' : 'Cuenta desarchivada';
            this.showNotification(message);
        }
    }

    // Sidebar methods
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    handleSidebarViewClick(e) {
        this.hideAllTooltips();
        const view = e.currentTarget.getAttribute('data-view');
        
        // Update active button in sidebar
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        e.currentTarget.classList.add('active');

        // Apply filters
        if (view === 'all') {
            this.showOnlyFavorites = false;
            this.showOnlyArchived = false;
        } else if (view === 'favorites') {
            this.showOnlyFavorites = true;
            this.showOnlyArchived = false;
        } else if (view === 'inactive') {
            this.showOnlyFavorites = false;
            this.showOnlyArchived = true;
        }

        // Update main buttons
        this.updateMainViewButtons();
        this.filterAccounts();
    }

    handleSidebarCategoryClick(e) {
        this.hideAllTooltips();
        const category = e.currentTarget.getAttribute('data-category');
        const isActive = e.currentTarget.classList.contains('active');
        
        if (isActive) {
            // Si ya está seleccionada, deselecciona
            document.getElementById('categoryFilter').value = '';
            e.currentTarget.classList.remove('active');
        } else {
            // Si no está seleccionada, selecciona
            document.getElementById('categoryFilter').value = category;
            
            // Update sidebar button styling
            document.querySelectorAll('[data-category]').forEach(btn => {
                btn.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
        }

        this.filterAccounts();
    }

    updateMainViewButtons() {
        const showFavoritesBtn = document.getElementById('showFavoritesBtn');
        const showArchivedBtn = document.getElementById('showArchivedBtn');

        if (this.showOnlyFavorites) {
            showFavoritesBtn.classList.add('active');
        } else {
            showFavoritesBtn.classList.remove('active');
        }

        if (this.showOnlyArchived) {
            showArchivedBtn.classList.add('active');
        } else {
            showArchivedBtn.classList.remove('active');
        }
    }

    updateSidebarStats() {
        const totalAccounts = this.accounts.length;
        const activeAccounts = this.accounts.filter(a => a.status === 'activa').length;
        const favoriteAccounts = this.accounts.filter(a => a.isFavorite).length;

        document.getElementById('sidebarTotalAccounts').textContent = totalAccounts;
        document.getElementById('sidebarActiveAccounts').textContent = activeAccounts;
        document.getElementById('sidebarFavoritesCount').textContent = favoriteAccounts;
    }

    toggleSidebarCollapse() {
        const sidebar = document.getElementById('sidebar');
        const mainContainer = document.querySelector('.main-container');
        const footer = document.querySelector('.footer');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        
        sidebar.classList.toggle('collapsed');
        mainContainer.classList.toggle('sidebar-collapsed');
        footer.classList.toggle('sidebar-collapsed');

        // Rotar el icono del botón
        if (sidebar.classList.contains('collapsed')) {
            collapseBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
            localStorage.setItem('sidebarCollapsed', 'true');
            // Enable tooltips when collapsed
            this.initializeTooltips();
        } else {
            collapseBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
            localStorage.setItem('sidebarCollapsed', 'false');
            // Disable tooltips when expanded
            this.disableTooltips();
        }
    }

    loadSidebarState() {
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed) {
            const sidebar = document.getElementById('sidebar');
            const mainContainer = document.querySelector('.main-container');
            const footer = document.querySelector('.footer');
            const collapseBtn = document.getElementById('sidebarCollapseBtn');
            
            sidebar.classList.add('collapsed');
            mainContainer.classList.add('sidebar-collapsed');
            footer.classList.add('sidebar-collapsed');
            collapseBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        }
    }

    initializeTooltips() {
        const sidebar = document.getElementById('sidebar');
        // Only initialize tooltips if sidebar is collapsed
        if (!sidebar.classList.contains('collapsed')) {
            return;
        }
        
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach((tooltipTriggerEl) => {
            // Destroy existing tooltip if any
            const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (existingTooltip) {
                existingTooltip.dispose();
            }
            // Create new tooltip
            new bootstrap.Tooltip(tooltipTriggerEl, {
                delay: { show: 100, hide: 0 }
            });
        });
    }

    showSkeletonLoader() {
        const skeletonLoader = document.getElementById('skeletonLoader');
        const accountsContainer = document.getElementById('accountsContainer');
        
        if (skeletonLoader && accountsContainer) {
            skeletonLoader.style.display = 'grid';
            accountsContainer.style.display = 'none';
        }
    }

    hideSkeletonLoader() {
        const skeletonLoader = document.getElementById('skeletonLoader');
        const accountsContainer = document.getElementById('accountsContainer');
        
        if (skeletonLoader && accountsContainer) {
            skeletonLoader.style.display = 'none';
            accountsContainer.style.display = 'grid';
        }
    }

    disableTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach((tooltipTriggerEl) => {
            const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (tooltip) {
                tooltip.dispose();
            }
        });
    }

    hideAllTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach((tooltipTriggerEl) => {
            const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (tooltip) {
                tooltip.hide();
            }
        });
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new VaultMail();
});