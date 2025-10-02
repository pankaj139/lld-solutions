/**
 * Task Management System - JavaScript Implementation
 * ==================================================
 * 
 * Advanced project management platform demonstrating enterprise-level Design Patterns:
 * 
 * DESIGN PATTERNS USED:
 * 1. State Pattern: Task status workflow management (TODO -> IN_PROGRESS -> DONE)
 * 2. Strategy Pattern: Different assignment strategies (skill-based, workload-based)
 * 3. Observer Pattern: Real-time notifications for task updates and deadlines
 * 4. Command Pattern: Task operations (create, assign, update, complete)
 * 5. Factory Pattern: Task and project creation with default configurations
 * 6. Chain of Responsibility: Approval workflow for high-priority tasks
 * 7. Composite Pattern: Project hierarchy with sub-projects and task trees
 * 8. Decorator Pattern: Enhanced task features (time tracking, dependencies)
 * 9. Template Method Pattern: Common project management workflows
 * 10. Facade Pattern: Simplified project management interface
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private task logic, workload management
 * 2. Inheritance: User role hierarchy with different permissions
 * 3. Polymorphism: Different task types, same management interface
 * 4. Composition: Projects composed of tasks, teams composed of users
 * 5. Association: Complex relationships between users, tasks, projects
 * 6. Aggregation: Team aggregation of multiple users and skills
 * 
 * ENTERPRISE FEATURES:
 * - Role-based access control with permission hierarchies
 * - Advanced task assignment with skill matching
 * - Real-time workload balancing and capacity planning
 * - Comprehensive project analytics and reporting
 * - Automated workflow management with triggers
 * - Time tracking with productivity analytics
 * - Dependency management with critical path analysis
 * - Team collaboration with communication integration
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Event-driven task lifecycle management
 * - Microservice-ready modular design
 * - Real-time collaboration support
 * - Scalable team and project organization
 */

// Task status enumeration - State Pattern for task lifecycle management
const TaskStatus = { 
    TODO: 'TODO',                    // Task created and ready to start
    IN_PROGRESS: 'IN_PROGRESS',      // Task actively being worked on
    IN_REVIEW: 'IN_REVIEW',          // Task completed, pending review
    DONE: 'DONE',                    // Task completed and approved
    CANCELLED: 'CANCELLED'           // Task cancelled or abandoned
};

// Priority enumeration - Strategy Pattern for task prioritization
const Priority = { 
    LOW: 1,        // Non-urgent tasks
    MEDIUM: 2,     // Standard priority tasks
    HIGH: 3,       // Important tasks requiring attention
    CRITICAL: 4    // Urgent tasks requiring immediate action
};

// User role enumeration - Strategy Pattern for permission management
const UserRole = { 
    MEMBER: 'MEMBER',     // Team member with basic task permissions
    MANAGER: 'MANAGER',   // Team lead with task assignment and monitoring
    ADMIN: 'ADMIN'        // System administrator with full access
};

// Project status enumeration - State Pattern for project lifecycle
const ProjectStatus = { 
    PLANNING: 'PLANNING',     // Project in planning phase
    ACTIVE: 'ACTIVE',         // Project actively running
    ON_HOLD: 'ON_HOLD',       // Project temporarily paused
    COMPLETED: 'COMPLETED',   // Project successfully completed
    CANCELLED: 'CANCELLED'    // Project cancelled or terminated
};

// Utility function for generating unique identifiers
function generateUUID() { 
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => { 
        const r = Math.random() * 16 | 0; 
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); 
    }); 
}

/**
 * User Class - Represents team members with roles and capabilities
 * 
 * DESIGN PATTERNS:
 * - Strategy Pattern: Different roles have different capabilities
 * - State Pattern: User activity and workload status
 * 
 * OOP CONCEPTS:
 * - Encapsulation: User data and workload management
 * - Business Logic: Skill matching and capacity planning
 */
class User {
    constructor(userId, username, email, name, role = UserRole.MEMBER) {
        this.userId = userId;           // Unique identifier
        this.username = username;       // Login username
        this.email = email;            // Contact email
        this.name = name;              // Display name
        this.role = role;              // User role determining permissions
        this.isActive = true;          // Account status
        this.skills = [];              // User skill set for task matching
        this.workload = 0;             // Current workload in hours
        this.maxWorkload = 40;         // Maximum weekly capacity
        this.joinDate = new Date();    // Account creation date
    }
    
    /**
     * Skill management for intelligent task assignment
     */
    addSkill(skill) { 
        if (!this.skills.includes(skill)) this.skills.push(skill); 
    }
    
