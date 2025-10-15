import type { Page } from "../types/Page";
import { SimpleCard, Button } from "@humansignal/ui";
import { IconExternal, IconFolderAdd, IconHumanSignal, IconUserAdd, IconFolderOpen } from "@humansignal/icons";

import { useQuery } from "@tanstack/react-query";
import { useAPI } from "../../providers/ApiProvider";
import { useCurrentUser } from "../../providers/CurrentUser";
import { useUserRoles } from "../../hooks/useUserRoles";
import { useState } from "react";
import { CreateProject } from "../CreateProject/CreateProject";
import { InviteLink } from "../Organization/PeoplePage/InviteLink";
import { Heading, Sub } from "@humansignal/typography";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";

const PROJECTS_TO_SHOW = 10;

// const resources = [
//   {
//     title: "Documentation",
//     url: "https://labelstud.io/guide/",
//   },
//   {
//     title: "API Documentation",
//     url: "https://api.labelstud.io/api-reference/introduction/getting-started",
//   },
//   {
//     title: "Release Notes",
//     url: "https://labelstud.io/learn/categories/release-notes/",
//   },
//   {
//     title: "LabelStud.io Blog",
//     url: "https://labelstud.io/blog/",
//   },
//   {
//     title: "Slack Community",
//     url: "https://slack.labelstud.io",
//   },
// ];

const actions = [
  {
    title: "Create Project",
    icon: IconFolderAdd,
    type: "createProject",
  },
  {
    title: "Invite People",
    icon: IconUserAdd,
    type: "invitePeople",
  },
] as const;

type Action = (typeof actions)[number]["type"];

