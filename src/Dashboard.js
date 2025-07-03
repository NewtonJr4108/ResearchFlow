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

export default function Dashboard() {
  const { currentUser } = useAuth();

  // Project states
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [linksInput, setLinksInput] = useState("");


  // Task states
  const [tasks, setTasks] = useState({});

  // Edit project states
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");

  useEffect(() => {
    if (currentUser) {
      getUserProjects(currentUser.uid).then(async projs => {
        setProjects(projs);
        const allTasks = {};
        for (let proj of projs) {
          allTasks[proj.id] = await getTasks(proj.id);
        }
        setTasks(allTasks);
      });
    }
  }, [currentUser]);

  const handleLogout = () => {
    signOut(auth).then(() => console.log("Logged out"));
  };

  const handleAddProject = () => {
    const linksArray = linksInput.split(",").map(link => link.trim()).filter(link => link);

    if (!title || !dueDate) {
      alert("Title and due date required");
      return;
    }
    addProject(currentUser.uid, title, description, new Date(dueDate), notes, linksArray)
      .then(() => refreshProjects());
    setTitle("");
    setDescription("");
    setDueDate("");
    setNotes("");
  setLinksInput("");

  };

  const handleDeleteProject = (projectId) => {
  if (!currentUser || !currentUser.uid) {
    console.error("No user logged in");
    return;
  }
  deleteProject(currentUser.uid, projectId)
    .then(() => refreshProjects());
};


  const handleEditClick = (proj) => {
    setEditingProjectId(proj.id);
    setEditedTitle(proj.title);
    setEditedDescription(proj.description);
    setEditedDueDate(new Date(proj.dueDate.seconds * 1000).toISOString().split('T')[0]);
  };

  const handleUpdateProject = (projectId) => {
    const updatedData = {
      title: editedTitle,
      description: editedDescription,
      dueDate: new Date(editedDueDate)
    };

    updateProject(projectId, updatedData)
      .then(() => {
        refreshProjects();
        setEditingProjectId(null);
      })
      .catch(error => {
        console.error("Error updating project:", error);
      });
  };

  const refreshProjects = () => {
    getUserProjects(currentUser.uid).then(async projs => {
      setProjects(projs);
      const allTasks = {};
      for (let proj of projs) {
        allTasks[proj.id] = await getTasks(proj.id);
      }
      setTasks(allTasks);
    });
  };

  const handleAddTask = (projectId, taskTitle, taskDueDate) => {
    if (!taskTitle || !taskDueDate) {
      alert("Task title and due date required");
      return;
    }
    addTask(projectId, taskTitle, new Date(taskDueDate))
      .then(() => getTasks(projectId).then(tasksForProject => {
        setTasks(prev => ({ ...prev, [projectId]: tasksForProject }));
      }));
  };

  const handleDeleteTask = (projectId, taskId) => {
    deleteTask(projectId, taskId)
      .then(() => getTasks(projectId).then(tasksForProject => {
        setTasks(prev => ({ ...prev, [projectId]: tasksForProject }));
      }));
  };

  return (
    <div className="container">
      <h2>Welcome to ResearchFlow Dashboard</h2>
      <p>Logged in as: {currentUser.email}</p>
      <button onClick={handleLogout}>Log Out</button>
      <button onClick={() => window.location.href = "/settings"}>Settings</button>

      <h3>Add New Project</h3>
      <input
        type="text"
        placeholder="Project Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      /><br/>
      <textarea
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      /><br/>


      <textarea
  placeholder="Optional Notes"
  value={notes}
  onChange={e => setNotes(e.target.value)}
/><br/>

<input
  type="text"
  placeholder="Links (comma-separated URLs)"
  value={linksInput}
  onChange={e => setLinksInput(e.target.value)}
/><br/>

      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
      /><br/>
      <button onClick={handleAddProject}>Add Project</button>

      <h3>Your Projects</h3>
      <ul>
        {projects.map(proj => (
          <li key={proj.id}>
            {editingProjectId === proj.id ? (
              <div>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  placeholder="New Title"
                /><br/>
                <textarea
                  value={editedDescription}
                  onChange={e => setEditedDescription(e.target.value)}
                  placeholder="New Description"
                /><br/>
                <input
                  type="date"
                  value={editedDueDate}
                  onChange={e => setEditedDueDate(e.target.value)}
                /><br/>

                <button onClick={() => handleUpdateProject(proj.id)}>Save</button>
                <button onClick={() => setEditingProjectId(null)}>Cancel</button>
              </div>
            ) : (
              <div>
                <strong>{proj.title}</strong><br/>
                {proj.description}<br/>
                Due: {new Date(proj.dueDate.seconds * 1000).toLocaleDateString()}<br/>

                <button onClick={() => window.location.href = `/browser/${proj.id}`}>
                Research Preferences
                </button>

                <button onClick={() => handleDeleteProject(proj.id)}>Delete Project</button>
                <button onClick={() => handleEditClick(proj)}>Edit Project</button>
              </div>
            )}


            <p><strong>Notes:</strong> {proj.notes}</p>
{proj.links && proj.links.length > 0 && (
  <div>
    <strong>Links:</strong>
    <ul>
      {proj.links.map((link, index) => (
        <li key={index}><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></li>
      ))}
    </ul>
  </div>
)}


            <h4>Tasks</h4>
            <ul>
              {tasks[proj.id] && tasks[proj.id].map(task => (
                <li key={task.id}>
                  {task.title} - Due: {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                  <button onClick={() => handleDeleteTask(proj.id, task.id)}>Delete Task</button>
                </li>
              ))}
            </ul>

            <AddTaskForm projectId={proj.id} handleAddTask={handleAddTask} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddTaskForm({ projectId, handleAddTask }) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  return (
    <div>
      <h5>Add Task</h5>
      <input
        type="text"
        placeholder="Task Title"
        value={taskTitle}
        onChange={e => setTaskTitle(e.target.value)}
      /><br/>
      <input
        type="date"
        value={taskDueDate}
        onChange={e => setTaskDueDate(e.target.value)}
      /><br/>
      <button onClick={() => {
        handleAddTask(projectId, taskTitle, taskDueDate);
        setTaskTitle("");
        setTaskDueDate("");
      }}>Add Task</button>
    </div>
  );
}