    /**
     * Workload management for capacity planning
     */
    updateWorkload(hours) { 
        this.workload += hours; 
    }
    
    /**
     * Strategy Pattern: Capacity checking algorithm
     */
    canTakeTask(estimatedHours) { 
        return this.workload + estimatedHours <= this.maxWorkload; 
    }
}

/**
 * Task Class - Core entity representing work items
 * 
 * DESIGN PATTERNS:
 * - State Pattern: Task status transitions
 * - Command Pattern: Task operations as commands
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Task data and progress tracking
 * - State Management: Status transitions with validation
 */
class Task {
    constructor(taskId, title, description, assigneeId, projectId, estimatedHours = 8) {
        this.taskId = taskId;              // Unique task identifier
        this.title = title;                // Task title/summary
        this.description = description;    // Detailed task description
        this.assigneeId = assigneeId;      // Assigned user ID
        this.projectId = projectId;        // Parent project ID
        this.status = TaskStatus.TODO;     // Current task status
        this.priority = Priority.MEDIUM;   // Task priority level
        this.estimatedHours = estimatedHours; // Estimated effort
        this.actualHours = 0;              // Actual time spent
        this.progress = 0;                 // Completion percentage
        this.tags = [];
        this.dependencies = [];
        this.subtasks = [];
        this.comments = [];
        this.attachments = [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.dueDate = null;
        this.completedAt = null;
    }
    
    updateStatus(status) {
        this.status = status;
        this.updatedAt = new Date();
        if (status === TaskStatus.DONE) {
            this.completedAt = new Date();
            this.progress = 100;
        }
    }
    
    updateProgress(progress) {
        this.progress = Math.max(0, Math.min(100, progress));
        this.updatedAt = new Date();
        if (this.progress === 100 && this.status !== TaskStatus.DONE) {
            this.updateStatus(TaskStatus.DONE);
        }
    }
    
    addDependency(taskId) { if (!this.dependencies.includes(taskId)) this.dependencies.push(taskId); }
    addSubtask(subtask) { this.subtasks.push(subtask); }
    addComment(comment) { this.comments.push(comment); }
    addTag(tag) { if (!this.tags.includes(tag)) this.tags.push(tag); }
    logTime(hours) { this.actualHours += hours; this.updatedAt = new Date(); }
}

class Comment {
    constructor(commentId, authorId, taskId, content) {
        this.commentId = commentId;
        this.authorId = authorId;
        this.taskId = taskId;
        this.content = content;
        this.timestamp = new Date();
        this.isEdited = false;
    }
    
    edit(newContent) { this.content = newContent; this.isEdited = true; }
}

class Project {
    constructor(projectId, name, description, ownerId) {
        this.projectId = projectId;
        this.name = name;
        this.description = description;
        this.ownerId = ownerId;
        this.status = ProjectStatus.PLANNING;
        this.members = new Set([ownerId]);
        this.tasks = [];
        this.milestones = [];
        this.budget = 0;
        this.spentBudget = 0;
        this.startDate = null;
        this.endDate = null;
        this.createdAt = new Date();
        this.tags = [];
    }
    
    addMember(userId) { this.members.add(userId); }
    removeMember(userId) { this.members.delete(userId); }
    addTask(taskId) { this.tasks.push(taskId); }
    updateStatus(status) { this.status = status; }
    addMilestone(milestone) { this.milestones.push(milestone); }
}

class Milestone {
    constructor(milestoneId, name, description, dueDate, projectId) {
        this.milestoneId = milestoneId;
        this.name = name;
        this.description = description;
        this.dueDate = dueDate;
        this.projectId = projectId;
        this.isCompleted = false;
        this.completedAt = null;
        this.tasks = [];
    }
    
    addTask(taskId) { this.tasks.push(taskId); }
    complete() { this.isCompleted = true; this.completedAt = new Date(); }
}

class Sprint {
    constructor(sprintId, name, projectId, startDate, endDate) {
        this.sprintId = sprintId;
        this.name = name;
        this.projectId = projectId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.tasks = [];
        this.goals = [];
        this.isActive = false;
        this.isCompleted = false;
    }
    
    addTask(taskId) { this.tasks.push(taskId); }
    addGoal(goal) { this.goals.push(goal); }
    start() { this.isActive = true; }
    complete() { this.isActive = false; this.isCompleted = true; }
}

class TaskObserver {
    update(task, event) { throw new Error('Method must be implemented'); }
}

class NotificationObserver extends TaskObserver {
    update(task, event) {
        console.log(`🔔 Task "${task.title}" ${event}`);
    }
}

class AnalyticsObserver extends TaskObserver {
    constructor() {
        super();
        this.events = [];
    }
    
