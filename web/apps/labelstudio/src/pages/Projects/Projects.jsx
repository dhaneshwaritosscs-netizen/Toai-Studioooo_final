import React, { useState, useEffect } from "react";
import { useParams as useRouterParams } from "react-router";
import { Redirect } from "react-router-dom";
import { Button } from "../../components";
import { Oneof } from "../../components/Oneof/Oneof";
import { ApiContext } from "../../providers/ApiProvider";
import { useContextProps } from "../../providers/RoutesProvider";
import { useUserRoles } from "../../hooks/useUserRoles";
import { useCurrentUser } from "../../providers/CurrentUser";
import { Block, Elem } from "../../utils/bem";
import { CreateProject } from "../CreateProject/CreateProject";
import { DataManagerPage } from "../DataManager/DataManager";
import { SettingsPage } from "../Settings";
import "./Projects.scss";
import { EmptyProjectsList, ProjectsList } from "./ProjectsList";
import { useAbortController } from "@humansignal/core";

const getCurrentPage = () => {
  const pageNumberFromURL = new URLSearchParams(location.search).get("page");

  return pageNumberFromURL ? Number.parseInt(pageNumberFromURL) : 1;
};

export const ProjectsPage = () => {
  const api = React.useContext(ApiContext);
  const abortController = useAbortController();
  const { hasRole, userRoles, loadingRoles } = useUserRoles();
  const { user: currentUser } = useCurrentUser();
  const [projectsList, setProjectsList] = React.useState([]);
  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const [totalItems, setTotalItems] = useState(1);
  const [userProjectAssignments, setUserProjectAssignments] = useState({});
  const setContextProps = useContextProps();
  const defaultPageSize = Number.parseInt(localStorage.getItem("pages:projects-list") ?? 30);

  const [modal, setModal] = React.useState(false);

  // Check if user is Super Admin or Admin
  const isSuperAdmin = hasRole('super-admin') || currentUser?.email === 'superadmin@gmail.com';
  const isAdmin = hasRole('admin') || currentUser?.email === 'dhaneshwari.tosscss@gmail.com';
  const isClient = !isAdmin && !isSuperAdmin; // Client if neither admin nor super-admin
  
  // Legacy variable for backward compatibility
  const isSpecificAdmin = isAdmin;

  // Debug user roles
  console.log("=== PROJECTS DEBUG START ===");
  console.log("User roles:", userRoles);
  console.log("Loading roles:", loadingRoles);
  console.log("Is Super Admin:", isSuperAdmin);
  console.log("Is admin:", isAdmin);
  console.log("Is client:", isClient);
  console.log("Current user email:", currentUser?.email);
  console.log("Current user object:", currentUser);
  console.log("hasRole('admin') result:", hasRole('admin'));
  console.log("hasRole('super-admin') result:", hasRole('super-admin'));
  console.log("=== PROJECTS DEBUG END ===");

  const openModal = () => setModal(true);

  const closeModal = () => setModal(false);

  // Load user project assignments from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('userProjectAssignments');
      console.log("Projects - Raw localStorage data:", saved);

      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("Projects - Parsed localStorage data:", parsed);
        console.log("Projects - Current user ID:", currentUser?.id);
        console.log("Projects - User assignments:", parsed[currentUser?.id] || []);
        setUserProjectAssignments(parsed);
      } else {
        console.log("Projects - No userProjectAssignments found in localStorage");
        setUserProjectAssignments({});
      }
    } catch (error) {
      console.error('Error loading user project assignments:', error);
      setUserProjectAssignments({});
    }
  }, [currentUser?.id]); // Re-load when user changes

  const fetchProjects = async (page = currentPage, pageSize = defaultPageSize) => {
    try {
      abortController.renew(); // Cancel any in flight requests

      console.log("User role check - isAdmin:", isAdmin, "isClient:", isClient);
      console.log("Current user:", currentUser);

      const requestParams = { page, page_size: pageSize };
      
      // For admin/super-admin, increase page size
      if (isAdmin || isSuperAdmin) {
        requestParams.page_size = 1000; // Large page size to get all admin projects
        console.log("Privileged user detected, fetching projects:", currentUser.id);
      }

      requestParams.include = [
        "id",
        "title",
        "created_by",
        "created_at",
        "color",
        "is_published",
        "assignment_settings",
      ].join(",");
      
      console.log("Request include fields:", requestParams.include);

      // For super-admin and admin users, fetch ALL projects so we can filter them properly
      if (isSuperAdmin) {
        requestParams.show_all = true;
        console.log("Fetching ALL projects for super-admin");
      } else if (isAdmin) {
        requestParams.show_all = true; // Fetch all projects so we can separate created vs assigned
        console.log("Fetching ALL projects for admin user to separate created vs assigned");
      } else {
        // For debugging, let's see what happens if we fetch all projects
        console.log("Fetching all projects for debugging");
        requestParams.show_all = true;
      }

      const data = await api.callApi("projects", {
        params: requestParams,
        signal: abortController.controller.current.signal,
        errorFilter: (e) => e.error.includes("aborted"),
      });

      console.log("API response:", data);
      console.log("Request params:", requestParams);

    // Filter projects based on user role and assignments
    let filteredProjects = (data && data.results) ? data.results : [];
    
    if (currentUser) {
      if (isSuperAdmin) {
        // Super admin sees all projects (no additional filtering)
        console.log("Super-admin viewing all projects:", filteredProjects.length);
      } else if (isAdmin) {
        // Admin sees projects they created AND projects assigned to them
        const currentUserAssignments = userProjectAssignments[currentUser.id] || [];
        console.log("=== ADMIN PROJECT FILTERING DEBUG ===");
        console.log("Admin user ID:", currentUser.id);
        console.log("Admin user email:", currentUser.email);
        console.log("Admin assignments from state:", currentUserAssignments);
        console.log("Admin assignments from localStorage:", JSON.parse(localStorage.getItem('userProjectAssignments') || '{}')[currentUser.id] || []);
        console.log("Admin projects from backend:", filteredProjects.length);
        console.log("All projects:", filteredProjects.map(p => ({ id: p.id, title: p.title, created_by: p.created_by?.id })));
        
        // Filter to show projects created by admin OR assigned to admin
        const createdProjects = filteredProjects.filter(project => project.created_by?.id === currentUser.id);
        const assignedProjects = filteredProjects.filter(project => currentUserAssignments.includes(project.id));
        
        console.log("Created projects:", createdProjects.map(p => ({ id: p.id, title: p.title })));
        console.log("Assigned projects:", assignedProjects.map(p => ({ id: p.id, title: p.title })));
        
        filteredProjects = filteredProjects.filter(project => 
          project.created_by?.id === currentUser.id || 
          currentUserAssignments.includes(project.id)
        );
        console.log("Final admin filtered projects (created + assigned):", filteredProjects.length);
        console.log("=== END ADMIN PROJECT FILTERING DEBUG ===");
      } else {
        // Client sees only assigned projects
        const currentUserAssignments = userProjectAssignments[currentUser.id] || [];
        console.log("Current user ID:", currentUser.id);
        console.log("User assignments:", currentUserAssignments);
        console.log("All projects:", filteredProjects.length);
        
        if (currentUserAssignments.length > 0) {
          filteredProjects = filteredProjects.filter(project => 
            currentUserAssignments.includes(project.id)
          );
          console.log("Filtered projects:", filteredProjects.length);
        } else {
          console.log("No assignments found, showing empty list");
          filteredProjects = [];
        }
      }
    }

    setTotalItems(filteredProjects.length);
    setProjectsList(filteredProjects);

    if (filteredProjects.length > 0) {
      try {
        const additionalData = await api.callApi("projects", {
          params: {
            ids: filteredProjects.map(({ id }) => id).join(","),
            include: [
              "id",
              "description",
              "num_tasks_with_annotations",
              "task_number",
              "skipped_annotations_number",
              "total_annotations_number",
              "total_predictions_number",
              "ground_truth_number",
              "finished_task_number",
            ].join(","),
            page_size: pageSize,
          },
          signal: abortController.controller.current.signal,
          errorFilter: (e) => e.error.includes("aborted"),
        });

        if (additionalData && additionalData.results && additionalData.results.length > 0) {
          setProjectsList((prev) =>
            additionalData.results.map((project) => {
              const prevProject = prev.find(({ id }) => id === project.id);

              return {
                ...prevProject,
                ...project,
              };
            }),
          );
        }
      } catch (additionalError) {
        console.error("Error fetching additional project data:", additionalError);
        // Continue with basic project data even if additional data fails
      }
    }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setTotalItems(0);
      setProjectsList([]);
    }
  };

  const loadNextPage = async (page, pageSize) => {
    setCurrentPage(page);
    await fetchProjects(page, pageSize);
  };

  React.useEffect(() => {
    // Wait for user roles to load before fetching projects
    if (!loadingRoles && currentUser) {
      fetchProjects();
    }
  }, [loadingRoles, currentUser]);

  // Refetch projects when user assignments change
  React.useEffect(() => {
    // Only fetch projects if we have both user and assignments loaded
    if (currentUser && Object.keys(userProjectAssignments).length >= 0) {
      console.log("Projects - Triggering fetchProjects with user:", currentUser.id, "assignments:", Object.keys(userProjectAssignments).length);
      fetchProjects();
    }
  }, [userProjectAssignments, currentUser]);

  React.useEffect(() => {
    // there is a nice page with Create button when list is empty
    // so don't show the context button in that case
    setContextProps({ openModal, showButton: projectsList.length > 0 && isSpecificAdmin });
  }, [projectsList.length, isSpecificAdmin]);

  // Debug function to check project assignments (can be called from browser console)
  window.debugProjectsPage = () => {
    const assignments = JSON.parse(localStorage.getItem('userProjectAssignments') || '{}');
    console.log('Projects Page Debug:');
    console.log('- Current user:', currentUser);
    console.log('- User ID:', currentUser?.id);
    console.log('- User email:', currentUser?.email);
    console.log('- userProjectAssignments state:', userProjectAssignments);
    console.log('- localStorage userProjectAssignments:', assignments);
    console.log('- User assignments from state:', userProjectAssignments[currentUser?.id] || []);
    console.log('- User assignments from localStorage:', assignments[currentUser?.id] || []);
    console.log('- Available projects:', projectsList.length);
    console.log('- Projects list:', projectsList);
    return { 
      currentUser, 
      assignments, 
      userProjectAssignments, 
      projectsList 
    };
  };

  // Function to manually refresh userProjectAssignments from localStorage
  window.refreshProjectAssignments = () => {
    try {
      const saved = localStorage.getItem('userProjectAssignments');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserProjectAssignments(parsed);
        console.log('Refreshed userProjectAssignments from localStorage:', parsed);
        // Trigger a re-fetch of projects
        fetchProjects();
        return parsed;
      } else {
        console.log('No userProjectAssignments found in localStorage');
        return {};
      }
    } catch (error) {
      console.error('Error refreshing userProjectAssignments:', error);
      return {};
    }
  };

  // Function to manually assign projects to current user (for testing)
  window.assignProjectsToCurrentUser = (projectIds) => {
    if (!currentUser?.id) {
      console.error('No current user found');
      return;
    }
    
    try {
      const assignments = JSON.parse(localStorage.getItem('userProjectAssignments') || '{}');
      assignments[currentUser.id] = projectIds;
      localStorage.setItem('userProjectAssignments', JSON.stringify(assignments));
      setUserProjectAssignments(assignments);
      console.log(`Assigned projects ${projectIds} to user ${currentUser.id} (${currentUser.email})`);
      // Trigger a re-fetch of projects
      fetchProjects();
      return assignments;
    } catch (error) {
      console.error('Error assigning projects:', error);
      return {};
    }
  };

  // Debug function to check why created projects aren't showing
  window.debugCreatedProjects = () => {
    console.log("=== CREATED PROJECTS DEBUG ===");
    console.log("Current user:", currentUser);
    console.log("All projects:", allProjects);
    console.log("Created projects filter result:", allProjects.filter(project => project.created_by?.id === currentUser?.id));
    console.log("User assignments:", userProjectAssignments);
    console.log("Created projects section:", createdProjects);
    console.log("Assigned projects section:", assignedProjects);
    console.log("=== END CREATED PROJECTS DEBUG ===");
    return {
      currentUser,
      allProjects,
      createdProjects,
      assignedProjects,
      userProjectAssignments
    };
  };

  // Function to assign all available projects to current user (for testing)
  window.assignAllProjectsToCurrentUser = () => {
    if (!currentUser?.id) {
      console.error('No current user found');
      return;
    }
    
    try {
      const assignments = JSON.parse(localStorage.getItem('userProjectAssignments') || '{}');
      const allProjectIds = allProjects.map(p => p.id);
      assignments[currentUser.id] = allProjectIds;
      localStorage.setItem('userProjectAssignments', JSON.stringify(assignments));
      setUserProjectAssignments(assignments);
      console.log(`Assigned ALL projects ${allProjectIds} to user ${currentUser.id} (${currentUser.email})`);
      // Trigger a re-fetch of projects
      fetchProjects();
      return assignments;
    } catch (error) {
      console.error('Error assigning all projects:', error);
      return {};
    }
  };

  // Function to clear all assignments for current user (for testing)
  window.clearAllAssignmentsForCurrentUser = () => {
    if (!currentUser?.id) {
      console.error('No current user found');
      return;
    }
    
    try {
      const assignments = JSON.parse(localStorage.getItem('userProjectAssignments') || '{}');
      assignments[currentUser.id] = [];
      localStorage.setItem('userProjectAssignments', JSON.stringify(assignments));
      setUserProjectAssignments(assignments);
      console.log(`Cleared all assignments for user ${currentUser.id} (${currentUser.email})`);
      // Trigger a re-fetch of projects
      fetchProjects();
      return assignments;
    } catch (error) {
      console.error('Error clearing assignments:', error);
      return {};
    }
  };

  // Separate projects into created and assigned for admin users
  const getProjectSections = () => {
    if (isSuperAdmin) {
      return {
        allProjects: projectsList,
        createdProjects: [],
        assignedProjects: []
      };
    } else if (isAdmin) {
      const currentUserAssignments = userProjectAssignments[currentUser?.id] || [];
      const createdProjects = projectsList.filter(project => project.created_by?.id === currentUser?.id);
      const assignedProjects = projectsList.filter(project => 
        currentUserAssignments.includes(project.id)
      );
      
      console.log("=== ADMIN SECTION FILTERING ===");
      console.log("Current user ID:", currentUser?.id);
      console.log("User assignments:", currentUserAssignments);
      console.log("All projects:", projectsList.map(p => ({ id: p.id, title: p.title, created_by: p.created_by?.id })));
      console.log("Created projects:", createdProjects.map(p => ({ id: p.id, title: p.title })));
      console.log("Assigned projects:", assignedProjects.map(p => ({ id: p.id, title: p.title, created_by: p.created_by?.id })));
      console.log("=== END ADMIN SECTION FILTERING ===");
      
      return {
        allProjects: projectsList,
        createdProjects,
        assignedProjects
      };
    } else {
      // Client users see only assigned projects
      const currentUserAssignments = userProjectAssignments[currentUser?.id] || [];
      const assignedProjects = projectsList.filter(project => currentUserAssignments.includes(project.id));
      
      return {
        allProjects: projectsList,
        createdProjects: [],
        assignedProjects
      };
    }
  };

  const { allProjects, createdProjects, assignedProjects } = getProjectSections();

  // Debug logging for project sections
  console.log("=== PROJECT SECTIONS DEBUG ===");
  console.log("User role - isSuperAdmin:", isSuperAdmin, "isAdmin:", isAdmin);
  console.log("Current user:", currentUser);
  console.log("User assignments:", userProjectAssignments[currentUser?.id] || []);
  console.log("Total projects:", allProjects.length);
  console.log("All projects details:", allProjects.map(p => ({ 
    id: p.id, 
    title: p.title, 
    created_by_id: p.created_by?.id, 
    created_by_email: p.created_by?.email 
  })));
  console.log("Created projects:", createdProjects.length, createdProjects.map(p => ({ id: p.id, title: p.title })));
  console.log("Assigned projects:", assignedProjects.length, assignedProjects.map(p => ({ id: p.id, title: p.title })));
  console.log("=== END PROJECT SECTIONS DEBUG ===");

  // All users see their assigned projects
  return (
    <Block name="projects-page">
      {/* Header Section without Dashboard Badge */}
      <div style={{
        textAlign: "center",
        padding: "0",
        margin: "0",
        background: "transparent",
        backgroundColor: "transparent",
        borderRadius: "0",
        boxShadow: "none",
        border: "none",
      }}>
        <h1 style={{
          fontSize: "48px",
          fontWeight: "700",
          margin: "0 0 16px",
          background: "linear-gradient(135deg, #2d3748, #4a5568)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          {isSuperAdmin ? "All Projects" : isAdmin ? "Your Projects" : "Your Assigned Projects"}
        </h1>
        <p style={{
          fontSize: "20px",
          color: "#4a5568",
          margin: "0 0 32px",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: "1.6",
        }}>
          {isSuperAdmin ? "View and manage all projects in the organization" : (isAdmin ? "View and manage your created and assigned projects" : "View and manage the projects assigned to you")}
        </p>
        <div style={{
          display: "flex",
          gap: "16px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {isSpecificAdmin && (
            <Button 
              onClick={openModal} 
              look="primary" 
              size="large"
              style={{
                background: "rgb(25 44 89)",
                border: "none",
                padding: "16px 32px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease",
                width: "250px",
                minWidth: "200px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 35px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.3)";
              }}
            >
              ✨ Create New Project
            </Button>
          )}
          <Button 
            look="secondary" 
            size="large"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              border: "2px solid rgba(102, 126, 234, 0.2)",
              color: "#4a5568",
              padding: "16px 32px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              transition: "all 0.3s ease",
              width: "250px",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 35px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.3)";
            }}
          >
            📊 View Analytics
          </Button>
        </div>
      </div>

      {/* Project Sections */}
      {isSuperAdmin ? (
        // Super Admin sees all projects in one section
        allProjects.length ? (
          <ProjectsList
            projects={allProjects}
            currentPage={currentPage}
            totalItems={totalItems}
            loadNextPage={loadNextPage}
            pageSize={defaultPageSize}
          />
        ) : (
          <EmptyProjectsList openModal={openModal} showCreateButton={isSpecificAdmin} />
        )
      ) : isAdmin ? (
        // Admin sees separate sections for created and assigned projects
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
          {/* Created Projects Section */}
          {createdProjects.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "2px solid #e5e7eb"
              }}>
                <h2 style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  🏗️ Your Created Projects ({createdProjects.length})
                </h2>
              </div>
              <ProjectsList
                projects={createdProjects}
                currentPage={1}
                totalItems={createdProjects.length}
                loadNextPage={() => {}}
                pageSize={createdProjects.length}
              />
            </div>
          )}

          {/* Assigned Projects Section */}
          {assignedProjects.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "2px solid #e5e7eb"
              }}>
                <h2 style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  📋 Your Assigned Projects ({assignedProjects.length})
                </h2>
              </div>
              <ProjectsList
                projects={assignedProjects}
                currentPage={1}
                totalItems={assignedProjects.length}
                loadNextPage={() => {}}
                pageSize={assignedProjects.length}
              />
            </div>
          )}

          {/* Empty State */}
          {createdProjects.length === 0 && assignedProjects.length === 0 && (
            <EmptyProjectsList openModal={openModal} showCreateButton={isSpecificAdmin} />
          )}
        </div>
      ) : (
        // Client sees only assigned projects
        assignedProjects.length ? (
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "10px",
              borderBottom: "2px solid #e5e7eb"
            }}>
              <h2 style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#1f2937",
                margin: "0",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                📋 Your Assigned Projects ({assignedProjects.length})
              </h2>
            </div>
            <ProjectsList
              projects={assignedProjects}
              currentPage={currentPage}
              totalItems={totalItems}
              loadNextPage={loadNextPage}
              pageSize={defaultPageSize}
            />
          </div>
        ) : (
          <EmptyProjectsList openModal={openModal} showCreateButton={isSpecificAdmin} />
        )
      )}
      {modal && <CreateProject onClose={closeModal} />}
    </Block>
  );
};

ProjectsPage.title = "Projects";
ProjectsPage.path = "/projects";
ProjectsPage.exact = true;
ProjectsPage.routes = ({ store }) => [
  {
    title: () => store.project?.title,
    path: "/:id(\\d+)",
    exact: true,
    component: () => {
      const params = useRouterParams();

      return <Redirect to={`/projects/${params.id}/data`} />;
    },
    pages: {
      DataManagerPage,
      SettingsPage,
    },
  },
];
ProjectsPage.context = ({ openModal, showButton }) => {
  if (!showButton) return null;
  return (
    <Button 
      onClick={openModal} 
      look="primary" 
      size="compact"
      style={{
        background: "rgb(25 44 89)",
        border: "none",
        color: "#ffffff",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
      }}
    >
      Create
    </Button>
  );
};
