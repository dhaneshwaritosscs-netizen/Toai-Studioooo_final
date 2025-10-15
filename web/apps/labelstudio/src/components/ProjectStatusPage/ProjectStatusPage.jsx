import React, { useState, useEffect } from "react";
import { IconSearch, IconRefresh, IconFileDownload, IconClose, IconChevronLeft } from "@humansignal/icons";
import { useAPI } from "../../providers/ApiProvider";
import { useCurrentUser } from "../../providers/CurrentUser";
import { useUserRoles } from "../../hooks/useUserRoles";
import { TopNavigationBar } from "../TopNavigationBar";

export const ProjectStatusPage = ({ onClose }) => {
  const api = useAPI();
  const { user } = useCurrentUser();
  const { hasRole } = useUserRoles();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Active");
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [selectedMainTab, setSelectedMainTab] = useState("Project Status");
  const [selectedSubTab, setSelectedSubTab] = useState("Task");
  const [startDate, setStartDate] = useState("12/09/2025");
  const [endDate, setEndDate] = useState("12/09/2025");
  const [selectedProject, setSelectedProject] = useState("");
  const [userTargetsData, setUserTargetsData] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [tenantReportData, setTenantReportData] = useState([]);
  const [monthlyProductivityData, setMonthlyProductivityData] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProjectForModal, setSelectedProjectForModal] = useState("");
  const [selectedMonthYear, setSelectedMonthYear] = useState("September 2025");
  const [cumulativeProductivityData, setCumulativeProductivityData] = useState([]);
  const [isDaywiseReport, setIsDaywiseReport] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedProjectUsers, setSelectedProjectUsers] = useState([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
  const [userProjectAssignments, setUserProjectAssignments] = useState({});
  const [clientUserAssignments, setClientUserAssignments] = useState({});
  const [usersData, setUsersData] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [userTargetsWithProjects, setUserTargetsWithProjects] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState(""); // "completed" or "pending"
  const [selectedProjectForTasks, setSelectedProjectForTasks] = useState(null);
  const [tasksData, setTasksData] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Billing form state
  const [billingForm, setBillingForm] = useState({
    clientId: "",
    userId: "",
    hours: "",
    rate: ""
  });
  const [billingStatusData, setBillingStatusData] = useState([]);
  const [availableClientIds, setAvailableClientIds] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Subscription form state
  const [subscriptionForm, setSubscriptionForm] = useState({
    clientId: "",
    userId: "",
    subscriptionPlan: "",
    months: ""
  });
  const [subscriptionPlans] = useState([
    { id: "starter", name: "Starter Cloud", price: "$99/month" },
    { id: "professional", name: "Professional", price: "$199/month" },
    { id: "enterprise", name: "Enterprise", price: "Custom" }
  ]);

  // Filter users based on user role - same logic as Users Status section
  const getFilteredUsers = () => {
    const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
    const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
    
    if (isSuperAdmin) {
      // Super Admin sees all users
      return availableUsers;
    } else if (isAdmin) {
      // Admin sees only users they created
      return availableUsers.filter(userItem => {
        const isCreatedByAdmin = userItem.created_by === user?.id;
        const isAdminSelf = userItem.id === user?.id;
        
        return isCreatedByAdmin || isAdminSelf;
      });
    } else {
      // Client sees users they created (including themselves) - same as Users Status
      return availableUsers.filter(userItem => {
        const isCreatedByClient = userItem.created_by === user?.id;
        const isClientSelf = userItem.id === user?.id;
        
        return isCreatedByClient || isClientSelf;
      });
    }
  };

  const filteredUsers = getFilteredUsers();

  // Debug function to test user fetching in Project Status page
  window.debugProjectStatusUsers = () => {
    console.log("=== DEBUG: Project Status Users ===");
    console.log("Available users:", availableUsers);
    console.log("Available users count:", availableUsers?.length || 0);
    console.log("Users data:", usersData);
    console.log("Users data count:", usersData?.length || 0);
    console.log("User targets with projects:", userTargetsWithProjects);
    console.log("User targets count:", userTargetsWithProjects?.length || 0);
    console.log("Current user:", user);
    console.log("User roles:", { isAdmin, isSuperAdmin });
    
    // Test fetch functions
    console.log("Testing fetchUsers...");
    fetchUsers();
    console.log("Testing fetchUsersData...");
    fetchUsersData();
    console.log("Testing fetchUserTargetsWithProjects...");
    fetchUserTargetsWithProjects();
  };

  // Filter billing data based on user role - same logic as user filtering
  const getFilteredBillingData = () => {
    const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
    const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
    
    if (isSuperAdmin) {
      // Super Admin sees all billing entries
      return billingStatusData;
    } else if (isAdmin) {
      // Admin sees only billing entries for users they created
      return billingStatusData.filter(item => {
        // Find the user in availableUsers to check created_by
        const userItem = availableUsers.find(u => u.email === item.emailId);
        if (!userItem) return false;
        
        const isCreatedByAdmin = userItem.created_by === user?.id;
        const isAdminSelf = userItem.id === user?.id;
        
        return isCreatedByAdmin || isAdminSelf;
      });
    } else {
      // Client sees only billing entries for users they created
      return billingStatusData.filter(item => {
        // Find the user in availableUsers to check created_by
        const userItem = availableUsers.find(u => u.email === item.emailId);
        if (!userItem) return false;
        
        const isCreatedByClient = userItem.created_by === user?.id;
        const isClientSelf = userItem.id === user?.id;
        
        return isCreatedByClient || isClientSelf;
      });
    }
  };

  const filteredBillingData = getFilteredBillingData();

  // Fetch available client IDs from projects
  const fetchClientIds = async () => {
    try {
      const response = await api.callApi("projects", {
        params: {
          show_all: true,
          page_size: 1000,
          include: "id,title,created_by"
        }
      });
      
      if (response.results) {
        // Extract unique client IDs from project creators
        const clientIds = [...new Set(response.results
          .filter(project => project.created_by?.id)
          .map(project => ({
            id: project.created_by.id,
            email: project.created_by.email || project.created_by.username,
            name: project.created_by.first_name && project.created_by.last_name 
              ? `${project.created_by.first_name} ${project.created_by.last_name}`
              : project.created_by.email || project.created_by.username
          }))
        )];
        setAvailableClientIds(clientIds);
      }
    } catch (error) {
      console.error("Error fetching client IDs:", error);
    }
  };

  // Fetch available users - same logic as Manage Users page
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      console.log("=== ProjectStatusPage: Fetching users ===");
      console.log("Current user:", user?.email);
      
      // Determine user role
      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
      
      let response;
      
      if (isSuperAdmin) {
        // Super Admin: Use direct fetch to get ALL users in the system
        console.log("Super Admin: Fetching all users using direct API call");
        const baseUrl = window.location.origin;
        
        try {
          const queryParams = new URLSearchParams({
            page: '1',
            page_size: '1000',  // Get more users
            search: '',
            user_filter: 'All Users'
          });
          
          const apiUrl = `${baseUrl}/api/users/list_role_based/?${queryParams}`;
          console.log("ProjectStatusPage API URL:", apiUrl);
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
          });
          
          if (apiResponse.ok) {
            response = await apiResponse.json();
            console.log("Direct API response:", response);
          } else {
            console.error("list_role_based API call failed:", apiResponse.status);
            // Fallback to regular users endpoint
            console.log("Falling back to regular users endpoint...");
            const fallbackResponse = await fetch(`${baseUrl}/api/users/`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              credentials: 'include',
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              // Transform the response to match expected format
              response = {
                results: fallbackData.results ? fallbackData.results.map(user => ({
                  user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    is_active: user.is_active,
                    created_by: user.created_by,
                    last_activity: user.last_activity,
                    date_joined: user.date_joined,
                  },
                  organization: {
                    id: 1,
                    title: 'All Users',
                  }
                })) : [],
                count: fallbackData.count || 0,
                page: fallbackData.page || 1,
                page_size: fallbackData.page_size || 1000,
                total_pages: fallbackData.total_pages || 1,
                user_role: 'super-admin',
                message: 'Users retrieved successfully (fallback)'
              };
              console.log("Fallback API response:", response);
            } else {
              throw new Error(`Fallback API call also failed: ${fallbackResponse.status}`);
            }
          }
        } catch (fetchError) {
          console.error("Error with direct API call:", fetchError);
          throw fetchError;
        }
      } else {
        // Regular users: Use memberships API (organization members only)
        console.log("Regular user: Fetching organization members from memberships");
        response = await api.callApi("memberships", {
        params: {
          pk: 1,
          contributed_to_projects: 1,
          page: 1,
            page_size: 1000, // Increased from 100 to 1000
        },
        include: [
          "id",
          "email", 
          "first_name",
          "last_name",
          "username",
          "created_by",
          "is_active"
        ],
      });
      }
      
      console.log("Users response:", response);
      console.log("Results count:", response?.results?.length);
      
      if (response && response.results) {
        const users = response.results.map(({ user }) => ({
          id: user.id,
          email: user.email,
          name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`
            : user.email,
          created_by: user.created_by,
          username: user.username,
          is_active: user.is_active
        }));
        console.log("Users loaded:", users.length);
        setAvailableUsers(users);
      } else {
        console.warn("No users found in response");
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setAvailableUsers([]);
    } finally {
      setUsersLoading(false);
      console.log("=== ProjectStatusPage: User fetch completed ===");
    }
  };

  // Load billing data from localStorage
  const loadBillingData = () => {
    try {
      const savedBillingData = localStorage.getItem('billingStatusData');
      if (savedBillingData) {
        const parsedData = JSON.parse(savedBillingData);
        setBillingStatusData(parsedData);
      }
    } catch (error) {
      console.error("Error loading billing data from localStorage:", error);
    }
  };

  // Save billing data to localStorage
  const saveBillingData = (data) => {
    try {
      localStorage.setItem('billingStatusData', JSON.stringify(data));
    } catch (error) {
      console.error("Error saving billing data to localStorage:", error);
    }
  };

  // Handle billing form submission
  const handleBillingSubmit = () => {
    if (!billingForm.userId || !billingForm.hours || !billingForm.rate) {
      alert("Please fill in all fields");
      return;
    }

    const selectedUser = filteredUsers.find(u => u.id === parseInt(billingForm.userId));
    
    if (!selectedUser) {
      alert("Invalid user selection");
      return;
    }

    const newBillingEntry = {
      id: Date.now(), // Simple ID generation
      emailId: selectedUser.email,
      clientId: user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.email || 'Current User',
      userId: selectedUser.name,
      hours: parseFloat(billingForm.hours),
      rate: parseFloat(billingForm.rate),
      total: parseFloat(billingForm.hours) * parseFloat(billingForm.rate)
    };

    const updatedBillingData = [...billingStatusData, newBillingEntry];
    setBillingStatusData(updatedBillingData);
    
    // Save to localStorage for persistence
    saveBillingData(updatedBillingData);
    
    // Reset form
    setBillingForm({
      clientId: "",
      userId: "",
      hours: "",
      rate: ""
    });

    alert("Billing entry added successfully!");
  };

  const handleSubscriptionSubmit = () => {
    if (!subscriptionForm.subscriptionPlan) {
      alert("Please select a subscription plan");
      return;
    }

    const selectedPlan = subscriptionPlans.find(p => p.id === subscriptionForm.subscriptionPlan);
    
    if (!selectedPlan) {
      alert("Invalid subscription plan selection");
      return;
    }

    // Auto-populate with current client data
    const newBillingEntry = {
      id: Date.now() + 1, // Different ID
      emailId: user?.email || 'No email',
      clientId: user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.email || 'Current User',
      userId: user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.email || 'Current User',
      hours: 0, // No hours for subscription
      rate: 0, // No rate for subscription
      total: 0, // No total for subscription
      subscriptionMonths: 1, // Default to 1 month
      subscriptionPlan: selectedPlan.name
    };

    const updatedBillingData = [...billingStatusData, newBillingEntry];
    setBillingStatusData(updatedBillingData);
    
    // Save to localStorage for persistence
    saveBillingData(updatedBillingData);

    // Reset form
    setSubscriptionForm({
      clientId: "",
      userId: "",
      subscriptionPlan: "",
      months: ""
    });

    alert("Subscription entry added successfully!");
  };

  // Delete a billing entry
  const deleteBillingEntry = (entryId) => {
    const updatedBillingData = billingStatusData.filter(entry => entry.id !== entryId);
    setBillingStatusData(updatedBillingData);
    saveBillingData(updatedBillingData);
  };

  // Clear all billing data (only filtered data for clients)
  const clearAllBillingData = () => {
    const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
    const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
    
    if (window.confirm("Are you sure you want to clear all billing entries? This action cannot be undone.")) {
      if (isAdmin) {
        // Admin clears all data
        setBillingStatusData([]);
        localStorage.removeItem('billingStatusData');
      } else {
        // Client clears only their filtered data
        const updatedData = billingStatusData.filter(item => {
          const userItem = availableUsers.find(u => u.email === item.emailId);
          if (!userItem) return true; // Keep entries where user not found
          
          const isCreatedByClient = userItem.created_by === user?.id;
          const isClientSelf = userItem.id === user?.id;
          
          // Remove entries for users created by this client
          return !(isCreatedByClient || isClientSelf);
        });
        
        setBillingStatusData(updatedData);
        saveBillingData(updatedData);
      }
    }
  };

  // Fetch tasks for a specific project
  const fetchProjectTasks = async (projectId, taskType) => {
    try {
      setTasksLoading(true);
      
      // Try different API endpoints for tasks
      let tasksResponse = null;
      
      try {
        // First try the tasks endpoint
        tasksResponse = await api.callApi("tasks", {
          params: {
            project: projectId,
            page_size: 1000,
            include: "id,data,annotations,created_at,updated_at,annotations_count,annotations_results"
          }
        });
        console.log('DEBUG: Tasks API response:', tasksResponse);
      } catch (error) {
        console.log('DEBUG: Tasks API failed, trying alternative:', error);
        
        // Try alternative endpoint
        try {
          tasksResponse = await api.callApi(`projects/${projectId}/tasks`, {
            params: {
              page_size: 1000,
              include: "id,data,annotations,created_at,updated_at,annotations_count,annotations_results"
            }
          });
          console.log('DEBUG: Alternative tasks API response:', tasksResponse);
        } catch (altError) {
          console.log('DEBUG: Alternative API also failed:', altError);
          throw altError;
        }
      }
      
      if (tasksResponse && tasksResponse.results) {
        console.log(`DEBUG: Fetched ${tasksResponse.results.length} tasks for project ${projectId}`);
        console.log('DEBUG: All tasks data:', tasksResponse.results);
        
        let filteredTasks = [];
        
        if (taskType === "completed") {
          // Filter completed tasks (tasks with annotations or annotations_count > 0)
          filteredTasks = tasksResponse.results.filter(task => {
            const hasAnnotations = (task.annotations && task.annotations.length > 0) || 
                                 (task.annotations_count && task.annotations_count > 0) ||
                                 (task.annotations_results && task.annotations_results.length > 0);
            console.log(`DEBUG: Task ${task.id} - annotations: ${task.annotations?.length || 0}, annotations_count: ${task.annotations_count || 0}, annotations_results: ${task.annotations_results?.length || 0}, isCompleted: ${hasAnnotations}`);
            return hasAnnotations;
          });
          console.log(`DEBUG: Found ${filteredTasks.length} completed tasks`);
        } else if (taskType === "pending") {
          // Filter pending tasks (tasks without annotations)
          filteredTasks = tasksResponse.results.filter(task => {
            const hasAnnotations = (task.annotations && task.annotations.length > 0) || 
                                 (task.annotations_count && task.annotations_count > 0) ||
                                 (task.annotations_results && task.annotations_results.length > 0);
            const isPending = !hasAnnotations;
            console.log(`DEBUG: Task ${task.id} - annotations: ${task.annotations?.length || 0}, annotations_count: ${task.annotations_count || 0}, annotations_results: ${task.annotations_results?.length || 0}, isPending: ${isPending}`);
            return isPending;
          });
          console.log(`DEBUG: Found ${filteredTasks.length} pending tasks`);
        }
        
        setTasksData(filteredTasks);
      } else {
        setTasksData([]);
      }
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      setTasksData([]);
    } finally {
      setTasksLoading(false);
    }
  };

  // Handle click on Complete or Pending column
  const handleTaskColumnClick = (project, taskType) => {
    console.log(`DEBUG: Clicked on ${taskType} for project ${project.title} (ID: ${project.id})`);
    setSelectedProjectForTasks(project);
    setSelectedTaskType(taskType);
    setShowTaskModal(true);
    fetchProjectTasks(project.id, taskType);
  };

  // Fetch project status data from backend
  const fetchProjectStatus = async () => {
    try {
      setLoading(true);
      
      // Determine user role
      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
      
      const requestParams = {
        page_size: 1000, // Large page size to get all projects
        include: [
          "id",
          "title",
          "created_by",
          "created_at",
          "color",
          "is_published",
          "assignment_settings",
          "task_number",
          "total_annotations_number",
          "finished_task_number",
          "batches"
        ].join(",")
      };
      
      // For Super Admin and Admin users, fetch ALL projects so we can filter them properly
      if (isSuperAdmin) {
        requestParams.show_all = true;
        console.log("Fetching all projects for Super Admin");
      } else if (isAdmin && user) {
        // For Admin users, fetch ALL projects so we can separate created vs assigned
        requestParams.show_all = true;
        console.log("Fetching ALL projects for admin user to separate created vs assigned");
      } else {
        // For client users, fetch all projects (will be filtered by assignments)
        console.log("Fetching all projects for client user");
        requestParams.show_all = true;
      }
      
      // Fetch projects data
      const projectsResponse = await api.callApi("projects", {
        params: requestParams
      });
      
      if (projectsResponse && projectsResponse.results) {
        console.log("Fetched projects:", projectsResponse.results.length);
        setProjects(projectsResponse.results);
      }
    } catch (error) {
      console.error("Error fetching project status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users assigned to a specific project
  const fetchProjectUsers = async (projectId, projectTitle) => {
    try {
      setLoading(true);
      
      // Get user project assignments from state
      const userInfoCache = JSON.parse(localStorage.getItem('userInfoCache') || '{}');
      
      // Find users assigned to this project
      const assignedUserIds = [];
      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
      
      if (isAdmin) {
        // For admin: show all users assigned to this project
        Object.keys(userProjectAssignments).forEach(userId => {
          const userAssignments = userProjectAssignments[userId] || [];
          if (userAssignments.includes(projectId)) {
            assignedUserIds.push(userId);
          }
        });
      } else {
        // For client: show only users assigned by this client to this project
        if (user && clientUserAssignments[user.id]) {
          const clientProjectAssignments = clientUserAssignments[user.id] || {};
          const usersAssignedByThisClient = clientProjectAssignments[projectId] || [];
          assignedUserIds.push(...usersAssignedByThisClient);
        }
      }
      
      // Get user details from cache or fetch from API
      const users = [];
      for (const userId of assignedUserIds) {
        if (userInfoCache[userId]) {
          users.push(userInfoCache[userId]);
        } else {
          try {
            // Fetch user details from API
            const userResponse = await api.callApi("users", {
              params: { id: userId }
            });
            if (userResponse && userResponse.results && userResponse.results.length > 0) {
              const userData = userResponse.results[0];
              users.push(userData);
              // Cache the user data
              userInfoCache[userId] = userData;
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
          }
        }
      }
      
      // Add project creator if not already in the list
      const project = projects.find(p => p.id === projectId);
      if (project && project.created_by) {
        const creatorAlreadyInList = users.some(user => user.id === project.created_by.id);
        if (!creatorAlreadyInList) {
          users.push(project.created_by);
        }
      }
      
      setSelectedProjectUsers(users);
      setSelectedProjectTitle(projectTitle);
      setShowUserModal(true);
      
      // Update cache
      localStorage.setItem('userInfoCache', JSON.stringify(userInfoCache));
      
    } catch (error) {
      console.error("Error fetching project users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user targets data from backend
  const fetchUserTargets = async () => {
    try {
      setLoading(true);
      const response = await api.callApi("memberships");
      if (response && response.results) {
        // Transform user data to include targets
        const targetsData = response.results.map((user, index) => ({
          id: user.id,
          username: user.user?.username || `User${index + 1}`,
          achievedTransaction: Math.floor(Math.random() * 100), // Mock data - replace with actual API
          transactionTarget: Math.floor(Math.random() * 1000) + 100,
          ahtTarget: Math.floor(Math.random() * 200) + 50,
        }));
        setUserTargetsData(targetsData);
      }
    } catch (error) {
      console.error("Error fetching user targets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch billing report data from backend
  const fetchBillingData = async () => {
    try {
      setLoading(true);
      // Mock billing data - replace with actual API call
      const mockBillingData = [
        {
          id: 1,
          orgName: "Org Billing Report",
          totalTransactions: 1,
          totalDatasets: 1,
          totalTimeTaken: "00:01:58",
          totalUsers: 1,
        }
      ];
      setBillingData(mockBillingData);
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenant report data from backend
  const fetchTenantReport = async () => {
    try {
      setLoading(true);
      // Mock tenant report data - replace with actual API call
      const mockTenantData = [
        {
          id: 1,
          projectName: "USA 434:ICD: Labelling",
          level: "2",
          noOfUser: "1",
          activeUsersCount: "1",
          actualCompletedTasks: "1",
          totalTimeTaken: "00:07:29",
          avgTimeTakenPerTask: "00:07:29",
          utilization: "1",
        },
        {
          id: 2,
          projectName: "TOTAL",
          level: "2",
          noOfUser: "1",
          activeUsersCount: "1",
          actualCompletedTasks: "1",
          totalTimeTaken: "00:07:29",
          avgTimeTakenPerTask: "00:07:29",
          utilization: "1",
        }
      ];
      setTenantReportData(mockTenantData);
    } catch (error) {
      console.error("Error fetching tenant report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly productivity data from backend
  const fetchMonthlyProductivity = async () => {
    try {
      setLoading(true);
      // Mock monthly productivity data - replace with actual API call
      const mockProductivityData = [
        {
          id: 1,
          projectName: "1210 - affinity",
          totalTasks: 150,
          completedTasks: 120,
          productivity: 80,
          utilization: 75,
        },
        {
          id: 2,
          projectName: "3901 - Fruit and Food Annotation",
          totalTasks: 200,
          completedTasks: 180,
          productivity: 90,
          utilization: 85,
        }
      ];
      setMonthlyProductivityData(mockProductivityData);
    } catch (error) {
      console.error("Error fetching monthly productivity data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle project selection modal
  const handleProjectSelect = () => {
    if (selectedProjectForModal) {
      fetchMonthlyProductivity();
      setShowProjectModal(false);
    }
  };

  // Fetch cumulative productivity data from backend
  const fetchCumulativeProductivity = async () => {
    try {
      setLoading(true);
      // Mock cumulative productivity data - replace with actual API call
      const mockCumulativeData = [
        {
          id: 1,
          projectName: "USA 434:ICD: Labelling",
          totalTasks: 500,
          completedTasks: 450,
          productivity: 90,
          utilization: 85,
          daywiseData: isDaywiseReport ? [
            { date: "2025-09-01", tasks: 50, completed: 45 },
            { date: "2025-09-02", tasks: 60, completed: 55 },
            { date: "2025-09-03", tasks: 70, completed: 65 },
          ] : null,
        },
        {
          id: 2,
          projectName: "ROW 441 Timestamping",
          totalTasks: 300,
          completedTasks: 280,
          productivity: 93,
          utilization: 88,
          daywiseData: isDaywiseReport ? [
            { date: "2025-09-01", tasks: 30, completed: 28 },
            { date: "2025-09-02", tasks: 35, completed: 33 },
            { date: "2025-09-03", tasks: 40, completed: 38 },
          ] : null,
        }
      ];
      setCumulativeProductivityData(mockCumulativeData);
    } catch (error) {
      console.error("Error fetching cumulative productivity data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users data for Users Status tab (same logic as Manage Users page)
  const fetchUsersData = async () => {
    try {
      setUsersLoading(true);
      console.log("=== ProjectStatusPage Users Status: Fetching users ===");
      console.log("Current user:", user?.email);
      
      // Determine user role
      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
      
      let response;
      
      if (isSuperAdmin) {
        // Super Admin: Use direct fetch to get ALL users in the system
        console.log("Super Admin: Fetching all users using direct API call");
        const baseUrl = window.location.origin;
        
        try {
          const queryParams = new URLSearchParams({
            page: '1',
            page_size: '1000',  // Get more users
            search: '',
            user_filter: 'All Users'
          });
          
          const apiUrl = `${baseUrl}/api/users/list_role_based/?${queryParams}`;
          console.log("Users Status API URL:", apiUrl);
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
          });
          
          if (apiResponse.ok) {
            response = await apiResponse.json();
            console.log("Direct API response:", response);
          } else {
            console.error("list_role_based API call failed:", apiResponse.status);
            // Fallback to regular users endpoint
            console.log("Falling back to regular users endpoint...");
            const fallbackResponse = await fetch(`${baseUrl}/api/users/`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              credentials: 'include',
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              // Transform the response to match expected format
              response = {
                results: fallbackData.results ? fallbackData.results.map(user => ({
                  user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    is_active: user.is_active,
                    created_by: user.created_by,
                    last_activity: user.last_activity,
                    date_joined: user.date_joined,
                  },
                  organization: {
                    id: 1,
                    title: 'All Users',
                  }
                })) : [],
                count: fallbackData.count || 0,
                page: fallbackData.page || 1,
                page_size: fallbackData.page_size || 1000,
                total_pages: fallbackData.total_pages || 1,
                user_role: 'super-admin',
                message: 'Users retrieved successfully (fallback)'
              };
              console.log("Fallback API response:", response);
            } else {
              throw new Error(`Fallback API call also failed: ${fallbackResponse.status}`);
            }
          }
        } catch (fetchError) {
          console.error("Error with direct API call:", fetchError);
          throw fetchError;
        }
      } else {
        // Regular users: Use memberships API (organization members only)
        console.log("Regular user: Fetching organization members from memberships");
        response = await api.callApi("memberships", {
        params: {
          pk: 1,
          contributed_to_projects: 1,
          page: 1,
            page_size: 1000, // Increased from 100 to 1000
        },
        include: [
          "id",
          "email", 
          "first_name",
          "last_name",
          "username",
          "created_by",
          "is_active"
        ],
      });
      }

      console.log("Users response:", response);
      console.log("Results count:", response?.results?.length);
      
      if (response && response.results) {
        setUsersData(response.results);
        console.log("Users loaded:", response.results.length);
      } else {
        console.warn("No users found in response");
        setUsersData([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsersData([]);
    } finally {
      setUsersLoading(false);
      console.log("=== ProjectStatusPage Users Status: User fetch completed ===");
    }
  };

  // Fetch user targets with their assigned projects
  const fetchUserTargetsWithProjects = async () => {
    try {
      setUsersLoading(true);
      console.log("=== ProjectStatusPage User Targets: Fetching users ===");
      console.log("Current user:", user?.email);
      
      // Determine user role
      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
      
      let usersResponse;
      
      if (isSuperAdmin) {
        // Super Admin: Use direct fetch to get ALL users in the system
        console.log("Super Admin: Fetching all users using direct API call");
        const baseUrl = window.location.origin;
        
        try {
          const queryParams = new URLSearchParams({
            page: '1',
            page_size: '1000',  // Get more users
            search: '',
            user_filter: 'All Users'
          });
          
          const apiUrl = `${baseUrl}/api/users/list_role_based/?${queryParams}`;
          console.log("User Targets API URL:", apiUrl);
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
          });
          
          if (apiResponse.ok) {
            usersResponse = await apiResponse.json();
            console.log("Direct API response for user targets:", usersResponse);
          } else {
            console.error("list_role_based API call failed:", apiResponse.status);
            // Fallback to regular users endpoint
            console.log("Falling back to regular users endpoint...");
            const fallbackResponse = await fetch(`${baseUrl}/api/users/`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              credentials: 'include',
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              // Transform the response to match expected format
              usersResponse = {
                results: fallbackData.results ? fallbackData.results.map(user => ({
                  user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    is_active: user.is_active,
                    created_by: user.created_by,
                    last_activity: user.last_activity,
                    date_joined: user.date_joined,
                  },
                  organization: {
                    id: 1,
                    title: 'All Users',
                  }
                })) : [],
                count: fallbackData.count || 0,
                page: fallbackData.page || 1,
                page_size: fallbackData.page_size || 1000,
                total_pages: fallbackData.total_pages || 1,
                user_role: 'super-admin',
                message: 'Users retrieved successfully (fallback)'
              };
              console.log("Fallback API response for user targets:", usersResponse);
            } else {
              throw new Error(`Fallback API call also failed: ${fallbackResponse.status}`);
            }
          }
        } catch (fetchError) {
          console.error("Error with direct API call for user targets:", fetchError);
          throw fetchError;
        }
      } else {
        // Regular users: Use memberships API (organization members only)
        console.log("Regular user: Fetching organization members for user targets");
        usersResponse = await api.callApi("memberships", {
        params: {
          pk: 1,
          contributed_to_projects: 1,
          page: 1,
            page_size: 1000, // Increased from 100 to 1000
        },
        include: [
          "id",
          "email", 
          "first_name",
          "last_name",
          "username",
          "created_by",
          "is_active"
        ],
      });
      }
      
      console.log("Users Target response:", usersResponse);
      if (usersResponse && usersResponse.results) {
        console.log("Users Target results:", usersResponse.results);
        // Load user project assignments from localStorage
        const assignments = JSON.parse(localStorage.getItem('userProjectAssignments') || '{}');
        const clientAssignments = JSON.parse(localStorage.getItem('clientUserAssignments') || '{}');
        
        // Determine current user role
        const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
        const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
        
        // Process users with their projects and targets
        const processedUsers = usersResponse.results.map((userData) => {
          const displayedUser = userData.user || userData; // Handle both data structures like Users Status
          
          console.log('DEBUG: userData:', userData);
          console.log('DEBUG: displayedUser:', displayedUser);
          
          // Apply strict role-based filtering for Users Target
          // - Super Admin: can see all
          // - Admin: only their own clients (users they created) and themselves
          // - Client: only themselves
          let shouldShow = false;
          if (isSuperAdmin) {
            shouldShow = true;
          } else if (isAdmin && user) {
            const isCreatedByThisAdmin = displayedUser.created_by === user.id;
            const isSelf = displayedUser.id === user.id;
            shouldShow = isCreatedByThisAdmin || isSelf;
          } else if (user) {
            shouldShow = displayedUser.id === user.id;
          }
          
          if (!shouldShow) return null;
          
          // Get user's assigned projects
          const userAssignments = assignments[displayedUser.id] || [];
          const userProjects = projects.filter(project => userAssignments.includes(project.id));
          
          // Get user target from localStorage (set from User Role Assignment page)
          const userTargets = JSON.parse(localStorage.getItem('userTargets') || '{}');
          const userTarget = userTargets[displayedUser.id] || null;
          
          return {
            user: displayedUser,
            projects: userProjects,
            target: userTarget,
            assignments: userAssignments
          };
        }).filter(Boolean);
        
        setUserTargetsWithProjects(processedUsers);
      }
    } catch (error) {
      console.error("Error fetching user targets with projects:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  // Function to refresh user project assignments
  const refreshUserProjectAssignments = () => {
    try {
      const saved = localStorage.getItem('userProjectAssignments');
      console.log('Refreshing userProjectAssignments from localStorage:', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('Parsed userProjectAssignments:', parsed);
        setUserProjectAssignments(parsed);
      } else {
        console.log('No userProjectAssignments found in localStorage');
        setUserProjectAssignments({});
      }
      
      // Also load client assignment tracking
      const clientSaved = localStorage.getItem('clientUserAssignments');
      console.log('Refreshing clientUserAssignments from localStorage:', clientSaved);
      if (clientSaved) {
        const clientParsed = JSON.parse(clientSaved);
        console.log('Parsed clientUserAssignments:', clientParsed);
        setClientUserAssignments(clientParsed);
      } else {
        console.log('No clientUserAssignments found in localStorage');
        setClientUserAssignments({});
      }
    } catch (error) {
      console.error('Error loading user project assignments:', error);
      setUserProjectAssignments({});
      setClientUserAssignments({});
    }
  };

  // Load user project assignments from localStorage
  useEffect(() => {
    refreshUserProjectAssignments();
    fetchClientIds();
    fetchUsers();
    loadBillingData();
  }, []);

  // Refresh assignments when user changes
  useEffect(() => {
    if (user?.id) {
      refreshUserProjectAssignments();
    }
  }, [user?.id]);

  // Fetch users data when Users Status tab is selected
  useEffect(() => {
    if (selectedMainTab === "Users Status") {
      fetchUsersData();
    }
  }, [selectedMainTab]);

  // Fetch user targets when Users Target tab is selected
  useEffect(() => {
    if (selectedMainTab === "Users Target") {
      fetchUserTargetsWithProjects();
    }
  }, [selectedMainTab, projects, userProjectAssignments]);

  // Toggle section expansion
  const toggleSection = (userId, sectionType) => {
    const key = `${userId}-${sectionType}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    fetchProjectStatus();
  }, [userProjectAssignments]); // Re-fetch when assignments change

  // Debug function to check project status filtering
  window.debugProjectStatus = () => {
    console.log("=== PROJECT STATUS DEBUG ===");
    console.log("Current user:", user);
    console.log("User assignments:", userProjectAssignments);
    console.log("All projects:", projects);
    console.log("Filtered projects:", filteredProjects);
    console.log("Projects created by user:", projects.filter(p => p.created_by?.id === user?.id));
    console.log("Projects assigned to user:", projects.filter(p => (userProjectAssignments[user?.id] || []).includes(p.id)));
    console.log("=== END PROJECT STATUS DEBUG ===");
    return {
      user,
      userProjectAssignments,
      projects,
      filteredProjects
    };
  };

  // Filter projects based on search term, active/archived status, and user role
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === "Active" ? !project.is_archived : project.is_archived;
    
    // Role-based filtering
    const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
    const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
    const isClient = !isAdmin;
    
    console.log('Project filtering debug:', {
      projectId: project.id,
      projectTitle: project.title,
      isAdmin: isAdmin,
      isClient: isClient,
      userId: user?.id,
      userEmail: user?.email,
      userProjectAssignments: userProjectAssignments
    });
    
    if (isClient && user) {
      // For client users, only show projects assigned to them
      const currentUserAssignments = userProjectAssignments[user.id] || [];
      const isProjectAssignedToUser = currentUserAssignments.includes(project.id);
      
      // Debug logging
      console.log('Client filtering debug:', {
        userId: user.id,
        userEmail: user.email,
        projectId: project.id,
        projectTitle: project.title,
        userAssignments: currentUserAssignments,
        isProjectAssignedToUser: isProjectAssignedToUser,
        allAssignments: userProjectAssignments
      });
      
      return matchesSearch && matchesStatus && isProjectAssignedToUser;
    }
    
    if (isAdmin && !isSuperAdmin && user) {
      // For Admin users (not Super Admin), show projects they created AND projects assigned to them
      const currentUserAssignments = userProjectAssignments[user.id] || [];
      const isProjectCreatedByAdmin = project.created_by?.id === user.id;
      const isProjectAssignedToAdmin = currentUserAssignments.includes(project.id);
      
      console.log('Admin filtering debug:', {
        userId: user.id,
        userEmail: user.email,
        projectId: project.id,
        projectTitle: project.title,
        projectCreatedBy: project.created_by?.id,
        isProjectCreatedByAdmin: isProjectCreatedByAdmin,
        isProjectAssignedToAdmin: isProjectAssignedToAdmin,
        userAssignments: currentUserAssignments
      });
      
      return matchesSearch && matchesStatus && (isProjectCreatedByAdmin || isProjectAssignedToAdmin);
    }
    
    // For Super Admin users, show all projects
    return matchesSearch && matchesStatus;
  });

  // Calculate project statistics
  const calculateProjectStats = (project) => {
    const total = project.task_number || 0;
    const annotations = project.total_annotations_number || 0;
    const finishedTasks = project.finished_task_number || 0;
    
    // Count users assigned to this project by the current client only
    let assignedUsersCount = 0;
    
    // Determine if current user is admin or client
    const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
    const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
    
    if (isSuperAdmin) {
      // For Super Admin: count all users assigned to this project
      Object.keys(userProjectAssignments).forEach(userId => {
        const userAssignments = userProjectAssignments[userId] || [];
        if (userAssignments.includes(project.id)) {
          assignedUsersCount++;
        }
      });
    } else if (isAdmin) {
      // For Admin: count only users they created who are assigned to this project
      Object.keys(userProjectAssignments).forEach(userId => {
        const userAssignments = userProjectAssignments[userId] || [];
        if (userAssignments.includes(project.id)) {
          // Check if this user was created by the current admin
          const userItem = availableUsers.find(u => u.id.toString() === userId);
          if (userItem && (userItem.created_by === user?.id || userItem.id === user?.id)) {
            assignedUsersCount++;
          }
        }
      });
      
      // Add project creator to user count if not already counted and if they created this project
      if (project.created_by && project.created_by.id === user?.id && !Object.keys(userProjectAssignments).some(userId => {
        const userAssignments = userProjectAssignments[userId] || [];
        return userAssignments.includes(project.id) && userId === project.created_by.id.toString();
      })) {
        assignedUsersCount++;
      }
    } else {
      // For client: count only users assigned by this client to this project
      if (user && clientUserAssignments[user.id]) {
        const clientProjectAssignments = clientUserAssignments[user.id] || {};
        const usersAssignedByThisClient = clientProjectAssignments[project.id] || [];
        assignedUsersCount = usersAssignedByThisClient.length;
      }
    }
    
    // Determine project status based on annotations and completion
    let active = 0;
    let pending = 0;
    let complete = 0;
    let completePercentage = 0;
    
    if (total === 0) {
      // New project with no tasks
      active = 1;
      pending = 0;
      complete = 0;
      completePercentage = 0;
    } else {
      // Calculate actual completed and pending tasks
      complete = finishedTasks || 0; // Tasks with annotations
      pending = Math.max(0, total - complete); // Remaining tasks
      
      if (complete === 0) {
        // No tasks completed yet
        active = 1;
        completePercentage = 0;
      } else if (complete === total) {
        // All tasks completed
        active = 0;
        completePercentage = 100;
      } else {
        // Some tasks completed, some pending
        active = 0;
        completePercentage = Math.round((complete / total) * 100);
      }
    }

    const batches = project.batches?.length || 1;

    return {
      total,
      pending,
      complete,
      active,
      completePercentage,
      users: assignedUsersCount,
      batches
    };
  };

  return (
    <div style={{
      backgroundColor: "#ffffff",
      minHeight: "100vh",
      padding: "24px",
    }}>
      {/* Top Navigation Bar */}
      <TopNavigationBar />
      
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f3f4f6";
              e.currentTarget.style.color = "#374151";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#6b7280";
            }}
          >
            <IconChevronLeft style={{ width: "20px", height: "20px" }} />
          </button>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1f2937",
            margin: 0,
          }}>
            Project Status
          </h1>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: "flex",
        gap: "32px",
        marginBottom: "24px",
        borderBottom: "1px solid #e5e7eb",
      }}>
        {(() => {
          const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
          const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
          
          if (isAdmin) {
            // Admin/Superadmin users don't see Subscription tab
            return ["Project Status", "Users Status", "Users Target", "Billing Report", "Billing Report Status"].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedMainTab(tab)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontSize: "14px",
                  fontWeight: tab === selectedMainTab ? "600" : "500",
                  color: tab === selectedMainTab ? "#7c3aed" : "#6b7280",
                  cursor: "pointer",
                  borderBottom: tab === selectedMainTab ? "2px solid #7c3aed" : "2px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (tab !== selectedMainTab) {
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseLeave={(e) => {
                  if (tab !== selectedMainTab) {
                    e.currentTarget.style.color = "#6b7280";
                  }
                }}
              >
                {tab}
              </button>
            ));
          } else {
            // Client users see Subscription tab
            return ["Project Status", "Users Status", "Users Target", "Subscription", "Billing Report", "Billing Report Status"].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedMainTab(tab)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontSize: "14px",
                  fontWeight: tab === selectedMainTab ? "600" : "500",
                  color: tab === selectedMainTab ? "#7c3aed" : "#6b7280",
                  cursor: "pointer",
                  borderBottom: tab === selectedMainTab ? "2px solid #7c3aed" : "2px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (tab !== selectedMainTab) {
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseLeave={(e) => {
                  if (tab !== selectedMainTab) {
                    e.currentTarget.style.color = "#6b7280";
                  }
                }}
              >
                {tab}
              </button>
            ));
          }
        })()}
      </div>


      {/* Search and Actions Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
      }}>
        {/* Left side - Search */}
        <div style={{
          position: "relative",
          width: "300px",
          }}>
            <IconSearch style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              color: "#9ca3af",
            }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 40px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                backgroundColor: "#ffffff",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

        {/* Action Buttons */}
      </div>

      {/* Content Tabs */}
      <div style={{
        display: "flex",
        gap: "32px",
        marginBottom: "24px",
        borderBottom: "1px solid #e5e7eb",
      }}>
        {selectedMainTab === "Users Status" ? (
          ["Task"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedSubTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "12px 0",
                fontSize: "14px",
                fontWeight: selectedSubTab === tab ? "600" : "500",
                color: selectedSubTab === tab ? "#7c3aed" : "#6b7280",
                cursor: "pointer",
                borderBottom: selectedSubTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedSubTab !== tab) {
                  e.currentTarget.style.color = "#374151";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSubTab !== tab) {
                  e.currentTarget.style.color = "#6b7280";
                }
              }}
            >
              {tab}
            </button>
          ))
        ) : selectedMainTab === "Users Target" ? (
          ["User Targets", "Transactions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedSubTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "12px 0",
                fontSize: "14px",
                fontWeight: selectedSubTab === tab ? "600" : "500",
                color: selectedSubTab === tab ? "#7c3aed" : "#6b7280",
                cursor: "pointer",
                borderBottom: selectedSubTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedSubTab !== tab) {
                  e.currentTarget.style.color = "#374151";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSubTab !== tab) {
                  e.currentTarget.style.color = "#6b7280";
                }
              }}
            >
              {tab}
            </button>
          ))
        ) : (
          ["Active"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "12px 0",
                fontSize: "14px",
                fontWeight: activeTab === tab ? "600" : "500",
                color: activeTab === tab ? "#7c3aed" : "#6b7280",
                cursor: "pointer",
                borderBottom: activeTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.color = "#374151";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.color = "#6b7280";
                }
              }}
            >
              {tab}
            </button>
          ))
        )}
      </div>


      {/* Projects Table */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        {/* Table Header - Only for Project Status */}
        {selectedMainTab === "Project Status" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 80px 80px 80px 80px 120px 80px",
            gap: "16px",
            padding: "16px 20px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "12px",
            fontWeight: "600",
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            <div>Project</div>
            <div>Process</div>
            <div style={{ textAlign: "right" }}>Total Task</div>
            <div style={{ textAlign: "right" }}>Pending</div>
            <div style={{ textAlign: "right" }}>Complete</div>
            <div style={{ textAlign: "right" }}>Active</div>
            <div style={{ textAlign: "right" }}>Complete Percentage</div>
            <div style={{ textAlign: "right" }}>Users</div>
          </div>
        )}

        {/* Table Body */}
        <div>
          {loading ? (
            <div style={{
              padding: "40px",
              textAlign: "center",
              color: "#6b7280",
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                border: "2px solid #e5e7eb",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }} />
              Loading project data...
            </div>
          ) : selectedMainTab === "Users Status" ? (
            <div style={{
              padding: "20px",
            }}>
              {/* Users Status Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px"
              }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  margin: "0"
                }}>All Users Work Status</h2>
              </div>

              {/* Users List */}
              <div style={{
                marginTop: "20px"
              }}>
                {usersLoading ? (
                  <div style={{
              textAlign: "center",
              color: "#6b7280",
                    fontSize: "14px",
                    padding: "20px 0"
                  }}>
                    Loading users...
                  </div>
                ) : usersData.length > 0 ? (
                  <div style={{
                    display: "grid",
                    gap: "6px"
                  }}>
                    {usersData.filter((userData) => {
                      const displayedUser = userData.user || userData;
                      
                      // Determine current logged-in user's role
                      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
                      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
                      const isClient = !isAdmin;
                      
                      if (isClient && user) {
                        // Client sees users they created (including themselves) - same as AssignRole page
                        const isCreatedByClient = displayedUser.created_by === user.id;
                        const isClientSelf = displayedUser.id === user.id;
                        
                        return isCreatedByClient || isClientSelf;
                      }
                      
                      if (isAdmin && !isSuperAdmin && user) {
                        // Admin sees only users they created (including themselves)
                        const isCreatedByAdmin = displayedUser.created_by === user.id;
                        const isAdminSelf = displayedUser.id === user.id;
                        
                        return isCreatedByAdmin || isAdminSelf;
                      }
                      
                      // Super Admin sees all users
                      return true;
                    }).filter((userData) => {
                      // Apply search filter
                      if (!searchTerm) return true;
                      
                      const displayedUser = userData.user || userData;
                      const searchLower = searchTerm.toLowerCase();
                      
                      return displayedUser.username?.toLowerCase().includes(searchLower) ||
                             displayedUser.email?.toLowerCase().includes(searchLower) ||
                             displayedUser.first_name?.toLowerCase().includes(searchLower) ||
                             displayedUser.last_name?.toLowerCase().includes(searchLower);
                    }).map((userData) => {
                      const user = userData.user || userData; // Handle both data structures
                      const isProjectsExpanded = expandedSections[`${user.id}-projects`];
                      const userAssignments = userProjectAssignments[user.id] || [];
                      
                      // Filter projects based on user role
                      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
                      const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
                      
                      let userProjects = [];
                      if (isSuperAdmin) {
                        // Super Admin sees all projects assigned to users
                        userProjects = projects.filter(project => userAssignments.includes(project.id));
                      } else if (isAdmin) {
                        // Admin sees only projects they created that are assigned to users
                        userProjects = projects.filter(project => 
                          userAssignments.includes(project.id) && project.created_by?.id === user?.id
                        );
                      } else {
                        // Client sees all projects assigned to users
                        userProjects = projects.filter(project => userAssignments.includes(project.id));
                      }

                      return (
                        <div key={`user-${user.id}`} style={{
                          padding: "8px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          background: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.2s ease",
                          marginBottom: "4px"
                        }}>
                          {/* User Header */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "8px"
                          }}>
                            {/* User Info */}
                            <div style={{
                              flex: 1,
                              minWidth: 0
                            }}>
                              <div style={{
                                fontSize: "16px",
                                fontWeight: "600",
                                color: "#1a1a1a",
                                marginBottom: "4px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}>
                                {user.email}
                              </div>
                              <div style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}>
                                <span>📅</span>
                                {user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-GB') : 
                                 user.last_activity ? new Date(user.last_activity).toLocaleDateString('en-GB') : 
                                 'Date not available'}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{
                              display: "flex",
                              gap: "10px",
                              justifyContent: "center",
                              flex: 1
                            }}>
                              {/* Projects Button */}
                              <button
                                onClick={() => toggleSection(user.id, 'projects')}
                                style={{
                                  padding: "6px 8px",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  background: isProjectsExpanded ? "rgb(25, 44, 89)" : "#f9fafb",
                                  color: isProjectsExpanded ? "white" : "black",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  outline: "none",
                                  borderColor: "#e5e7eb",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                Projects ({userProjects.length})
                              </button>
                            </div>

                            {/* Status */}
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flex: 0.5,
                              justifyContent: "flex-end"
                            }}>
                              <span style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#1a1a1a"
                              }}>Status: Active</span>
                              <div style={{
                                width: "8px",
                                height: "8px",
                                backgroundColor: "#10b981",
                                borderRadius: "50%"
                              }}></div>
                            </div>
                          </div>

                          {/* Expanded Projects Section */}
                          {isProjectsExpanded && (
                            <div style={{
                              marginTop: "12px",
                              padding: "12px",
                              backgroundColor: "#f9fafb",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb"
                            }}>
                              <h4 style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#1a1a1a",
                                marginBottom: "8px"
                              }}>Assigned Projects:</h4>
                              {userProjects.length > 0 ? (
                                <div style={{
                                  display: "grid",
                                  gap: "8px"
                                }}>
                                  {userProjects.map((project) => (
                                    <div key={project.id} style={{
                                      padding: "8px",
                                      backgroundColor: "white",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: "6px",
                                      fontSize: "12px"
                                    }}>
                                      <div style={{ fontWeight: "500", color: "#1a1a1a" }}>
                                        {project.title}
                                      </div>
                                      <div style={{ color: "#6b7280", marginTop: "2px" }}>
                                        Tasks: {project.task_number || 0} | Completed: {project.finished_task_number || 0}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{
                                  color: "#6b7280",
                                  fontSize: "12px",
                                  fontStyle: "italic"
                                }}>
                                  No projects assigned
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "14px",
                    padding: "20px 0"
                  }}>
                    No users found
                  </div>
                )}
              </div>
            </div>
          ) : selectedMainTab === "Users Target" ? (
            <div style={{
              padding: "20px",
            }}>
              {/* Users Target Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px"
              }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  margin: "0"
                }}>User Targets & Assigned Projects</h2>
              </div>

              {/* Users Target Table */}
              <div style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
              }}>
              <div style={{
                display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr",
                gap: "16px",
                padding: "16px",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: "600",
                fontSize: "14px",
                color: "#374151",
              }}>
                  <div>User</div>
                  <div>Assigned Projects</div>
                  <div style={{ textAlign: "center" }}>Target Status</div>
                  <div style={{ textAlign: "center" }}>Target Value</div>
              </div>
              
                {usersLoading ? (
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "14px",
                    padding: "40px 0"
                  }}>
                    Loading user targets...
                  </div>
                ) : userTargetsWithProjects.length > 0 ? (
                  userTargetsWithProjects.filter((userData) => {
                    // Apply search filter
                    if (!searchTerm) return true;
                    
                    const displayedUser = userData.user;
                    const searchLower = searchTerm.toLowerCase();
                    
                    return displayedUser.username?.toLowerCase().includes(searchLower) ||
                           displayedUser.email?.toLowerCase().includes(searchLower) ||
                           displayedUser.first_name?.toLowerCase().includes(searchLower) ||
                           displayedUser.last_name?.toLowerCase().includes(searchLower);
                  }).map((userData, index) => (
                    <div
                      key={userData.user.id}
                  style={{
                    display: "grid",
                        gridTemplateColumns: "2fr 1.5fr 1fr 1fr",
                    gap: "16px",
                    padding: "16px",
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                      {/* User Info */}
                      <div>
                        <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                          {userData.user.first_name && userData.user.last_name 
                            ? `${userData.user.first_name} ${userData.user.last_name}`
                            : userData.user.username || userData.user.email || 'Unknown User'
                          }
                </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {userData.user.email || 'No email'}
                        </div>
                      </div>
                      
                      {/* Assigned Projects */}
                      <div>
                        {userData.projects.length > 0 ? (
                          <div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                              {userData.projects.length} project(s) assigned
                            </div>
                            <div style={{ fontSize: "12px" }}>
                              {userData.projects.slice(0, 2).map(project => project.title).join(", ")}
                              {userData.projects.length > 2 && ` +${userData.projects.length - 2} more`}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            No projects assigned
                          </div>
                        )}
                      </div>
                      
                      {/* Target Status */}
                      <div style={{ textAlign: "center" }}>
                        {userData.target ? (
                          <span style={{
                            backgroundColor: "#10b981",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}>
                            Set
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: "#6b7280",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}>
                            Not Set
                          </span>
                        )}
                      </div>
                      
                      {/* Target Value */}
                      <div style={{ textAlign: "center" }}>
                        {userData.target ? (
                          <div style={{ color: "#3b82f6", fontWeight: "500" }}>
                            {userData.target}
                          </div>
                        ) : (
                          <div style={{ color: "#6b7280" }}>
                            -
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "14px",
                    padding: "40px 0"
                  }}>
                    No user targets found
                  </div>
                )}
              </div>
            </div>
          ) : selectedMainTab === "Billing Report" ? (
            <div style={{
              padding: "20px",
            }}>
              {/* Billing Form */}
              <div style={{
                backgroundColor: "#f8fafc",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Add Billing Entry
                </h3>
                
              <div style={{
                display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                  gap: "16px",
                  alignItems: "end"
                }}>
                  {/* Client ID Display */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "4px"
                    }}>
                      Client ID
                    </label>
                    <div style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      backgroundColor: "#f9fafb",
                      color: "#374151",
                      fontWeight: "500"
                    }}>
                      {user?.first_name && user?.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user?.email || 'Current User'
                      } ({user?.email || 'No email'})
                    </div>
                  </div>

                  {/* User ID Dropdown */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "4px"
                    }}>
                      User ID
                    </label>
                    <select
                      value={billingForm.userId}
                      onChange={(e) => setBillingForm(prev => ({ ...prev, userId: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        backgroundColor: "#ffffff"
                      }}
                    >
                      <option value="">Select User</option>
                      {filteredUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hours Input */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "4px"
                    }}>
                      Number of Hours
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={billingForm.hours}
                      onChange={(e) => setBillingForm(prev => ({ ...prev, hours: e.target.value }))}
                      placeholder="0.0"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px"
                      }}
                    />
                  </div>

                  {/* Rate Input */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "4px"
                    }}>
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={billingForm.rate}
                      onChange={(e) => setBillingForm(prev => ({ ...prev, rate: e.target.value }))}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px"
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      onClick={handleBillingSubmit}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#7c3aed",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "background-color 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#6d28d9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#7c3aed";
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : selectedMainTab === "Billing Report Status" ? (
            <div style={{
              padding: "20px",
            }}>
              {/* Header with Clear All Button */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px"
              }}>
                <h3 style={{
                  margin: "0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Billing Entries ({filteredBillingData.length})
                </h3>
                {filteredBillingData.length > 0 && (
                  <button
                    onClick={clearAllBillingData}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#b91c1c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#dc2626";
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Billing Report Status Table */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr 1fr auto",
                gap: "16px",
                padding: "16px",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: "600",
                fontSize: "14px",
                color: "#374151",
              }}>
                <div>Client ID</div>
                <div>User ID</div>
                <div style={{ textAlign: "right" }}>Number of Hours</div>
                <div style={{ textAlign: "right" }}>Rate (₹)</div>
                <div style={{ textAlign: "right" }}>Total (₹)</div>
                <div style={{ textAlign: "right" }}>Subscription Months</div>
                <div style={{ textAlign: "center" }}>Action</div>
              </div>
              
              {filteredBillingData.length > 0 ? (
                filteredBillingData.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                      gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr 1fr auto",
                    gap: "16px",
                    padding: "16px",
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                    <div>{item.clientId}</div>
                    <div style={{ fontWeight: "500" }}>{item.userId}</div>
                    <div style={{ textAlign: "right", color: "#3b82f6" }}>{item.hours}</div>
                    <div style={{ textAlign: "right", color: "#3b82f6" }}>₹{item.rate.toFixed(2)}</div>
                    <div style={{ textAlign: "right", color: "#059669", fontWeight: "600" }}>₹{item.total.toFixed(2)}</div>
                    <div style={{ textAlign: "right", color: "#7c3aed", fontWeight: "500" }}>
                      {item.subscriptionMonths ? `${item.subscriptionMonths} months` : '-'}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <button
                        onClick={() => deleteBillingEntry(item.id)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#b91c1c";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#dc2626";
                        }}
                      >
                        Delete
                      </button>
                </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "14px",
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  No billing entries found. Add entries using the Billing Report tab.
                </div>
              )}
            </div>
          ) : selectedMainTab === "Subscription" ? (
            <div style={{
              padding: "20px",
            }}>
              {/* Subscription Form */}
              <div style={{
                backgroundColor: "#f8fafc",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Add Subscription Entry
                </h3>
                
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px"
                }}>
                  {/* Submit Button */}
                  <div style={{
                    display: "flex",
                    justifyContent: "flex-end"
                  }}>
                    <button
                      onClick={handleSubscriptionSubmit}
                      style={{
                        padding: "12px 24px",
                        backgroundColor: "#7c3aed",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "background-color 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#6d28d9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#7c3aed";
                      }}
                    >
                      Submit Subscription
                    </button>
                  </div>

                  {/* Subscription Plan Selection */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "12px"
                    }}>
                      Select Subscription Plan
                    </label>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "16px"
                    }}>
                      {subscriptionPlans.map((plan, index) => (
                        <div
                          key={plan.id}
                          onClick={() => setSubscriptionForm(prev => ({ ...prev, subscriptionPlan: plan.id }))}
                          style={{
                            backgroundColor: "#1f2937",
                            border: subscriptionForm.subscriptionPlan === plan.id ? "2px solid #7c3aed" : "1px solid #374151",
                            borderRadius: "8px",
                            padding: "16px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            position: "relative",
                            minHeight: "280px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#7c3aed";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            if (subscriptionForm.subscriptionPlan !== plan.id) {
                              e.currentTarget.style.borderColor = "#374151";
                            }
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {/* Most Popular Badge */}
                          {index === 1 && (
                            <div style={{
                              position: "absolute",
                              top: "-8px",
                              left: "50%",
                              transform: "translateX(-50%)",
                              backgroundColor: "#7c3aed",
                              color: "#ffffff",
                              padding: "4px 16px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              Most Popular
                            </div>
                          )}

                          {/* Plan Header */}
                          <div>
                            <h3 style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "#ffffff",
                              margin: "0 0 6px 0"
                            }}>
                              {plan.name}
                            </h3>
                            <div style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              color: "#ffffff",
                              marginBottom: "6px"
                            }}>
                              {plan.price}
                            </div>
                            <p style={{
                              fontSize: "12px",
                              color: "#9ca3af",
                              margin: "0 0 12px 0",
                              lineHeight: "1.4"
                            }}>
                              {plan.id === "starter" && "Advanced TOAI Studio with team collaboration"}
                              {plan.id === "professional" && "Professional TOAI Studio with advanced features"}
                              {plan.id === "enterprise" && "Full TOAI Studio with custom integrations"}
                            </p>
                          </div>

                          {/* Features List */}
                          <div style={{ flex: 1 }}>
                            {plan.id === "starter" && (
                              <ul style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0
                              }}>
                                {["Advanced labeling tools", "Up to 20 projects", "Team collaboration", "Priority support", "Custom templates", "Data export"].map((feature, idx) => (
                                  <li key={idx} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "6px",
                                    fontSize: "12px",
                                    color: "#ffffff"
                                  }}>
                                    <span style={{ color: "#10b981", marginRight: "6px" }}>✓</span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {plan.id === "professional" && (
                              <ul style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0
                              }}>
                                {["Premium labeling tools", "Up to 50 projects", "Advanced analytics", "Priority support", "Custom workflows", "API access", "Data visualization"].map((feature, idx) => (
                                  <li key={idx} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "6px",
                                    fontSize: "12px",
                                    color: "#ffffff"
                                  }}>
                                    <span style={{ color: "#10b981", marginRight: "6px" }}>✓</span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {plan.id === "enterprise" && (
                              <ul style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0
                              }}>
                                {["Unlimited projects", "Advanced analytics", "Custom integrations", "24/7 support", "White-labeling", "API access", "On-premise deployment"].map((feature, idx) => (
                                  <li key={idx} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "6px",
                                    fontSize: "12px",
                                    color: "#ffffff"
                                  }}>
                                    <span style={{ color: "#10b981", marginRight: "6px" }}>✓</span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Selection Indicator */}
                          {subscriptionForm.subscriptionPlan === plan.id && (
                            <div style={{
                              position: "absolute",
                              top: "16px",
                              right: "16px",
                              width: "24px",
                              height: "24px",
                              backgroundColor: "#7c3aed",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <span style={{ color: "#ffffff", fontSize: "16px" }}>✓</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{
              padding: "40px",
              textAlign: "center",
              color: "#6b7280",
            }}>
              No projects found
            </div>
          ) : (
            filteredProjects.map((project, index) => {
              const stats = calculateProjectStats(project);
              return (
                <div
                  key={project.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.5fr 80px 80px 80px 80px 120px 80px",
                    gap: "16px",
                    padding: "16px 20px",
                    borderBottom: index < filteredProjects.length - 1 ? "1px solid #f3f4f6" : "none",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  {/* Project */}
                  <div style={{
                    fontWeight: "500",
                    color: "#1f2937",
                  }}>
                    {project.title || `Project ${project.id}`}
                  </div>

                  {/* Process */}
                  <div style={{
                    color: "#6b7280",
                  }}>
                    {project.description || "Text Annotation"}
                  </div>

                  {/* Total */}
                  <div style={{
                    textAlign: "right",
                    color: "#3b82f6",
                    fontWeight: "500",
                  }}>
                    {stats.total}
                  </div>

                  {/* Pending */}
                  <div 
                    style={{
                    textAlign: "right",
                    color: "#3b82f6",
                    fontWeight: "500",
                    }}
                  >
                    {stats.pending}
                  </div>

                  {/* Complete */}
                  <div 
                    style={{
                    textAlign: "right",
                    color: "#3b82f6",
                    fontWeight: "500",
                    }}
                  >
                    {stats.complete}
                  </div>

                  {/* Active */}
                  <div style={{
                    textAlign: "right",
                    color: "#3b82f6",
                    fontWeight: "500",
                  }}>
                    {stats.active}
                  </div>

                  {/* Complete Percentage */}
                  <div style={{
                    textAlign: "right",
                    color: "#3b82f6",
                    fontWeight: "500",
                  }}>
                    {stats.completePercentage}%
                  </div>

                  {/* Users */}
                  <div 
                    onClick={() => fetchProjectUsers(project.id, project.title || `Project ${project.id}`)}
                    style={{
                    textAlign: "right",
                      color: "#3b82f6",
                      cursor: "pointer",
                      fontWeight: "500",
                      textDecoration: "underline",
                    }}
                    title="Click to view assigned users"
                  >
                    {stats.users} USER{stats.users !== 1 ? 'S' : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Project Selection Modal */}
      {showProjectModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "24px",
            width: "400px",
            maxHeight: "80vh",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#374151",
                margin: 0,
              }}>
                Select Project and Date
              </h3>
              <div style={{
                display: "flex",
                gap: "8px",
              }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <IconRefresh style={{ width: "16px", height: "16px", color: "#6b7280" }} />
                </button>
                <button
                  onClick={() => setShowProjectModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <IconClose style={{ width: "16px", height: "16px", color: "#6b7280" }} />
                </button>
              </div>
            </div>

            {/* Project Selection */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "8px",
              }}>
                Project name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={selectedProjectForModal}
                  onChange={(e) => setSelectedProjectForModal(e.target.value)}
                  placeholder="Select project..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "2px solid #3b82f6",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "#ffffff",
                  }}
                />
                <div style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}>
                  <IconChevronDown style={{ width: "16px", height: "16px", color: "#6b7280" }} />
                </div>
              </div>
              
              {/* Project Dropdown */}
              <div style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                marginTop: "4px",
                backgroundColor: "#ffffff",
              }}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectForModal(project.title)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#374151",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {project.id} - {project.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Month and Year Selection */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "8px",
              }}>
                Month and Year
              </label>
              <input
                type="text"
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>

            {/* OK Button */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={handleProjectSelect}
                disabled={!selectedProjectForModal}
                style={{
                  padding: "10px 20px",
                  backgroundColor: selectedProjectForModal ? "#6b7280" : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: selectedProjectForModal ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (selectedProjectForModal) {
                    e.currentTarget.style.backgroundColor = "#4b5563";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedProjectForModal) {
                    e.currentTarget.style.backgroundColor = "#6b7280";
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            width: "500px",
            maxHeight: "600px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            padding: "20px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              paddingBottom: "12px",
              borderBottom: "1px solid #e5e7eb",
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
              }}>
                Users assigned to "{selectedProjectTitle}"
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconClose />
              </button>
            </div>

            {/* User List */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: "8px",
            }}>
              {selectedProjectUsers.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  color: "#6b7280",
                  padding: "40px 20px",
                }}>
                  No users assigned to this project
                </div>
              ) : (
                selectedProjectUsers.map((user, index) => (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: index < selectedProjectUsers.length - 1 ? "1px solid #f3f4f6" : "none",
                      borderRadius: "8px",
                      marginBottom: index < selectedProjectUsers.length - 1 ? "8px" : "0",
                    }}
                  >
                    {/* User Avatar */}
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: "16px",
                      marginRight: "12px",
                    }}>
                      {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>

                    {/* User Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: "500",
                        color: "#1f2937",
                        fontSize: "14px",
                        marginBottom: "2px",
                      }}>
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.email
                        }
                      </div>
                      <div style={{
                        color: "#6b7280",
                        fontSize: "12px",
                      }}>
                        {user.email}
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div style={{
                      background: "#f3f4f6",
                      color: "#374151",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}>
                      {user.id === projects.find(p => p.title === selectedProjectTitle)?.created_by?.id ? "Creator" : "User"}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              paddingTop: "16px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "800px",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}>
            {/* Header */}
            <div style={{
              padding: "24px 24px 16px 24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: 0,
                  marginBottom: "4px",
                }}>
                  {selectedTaskType === "completed" ? "Completed Tasks" : "Pending Tasks"}
                </h2>
                <p style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                }}>
                  Project: {selectedProjectForTasks?.title}
                </p>
              </div>
              <button
                onClick={() => setShowTaskModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                  e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <IconClose style={{ width: "20px", height: "20px" }} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "0 24px",
            }}>
              {tasksLoading ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "#6b7280",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid #e5e7eb",
                      borderTop: "2px solid #3b82f6",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }} />
                    Loading tasks...
                  </div>
                </div>
              ) : tasksData.length === 0 ? (
                <div style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#6b7280",
                }}>
                  <div style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    marginBottom: "8px",
                  }}>
                    No {selectedTaskType} tasks found
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "#9ca3af",
                  }}>
                    This project has no {selectedTaskType} tasks at the moment.
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "16px 0",
                }}>
                  {/* Tasks Table */}
                  <div style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}>
                    {/* Table Header */}
                    <div style={{
                      backgroundColor: "#f9fafb",
                      padding: "12px 16px",
                      borderBottom: "1px solid #e5e7eb",
                      display: "grid",
                      gridTemplateColumns: "80px 120px 1fr 100px 100px",
                      gap: "16px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      <div>ID</div>
                      <div>Image</div>
                      <div>Task Data</div>
                      <div>Status</div>
                      <div>Date</div>
                    </div>

                    {/* Table Body */}
                    {tasksData.map((task, index) => {
                      // Determine task status
                      const hasAnnotations = (task.annotations && task.annotations.length > 0) || 
                                           (task.annotations_count && task.annotations_count > 0) ||
                                           (task.annotations_results && task.annotations_results.length > 0);
                      const status = hasAnnotations ? "Completed" : "Pending";
                      const statusColor = hasAnnotations ? "#10b981" : "#f59e0b";
                      
                      // Extract image URL from task data
                      let imageUrl = null;
                      if (task.data) {
                        if (typeof task.data === 'string') {
                          try {
                            const parsedData = JSON.parse(task.data);
                            imageUrl = parsedData.image || parsedData.url || parsedData.src;
                          } catch (e) {
                            // If not JSON, check if it's a direct URL
                            if (task.data.startsWith('http')) {
                              imageUrl = task.data;
                            }
                          }
                        } else if (typeof task.data === 'object') {
                          imageUrl = task.data.image || task.data.url || task.data.src;
                        }
                      }
                      
                      return (
                        <div
                          key={task.id}
                          style={{
                            padding: "16px",
                            borderBottom: index < tasksData.length - 1 ? "1px solid #f3f4f6" : "none",
                            display: "grid",
                            gridTemplateColumns: "80px 120px 1fr 100px 100px",
                            gap: "16px",
                            alignItems: "center",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          {/* Task ID */}
                          <div style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#1f2937",
                          }}>
                            {task.id}
                          </div>

                          {/* Task Image */}
                          <div style={{
                            width: "100px",
                            height: "60px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            backgroundColor: "#f3f4f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`Task ${task.id}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div style={{
                              display: imageUrl ? "none" : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              color: "#9ca3af",
                              width: "100%",
                              height: "100%",
                            }}>
                              No Image
                            </div>
                          </div>

                          {/* Task Data */}
                          <div style={{
                            fontSize: "14px",
                            color: "#374151",
                            wordBreak: "break-word",
                          }}>
                            {task.data ? (
                              typeof task.data === 'string' ? 
                                task.data.substring(0, 80) + (task.data.length > 80 ? '...' : '') :
                                JSON.stringify(task.data).substring(0, 80) + (JSON.stringify(task.data).length > 80 ? '...' : '')
                            ) : 'No data'}
                          </div>

                          {/* Status */}
                          <div style={{
                            fontSize: "12px",
                            fontWeight: "500",
                            color: statusColor,
                            backgroundColor: statusColor === "#10b981" ? "#d1fae5" : "#fef3c7",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            textAlign: "center",
                          }}>
                            {status}
                          </div>

                          {/* Date */}
                          <div style={{
                            fontSize: "12px",
                            color: "#6b7280",
                          }}>
                            {task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB') : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              borderRadius: "0 0 12px 12px",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{
                  fontSize: "14px",
                  color: "#6b7280",
                }}>
                  {tasksData.length} {selectedTaskType} task{tasksData.length !== 1 ? 's' : ''} found
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* CSS for spinner animation */}
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