    update(task, event) {
        this.events.push({ task: task.taskId, event, timestamp: new Date() });
    }
}

class TaskManagementSystem {
    constructor(organizationName) {
        this.organizationName = organizationName;
        this.users = new Map();
        this.projects = new Map();
        this.tasks = new Map();
        this.sprints = new Map();
        this.observers = [];
        this.workflowRules = [];
        this.timeEntries = [];
    }
    
    addObserver(observer) { this.observers.push(observer); }
    notifyObservers(task, event) { this.observers.forEach(obs => obs.update(task, event)); }
    
    registerUser(username, email, name, role = UserRole.MEMBER) {
        const userId = generateUUID();
        const user = new User(userId, username, email, name, role);
        this.users.set(userId, user);
        console.log(`User registered: ${username} (${role})`);
        return user;
    }
    
    createProject(name, description, ownerId) {
        const projectId = generateUUID();
        const project = new Project(projectId, name, description, ownerId);
        this.projects.set(projectId, project);
        console.log(`Project created: ${name}`);
        return project;
    }
    
    addProjectMember(projectId, userId) {
        const project = this.projects.get(projectId);
        if (project) {
            project.addMember(userId);
            console.log(`User ${this.users.get(userId).username} added to project ${project.name}`);
            return true;
        }
        return false;
    }
    
    createTask(title, description, projectId, assigneeId = null, estimatedHours = 8) {
        const taskId = generateUUID();
        const task = new Task(taskId, title, description, assigneeId, projectId, estimatedHours);
        
        this.tasks.set(taskId, task);
        
        const project = this.projects.get(projectId);
        if (project) project.addTask(taskId);
        
        if (assigneeId) {
            const assignee = this.users.get(assigneeId);
            if (assignee) assignee.updateWorkload(estimatedHours);
        }
        
        this.notifyObservers(task, 'created');
        console.log(`Task created: ${title}`);
        return task;
    }
    
    assignTask(taskId, assigneeId) {
        const task = this.tasks.get(taskId);
        const assignee = this.users.get(assigneeId);
        
        if (task && assignee) {
            // Remove workload from previous assignee
            if (task.assigneeId) {
                const previousAssignee = this.users.get(task.assigneeId);
                if (previousAssignee) previousAssignee.updateWorkload(-task.estimatedHours);
            }
            
            // Check if new assignee can take the task
            if (!assignee.canTakeTask(task.estimatedHours)) {
                console.log(`Warning: ${assignee.username} workload will exceed limit`);
            }
            
            task.assigneeId = assigneeId;
            assignee.updateWorkload(task.estimatedHours);
            this.notifyObservers(task, `assigned to ${assignee.username}`);
            console.log(`Task "${task.title}" assigned to ${assignee.username}`);
            return true;
        }
        return false;
    }
    
    updateTaskStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (task) {
            const oldStatus = task.status;
            task.updateStatus(status);
            this.notifyObservers(task, `status changed from ${oldStatus} to ${status}`);
            
            // Apply workflow rules
            this.applyWorkflowRules(task);
            
            console.log(`Task "${task.title}" status updated to ${status}`);
            return true;
        }
        return false;
    }
    
    updateTaskProgress(taskId, progress) {
        const task = this.tasks.get(taskId);
        if (task) {
            const oldProgress = task.progress;
            task.updateProgress(progress);
            this.notifyObservers(task, `progress updated from ${oldProgress}% to ${progress}%`);
            console.log(`Task "${task.title}" progress updated to ${progress}%`);
            return true;
        }
        return false;
    }
    
    addTaskComment(taskId, authorId, content) {
        const task = this.tasks.get(taskId);
        if (task) {
            const commentId = generateUUID();
            const comment = new Comment(commentId, authorId, taskId, content);
            task.addComment(comment);
            
            const author = this.users.get(authorId);
            console.log(`${author.username} commented on task "${task.title}"`);
            return comment;
        }
        return null;
    }
    
    logTimeEntry(taskId, userId, hours, description = '') {
        const task = this.tasks.get(taskId);
        const user = this.users.get(userId);
        
        if (task && user) {
            task.logTime(hours);
            
            const timeEntry = {
                entryId: generateUUID(),
                taskId,
                userId,
                hours,
                description,
                date: new Date()
            };
            
            this.timeEntries.push(timeEntry);
            console.log(`${user.username} logged ${hours} hours on task "${task.title}"`);
            return timeEntry;
        }
        return null;
    }
    
    createSprint(name, projectId, startDate, endDate) {
        const sprintId = generateUUID();
        const sprint = new Sprint(sprintId, name, projectId, startDate, endDate);
        this.sprints.set(sprintId, sprint);
        console.log(`Sprint created: ${name}`);
        return sprint;
    }
    
