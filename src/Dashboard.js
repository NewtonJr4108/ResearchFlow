import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { addProject } from "./addProject";
import { getUserProjects } from "./readProjects";
import { addTask } from "./addTask";
import { getTasks } from "./getTasks";
import { deleteProject } from "./deleteProject";
import { deleteTask } from "./deleteTask";
import { updateProject } from "./updateProject";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { currentUser } = useAuth();

  // Project form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [linksInput, setLinksInput] = useState("");

  // Data states
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({});

  // Editing project states
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");

  // Fetch projects & tasks on mount or refresh
  useEffect(() => {
    refreshProjects();
  }, []);

  const refreshProjects = async () => {
    if (!currentUser) return;
    try {
      const projs = await getUserProjects(currentUser.uid);
      setProjects(projs);

      // Fetch tasks for each project
      const allTasks = {};
      for (let proj of projs) {
        allTasks[proj.id] = await getTasks(proj.id);
      }
      setTasks(allTasks);
    } catch (error) {
      console.error("Error loading projects or tasks:", error);
    }
  };

  // Logout handler
  const handleLogout = () => {
    signOut(auth).then(() => console.log("Logged out"));
  };

  // Add new project handler
  const handleAddProject = async () => {
    if (!title || !dueDate) {
      alert("Title and due date are required");
      return;
    }
    const linksArray = linksInput
      .split(",")
      .map((link) => link.trim())
      .filter(Boolean);

    try {
      await addProject(
        currentUser.uid,
        title,
        description,
        new Date(dueDate),
        notes,
        linksArray
      );
      await refreshProjects();

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setNotes("");
      setLinksInput("");
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  // Delete project handler
  const handleDeleteProject = async (projectId) => {
    if (!currentUser) return;
    try {
      await deleteProject(currentUser.uid, projectId);
      await refreshProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Edit project handlers
  const handleEditClick = (proj) => {
    setEditingProjectId(proj.id);
    setEditedTitle(proj.title);
    setEditedDescription(proj.description);
    setEditedDueDate(
      new Date(proj.dueDate.seconds * 1000).toISOString().split("T")[0]
    );
  };

  const handleUpdateProject = async (projectId) => {
    try {
      await updateProject(projectId, {
        title: editedTitle,
        description: editedDescription,
        dueDate: new Date(editedDueDate),
      });
      setEditingProjectId(null);
      await refreshProjects();
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  // Task handlers
  const handleAddTask = async (projectId, taskTitle, taskDueDate) => {
    if (!taskTitle || !taskDueDate) {
      alert("Task title and due date required");
      return;
    }
    try {
      await addTask(projectId, taskTitle, new Date(taskDueDate));
      const updatedTasks = await getTasks(projectId);
      setTasks((prev) => ({ ...prev, [projectId]: updatedTasks }));
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleDeleteTask = async (projectId, taskId) => {
    try {
      await deleteTask(projectId, taskId);
      const updatedTasks = await getTasks(projectId);
      setTasks((prev) => ({ ...prev, [projectId]: updatedTasks }));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>Welcome to ResearchFlow Dashboard</h2>
      <p>Logged in as: {currentUser?.email}</p>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleLogout}>Log Out</button>{" "}
        <button onClick={() => (window.location.href = "/settings")}>Settings</button>
      </div>

      {/* New Project Form */}
      <section style={{ marginBottom: 40 }}>
        <h3>Add New Project</h3>
        <input
          type="text"
          placeholder="Project Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          rows={3}
        />
        <textarea
          placeholder="Optional Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          rows={2}
        />
        <input
          type="text"
          placeholder="Links (comma-separated URLs)"
          value={linksInput}
          onChange={(e) => setLinksInput(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <br />
        <button onClick={handleAddProject}>Add Project</button>
      </section>

      {/* Projects List */}
      <section>
        <h3>Your Projects</h3>
        {projects.length === 0 ? (
          <p>No projects found. Add one above!</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {projects.map((proj) => (
              <li
                key={proj.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 5,
                  padding: 15,
                  marginBottom: 20,
                }}
              >
                {editingProjectId === proj.id ? (
                  <>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="New Title"
                      style={{ width: "100%", marginBottom: 10 }}
                    />
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="New Description"
                      rows={3}
                      style={{ width: "100%", marginBottom: 10 }}
                    />
                    <input
                      type="date"
                      value={editedDueDate}
                      onChange={(e) => setEditedDueDate(e.target.value)}
                      style={{ marginBottom: 10 }}
                    />
                    <br />
                    <button onClick={() => handleUpdateProject(proj.id)}>Save</button>{" "}
                    <button onClick={() => setEditingProjectId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <h4>{proj.title}</h4>
                    <p>{proj.description}</p>
                    <p>
                      <strong>Due:</strong>{" "}
                      {new Date(proj.dueDate.seconds * 1000).toLocaleDateString()}
                    </p>

                    {/* Link to detailed project page */}
                    <Link to={`/projects/${proj.id}`}>
                      <button>Open Project Page</button>
                    </Link>{" "}
                    <button onClick={() => handleDeleteProject(proj.id)}>Delete</button>{" "}
                    <button onClick={() => handleEditClick(proj)}>Edit</button>

                    <p>
                      <strong>Notes:</strong> {proj.notes || "(none)"}
                    </p>
                    {proj.links && proj.links.length > 0 && (
                      <div>
                        <strong>Links:</strong>
                        <ul>
                          {proj.links.map((link, i) => (
                            <li key={i}>
                              <a href={link} target="_blank" rel="noopener noreferrer">
                                {link}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tasks */}
                    <section>
                      <h5>Tasks</h5>
                      <ul>
                        {tasks[proj.id] && tasks[proj.id].length > 0 ? (
                          tasks[proj.id].map((task) => (
                            <li key={task.id}>
                              {task.title} - Due:{" "}
                              {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                              <button
                                onClick={() => handleDeleteTask(proj.id, task.id)}
                                style={{ marginLeft: 10 }}
                              >
                                Delete Task
                              </button>
                            </li>
                          ))
                        ) : (
                          <p>No tasks yet.</p>
                        )}
                      </ul>
                      <AddTaskForm
                        projectId={proj.id}
                        handleAddTask={handleAddTask}
                      />
                    </section>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AddTaskForm({ projectId, handleAddTask }) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  return (
    <div style={{ marginTop: 10 }}>
      <input
        type="text"
        placeholder="Task Title"
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <input
        type="date"
        value={taskDueDate}
        onChange={(e) => setTaskDueDate(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <button
        onClick={() => {
          handleAddTask(projectId, taskTitle, taskDueDate);
          setTaskTitle("");
          setTaskDueDate("");
        }}
      >
        Add Task
      </button>
    </div>
  );
}
