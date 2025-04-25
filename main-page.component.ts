
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('popper', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.5)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'scale(1)' }),
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.5)' }))
      ])
    ]),
    trigger('badgePop', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.5)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('levelUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'scale(1.1)' })),
        animate('200ms ease-in', style({ transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ]),
    trigger('calendarFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('400ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, height: 0 }),
        animate('300ms ease-out', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, height: 0 }))
      ])
    ])
  ]
})
export class MainPageComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  isSidePanelOpen = false;
  isLoggedIn = false;
  username = '';
  password = '';
  email = '';
  fullName = '';
  errorMessage = '';
  successMessage = '';
  signupMode = false;
  loggedInUsername = '';
  welcomeMessage = '';
  notificationSound = new Audio('/assets/sounds/notification.mp3');
  private notificationIntervals: { [taskId: number]: any } = {};
  showLevelUp = false;
  today = new Date();

  tasks: Task[] = [];
  newTask!: Task;
  isEditing = false;
  editingTask!: Task;
  filter: 'today' | 'completed' | 'active' | 'date' = 'today';
  selectedDate: Date | null = null;
  showCalendar = false;
  calendarMonth: Date = new Date();
  categories = ['Work', 'Personal', 'Shopping', 'Urgent', 'Other'];

  showTaskInput = false;
  showProfile = false;
  isLoading = false;

  searchQuery: string = '';
  sortBy: 'dueDate' | 'priority' | 'text' | 'createdAt' = 'dueDate';
  sortDirection: 'asc' | 'desc' = 'asc';
  showProgressBar: boolean = true;

  showReport: boolean = false;
  taskReport: string = '';

  private _calendarDays: { date: Date; tasks: Task[] }[] = [];

  userProfile: UserProfile = {
    username: '',
    email: '',
    fullName: '',
    tasksCompleted: 0,
    joinedDate: '',
    profilePhoto: '',
    preferences: { notificationSound: true, reminderFrequency: 15 },
    points: 0,
    level: 1,
    badges: []
  };

 
  showConfirmModal: boolean = false;
  confirmMessage: string = '';
  pendingTask: Task | null = null;
  pendingAction: 'edit' | 'delete' | '' = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.clearAllNotifications();
  }

  private initializeComponent() {
    this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    this.newTask = this.createEmptyTask();
    this.editingTask = this.createEmptyTask();

    this.restoreState();
    this.loadInitialData();
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.updateBodyClass();
    this.cdr.detectChanges();
  }

  private restoreState() {
    const savedFilter = localStorage.getItem('taskFilter') as 'today' | 'completed' | 'active' | 'date';
    this.filter = savedFilter || 'today';
    
    const savedDate = localStorage.getItem('selectedDate');
    this.selectedDate = savedDate ? this.parseDate(savedDate) : null;
    
    const savedSortBy = localStorage.getItem('sortBy') as 'dueDate' | 'priority' | 'text' | 'createdAt';
    this.sortBy = savedSortBy || 'dueDate';
    
    const savedSortDirection = localStorage.getItem('sortDirection') as 'asc' | 'desc';
    this.sortDirection = savedSortDirection || 'asc';
  }

  private loadInitialData() {
    if (this.isLoggedIn) {
      this.loggedInUsername = localStorage.getItem('loggedInUsername') || '';
      this.welcomeMessage = `Welcome Back, ${this.loggedInUsername}!`;
      this.loadUserData();
      this.requestNotificationPermission();
    }
  }

  private parseDate(dateString: string): Date {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  private formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  private getDateRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  get filteredTasks(): Task[] {
    let filtered = [...this.tasks];

    const filterByDateRange = (tasks: Task[], start: Date, end: Date) => {
      return tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = this.parseDate(t.dueDate);
        return due >= start && due <= end;
      });
    };

    const todayRange = this.getDateRange(this.today);
    let contextRange = todayRange;

    if (this.filter === 'date' && this.selectedDate) {
      contextRange = this.getDateRange(this.selectedDate);
    }

    switch (this.filter) {
      case 'today':
        filtered = filterByDateRange(filtered, todayRange.start, todayRange.end);
        break;
      case 'completed':
        filtered = filterByDateRange(filtered.filter(t => t.completed), contextRange.start, contextRange.end);
        break;
      case 'active':
        filtered = filterByDateRange(filtered.filter(t => !t.completed), contextRange.start, contextRange.end);
        break;
      case 'date':
        if (!this.selectedDate) return [];
        filtered = filterByDateRange(filtered, contextRange.start, contextRange.end);
        break;
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.text.toLowerCase().includes(query) ||
        (task.category && task.category.toLowerCase().includes(query)) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (this.sortBy) {
        case 'dueDate':
          valueA = a.dueDate ? this.parseDate(a.dueDate).getTime() : 0;
          valueB = b.dueDate ? this.parseDate(b.dueDate).getTime() : 0;
          break;
        case 'priority':
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          valueA = priorityOrder[a.priority];
          valueB = priorityOrder[b.priority];
          break;
        case 'text':
          valueA = a.text.toLowerCase();
          valueB = b.text.toLowerCase();
          break;
        case 'createdAt':
          valueA = a.createdAt ? this.parseDate(a.createdAt).getTime() : 0;
          valueB = b.createdAt ? this.parseDate(b.createdAt).getTime() : 0;
          break;
      }

      if (valueA === valueB) return 0;
      return this.sortDirection === 'asc' 
        ? (valueA > valueB ? 1 : -1) 
        : (valueA < valueB ? 1 : -1);
    });

    return filtered;
  }

  get activeTasksCount(): number {
    const contextRange = this.filter === 'date' && this.selectedDate 
      ? this.getDateRange(this.selectedDate)
      : this.getDateRange(this.today);

    return this.tasks.filter(t => 
      !t.completed && 
      t.dueDate && 
      this.parseDate(t.dueDate) >= contextRange.start && 
      this.parseDate(t.dueDate) <= contextRange.end
    ).length;
  }

  get completedTasksCount(): number {
    const contextRange = this.filter === 'date' && this.selectedDate 
      ? this.getDateRange(this.selectedDate)
      : this.getDateRange(this.today);

    return this.tasks.filter(t => 
      t.completed && 
      t.dueDate && 
      this.parseDate(t.dueDate) >= contextRange.start && 
      this.parseDate(t.dueDate) <= contextRange.end
    ).length;
  }

  get completionProgress(): number {
    const totalTasks = this.tasks.length;
    if (totalTasks === 0) return 0;
    const completedTasks = this.tasks.filter(t => t.completed).length;
    return Math.round((completedTasks / totalTasks) * 100);
  }

  get calendarDays(): { date: Date; tasks: Task[] }[] {
    if (!this._calendarDays.length || !this.isSameDay(this.calendarMonth, new Date())) {
      this._calendarDays = this.buildCalendar();
    }
    return this._calendarDays;
  }

  updateTodayButtonLabel(date: Date) {
    const todayButton = document.querySelector('.today-button') as HTMLElement;
    if (todayButton) {
      todayButton.innerText = this.formatDateForDisplay(date);
    }
    this.cdr.detectChanges();
  }

  setFilter(filter: 'today' | 'completed' | 'active' | 'date') {
    this.filter = filter;
    this.showCalendar = false;
    if (filter === 'today') {
      this.selectedDate = null;
      this.updateTodayButtonLabel(this.today);
      localStorage.setItem('selectedDate', '');
    }
    localStorage.setItem('taskFilter', filter);
    this.cdr.detectChanges();
  }

  selectDate(date: Date) {
    this.selectedDate = new Date(date);
    this.filter = 'date';
    this.showCalendar = false;
    this.isSidePanelOpen = false;
    this.updateTodayButtonLabel(this.selectedDate);
    localStorage.setItem('selectedDate', this.selectedDate.toISOString());
    localStorage.setItem('taskFilter', 'date');
    this.cdr.detectChanges();
  }

  buildCalendar(): { date: Date; tasks: Task[] }[] {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const calendarDays: { date: Date; tasks: Task[] }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      calendarDays.push({ date, tasks: this.getTasksForDate(date) });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      calendarDays.push({ date, tasks: this.getTasksForDate(date) });
    }

    const remainingDays = (7 - (calendarDays.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      calendarDays.push({ date, tasks: this.getTasksForDate(date) });
    }

    return calendarDays;
  }

  getTasksForDate(date: Date): Task[] {
    const { start, end } = this.getDateRange(date);
    return this.tasks.filter(t => {
      if (!t.dueDate) return false;
      const due = this.parseDate(t.dueDate);
      return due >= start && due <= end;
    });
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      this.showError('This browser does not support notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      this.showError('Please enable notifications in your browser settings.');
    }
  }

  scheduleTaskNotification(task: Task) {
    if (!task.dueDate || task.completed || !this.userProfile.preferences.notificationSound) return;

    this.clearNotification(task.id);

    const dueTime = this.parseDate(task.dueDate).getTime();
    const now = Date.now();
    const notifyBeforeMs = (task.notifyBefore || this.userProfile.preferences.reminderFrequency) * 60 * 1000;
    const notificationTime = dueTime - notifyBeforeMs;

    if (notificationTime <= now) {
      if (now <= dueTime && !task.notified) this.showNotification(task);
      return;
    }

    const delay = notificationTime - now;
    this.notificationIntervals[task.id] = setTimeout(() => {
      if (!task.completed && !task.notified) {
        this.showNotification(task);
        if (task.recurring) this.scheduleRecurringTask(task);
      }
    }, delay);
  }

  private scheduleRecurringTask(task: Task) {
    if (!task.recurring) return;

    const nextDueDate = this.parseDate(task.dueDate);
    switch (task.recurring) {
      case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
      case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
      case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
    }

    task.dueDate = nextDueDate.toISOString();
    task.notified = false;
    this.saveTasksToStorage();
    this.scheduleTaskNotification(task);
  }

  showNotification(task: Task) {
    if (Notification.permission !== 'granted') return;

    const options: NotificationOptions & { vibrate?: number[] } = {
      body: `Due: ${this.parseDate(task.dueDate).toLocaleString()}\nPriority: ${task.priority}${task.category ? `\nCategory: ${task.category}` : ''}`,
      icon: '/assets/images/task-icon.png',
      tag: task.id.toString(),
      vibrate: [200, 100, 200]
    };

    const notification = new Notification(`Task Due: ${task.text}`, options);

    if (this.userProfile.preferences.notificationSound) {
      this.notificationSound.play().catch(err => console.error('Audio play failed:', err));
    }

    task.notified = true;
    this.saveTasksToStorage();
    this.cdr.detectChanges();
  }

  clearNotification(taskId: number) {
    if (this.notificationIntervals[taskId]) {
      clearTimeout(this.notificationIntervals[taskId]);
      delete this.notificationIntervals[taskId];
    }
  }

  clearAllNotifications() {
    Object.values(this.notificationIntervals).forEach(interval => clearTimeout(interval));
    this.notificationIntervals = {};
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.updateBodyClass();
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.cdr.detectChanges();
  }

  toggleSidePanel() {
    this.isSidePanelOpen = !this.isSidePanelOpen;
    this.showProfile = false;
    this.showCalendar = false;
    this.showReport = false;
    this.cdr.detectChanges();
  }

  toggleProfile() {
    this.showProfile = !this.showProfile;
    this.isSidePanelOpen = false;
    this.showReport = false;
    if (this.showProfile) this.loadProfile();
    this.cdr.detectChanges();
  }

  toggleCalendar() {
    this.showCalendar = !this.showCalendar;
    this.showReport = false;
    if (this.showCalendar) {
      this._calendarDays = this.buildCalendar();
    }
    this.cdr.detectChanges();
  }

  toggleReport() {
    this.showReport = !this.showReport;
    this.isSidePanelOpen = false;
    this.showProfile = false;
    if (this.showReport) {
      this.generateTaskReport();
    }
    this.cdr.detectChanges();
  }

  editTask(task: Task) {
    this.showConfirmModal = true;
    this.confirmMessage = `Are you sure you want to edit the task: "${task.text}"?`;
    this.pendingTask = task;
    this.pendingAction = 'edit';
    this.cdr.detectChanges();
  }

  deleteTask(task: Task) {
    this.showConfirmModal = true;
    this.confirmMessage = `Are you sure you want to delete the task: "${task.text}"?`;
    this.pendingTask = task;
    this.pendingAction = 'delete';
    this.cdr.detectChanges();
  }

  confirmAction() {
    if (!this.pendingTask) return;

    if (this.pendingAction === 'edit') {
      this.isEditing = true;
      this.editingTask = { ...this.pendingTask };
      if (this.pendingTask.dueDate) {
        const dateTime = this.parseDate(this.pendingTask.dueDate);
        this.editingTask.dueDate = dateTime.toISOString().split('T')[0];
        this.editingTask.dueTime = dateTime.toISOString().split('T')[1].substring(0, 5);
      }
      this.showTaskInput = true;
    } else if (this.pendingAction === 'delete') {
      this.tasks = this.tasks.filter(t => t.id !== this.pendingTask!.id);
      this.clearNotification(this.pendingTask!.id);
      this.saveTasksToStorage();
      this.showSuccess(`Task "${this.pendingTask.text}" deleted successfully!`);
    }
    this.closeModal();
  }

  cancelAction() {
    this.closeModal();
  }

  private closeModal() {
    this.showConfirmModal = false;
    this.pendingTask = null;
    this.pendingAction = '';
    this.cdr.detectChanges();
  }

  async login() {
    try {
      this.isLoading = true;
      this.clearMessages();
      if (!this.validateLoginInput()) return;

      const users = this.getUsersFromStorage();
      const user = users.find(u => u.username === this.username && u.password === this.password);
      if (!user) throw new Error('Invalid credentials');

      await this.completeLogin(false);
      this.showSuccess('Logged in successfully!');
    } catch (error: unknown) {
      this.showError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async signup() {
    try {
      this.isLoading = true;
      this.clearMessages();
      if (!this.validateSignupInput()) return;

      const users = this.getUsersFromStorage();
      if (users.some(u => u.username === this.username)) {
        throw new Error('Username already exists');
      }

      users.push({ username: this.username, password: this.password, email: this.email, fullName: this.fullName });
      localStorage.setItem('users', JSON.stringify(users));
      await this.completeLogin(true);
      this.showSuccess('Account created successfully!');
    } catch (error: unknown) {
      this.showError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
      this.logout();
    }
  }

  logout() {
    this.isLoggedIn = false;
    this.isSidePanelOpen = false;
    this.showProfile = false;
    this.showCalendar = false;
    this.showReport = false;
    this.loggedInUsername = '';
    this.welcomeMessage = '';
    this.tasks = [];
    this.clearAllNotifications();
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('loggedInUsername');
    this.signupMode = false;
    this.cdr.detectChanges();
  }

  async updateProfile() {
    try {
      this.isLoading = true;
      this.clearMessages();
      const users = this.getUsersFromStorage();
      const userIndex = users.findIndex(u => u.username === this.loggedInUsername);
      if (userIndex === -1) throw new Error('User not found');

      users[userIndex] = {
        username: this.userProfile.username,
        email: this.userProfile.email,
        fullName: this.userProfile.fullName,
        password: users[userIndex].password
      };
      localStorage.setItem('users', JSON.stringify(users));
      this.loggedInUsername = this.userProfile.username;
      this.welcomeMessage = `Welcome Back, ${this.loggedInUsername}!`;
      localStorage.setItem('loggedInUsername', this.loggedInUsername);
      this.saveProfileToStorage();
      this.showProfile = false;
      this.showSuccess('Profile updated successfully!');
    } catch (error: unknown) {
      this.showError(error instanceof Error ? error.message : 'Profile update failed');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  uploadProfilePhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.userProfile.profilePhoto = reader.result as string;
        this.saveProfileToStorage();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  getAvatarColor(): string {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];
    const charCode = this.userProfile.username.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  }

  async addTask() {
    try {
      this.clearMessages();
      if (!this.newTask.text.trim()) throw new Error('Task text cannot be empty');

      const dueDateTime = this.combineDateTime(
        this.newTask.dueDate || this.today.toISOString().split('T')[0],
        this.newTask.dueTime || '00:00'
      );
      const task: Task = {
        ...this.newTask,
        id: Date.now(),
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDateTime,
        notifyBefore: this.newTask.notifyBefore || this.userProfile.preferences.reminderFrequency,
        notified: false,
        tags: this.newTask.tags || [],
        pointsAwarded: false
      };

      this.tasks.push(task);
      this.saveTasksToStorage();
      this.scheduleTaskNotification(task);
      this.newTask = this.createEmptyTask();
      this.showTaskInput = false;
      this.userProfile.points += 1;
      this.updateLevel();
      this.checkForBadges();
      this.saveProfileToStorage();
      this.showSuccess('Task added successfully! +1 point');
      this.cdr.detectChanges();
    } catch (error: unknown) {
      this.showError(error instanceof Error ? error.message : 'Failed to add task');
    }
  }

  toggleTask(task: Task) {
    task.completed = !task.completed;
    if (task.completed && !task.pointsAwarded) {
      const basePoints = task.priority === 'High' ? 10 : task.priority === 'Medium' ? 5 : 2;
      const complexityBonus = task.text.length > 20 ? 2 : 0;
      const urgencyBonus = task.category === 'Urgent' ? 3 : 0;
      const points = basePoints + complexityBonus + urgencyBonus;
      this.userProfile.points += points;
      task.pointsAwarded = true;
      task.completedAt = new Date().toISOString();
      this.updateLevel();
      this.checkForBadges();
      this.clearNotification(task.id);
      this.updateTasksCompleted();
      this.showSuccess(`Task completed! +${points} points`);
    } else if (!task.completed && task.pointsAwarded) {
      task.pointsAwarded = false;
    }
    this.saveTasksToStorage();
    this.saveProfileToStorage();
    this.cdr.detectChanges();
  }

  clearCompleted() {
    this.tasks.filter(t => t.completed).forEach(t => this.clearNotification(t.id));
    this.tasks = this.tasks.filter(t => !t.completed);
    this.saveTasksToStorage();
    this.cdr.detectChanges();
  }

  async saveEditedTask() {
    try {
      this.clearMessages();
      if (!this.editingTask.text.trim()) throw new Error('Task text cannot be empty');

      const dueDateTime = this.combineDateTime(
        this.editingTask.dueDate || this.today.toISOString().split('T')[0],
        this.editingTask.dueTime || '00:00'
      );
      const index = this.tasks.findIndex(t => t.id === this.editingTask.id);
      if (index === -1) throw new Error('Task not found');

      this.tasks[index] = { ...this.editingTask, dueDate: dueDateTime, notified: false };
      this.saveTasksToStorage();
      this.scheduleTaskNotification(this.tasks[index]);
      this.isEditing = false;
      this.editingTask = this.createEmptyTask();
      this.showTaskInput = false;
      this.userProfile.points += 1;
      this.updateLevel();
      this.checkForBadges();
      this.saveProfileToStorage();
      this.showSuccess('Task updated successfully! +1 point');
      this.cdr.detectChanges();
    } catch (error: unknown) {
      this.showError(error instanceof Error ? error.message : 'Failed to update task');
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingTask = this.createEmptyTask();
    this.showTaskInput = false;
    this.cdr.detectChanges();
  }

  showAllTasks() {
    this.toggleCalendar();
    this.isSidePanelOpen = true;
    this.showReport = false;
    this.cdr.detectChanges();
  }

  changeMonth(delta: number) {
    this.calendarMonth = new Date(this.calendarMonth.setMonth(this.calendarMonth.getMonth() + delta));
    this._calendarDays = this.buildCalendar();
    this.cdr.detectChanges();
  }

  clearSearch() {
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    this.cdr.detectChanges();
  }

  setSortBy(field: 'dueDate' | 'priority' | 'text' | 'createdAt') {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    localStorage.setItem('sortBy', this.sortBy);
    localStorage.setItem('sortDirection', this.sortDirection);
    this.cdr.detectChanges();
  }

  generateTaskReport() {
    const totalTasks = this.tasks.length;
    const activeTasks = this.tasks.filter(t => !t.completed).length;
    const completedTasks = this.tasks.filter(t => t.completed).length;

    let report = `Task Report for ${this.loggedInUsername} - ${new Date().toLocaleString()}\n\n`;
    report += `Summary:\n`;
    report += `Total Tasks: ${totalTasks}\n`;
    report += `Active Tasks: ${activeTasks}\n`;
    report += `Completed Tasks: ${completedTasks}\n`;
    report += `Completion Rate: ${this.completionProgress}%\n\n`;

    report += `Detailed Task List:\n`;
    if (this.tasks.length === 0) {
      report += `No tasks available.\n`;
    } else {
      this.tasks.forEach((task, index) => {
        report += `${index + 1}. ${task.text}\n`;
        report += `   Status: ${task.completed ? 'Completed' : 'Active'}\n`;
        report += `   Due Date: ${task.dueDate ? this.parseDate(task.dueDate).toLocaleString() : 'Not set'}\n`;
        report += `   Priority: ${task.priority}\n`;
        report += `   Category: ${task.category || 'None'}\n`;
        report += `   Created: ${this.parseDate(task.createdAt).toLocaleString()}\n`;
        report += `   Completed: ${task.completedAt ? this.parseDate(task.completedAt).toLocaleString() : 'N/A'}\n`;
        report += `   Recurring: ${task.recurring || 'None'}\n\n`;
      });
    }

    this.taskReport = report;
  }

  exportReport() {
    if (!this.taskReport) {
      this.generateTaskReport();
    }
    
    const blob = new Blob([this.taskReport], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Task_Report_${this.loggedInUsername}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.showSuccess('Report exported successfully!');
  }

  private createEmptyTask(): Task {
    return {
      id: 0,
      text: '',
      completed: false,
      createdAt: '',
      dueDate: this.today.toISOString().split('T')[0],
      dueTime: '00:00',
      priority: 'Medium',
      category: '',
      notifyBefore: this.userProfile.preferences?.reminderFrequency || 15,
      notified: false,
      tags: [],
      recurring: '',
      pointsAwarded: false
    };
  }

  private async completeLogin(isNewUser: boolean) {
    this.isLoggedIn = true;
    this.errorMessage = '';
    this.loggedInUsername = this.username;
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loggedInUsername', this.loggedInUsername);
    this.welcomeMessage = isNewUser ? `Welcome, ${this.loggedInUsername}!` : `Welcome Back, ${this.loggedInUsername}!`;
    if (isNewUser) {
      this.userProfile = {
        username: this.username,
        email: this.email,
        fullName: this.fullName,
        tasksCompleted: 0,
        joinedDate: new Date().toISOString(),
        profilePhoto: '',
        preferences: { notificationSound: true, reminderFrequency: 15 },
        points: 0,
        level: 1,
        badges: []
      };
      this.saveProfileToStorage();
    }
    await this.loadUserData();
    this.cdr.detectChanges();
  }

  private updateBodyClass() {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateLoginInput(): boolean {
    if (!this.username.trim() || !this.password.trim()) {
      this.showError('Please enter both username and password.');
      return false;
    }
    return true;
  }

  private validateSignupInput(): boolean {
    if (!this.username.trim() || !this.password.trim() || !this.email.trim() || !this.fullName.trim()) {
      this.showError('Please fill in all fields.');
      return false;
    }
    if (this.username.length < 3 || this.password.length < 6) {
      this.showError('Username must be at least 3 characters and password at least 6 characters.');
      return false;
    }
    if (!this.isValidEmail(this.email)) {
      this.showError('Please enter a valid email address.');
      return false;
    }
    return true;
  }

  private getUsersFromStorage(): { username: string; password: string; email: string; fullName: string }[] {
    const usersJson = localStorage.getItem('users');
    return usersJson ? JSON.parse(usersJson) : [];
  }

  private async loadTasks() {
    const tasksJson = localStorage.getItem(`tasks_${this.loggedInUsername}`);
    if (tasksJson) {
      this.tasks = JSON.parse(tasksJson).map((task: Task) => ({
        ...task,
        dueDate: task.dueDate ? this.parseDate(task.dueDate).toISOString() : this.today.toISOString(),
        createdAt: task.createdAt ? this.parseDate(task.createdAt).toISOString() : this.today.toISOString(),
        completedAt: task.completedAt ? this.parseDate(task.completedAt).toISOString() : undefined
      }));
    } else {
      this.tasks = [];
    }
  }

  private saveTasksToStorage() {
    localStorage.setItem(`tasks_${this.loggedInUsername}`, JSON.stringify(this.tasks));
  }

  private loadProfile() {
    const users = this.getUsersFromStorage();
    const user = users.find(u => u.username === this.loggedInUsername);
    if (user) {
      const profileData = JSON.parse(localStorage.getItem(`profile_${this.loggedInUsername}`) || '{}');
      this.userProfile = {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        tasksCompleted: this.tasks.filter(t => t.completed).length,
        joinedDate: localStorage.getItem(`joined_${this.loggedInUsername}`) || new Date().toISOString(),
        profilePhoto: localStorage.getItem(`photo_${this.loggedInUsername}`) || '',
        preferences: { notificationSound: true, reminderFrequency: 15 },
        points: profileData.points || 0,
        level: profileData.level || 1,
        badges: profileData.badges || []
      };
    }
  }

  private saveProfileToStorage() {
    localStorage.setItem(`joined_${this.loggedInUsername}`, this.userProfile.joinedDate);
    if (this.userProfile.profilePhoto) {
      localStorage.setItem(`photo_${this.loggedInUsername}`, this.userProfile.profilePhoto);
    }
    localStorage.setItem(`profile_${this.loggedInUsername}`, JSON.stringify({
      points: this.userProfile.points,
      level: this.userProfile.level,
      badges: this.userProfile.badges
    }));
  }

  private updateTasksCompleted() {
    this.userProfile.tasksCompleted = this.tasks.filter(t => t.completed).length;
  }

  private async loadUserData() {
    this.isLoading = true;
    try {
      await Promise.all([this.loadTasks(), this.loadProfile()]);
      this.tasks.forEach(task => {
        if (task.dueDate) task.dueDate = this.parseDate(task.dueDate).toISOString();
        this.scheduleTaskNotification(task);
      });
    } catch (error: unknown) {
      this.showError(error instanceof Error ? error.message : 'Failed to load user data');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private showError(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
    console.error(message);
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  private showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  private combineDateTime(date: string, time: string): string {
    if (!date) return this.today.toISOString();
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined.toISOString();
  }

  updateLevel() {
    const newLevel = Math.floor(this.userProfile.points / 50) + 1;
    if (newLevel > this.userProfile.level) {
      this.userProfile.level = newLevel;
      this.userProfile.points += 10;
      this.showLevelUp = true;
      setTimeout(() => {
        this.showLevelUp = false;
        this.cdr.detectChanges();
      }, 3000);
      const messages = [
        `Level Up! You’re now Level ${newLevel} - Amazing work!`,
        `Congratulations on Level ${newLevel}! Keep the momentum going!`,
        `Level ${newLevel} achieved! You’re a productivity superstar!`
      ];
      this.showSuccess(messages[Math.floor(Math.random() * messages.length)] + ' (+10 bonus points)');
    }
  }

  checkForBadges() {
    if (!this.userProfile.badges.includes('First Task') && this.tasks.filter(t => t.completed).length >= 1) {
      this.userProfile.badges.push('First Task');
      this.showSuccess('Badge Earned: First Task!');
    }
    if (!this.userProfile.badges.includes('Task Master') && this.tasks.filter(t => t.completed).length >= 10) {
      this.userProfile.badges.push('Task Master');
      this.showSuccess('Badge Earned: Task Master!');
    }
    if (!this.userProfile.badges.includes('Priority King') && this.tasks.filter(t => t.priority === 'High' && t.completed).length >= 5) {
      this.userProfile.badges.push('Priority King');
      this.showSuccess('Badge Earned: Priority King!');
    }
    if (!this.userProfile.badges.includes('Streak Starter') && this.checkDailyStreak() >= 3) {
      this.userProfile.badges.push('Streak Starter');
      this.showSuccess('Badge Earned: Streak Starter!');
    }
    this.cdr.detectChanges();
  }

  checkDailyStreak(): number {
    const completedDates: string[] = [];
    this.tasks
      .filter(t => t.completed && t.completedAt)
      .forEach(t => {
        const dateStr = this.parseDate(t.completedAt!).toDateString();
        if (!completedDates.includes(dateStr)) completedDates.push(dateStr);
      });

    completedDates.sort();
    let streak = 1;
    for (let i = 1; i < completedDates.length; i++) {
      const prevDate = this.parseDate(completedDates[i - 1]);
      const currDate = this.parseDate(completedDates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays === 1) streak++;
      else if (diffDays > 1) streak = 1;
    }
    return streak;
  }

  hasCompletedTasks(): boolean {
    return this.tasks.some(t => t.completed);
  }

  get taskStats(): { total: number; active: number; completed: number } {
    return {
      total: this.tasks.length,
      active: this.activeTasksCount,
      completed: this.completedTasksCount
    };
  }
}

interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
  dueDate: string;
  dueTime?: string;
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  notifyBefore?: number;
  notified?: boolean;
  tags?: string[];
  recurring?: '' | 'daily' | 'weekly' | 'monthly';
  completedAt?: string;
  pointsAwarded: boolean;
}

interface UserProfile {
  username: string;
  email: string;
  fullName: string;
  tasksCompleted: number;
  joinedDate: string;
  profilePhoto: string;
  preferences: { notificationSound: boolean; reminderFrequency: number };
  points: number;
  level: number;
  badges: string[];
}