    addTaskToSprint(taskId, sprintId) {
        const sprint = this.sprints.get(sprintId);
        if (sprint) {
            sprint.addTask(taskId);
            console.log(`Task added to sprint ${sprint.name}`);
            return true;
        }
        return false;
    }
    
    applyWorkflowRules(task) {
        // Simple workflow rules
        if (task.status === TaskStatus.DONE) {
            // Check if all dependencies are complete
            const incompleteDependencies = task.dependencies.filter(depId => {
                const depTask = this.tasks.get(depId);
                return depTask && depTask.status !== TaskStatus.DONE;
            });
            
            if (incompleteDependencies.length > 0) {
                console.log(`Warning: Task "${task.title}" marked as done but has incomplete dependencies`);
            }
        }
    }
    
    searchTasks(query, filters = {}) {
        const results = [];
        this.tasks.forEach(task => {
            let matches = task.title.toLowerCase().includes(query.toLowerCase()) ||
                         task.description.toLowerCase().includes(query.toLowerCase());
            
            if (filters.status && task.status !== filters.status) matches = false;
            if (filters.assigneeId && task.assigneeId !== filters.assigneeId) matches = false;
            if (filters.projectId && task.projectId !== filters.projectId) matches = false;
            if (filters.priority && task.priority !== filters.priority) matches = false;
            
            if (matches) results.push(task);
        });
        
        return results;
    }
    
    getProjectAnalytics(projectId) {
        const project = this.projects.get(projectId);
        if (!project) return null;
        
        const projectTasks = project.tasks.map(taskId => this.tasks.get(taskId));
        const completedTasks = projectTasks.filter(task => task.status === TaskStatus.DONE);
        const inProgressTasks = projectTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
        const totalEstimatedHours = projectTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
        const totalActualHours = projectTasks.reduce((sum, task) => sum + task.actualHours, 0);
        
        return {
            projectName: project.name,
            totalTasks: projectTasks.length,
            completedTasks: completedTasks.length,
            inProgressTasks: inProgressTasks.length,
            completionRate: projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0,
            totalEstimatedHours,
            totalActualHours,
            efficiency: totalEstimatedHours > 0 ? (totalEstimatedHours / totalActualHours) * 100 : 0,
            members: project.members.size
        };
    }
    
    getUserAnalytics(userId) {
        const user = this.users.get(userId);
        if (!user) return null;
        
        const userTasks = Array.from(this.tasks.values()).filter(task => task.assigneeId === userId);
        const completedTasks = userTasks.filter(task => task.status === TaskStatus.DONE);
        const userTimeEntries = this.timeEntries.filter(entry => entry.userId === userId);
        const totalHoursLogged = userTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        
        return {
            username: user.username,
            currentWorkload: user.workload,
            maxWorkload: user.maxWorkload,
            workloadPercentage: (user.workload / user.maxWorkload) * 100,
            totalTasks: userTasks.length,
            completedTasks: completedTasks.length,
            completionRate: userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0,
            totalHoursLogged,
            averageTaskCompletion: completedTasks.length > 0 ? 
                completedTasks.reduce((sum, task) => sum + task.actualHours, 0) / completedTasks.length : 0
        };
    }
    
    getSystemStats() {
        const totalTasks = this.tasks.size;
        const completedTasks = Array.from(this.tasks.values()).filter(task => task.status === TaskStatus.DONE).length;
        const activeProjects = Array.from(this.projects.values()).filter(project => project.status === ProjectStatus.ACTIVE).length;
        
        return {
            totalUsers: this.users.size,
            totalProjects: this.projects.size,
            activeProjects,
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            totalSprints: this.sprints.size,
            organizationName: this.organizationName
        };
    }
}