export const HomePage: Page = () => {
  const api = useAPI();
  const history = useHistory();
  const { user } = useCurrentUser();
  const { hasRole } = useUserRoles();
  const [creationDialogOpen, setCreationDialogOpen] = useState(false);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  
  // Determine user role
  const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
  const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com' || isSuperAdmin;
  const isClient = hasRole('client') || (!isAdmin && user); // Default to client if not admin
  
  // Show create project options for Super Admin and Admin users
  const showCreateProject = isAdmin || isSuperAdmin;
  const { data, isFetching, isSuccess, isError } = useQuery({
    queryKey: ["projects", { page_size: 10, user_role: isClient ? 'client' : 'admin' }],
    async queryFn() {
      if (isClient) {
        // For client users, fetch assigned projects AND projects created by the user
        const allProjectsResponse = await api.callApi<{ results: APIProject[]; count: number }>("projects", {
          params: {
            show_all: true,
            page_size: 1000,
            include: "id,title,created_by,created_at,is_published,task_number,total_annotations_number,finished_task_number",
          },
        });

        const allProjects = allProjectsResponse?.results || [];

        // Get user's assigned projects from localStorage
        const userProjectAssignments = JSON.parse(localStorage.getItem('userProjectAssignments') || '{}');
        const userAssignments: number[] = userProjectAssignments[user?.id] || [];

        // Helper to safely get creator id whether API returns number or object
        const getCreatedById = (project: APIProject): number | undefined => {
          const creator: unknown = (project as any).created_by;
          if (creator == null) return undefined;
          if (typeof creator === 'number') return creator;
          if (typeof creator === 'object' && 'id' in (creator as Record<string, unknown>)) {
            const idVal = (creator as Record<string, unknown>).id;
            return typeof idVal === 'number' ? idVal : undefined;
          }
          return undefined;
        };

        // Assigned to user
        const assignedProjects = allProjects.filter(project => userAssignments.includes(project.id));

        // Created by the current user
        const createdProjects = allProjects.filter(project => getCreatedById(project) === user?.id);

        // Merge (unique by id)
        const mergedById = new Map<number, APIProject>();
        [...createdProjects, ...assignedProjects].forEach(p => mergedById.set(p.id, p));
        const mergedProjects = Array.from(mergedById.values());

        return {
          results: mergedProjects.slice(0, PROJECTS_TO_SHOW),
          count: mergedProjects.length,
        };
      } else {
        // For admin users, fetch all projects
        return api.callApi<{ results: APIProject[]; count: number }>("projects", {
          params: { page_size: PROJECTS_TO_SHOW },
        });
      }
    },
  });

  const handleActions = (action: Action) => {
    return () => {
      switch (action) {
        case "createProject":
          setCreationDialogOpen(true);
          break;
        case "invitePeople":
          setInvitationOpen(true);
          break;
      }
    };
  };

  const handleTargetClick = () => {
    // For admin and superadmin users, show "Yet to Update" message
    if (isAdmin || isSuperAdmin) {
      alert("Yet to Update");
    } else if (isClient && user) {
      setTargetModalOpen(true);
    } else {
      alert("Yet to Update");
    }
  };

  // Get user target from localStorage
  const getUserTarget = () => {
    try {
      const userTargets = JSON.parse(localStorage.getItem('userTargets') || '{}');
      return userTargets[user?.id] || "No target set";
    } catch (error) {
      console.error('Error loading user target:', error);
      return "No target set";
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="relative flex flex-col gap-8 items-center w-full text-center">
          {/* Welcome Banner */}
          <div className="w-full bg-white rounded-lg p-8 shadow-sm border border-gray-200 relative">

            {/* TOAI Studio Badge */}
            {/* <div className="inline-flex items-center gap-4 px-6 py-4 bg-blue-100 rounded-full border border-blue-200 mb-6">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
              <img 
                src="/static/images/icon.png" 
                alt="TOAI Studio" 
                style={{ 
                  height: "32px", 
                  width: "auto",
                  objectFit: "contain"
                }} 
              />
            </div> */}

            {/* Welcome Message */}
            <div className="flex flex-col items-center">
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                Welcome to
                <img
                  src="/static/images/icon.png"
                  alt="TOAI Studio"
                  style={{
                    height: "100px",
                    width: "auto",
                    objectFit: "contain",
                    marginTop: "10px"
                  }}
                />
              </h1>
             
              <p className="text-gray-500 text-base -mt-6">
                Let's get you started with your AI journey.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md  ">
            {actions.filter(action => showCreateProject || action.title !== "Create Project").map((action) => {
              const isCreateProject = action.title === "Create Project";
              return (
                <Button
                  key={action.title}
                  variant="primary"
                  size="medium"
                  className={`group flex-1 sm:flex-none text-base font-medium gap-3 border-0 shadow-sm hover:shadow-md transition-all duration-200 py-3 px-6 rounded-lg ${isCreateProject
                    ? "text-white"
                    : "text-blue-600 bg-white border border-blue-300 hover:bg-gray-50"
                    }`}
                  style={isCreateProject ? {
                    background: "rgb(25 44 89)",
                    width: "200px",
                    minWidth: "200px"
                  } : {
                    width: "200px",
                    minWidth: "200px",
                    color: "#2563eb"
                  }}
                  onClick={handleActions(action.type)}
                >
                  <action.icon className={`w-5 h-5 ${isCreateProject ? "text-white" : "text-blue-600 group-hover:text-blue-600"}`} />
                  {action.title}
                </Button>
              );
            })}
          </div>
        </section>

        {/* Dashboard Sections */}
        <section className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Your Projects */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <IconFolderOpen className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-800">{isClient ? "Your Projects" : "Your Projects"}</h2>
                </div>

                {isError ? (
                  <div className="h-64 flex justify-center items-center">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <IconFolderOpen className="w-8 h-8 text-red-500" />
                      </div>
                      <span className="text-red-600 font-medium">Unable to load projects</span>
                      <span className="text-gray-500 text-sm">Please try refreshing the page</span>
                    </div>
                  </div>
                ) : isSuccess && data && data.results.length === 0 ? (
                  <div className="flex flex-col justify-center items-center border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg h-80 p-8 text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm mb-6">
                      <IconFolderOpen className="w-10 h-10 text-white" />
                    </div>
                    <Heading size={2} className="text-gray-800 mb-3">
                      {isClient ? "No projects assigned yet" : "Create your first project in TOAI Studio"}
                    </Heading>
                    <Sub className="text-gray-600 mb-6 max-w-md">
                      {isClient ? "Contact your administrator to get projects assigned to you" : "Import your data and set up the labeling interface to start annotating"}
                    </Sub>
                    {showCreateProject && (
                      <Button
                        variant="primary"
                        size="medium"
                        className="px-8 py-3 text-lg font-medium border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                        style={{
                          background: "rgb(25 44 89)",
                          width: "200px",
                          minWidth: "200px"
                        }}
                        onClick={() => setCreationDialogOpen(true)}
                      >
                        Create Project
                      </Button>
                    )}
                  </div>
                ) : isSuccess && data && data.results.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {data.results.slice(0, 4).map((project) => {
                      return <AdvancedProjectCard key={project.id} project={project} />;
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Middle Column - Quick Actions & Feed */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                  <div className="flex justify-center">
                    <button 
                      onClick={handleTargetClick}
                      className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2 transition-colors duration-200"
                    >
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🎯</span>
                      </div>
                      <span className="text-purple-600 text-xs">Target</span>
                    </button>
                  </div>
                </div>

                {/* Quick Feed */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Feed</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📝</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-gray-800 font-medium text-sm">Create New Update</h4>
                        <p className="text-gray-600 text-xs mt-1">Platform Building: New AI Models Available</p>
                        <button 
                          onClick={() => alert("Yet to Update")}
                          className="text-blue-600 text-xs mt-2 hover:text-blue-700"
                        >
                          Tutorial
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* News Feed */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">News Feed</h3>
                  <div className="space-y-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">🖼️</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-gray-800 font-medium text-sm">Image Building: New AI</h4>
                          <p className="text-gray-600 text-xs mt-1">Heuri Four AI Aide ged Available</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">🎯</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-gray-800 font-medium text-sm">Object Project Filter</h4>
                          <p className="text-gray-600 text-xs mt-1">2 4 118 Tasks Complete!</p>
                          <button 
                            onClick={() => alert("Yet to Update")}
                            className="text-blue-600 text-xs mt-2 hover:text-blue-700"
                          >
                            Tutorial
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Resource Hub & Support */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Resource Hub */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Resource Hub</h3>
                  <div className="space-y-3">
                    {[
                      { icon: "📚", label: "Documentation", color: "text-green-600" },
                      { icon: "💾", label: "Code Saving", color: "text-orange-600" },
                      { icon: "🔧", label: "A Features", color: "text-gray-600" },
                      { icon: "🔌", label: "API Access", color: "text-gray-600" },
                      { icon: "🆘", label: "Support", color: "text-red-600" }
                    ].map((item, index) => (
                      <button 
                        key={index} 
                        onClick={() => alert("Yet to Update")}
                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors duration-200"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className={`text-sm ${item.color}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Support */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Support</h3>
                  <div 
                    onClick={() => alert("Yet to Update")}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-800 text-sm">11</span>
                      <span className="text-gray-800 text-sm">5</span>
                      <span className="text-gray-800 text-sm">28</span>
                      <span className="text-gray-800 text-sm">10</span>
                    </div>
                    <div className="flex gap-1 h-8">
                      <div className="flex-1 bg-blue-500 rounded"></div>
                      <div className="flex-1 bg-green-500 rounded"></div>
                      <div className="flex-1 bg-yellow-500 rounded"></div>
                      <div className="flex-1 bg-red-500 rounded"></div>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-gray-800 text-sm">20%</span>
                    </div>
                  </div>
                </div>

                {/* Task Overview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Task Overview</h3>
                  <p className="text-gray-800 text-sm mb-4">7 Completed Tasks (3)</p>
                  <div 
                    onClick={() => alert("Yet to Update")}
                    className="bg-white border border-gray-200 rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-800 text-sm">3</span>
                      <span className="text-gray-800 text-sm">28</span>
                      <span className="text-gray-800 text-sm">18%</span>
                      <span className="text-gray-800 text-sm">17%</span>
                      <span className="text-gray-800 text-sm">26</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div className="flex-1 bg-blue-500 rounded"></div>
                      <div className="flex-1 bg-green-500 rounded"></div>
                      <div className="flex-1 bg-yellow-500 rounded"></div>
                      <div className="flex-1 bg-purple-500 rounded"></div>
                      <div className="flex-1 bg-red-500 rounded"></div>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-gray-800 text-sm">30%</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert("Yet to Update")}
                    className="text-blue-600 text-sm hover:text-blue-700 flex items-center gap-1"
                  >
                    Relbirtastice <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {creationDialogOpen && <CreateProject onClose={() => setCreationDialogOpen(false)} />}
      <InviteLink opened={invitationOpen} onClosed={() => setInvitationOpen(false)} />
      
      {/* Target Modal */}
      {targetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Your Assigned Projects & Targets</h2>
              <button
                onClick={() => setTargetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {isSuccess && data && data.results.length > 0 ? (
                <div className="space-y-4">
                  {/* User Target Section */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Your Personal Target</h3>
                    <p className="text-blue-700 text-base">
                      {getUserTarget()}
                    </p>
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    Here are your assigned projects with their targets:
                  </p>
                  {data.results.map((project) => (
                    <div key={project.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {project.title}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Project Target:</span>
                              <span className="text-sm text-gray-800">
                                {project.task_number || 0} tasks to complete
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Progress:</span>
                              <span className="text-sm text-gray-800">
                                {project.finished_task_number || 0} of {project.task_number || 0} completed
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Completion Rate:</span>
                              <span className="text-sm text-gray-800">
                                {(project.task_number && project.task_number > 0) ? Math.round(((project.finished_task_number || 0) / project.task_number) * 100) : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Link
                            to={`/projects/${project.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200"
                          >
                            View Project
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* User Target Section - Even when no projects */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Your Personal Target</h3>
                    <p className="text-blue-700 text-base">
                      {getUserTarget()}
                    </p>
                  </div>
                  
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Projects Assigned</h3>
                    <p className="text-gray-600">
                      You don't have any projects assigned yet. Contact your administrator to get projects assigned.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

HomePage.title = "Home";
HomePage.path = "/";
HomePage.exact = true;

function AdvancedProjectCard({
  project,
}: {
  project: APIProject;
}) {
  const finished = project.finished_task_number ?? 0;
  const total = project.task_number ?? 0;
  const progress = (total > 0 ? finished / total : 0) * 100;

  // Generate project type and model based on title
  const getProjectDetails = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('image') || lowerTitle.includes('classifier')) {
      return { type: 'Image Annotation', model: 'Object Detection Model' };
    }
    if (lowerTitle.includes('audio') || lowerTitle.includes('transcription')) {
      return { type: 'Audio Analysis', model: 'Audio Processing Model' };
    }
    if (lowerTitle.includes('text') || lowerTitle.includes('sentiment')) {
      return { type: 'Text Labeling', model: 'Text Summarization Tool' };
    }
    if (lowerTitle.includes('nlp') || lowerTitle.includes('document')) {
      return { type: 'Document Analysis', model: 'NLP Processing Model' };
    }
    if (lowerTitle.includes('chatbot') || lowerTitle.includes('conversation')) {
      return { type: 'Conversational AI', model: 'Chatbot Model' };
    }
    return { type: 'AI Project', model: 'General AI Model' };
  };

  const { type, model } = getProjectDetails(project.title);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block group hover:bg-gray-50 transition-all duration-200 rounded-lg p-4 bg-white border border-gray-200"
      data-external
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Project Title */}
          <h3 className="text-gray-800 font-bold text-sm group-hover:text-blue-600 transition-colors duration-200">
            {project.title}
          </h3>

          {/* Project Model */}
          <p className="text-gray-500 text-xs mt-1">
            {model}
          </p>

          {/* Progress Text */}
          <p className="text-gray-600 text-xs mt-1">
            {finished} of {total} Tasks ({total > 0 ? Math.round((finished / total) * 100) : 0}%)
          </p>

          {/* New Project Label */}
          <span className="inline-block text-white text-xs px-2 py-1 rounded mt-2"
            style={{
              background: "rgb(25 44 89)"
            }}>
            New Project
          </span>
        </div>

        {/* Circular Progress Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-600 text-xs font-bold">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectCard({
  project,
}: {
  project: APIProject;
}) {
  const finished = project.finished_task_number ?? 0;
  const total = project.task_number ?? 0;
  const progress = (total > 0 ? finished / total : 0) * 100;

  // Generate project type based on title or use a default
  const getProjectType = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('image') || lowerTitle.includes('classifier')) return 'Image Annotation';
    if (lowerTitle.includes('audio') || lowerTitle.includes('transcription')) return 'Audio Analysis';
    if (lowerTitle.includes('text') || lowerTitle.includes('sentiment')) return 'Text Labeling';
    if (lowerTitle.includes('nlp') || lowerTitle.includes('document')) return 'Document Analysis';
    if (lowerTitle.includes('chatbot') || lowerTitle.includes('conversation')) return 'Conversational AI';
    if (lowerTitle.includes('alpha') || lowerTitle.includes('exploratory')) return 'Exploratory AI';
    return 'AI Project';
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block group hover:shadow-md transition-all duration-200"
      data-external
    >
      <div className="bg-white border border-gray-200 rounded-lg p-4 h-full hover:border-gray-300 transition-colors duration-200">
        <div className="flex flex-col gap-3">
          {/* Project Title */}
          <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
            {project.title}
          </h3>

          {/* Project Type */}
          <p className="text-sm text-gray-500 font-medium">
            {getProjectType(project.title)}
          </p>

          {/* Progress Text */}
          <p className="text-sm text-gray-600 font-medium">
            {finished} of {total} Tasks ({total > 0 ? Math.round((finished / total) * 100) : 0}%)
          </p>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full overflow-hidden h-2">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
