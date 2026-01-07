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
        this.pendingImportData = null;
        this.pendingImportMode = null;
        
        // Swipe gesture properties
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        
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
            localStorage.setItem('vaultmail_login_time', Date.now().toString());
            document.getElementById('loginForm').reset();
            this.accessDashboard();
        } else {
            // Verify password
            if (this.verifyPassword(password, storedPassword)) {
                localStorage.setItem('vaultmail_authenticated', 'true');
                localStorage.setItem('vaultmail_login_time', Date.now().toString());
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
        const loginScreen = document.getElementById('loginScreen');
        loginScreen.classList.add('slide-out-left');
        
        // Esperar a que la animación termine antes de ocultar
        setTimeout(() => {
            loginScreen.classList.add('d-none');
        }, 700);
        
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
        let value = emailInput.value;
        
        // Sanitizar: remover espacios y convertir a minúsculas
        const sanitizedValue = value.replace(/\s+/g, '').toLowerCase();
        if (value !== sanitizedValue) {
            emailInput.value = sanitizedValue;
            value = sanitizedValue;
        }
        
        // Si el valor contiene @, ocultar el sufijo
        if (value.includes('@')) {
            emailSuffix.classList.add('hidden');
        } else {
            emailSuffix.classList.remove('hidden');
        }
    }

    performLogout() {
        localStorage.removeItem('vaultmail_authenticated');
        localStorage.removeItem('vaultmail_login_time');
        if (this.sessionTimeInterval) {
            clearInterval(this.sessionTimeInterval);
            this.sessionTimeInterval = null;
        }
        if (this.sessionNotificationCheckInterval) {
            clearInterval(this.sessionNotificationCheckInterval);
            this.sessionNotificationCheckInterval = null;
        }
        document.getElementById('logoutConfirmModal').classList.add('d-none');
        const loginScreen = document.getElementById('loginScreen');
        loginScreen.classList.remove('d-none');
        loginScreen.classList.remove('slide-out-left');
        loginScreen.classList.add('slide-in-right');
        document.body.style.overflow = 'hidden';
        this.accounts = [];
        this.filteredAccounts = [];
        document.getElementById('accountsContainer').innerHTML = '';
        document.getElementById('loginPassword').value = '';
        
        // Quitar la clase de animación después de terminar
        setTimeout(() => {
            loginScreen.classList.remove('slide-in-right');
        }, 700);
        
        this.showLoginModal();
    }

    init() {
        this.initTheme();
        this.loadAccounts();
        this.checkAndUpdateInactiveAccounts(); // Check on load
        this.setupEventListeners();
        this.setupSwipeGestures();
        this.setupKeyboardShortcuts();
        this.loadSidebarState();
        this.renderAccounts();
        this.updateStats();
        this.initializeTooltips(); // Initialize tooltips only if sidebar is collapsed
        this.initSessionNotification(); // Initialize session notification
        
        // Nueva configuración de funcionalidades
        this.setupPasswordGeneratorModal();
        this.setupTags();
        this.setupPasswordStrengthIndicator();
    }

    setupEventListeners() {
        // Clone elements to remove existing event listeners before adding new ones
        const sidebarToggle = document.getElementById('sidebarToggle');
        const newSidebarToggle = sidebarToggle.cloneNode(true);
        sidebarToggle.parentNode.replaceChild(newSidebarToggle, sidebarToggle);

        const sidebarClose = document.getElementById('sidebarClose');
        const newSidebarClose = sidebarClose.cloneNode(true);
        sidebarClose.parentNode.replaceChild(newSidebarClose, sidebarClose);

        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const newSidebarOverlay = sidebarOverlay.cloneNode(true);
        sidebarOverlay.parentNode.replaceChild(newSidebarOverlay, sidebarOverlay);

        const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
        const newSidebarCollapseBtn = sidebarCollapseBtn.cloneNode(true);
        sidebarCollapseBtn.parentNode.replaceChild(newSidebarCollapseBtn, sidebarCollapseBtn);

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
            this.showImportModeModal();
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
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModeModal());
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

        // Keyboard shortcuts - remove old listener before adding new one
        document.removeEventListener('keydown', this._keyboardHandler);
        this._keyboardHandler = (e) => this.handleKeyboardShortcuts(e);
        document.addEventListener('keydown', this._keyboardHandler);
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
        
        // Resetear etiquetas
        const tagsContainer = document.getElementById('tagsContainer');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
        }
        
        // Resetear el estado del grupo de fecha inactiva
        const inactiveUntilGroup = document.getElementById('inactiveUntilGroup');
        const statusCheckbox = document.getElementById('status');
        inactiveUntilGroup.style.display = 'none';
        document.getElementById('inactiveUntil').value = '';
        
        // Resetear indicador de fortaleza de contraseña
        const passwordStrengthGroup = document.getElementById('passwordStrengthGroup');
        if (passwordStrengthGroup) {
            passwordStrengthGroup.style.display = 'none';
        }
        
        document.querySelector('.modal-header h2').textContent = 'Agregar Nueva Cuenta';
        document.querySelector('.modal-description').textContent = 'Completa los datos de tu cuenta';
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

        const username = document.getElementById('username').value.trim();
        let email = document.getElementById('email').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        // Validar que al menos uno de los dos esté completado
        if (!username && !email) {
            this.showNotification('Debes completar al menos el nombre de usuario o el correo electrónico');
            return;
        }

        // Validar que las notas no estén vacías
        if (!notes) {
            this.showNotification('Las notas son obligatorias. Agrega una descripción de la cuenta.');
            document.getElementById('notes').focus();
            return;
        }
        
        // Si el email no contiene @, agregar @gmail.com automáticamente
        if (email && !email.includes('@')) {
            email = email + '@gmail.com';
        }
        
        const statusCheckbox = document.getElementById('status').checked;
        const inactiveUntilValue = document.getElementById('inactiveUntil').value;

        // Validar que no exista otro registro igual (si es una nueva cuenta o si cambió)
        let isDuplicate = false;
        let duplicateIdentifier = email || username;
        
        if (!this.currentEditingId) {
            // Es una nueva cuenta, verificar si el email o username ya existe
            if (email) {
                const emailExists = this.accounts.some(a => a.email && a.email.toLowerCase() === email.toLowerCase());
                if (emailExists) {
                    isDuplicate = true;
                }
            }
            if (!isDuplicate && username) {
                const usernameExists = this.accounts.some(a => a.username && a.username.toLowerCase() === username.toLowerCase());
                if (usernameExists) {
                    isDuplicate = true;
                    duplicateIdentifier = username;
                }
            }
        } else {
            // Es una edición, verificar si el email o username cambiaron y si los nuevos valores ya existen
            const currentAccount = this.accounts.find(a => a.id === this.currentEditingId);
            if (email && currentAccount.email && currentAccount.email.toLowerCase() !== email.toLowerCase()) {
                const emailExists = this.accounts.some(a => a.email && a.email.toLowerCase() === email.toLowerCase());
                if (emailExists) {
                    isDuplicate = true;
                }
            }
            if (!isDuplicate && username && currentAccount.username && currentAccount.username.toLowerCase() !== username.toLowerCase()) {
                const usernameExists = this.accounts.some(a => a.username && a.username.toLowerCase() === username.toLowerCase());
                if (usernameExists) {
                    isDuplicate = true;
                    duplicateIdentifier = username;
                }
            }
        }

        // Si hay duplicado, mostrar modal de confirmación
        if (isDuplicate) {
            this.showDuplicateConfirmation(duplicateIdentifier);
            return;
        }

        // Si no hay duplicado, proceder con el guardado
        this.saveAccount(username, email, statusCheckbox, inactiveUntilValue);
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
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const statusCheckbox = document.getElementById('status').checked;
            const inactiveUntilValue = document.getElementById('inactiveUntil').value;
            this.saveAccount(username, email, statusCheckbox, inactiveUntilValue);
            duplicateModal.hide();
        };
    }

    saveAccount(username, email, statusCheckbox, inactiveUntilValue) {
        // Sanitizar username y email: remover espacios y convertir a minúsculas
        username = username ? username.replace(/\s+/g, '').toLowerCase() : null;
        email = email ? email.replace(/\s+/g, '').toLowerCase() : null;
        
        const account = {
            id: this.currentEditingId || Date.now(),
            username: username,
            email: email,
            password: document.getElementById('password').value,
            notes: document.getElementById('notes').value,
            category: document.getElementById('category').value,
            status: statusCheckbox ? 'activa' : 'inactiva',
            inactiveUntil: !statusCheckbox && inactiveUntilValue ? inactiveUntilValue : null,
            createdAt: this.currentEditingId ? this.accounts.find(a => a.id === this.currentEditingId).createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: this.currentEditingId ? this.accounts.find(a => a.id === this.currentEditingId).isFavorite : false,
            isArchived: this.currentEditingId ? this.accounts.find(a => a.id === this.currentEditingId).isArchived : false,
            tags: this.getTags()
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
                                    (account.email && account.email.toLowerCase().includes(searchTerm)) ||
                                    (account.username && account.username.toLowerCase().includes(searchTerm)) ||
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

        document.getElementById('username').value = account.username || '';
        document.getElementById('email').value = account.email || '';
        document.getElementById('password').value = account.password;
        document.getElementById('notes').value = account.notes;
        document.getElementById('category').value = account.category;
        document.getElementById('status').checked = account.status === 'activa';
        document.getElementById('inactiveUntil').value = account.inactiveUntil || '';

        // Cargar etiquetas existentes
        const tagsContainer = document.getElementById('tagsContainer');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            if (account.tags && account.tags.length > 0) {
                account.tags.forEach(tag => this.addTag(tag));
            }
        }

        // Actualizar indicador de fortaleza de contraseña
        this.updatePasswordStrengthUI(account.password);

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
                                (account.email && account.email.toLowerCase().includes(searchTerm)) ||
                                (account.username && account.username.toLowerCase().includes(searchTerm)) ||
                                (account.notes && account.notes.toLowerCase().includes(searchTerm)) ||
                                (account.tags && account.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
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
                const accountId = parseFloat(btn.dataset.id);
                this.toggleFavorite(accountId, btn);
            });
        });

        // Add tag removal listeners
        container.querySelectorAll('.btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountId = btn.dataset.accountId;
                const tag = btn.dataset.tag;
                this.removeTagFromAccount(accountId, tag);
            });
        });

        // Close tag input when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.account-card')) {
                container.querySelectorAll('.account-tag-input-section').forEach(section => {
                    section.style.display = 'none';
                    const input = section.querySelector('.account-tag-input');
                    input.value = '';
                });
            }
        });

        // Add tag input toggle listeners
        container.querySelectorAll('.btn-toggle-add-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.account-card');
                const inputSection = card.querySelector('.account-tag-input-section');
                const input = card.querySelector('.account-tag-input');
                if (inputSection.style.display === 'none') {
                    inputSection.style.display = 'flex';
                    input.focus();
                } else {
                    inputSection.style.display = 'none';
                    input.value = '';
                }
            });
        });

        // Add tag input listeners
        container.querySelectorAll('.account-tag-input').forEach(input => {
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    const addBtn = input.nextElementSibling;
                    const accountId = addBtn.dataset.id;
                    const tag = input.value.trim();
                    if (tag) {
                        this.addTagToAccount(accountId, tag);
                        input.value = '';
                    }
                }
            });
        });

        // Add tag button listeners
        container.querySelectorAll('.btn-add-tag-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const input = btn.previousElementSibling;
                const accountId = btn.dataset.id;
                const tag = input.value.trim();
                if (tag) {
                    this.addTagToAccount(accountId, tag);
                    input.value = '';
                }
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
                const accountId = parseFloat(btn.dataset.id);
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
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-direction: column; align-items: flex-start;">
                        ${account.username ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="bi bi-person" style="color: var(--primary-color);"></i>
                            <span class="table-username">${this.escapeHtml(account.username)}</span>
                        </div>
                        ` : ''}
                        ${account.email ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="bi bi-envelope" style="color: var(--primary-color);"></i>
                            <span class="table-email">${this.escapeHtml(account.email)}</span>
                        </div>
                        ` : ''}
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
                        ${account.email ? `
                        <button type="button" class="btn-action btn-table-gmail" data-email="${this.escapeHtml(account.email)}" title="Abrir en Gmail">
                            <i class="bi bi-box-arrow-up-right"></i>
                        </button>
                        ` : ''}
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

        // Renderizar etiquetas personalizadas
        let tagsHtml = '';
        if (account.tags && account.tags.length > 0) {
            tagsHtml = `<div class="account-custom-tags" style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem;">
                ${account.tags.map(tag => `<span class="tag-badge" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" data-account-id="${account.id}" data-tag="${this.escapeHtml(tag)}">
                    <span>${this.escapeHtml(tag)}</span>
                    <button type="button" class="btn-remove-tag" data-account-id="${account.id}" data-tag="${this.escapeHtml(tag)}"><i class="bi bi-x"></i></button>
                </span>`).join('')}
            </div>`;
        }

        return `
            <div class="account-card" data-id="${account.id}">
                <div class="account-header">
                    <div class="account-email-section">
                        <i class="bi ${this.getCategoryIcon(account.category)} account-email-icon"></i>
                        <div class="account-email">${this.escapeHtml(account.email || account.username || 'Sin datos')}</div>
                    </div>
                    <div class="account-actions">
                        <div class="btn-action btn-status" title="${account.status === 'activa' ? 'En uso' : 'En desuso'}" style="${account.status === 'activa' ? 'background-color: rgba(34, 197, 94, 0.2);' : 'background-color: rgba(239, 68, 68, 0.2);'}">
                            ${account.status === 'activa' ? '<i class="bi bi-check" style="color: var(--success-color);"></i>' : '<i class="bi bi-dash" style="color: var(--danger-color);"></i>'}
                        </div>
                        <button type="button" class="btn-action btn-favorite" data-id="${account.id}" title="${account.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                            <i class="bi bi-star${account.isFavorite ? '-fill' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="account-tags">
                    ${account.isArchived ? '<span class="account-archived"><i class="bi bi-archive-fill"></i> Archivada</span>' : ''}
                </div>
                ${tagsHtml}
                <div class="account-tag-input-section" style="display: none; margin-top: 0.5rem; gap: 0.5rem;">
                    <input type="text" class="account-tag-input" placeholder="Nueva etiqueta..." maxlength="30" style="flex: 1; padding: 0.5rem 0.8rem; border: 2px solid var(--primary-color); border-radius: 6px; background: var(--bg-dark); color: var(--text-primary); font-size: 0.9rem; outline: none;">
                    <button type="button" class="btn-add-tag-card" data-id="${account.id}" style="padding: 0.5rem 0.8rem; font-size: 1.1rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 40px; transition: all 0.3s ease;"><i class="bi bi-plus-lg"></i></button>
                </div>
                ${inactiveUntilHtml}
                ${account.notes ? `
                <div class="account-notes-preview">
                    <i class="bi bi-sticky"></i>
                    <span class="notes-text">${this.escapeHtml(account.notes.substring(0, 80))}${account.notes.length > 80 ? '...' : ''}</span>
                </div>
                ` : ''}
                <div class="account-details">
                    ${account.username ? `
                    <div class="account-detail">
                        <span class="detail-label">Usuario</span>
                        <span class="detail-value">${this.escapeHtml(account.username)}</span>
                        <button type="button" class="btn-copy" data-text="${this.escapeHtml(account.username)}" title="Copiar">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                    ` : ''}
                    ${account.email ? `
                    <div class="account-detail">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${this.escapeHtml(account.email)}</span>
                        <button type="button" class="btn-copy" data-text="${this.escapeHtml(account.email)}" title="Copiar">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                    ` : ''}
                    <div class="account-detail">
                        <span class="detail-label">Contraseña</span>
                        <span class="detail-value password-field" data-password="${this.escapeHtml(account.password)}">${this.showPasswordsGlobally ? this.escapeHtml(account.password) : '••••••••'}</span>
                        <button type="button" class="btn-copy btn-show-password" data-password="${this.escapeHtml(account.password)}" title="${this.showPasswordsGlobally ? 'Ocultar' : 'Mostrar'} contraseña">
                            <i class="bi bi-${this.showPasswordsGlobally ? 'eye-slash' : 'eye'}"></i>
                        </button>
                    </div>
                </div>
                <div class="account-actions-footer">
                    <span class="account-category" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
                        <i class="bi ${this.getCategoryIcon(account.category)}"></i>
                        ${this.getCategoryLabel(account.category)}
                    </span>
                    ${account.email ? `
                    <button type="button" class="btn-action btn-gmail" data-email="${this.escapeHtml(account.email)}" title="Abrir en Gmail">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </button>
                    ` : ''}
                    <button type="button" class="btn-action btn-toggle-add-tag" data-id="${account.id}" title="Agregar etiqueta" style="font-size: 1.3rem;">
                        <i class="bi bi-plus-lg"></i>
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
            ${account.username ? `
            <div class="account-detail-item">
                <div class="account-detail-label">Nombre de usuario</div>
                <div class="account-detail-value">${this.escapeHtml(account.username)}</div>
            </div>
            ` : ''}
            ${account.email ? `
            <div class="account-detail-item">
                <div class="account-detail-label">Correo electrónico</div>
                <div class="account-detail-value">${this.escapeHtml(account.email)}</div>
            </div>
            ` : ''}
            <div class="account-detail-item">
                <div class="account-detail-label">Contraseña</div>
                <div class="account-detail-password-group">
                    <div class="account-detail-value" id="passwordField">••••••••</div>
                    <button type="button" class="btn-password-toggle" id="togglePassword" title="Mostrar/Ocultar contraseña">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                <input 
                    type="password"
                    id="editPassword"
                    class="account-detail-input"
                    placeholder="Nueva contraseña (dejar en blanco para no cambiar)"
                    style="margin-top: 0.5rem;"
                />
            </div>
            <div class="account-detail-item">
                <div class="account-detail-label">Categoría</div>
                <select id="editCategory" class="account-detail-input">
                    <option value="otros" ${account.category === 'otros' ? 'selected' : ''}>Otros</option>
                    <option value="email" ${account.category === 'email' ? 'selected' : ''}>Email</option>
                    <option value="redes_sociales" ${account.category === 'redes_sociales' ? 'selected' : ''}>Redes Sociales</option>
                    <option value="trabajo" ${account.category === 'trabajo' ? 'selected' : ''}>Trabajo</option>
                    <option value="finanzas" ${account.category === 'finanzas' ? 'selected' : ''}>Finanzas</option>
                    <option value="entretenimiento" ${account.category === 'entretenimiento' ? 'selected' : ''}>Entretenimiento</option>
                    <option value="educacion" ${account.category === 'educacion' ? 'selected' : ''}>Educación</option>
                </select>
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
                <textarea 
                    id="editNotes"
                    class="account-detail-input"
                    style="resize: vertical; min-height: 100px;"
                >${this.escapeHtml(account.notes)}</textarea>
            </div>
            ` : `
            <div class="account-detail-item">
                <div class="account-detail-label">Notas</div>
                <textarea 
                    id="editNotes"
                    class="account-detail-input"
                    placeholder="Agrega notas sobre esta cuenta..."
                    style="resize: vertical; min-height: 100px;"></textarea>
            </div>
            `}
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
        const passwordField = document.getElementById('passwordField');
        const icon = toggleBtn.querySelector('i');
        
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isPasswordVisible = !isPasswordVisible;
            if (isPasswordVisible) {
                passwordField.textContent = this.escapeHtml(account.password);
                icon.className = 'bi bi-eye-slash';
                toggleBtn.setAttribute('title', 'Ocultar contraseña');
            } else {
                passwordField.textContent = '••••••••';
                icon.className = 'bi bi-eye';
                toggleBtn.setAttribute('title', 'Mostrar contraseña');
            }
        });

        document.getElementById('viewModal').classList.add('active');
    }

    saveViewAccountChanges() {
        const account = this.accounts.find(a => a.id === this.currentEditingId);
        if (!account) return;

        const statusCheckbox = document.getElementById('viewStatus');
        const newStatus = statusCheckbox.checked ? 'activa' : 'inactiva';
        const newPassword = document.getElementById('editPassword').value;
        const newCategory = document.getElementById('editCategory').value;
        const newNotes = document.getElementById('editNotes').value.trim();
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
        
        // Update password if provided
        if (newPassword.trim()) {
            account.password = newPassword;
        }
        
        // Update category
        account.category = newCategory;

        // Update notes
        account.notes = newNotes;
        account.updatedAt = new Date().toISOString();

        // Update filtered accounts if exists
        const filteredAccount = this.filteredAccounts.find(a => a.id === this.currentEditingId);
        if (filteredAccount) {
            filteredAccount.status = newStatus;
            filteredAccount.inactiveUntil = account.inactiveUntil;
            if (newPassword.trim()) {
                filteredAccount.password = newPassword;
            }
            filteredAccount.category = newCategory;
            filteredAccount.notes = newNotes;
            filteredAccount.updatedAt = account.updatedAt;
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
        document.getElementById('totalFavorites').textContent = accountsToCount.filter(a => a.isFavorite).length;

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
            // Cambiar icono temporalmente
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check-circle"></i>';
            button.style.color = 'var(--success-color)';
            
            // Mostrar notificación con animación
            this.showNotification('✓ Copiado al portapapeles', 'success', 1500);
            
            // Restaurar estado original después de 2 segundos
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            button.innerHTML = '<i class="bi bi-exclamation-circle"></i>';
            button.style.color = 'var(--error-color)';
            this.showNotification('❌ Error al copiar al portapapeles', 'error', 1500);
            setTimeout(() => {
                const originalIcon = button.innerHTML;
                button.innerHTML = originalIcon;
                button.style.color = '';
            }, 2000);
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

    showNotification(message, type = 'success', duration = 3000) {
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
        }, duration);
    }

    toggleFavorite(accountId, btn) {
        const account = this.accounts.find(a => a.id === accountId);
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

    addTagToAccount(accountId, tag) {
        const id = parseInt(accountId, 10);
        const account = this.accounts.find(a => a.id === id);
        if (!account) return;

        tag = tag.trim().toLowerCase();
        
        // Verificar que la etiqueta no esté vacía
        if (!tag) {
            this.showNotification('La etiqueta no puede estar vacía', 'error');
            return;
        }

        // Verificar límite de caracteres (máximo 30)
        if (tag.length > 30) {
            this.showNotification('La etiqueta debe tener máximo 30 caracteres', 'warning');
            return;
        }

        // Verificar que la etiqueta no exista ya
        if (account.tags && account.tags.includes(tag)) {
            this.showNotification('La etiqueta ya existe', 'error');
            return;
        }

        // Verificar límite de 3 etiquetas máximo por cuenta
        if (!account.tags) {
            account.tags = [];
        }
        
        if (account.tags.length >= 3) {
            this.showNotification('Máximo 3 etiquetas permitidas por cuenta', 'warning');
            return;
        }

        account.tags.push(tag);
        account.updatedAt = new Date().toISOString();
        this.saveAccounts();
        this.renderAccounts();
        this.showNotification(`Etiqueta "${tag}" agregada`);
    }

    removeTagFromAccount(accountId, tag) {
        const id = parseInt(accountId, 10);
        const account = this.accounts.find(a => a.id === id);
        if (!account || !account.tags) return;

        const index = account.tags.indexOf(tag);
        if (index > -1) {
            account.tags.splice(index, 1);
            account.updatedAt = new Date().toISOString();
            this.saveAccounts();
            this.renderAccounts();
            this.showNotification(`Etiqueta "${tag}" eliminada`);
        }
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

        // Crear un modal para elegir formato
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'exportModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Selecciona formato de exportación</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Elige el formato en el que deseas exportar tus cuentas:</p>
                        <div class="d-grid gap-3">
                            <button class="btn btn-primary export-pdf-btn">
                                <i class="bi bi-file-pdf"></i> Exportar a PDF
                            </button>
                            <button class="btn btn-secondary export-json-btn">
                                <i class="bi bi-file-earmark-code"></i> Exportar a JSON
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);

        modal.querySelector('.export-pdf-btn').addEventListener('click', () => {
            bsModal.hide();
            this.exportAccountsToPDF();
            modal.remove();
        });

        modal.querySelector('.export-json-btn').addEventListener('click', () => {
            bsModal.hide();
            this.exportAccountsToJSON();
            modal.remove();
        });

        bsModal.show();
    }

    exportAccountsToPDF() {
        if (this.accounts.length === 0) {
            this.showNotification('No hay cuentas para exportar', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configuración
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = margin;
            
            // Título
            doc.setFontSize(18);
            doc.setTextColor(113, 84, 234); // Color primario
            doc.text('VaultMail - Copia de Seguridad', margin, yPosition);
            yPosition += 10;
            
            // Fecha
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.text(`Fecha de exportación: ${dateStr}`, margin, yPosition);
            yPosition += 8;
            
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 8;
            
            // Información de cada cuenta
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            
            this.accounts.forEach((account, index) => {
                // Verificar si necesitamos nueva página
                if (yPosition > pageHeight - margin - 20) {
                    doc.addPage();
                    yPosition = margin;
                }
                
                // Número de cuenta
                doc.setFont(undefined, 'bold');
                doc.text(`Cuenta ${index + 1}`, margin, yPosition);
                yPosition += 6;
                
                // Detalles
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                
                if (account.username) {
                    doc.text(`Usuario: ${account.username}`, margin + 5, yPosition);
                    yPosition += 5;
                }
                
                if (account.email) {
                    doc.text(`Email: ${account.email}`, margin + 5, yPosition);
                    yPosition += 5;
                }
                
                doc.text(`Contraseña: ${account.password}`, margin + 5, yPosition);
                yPosition += 5;
                
                if (account.notes) {
                    doc.text(`Notas: ${account.notes}`, margin + 5, yPosition);
                    yPosition += 5;
                }
                
                doc.text(`Categoría: ${this.getCategoryLabel(account.category)}`, margin + 5, yPosition);
                yPosition += 5;
                
                doc.text(`Estado: ${account.status === 'activa' ? 'En uso' : 'En desuso'}`, margin + 5, yPosition);
                yPosition += 5;
                
                if (account.inactiveUntil) {
                    const inactiveDate = new Date(account.inactiveUntil).toLocaleDateString('es-ES');
                    doc.text(`Vuelve a estar en uso: ${inactiveDate}`, margin + 5, yPosition);
                    yPosition += 5;
                }
                
                if (account.tags && account.tags.length > 0) {
                    doc.text(`Etiquetas: ${account.tags.join(', ')}`, margin + 5, yPosition);
                    yPosition += 5;
                }
                
                yPosition += 2;
                
                // Línea separadora entre cuentas
                doc.setDrawColor(220, 220, 220);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 6;
            });
            
            // Pie de página
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Página ${i} de ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
            
            // Descargar PDF
            const filename = `vaultmail-backup-${new Date().getTime()}.pdf`;
            doc.save(filename);
            
            this.showNotification('Cuentas exportadas a PDF exitosamente');
        } catch (error) {
            console.error('Error al exportar:', error);
            this.showNotification('Error al exportar a PDF: ' + error.message, 'error');
        }
    }

    exportAccountsToJSON() {
        if (this.accounts.length === 0) {
            this.showNotification('No hay cuentas para exportar', 'error');
            return;
        }

        try {
            // Crear un JSON con todas las cuentas incluyendo etiquetas
            const dataToExport = this.accounts.map(account => ({
                id: account.id,
                username: account.username || null,
                email: account.email || null,
                password: account.password,
                notes: account.notes || '',
                category: account.category,
                status: account.status || 'activa',
                inactiveUntil: account.inactiveUntil || null,
                isFavorite: account.isFavorite || false,
                isArchived: account.isArchived || false,
                tags: account.tags || [],
                createdAt: account.createdAt || new Date().toISOString()
            }));

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `vaultmail-backup-${new Date().getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showNotification('Cuentas exportadas a JSON exitosamente');
        } catch (error) {
            console.error('Error al exportar JSON:', error);
            this.showNotification('Error al exportar a JSON: ' + error.message, 'error');
        }
    }

    importAccounts(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileType = file.type;
                
                if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
                    // Importar desde PDF - validar primero
                    await this.validateAndShowImportModal(e.target.result, 'pdf');
                } else if (fileType === 'application/json' || file.name.endsWith('.json')) {
                    // Importar desde JSON - validar primero
                    await this.validateAndShowImportModal(e.target.result, 'json');
                } else {
                    throw new Error('Formato de archivo no válido. Use PDF o JSON.');
                }
            } catch (error) {
                this.showNotification(`Error al importar: ${error.message}`, 'error');
            }
        };

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
        
        // Reset file input
        event.target.value = '';
    }

    async validateAndShowImportModal(fileContent, fileType) {
        let importedAccounts = [];
        
        try {
            if (fileType === 'pdf') {
                importedAccounts = await this.parseAccountsFromPDFContent(fileContent);
            } else {
                importedAccounts = JSON.parse(fileContent);
                
                if (!Array.isArray(importedAccounts)) {
                    throw new Error('El archivo no contiene un array válido');
                }

                // Validate accounts structure
                const isValid = importedAccounts.every(acc => 
                    (acc.email || acc.username) && acc.password && acc.category && typeof acc.id === 'number'
                );

                if (!isValid) {
                    throw new Error('El archivo contiene un formato inválido');
                }
            }
            
            if (importedAccounts.length === 0) {
                throw new Error('No se encontraron cuentas válidas en el archivo');
            }

            // Guardar los datos para usar después
            this.pendingImportData = {
                accounts: importedAccounts,
                fileType: fileType
            };

            // Si ya hay un modo seleccionado, ejecutar la importación directamente
            if (this.pendingImportMode) {
                this.executeImport(this.pendingImportMode);
                this.pendingImportMode = null;
            } else {
                // Si no, mostrar modal para confirmar
                this.showImportConfirmModal(importedAccounts.length);
            }
        } catch (error) {
            throw error;
        }
    }

    async parseAccountsFromPDFContent(arrayBuffer) {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
        let extractedText = '';

        // Extraer texto de todas las páginas
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
        }

        // Parsear el texto extraído
        return this.parseAccountsFromPDF(extractedText);
    }

    showImportModeModal() {
        const modal = document.getElementById('importModal');
        const message = modal.querySelector('.modal-logout-message');
        
        // Cambiar mensaje para seleccionar modo
        message.innerHTML = '¿Cómo deseas importar las cuentas?';
        
        // Mostrar modal
        modal.classList.remove('d-none');

        // Limpiar listeners anteriores
        const cancelBtn = document.getElementById('importCancelBtn');
        const addBtn = document.getElementById('importAddBtn');
        const overwriteBtn = document.getElementById('importOverwriteBtn');

        // Remover listeners anteriores
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newAddBtn = addBtn.cloneNode(true);
        const newOverwriteBtn = overwriteBtn.cloneNode(true);

        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        overwriteBtn.parentNode.replaceChild(newOverwriteBtn, overwriteBtn);

        // Agregar nuevos listeners
        document.getElementById('importCancelBtn').addEventListener('click', () => {
            modal.classList.add('d-none');
        });

        document.getElementById('importAddBtn').addEventListener('click', () => {
            modal.classList.add('d-none');
            this.pendingImportMode = 'add';
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importOverwriteBtn').addEventListener('click', () => {
            modal.classList.add('d-none');
            this.pendingImportMode = 'overwrite';
            document.getElementById('importFileInput').click();
        });

        // Permitir cerrar con click en overlay
        const overlay = modal.querySelector('.modal-logout-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                modal.classList.add('d-none');
            });
        }
    }

    showImportConfirmModal(accountCount) {
        const modal = document.getElementById('importModal');
        document.getElementById('importAccountCount').textContent = accountCount;
        modal.classList.remove('d-none');

        // Limpiar listeners anteriores
        const cancelBtn = document.getElementById('importCancelBtn');
        const addBtn = document.getElementById('importAddBtn');
        const overwriteBtn = document.getElementById('importOverwriteBtn');

        // Remover listeners anteriores
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newAddBtn = addBtn.cloneNode(true);
        const newOverwriteBtn = overwriteBtn.cloneNode(true);

        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        overwriteBtn.parentNode.replaceChild(newOverwriteBtn, overwriteBtn);

        // Agregar nuevos listeners
        document.getElementById('importCancelBtn').addEventListener('click', () => {
            modal.classList.add('d-none');
            this.pendingImportData = null;
        });

        document.getElementById('importAddBtn').addEventListener('click', () => {
            this.executeImport('add');
            modal.classList.add('d-none');
        });

        document.getElementById('importOverwriteBtn').addEventListener('click', () => {
            this.executeImport('overwrite');
            modal.classList.add('d-none');
        });

        // Permitir cerrar con click en overlay
        const overlay = modal.querySelector('.modal-logout-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                modal.classList.add('d-none');
                this.pendingImportData = null;
            });
        }
    }

    executeImport(mode) {
        if (!this.pendingImportData) return;

        const importedAccounts = this.pendingImportData.accounts;
        const fileType = this.pendingImportData.fileType;
        let importedCount = 0;
        const sourceLabel = fileType === 'pdf' ? 'PDF' : 'JSON';

        if (mode === 'overwrite') {
            // Sobreescribir: eliminar todas las cuentas actuales
            this.accounts = importedAccounts.map(acc => ({
                ...acc,
                inactiveUntil: acc.inactiveUntil || null,
                isFavorite: acc.isFavorite || false,
                isArchived: acc.isArchived || false,
                tags: acc.tags || []
            }));
            importedCount = importedAccounts.length;
        } else {
            // Agregar: merge con cuentas existentes
            const existingIds = new Set(this.accounts.map(a => a.id));
            
            importedAccounts.forEach(importedAccount => {
                if (!existingIds.has(importedAccount.id)) {
                    this.accounts.push({
                        ...importedAccount,
                        inactiveUntil: importedAccount.inactiveUntil || null,
                        isFavorite: importedAccount.isFavorite || false,
                        isArchived: importedAccount.isArchived || false,
                        tags: importedAccount.tags || []
                    });
                    importedCount++;
                }
            });
        }

        this.saveAccounts();
        this.renderAccounts();
        this.updateStats();
        
        const modeLabel = mode === 'overwrite' ? 'reemplazadas' : 'agregadas';
        this.showNotification(`${importedCount} cuenta(s) ${modeLabel} exitosamente desde ${sourceLabel}`);
        
        this.pendingImportData = null;
    }

    async importFromPDF(arrayBuffer) {
        // Este método se mantiene por compatibilidad hacia atrás
        // La importación ahora se maneja a través de validateAndShowImportModal
        const importedAccounts = await this.parseAccountsFromPDFContent(arrayBuffer);
        
        if (importedAccounts.length === 0) {
            throw new Error('No se encontraron cuentas válidas en el PDF');
        }

        // Merge con cuentas existentes
        const existingIds = new Set(this.accounts.map(a => a.id));
        let importedCount = 0;

        importedAccounts.forEach(importedAccount => {
            if (!existingIds.has(importedAccount.id)) {
                this.accounts.push(importedAccount);
                importedCount++;
            }
        });

        this.saveAccounts();
        this.renderAccounts();
        this.updateStats();
        this.showNotification(`${importedCount} cuenta(s) importada(s) exitosamente desde PDF`);
    }

    importFromJSON(jsonString) {
        // Este método se mantiene por compatibilidad hacia atrás
        // La importación ahora se maneja a través de validateAndShowImportModal
        const importedAccounts = JSON.parse(jsonString);
        
        if (!Array.isArray(importedAccounts)) {
            throw new Error('El archivo no contiene un array válido');
        }

        // Validate accounts structure
        const isValid = importedAccounts.every(acc => 
            (acc.email || acc.username) && acc.password && acc.category && typeof acc.id === 'number'
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
                    inactiveUntil: importedAccount.inactiveUntil || null,
                    isFavorite: importedAccount.isFavorite || false,
                    isArchived: importedAccount.isArchived || false,
                    tags: importedAccount.tags || []
                });
                importedCount++;
            }
        });

        this.saveAccounts();
        this.renderAccounts();
        this.updateStats();
        this.showNotification(`${importedCount} cuenta(s) importada(s) exitosamente desde JSON`);
    }

    parseAccountsFromPDF(text) {
        // Expresiones regulares para extraer información
        const accountPattern = /Cuenta\s+(\d+)([\s\S]*?)(?=Cuenta\s+\d+|$)/g;
        const importedAccounts = [];
        let match;

        while ((match = accountPattern.exec(text)) !== null) {
            const accountText = match[2];
            
            const usernameMatch = accountText.match(/Usuario:\s*(.+?)(?:\n|Email:|Contraseña:|$)/);
            const emailMatch = accountText.match(/Email:\s*(.+?)(?:\n|Contraseña:|$)/);
            const passwordMatch = accountText.match(/Contraseña:\s*(.+?)(?:\n|Notas:|Categoría:|$)/);
            const notesMatch = accountText.match(/Notas:\s*(.+?)(?:\n|Categoría:|$)/);
            const categoryMatch = accountText.match(/Categoría:\s*(.+?)(?:\n|Estado:|$)/);
            const statusMatch = accountText.match(/Estado:\s*(.+?)(?:\n|Vuelve a estar|Etiquetas:|$)/);
            const inactiveUntilMatch = accountText.match(/Vuelve a estar en uso:\s*(.+?)(?:\n|Etiquetas:|$)/);
            const tagsMatch = accountText.match(/Etiquetas:\s*(.+?)(?:\n|$)/);

            if (passwordMatch) {
                let inactiveUntil = null;
                
                // Intentar parsear la fecha de inactiveUntil
                if (inactiveUntilMatch) {
                    const dateStr = inactiveUntilMatch[1].trim();
                    const parsedDate = new Date(dateStr);
                    // Validar que la fecha sea válida
                    if (!isNaN(parsedDate.getTime())) {
                        inactiveUntil = parsedDate.toISOString().split('T')[0];
                    }
                }
                
                // Parsear etiquetas
                let tags = [];
                if (tagsMatch) {
                    tags = tagsMatch[1].split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                }
                
                const newAccount = {
                    id: Date.now() + Math.random(),
                    username: usernameMatch ? usernameMatch[1].trim() : null,
                    email: emailMatch ? emailMatch[1].trim() : null,
                    password: passwordMatch[1].trim(),
                    notes: notesMatch ? notesMatch[1].trim() : '',
                    category: 'personal',
                    status: statusMatch && statusMatch[1].includes('En desuso') ? 'inactiva' : 'activa',
                    inactiveUntil: inactiveUntil,
                    createdAt: new Date().toISOString(),
                    isFavorite: false,
                    isArchived: false,
                    tags: tags
                };
                
                // Mapear categoría si es posible
                const catText = categoryMatch ? categoryMatch[1].trim().toLowerCase() : '';
                const categories = ['streaming', 'redes-sociales', 'billetera-virtual', 'trabajo', 'app', 'video-juego', 'personal', 'otros'];
                const foundCategory = categories.find(cat => catText.includes(cat));
                if (foundCategory) {
                    newAccount.category = foundCategory;
                }

                importedAccounts.push(newAccount);
            }
        }

        return importedAccounts;
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

    setupSwipeGestures() {
        // Detect touch start
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, false);

        // Detect touch end and perform swipe action
        document.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(e);
        }, false);
    }

    handleSwipe(e) {
        // Don't open sidebar if in table view mode (to avoid conflicts with horizontal scrolling)
        if (this.viewMode === 'table') {
            return;
        }

        const minSwipeDistance = 50; // Minimum pixels for a swipe to be detected
        const maxVerticalDistance = 100; // Maximum vertical movement allowed for horizontal swipe
        
        const horizontalDistance = this.touchEndX - this.touchStartX;
        const verticalDistance = Math.abs(this.touchEndY - this.touchStartY);

        // If primarily vertical movement, ignore (could be scrolling content)
        if (verticalDistance > maxVerticalDistance) {
            return;
        }

        const sidebar = document.getElementById('sidebar');
        const isSidebarOpen = sidebar.classList.contains('open');

        // Swipe right (positive distance) - Open sidebar
        if (horizontalDistance > minSwipeDistance && !isSidebarOpen) {
            this.toggleSidebar();
        }
        // Swipe left (negative distance) - Close sidebar
        else if (horizontalDistance < -minSwipeDistance && isSidebarOpen) {
            this.closeSidebar();
        }
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
        
        // Update category counters
        this.updateCategoryCounters();
    }

    updateCategoryCounters() {
        // Get all unique categories
        const categories = ['streaming', 'redes-sociales', 'billetera-virtual', 'trabajo', 'app', 'video-juego', 'personal', 'otros'];
        
        // Count accounts per category
        categories.forEach(category => {
            const count = this.accounts.filter(a => a.category === category).length;
            const counterElements = document.querySelectorAll(`.category-counter[data-category="${category}"]`);
            counterElements.forEach(el => {
                el.textContent = count;
            });
        });
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

    initSessionNotification() {
        // Get login time from localStorage
        let loginTime = localStorage.getItem('vaultmail_login_time');
        if (!loginTime) {
            // Si no hay tiempo de login, usar la hora actual
            loginTime = Date.now().toString();
            localStorage.setItem('vaultmail_login_time', loginTime);
        }

        const notification = document.getElementById('sessionNotification');
        const sessionTimeElement = document.getElementById('sessionTime');
        const closeBtn = document.getElementById('closeSessionNotification');
        const closeXBtn = document.getElementById('closeSessionNotificationBtn');
        
        // Update session time periodically
        const updateSessionTime = () => {
            const elapsed = Date.now() - parseInt(loginTime);
            const minutes = Math.floor(elapsed / 60000);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                const remainingMinutes = minutes % 60;
                sessionTimeElement.textContent = `${hours} hora${hours > 1 ? 's' : ''} ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
            } else {
                sessionTimeElement.textContent = `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
            }
        };

        // Check if notification should be shown
        const checkAndShowNotification = () => {
            const notificationDismissedTime = localStorage.getItem('vaultmail_notification_dismissed_time');
            const now = Date.now();
            const elapsedSinceLogin = now - parseInt(loginTime);
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            
            // Check if notification was dismissed less than 24 hours ago
            if (notificationDismissedTime && (now - parseInt(notificationDismissedTime)) < TWENTY_FOUR_HOURS) {
                // Don't show notification yet
                return;
            }
            
            // Check if 24 hours or more have passed since login
            if (elapsedSinceLogin >= TWENTY_FOUR_HOURS) {
                // Show notification with animation
                if (!notification.classList.contains('show')) {
                    notification.classList.add('show');
                    
                    // Start updating session time every second
                    if (!this.sessionTimeInterval) {
                        updateSessionTime();
                        this.sessionTimeInterval = setInterval(updateSessionTime, 1000);
                    }
                    
                    // Setup close button handlers only once
                    if (closeXBtn && !closeXBtn.dataset.listenerAdded) {
                        closeXBtn.addEventListener('click', () => {
                            notification.classList.remove('show');
                            // Clear interval
                            if (this.sessionTimeInterval) {
                                clearInterval(this.sessionTimeInterval);
                                this.sessionTimeInterval = null;
                            }
                        });
                        closeXBtn.dataset.listenerAdded = 'true';
                    }
                    
                    if (closeBtn && !closeBtn.dataset.listenerAdded) {
                        closeBtn.addEventListener('click', () => {
                            notification.classList.remove('show');
                            // Save dismissal time for 24 hours
                            localStorage.setItem('vaultmail_notification_dismissed_time', Date.now().toString());
                            // Clear interval
                            if (this.sessionTimeInterval) {
                                clearInterval(this.sessionTimeInterval);
                                this.sessionTimeInterval = null;
                            }
                        });
                        closeBtn.dataset.listenerAdded = 'true';
                    }
                }
            }
        };

        // Initial check
        checkAndShowNotification();
        
        // Check every minute if 24 hours have passed
        this.sessionNotificationCheckInterval = setInterval(checkAndShowNotification, 60000);
    }

    // ========== NUEVAS FUNCIONALIDADES ==========

    // Generador de Contraseñas
    generatePassword(options = {}) {
        const {
            length = 16,
            uppercase = true,
            lowercase = true,
            numbers = true,
            symbols = true
        } = options;

        let chars = '';
        let password = '';

        if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) chars += '0123456789';
        if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) return '';

        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return password;
    }

    calculatePasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { level: 'weak', label: 'Débil', color: 'var(--error-color)', percent: 33 };
        if (strength <= 3) return { level: 'fair', label: 'Regular', color: 'var(--warning-color)', percent: 66 };
        return { level: 'good', label: 'Fuerte', color: 'var(--success-color)', percent: 100 };
    }

    setupPasswordGeneratorModal() {
        const openBtn = document.getElementById('openGeneratorBtn');
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePasswordVisibility');

        if (!openBtn) return;

        // Generar contraseña al hacer clic en el botón
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Usar valores por defecto para generar una contraseña segura
            const password = this.generatePassword({
                length: 16,
                uppercase: true,
                lowercase: true,
                numbers: true,
                symbols: true
            });
            passwordInput.value = password;
            this.updatePasswordStrengthUI(password);
        });

        // Toggle para mostrar/ocultar contraseña
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const icon = toggleBtn.querySelector('i');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                }
            });
        }
    }

    generateNewPassword() {
        const uppercase = document.getElementById('genMayusculas')?.checked || false;
        const lowercase = document.getElementById('genMinusculas')?.checked || false;
        const numbers = document.getElementById('genNumeros')?.checked || false;
        const symbols = document.getElementById('genSimbolos')?.checked || false;
        const length = parseInt(document.getElementById('passwordLength')?.value || '16');

        const password = this.generatePassword({
            length,
            uppercase,
            lowercase,
            numbers,
            symbols
        });

        const field = document.getElementById('generatedPassword');
        if (field) field.value = password;
    }

    // Sistema de Etiquetas
    setupTags() {
        const addTagBtn = document.getElementById('addTagBtn');
        const tagInput = document.getElementById('tagInput');

        if (!addTagBtn || !tagInput) return;

        addTagBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.addTag(tagInput.value);
            tagInput.value = '';
        });

        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(tagInput.value);
                tagInput.value = '';
            }
        });
    }

    addTag(tagText) {
        if (!tagText.trim()) return;

        const container = document.getElementById('tagsContainer');
        if (!container) return;

        // Verificar límite de etiquetas (máximo 3)
        const existingTags = container.querySelectorAll('.tag-badge');
        if (existingTags.length >= 3) {
            this.showNotification('Máximo 3 etiquetas permitidas por cuenta', 'warning');
            return;
        }

        // Limitar a 30 caracteres
        const trimmedText = tagText.trim();
        if (trimmedText.length > 30) {
            this.showNotification('La etiqueta debe tener máximo 30 caracteres', 'warning');
            return;
        }

        const tagBadge = document.createElement('div');
        tagBadge.className = 'tag-badge';
        tagBadge.innerHTML = `
            <span>${trimmedText}</span>
            <button type="button"><i class="bi bi-x"></i></button>
        `;

        tagBadge.querySelector('button').addEventListener('click', () => {
            tagBadge.remove();
        });

        container.appendChild(tagBadge);
    }

    getTags() {
        const container = document.getElementById('tagsContainer');
        if (!container) return [];

        return Array.from(container.querySelectorAll('.tag-badge span')).map(span => span.textContent);
    }

    setupPasswordStrengthIndicator() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;

        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrengthUI(e.target.value);
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