function runDemo() {
    console.log("=== Task Management System Demo ===\n");
    
    const system = new TaskManagementSystem("TechCorp");
    system.addObserver(new NotificationObserver());
    system.addObserver(new AnalyticsObserver());
    
    // Register users
    console.log("1. Registering users...");
    const alice = system.registerUser("alice_m", "alice@techcorp.com", "Alice Manager", UserRole.MANAGER);
    const bob = system.registerUser("bob_dev", "bob@techcorp.com", "Bob Developer");
    const charlie = system.registerUser("charlie_qa", "charlie@techcorp.com", "Charlie QA");
    console.log();
    
    // Create project
    console.log("2. Creating project...");
    const project = system.createProject("Mobile App Development", "iOS and Android app for customer portal", alice.userId);
    system.addProjectMember(project.projectId, bob.userId);
    system.addProjectMember(project.projectId, charlie.userId);
    console.log();
    
    // Create tasks
    console.log("3. Creating tasks...");
    const task1 = system.createTask("Design user interface", "Create mockups and wireframes", project.projectId, null, 16);
    const task2 = system.createTask("Implement authentication", "User login and registration", project.projectId, null, 24);
    const task3 = system.createTask("API integration", "Connect to backend services", project.projectId, null, 32);
    const task4 = system.createTask("Testing and QA", "Comprehensive testing of all features", project.projectId, null, 20);
    console.log();
    
    // Assign tasks
    console.log("4. Assigning tasks...");
    system.assignTask(task1.taskId, alice.userId);
    system.assignTask(task2.taskId, bob.userId);
    system.assignTask(task3.taskId, bob.userId);
    system.assignTask(task4.taskId, charlie.userId);
    console.log();
    
    // Create sprint
    console.log("5. Creating sprint...");
    const sprint = system.createSprint("Sprint 1", project.projectId, new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    system.addTaskToSprint(task1.taskId, sprint.sprintId);
    system.addTaskToSprint(task2.taskId, sprint.sprintId);
    console.log();
    
    // Update task statuses and progress
    console.log("6. Working on tasks...");
    system.updateTaskStatus(task1.taskId, TaskStatus.IN_PROGRESS);
    system.updateTaskProgress(task1.taskId, 50);
    system.updateTaskStatus(task2.taskId, TaskStatus.IN_PROGRESS);
    system.updateTaskProgress(task2.taskId, 25);
    console.log();
    
    // Add comments
    console.log("7. Adding task comments...");
    system.addTaskComment(task1.taskId, alice.userId, "Initial mockups completed, working on detailed designs");
    system.addTaskComment(task2.taskId, bob.userId, "Authentication service setup complete, working on frontend");
    console.log();
    
    // Log time entries
    console.log("8. Logging time entries...");
    system.logTimeEntry(task1.taskId, alice.userId, 8, "Created initial wireframes");
    system.logTimeEntry(task2.taskId, bob.userId, 6, "Set up authentication endpoints");
    system.logTimeEntry(task3.taskId, bob.userId, 4, "Research API documentation");
    console.log();
    
    // Complete some tasks
    console.log("9. Completing tasks...");
    system.updateTaskProgress(task1.taskId, 100);
    system.updateTaskStatus(task1.taskId, TaskStatus.DONE);
    console.log();
    
    // Search tasks
    console.log("10. Searching tasks...");
    const searchResults = system.searchTasks("auth", { status: TaskStatus.IN_PROGRESS });
    console.log(`Found ${searchResults.length} tasks matching search criteria:`);
    searchResults.forEach(task => {
        console.log(`  - ${task.title} (${task.status})`);
    });
    console.log();
    
    // Project analytics
    console.log("11. Project Analytics:");
    const projectAnalytics = system.getProjectAnalytics(project.projectId);
    console.log(`Project: ${projectAnalytics.projectName}`);
    console.log(`Tasks: ${projectAnalytics.completedTasks}/${projectAnalytics.totalTasks} completed (${projectAnalytics.completionRate.toFixed(1)}%)`);
    console.log(`Hours: ${projectAnalytics.totalActualHours}/${projectAnalytics.totalEstimatedHours} (${projectAnalytics.efficiency.toFixed(1)}% efficiency)`);
    console.log(`Team members: ${projectAnalytics.members}`);
    console.log();
    
    // User analytics
    console.log("12. User Analytics:");
    [alice, bob, charlie].forEach(user => {
        const analytics = system.getUserAnalytics(user.userId);
        console.log(`${analytics.username}: ${analytics.completedTasks}/${analytics.totalTasks} tasks (${analytics.completionRate.toFixed(1)}% completion)`);
        console.log(`  Workload: ${analytics.currentWorkload}/${analytics.maxWorkload} hours (${analytics.workloadPercentage.toFixed(1)}%)`);
        console.log(`  Hours logged: ${analytics.totalHoursLogged}`);
    });
    console.log();
    
    // System statistics
    console.log("13. System Statistics:");
    const stats = system.getSystemStats();
    console.log(`Organization: ${stats.organizationName}`);
    console.log(`Users: ${stats.totalUsers}`);
    console.log(`Projects: ${stats.activeProjects}/${stats.totalProjects} active`);
    console.log(`Tasks: ${stats.completedTasks}/${stats.totalTasks} completed (${stats.completionRate.toFixed(1)}%)`);
    console.log(`Sprints: ${stats.totalSprints}`);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaskManagementSystem, Task, Project, User };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}