// /src/pages/TaskBoard.tsx
import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";


const PROJECTS_FOR_STATS = gql`
  query Projects($search: String) {
    projects(search: $search) {
      id
      stats {
        taskCount
        completedTasks
        completionRate
      }
    }
  }
`;

// ================== QUERIES & MUTATIONS ==================
const TASKS = gql`
  query Tasks($projectId: ID) {
    tasks(projectId: $projectId) {
      id
      title
      description
      status
      assigneeEmail
      dueDate
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask(
    $projectId: ID!
    $title: String!
    $description: String
    $status: String
    $assigneeEmail: String
    $dueDate: DateTime
  ) {
    createTask(
      projectId: $projectId
      title: $title
      description: $description
      status: $status
      assigneeEmail: $assigneeEmail
      dueDate: $dueDate
    ) {
      task {
        id
        title
        description
        status
        assigneeEmail
        dueDate
      }
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask(
    $id: ID!
    $title: String
    $description: String
    $status: String
    $assigneeEmail: String
    $dueDate: DateTime
  ) {
    updateTask(
      id: $id
      title: $title
      description: $description
      status: $status
      assigneeEmail: $assigneeEmail
      dueDate: $dueDate
    ) {
      task {
        id
        title
        description
        status
        assigneeEmail
        dueDate
      }
    }
  }
`;

const ADD_COMMENT = gql`
  mutation AddComment($taskId: ID!, $content: String!, $authorEmail: String!) {
    addTaskComment(
      taskId: $taskId
      content: $content
      authorEmail: $authorEmail
    ) {
      comment {
        id
        content
        authorEmail
        timestamp
      }
    }
  }
`;

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeEmail?: string;
  dueDate?: string;
}

interface TaskBoardProps {
  projectId: string | null;
  orgSlug: string;
}

export default function TaskBoard({ projectId, orgSlug }: TaskBoardProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeEmail: "",
    dueDate: "",
  });
  const [editing, setEditing] = useState<Task | null>(null);

  const { data, loading, error, refetch } = useQuery(TASKS, {
    variables: { projectId, orgSlug },
    skip: !projectId,
  });

  useEffect(() => {
    if (projectId) {
      refetch({ projectId, orgSlug });
      setEditing(null);
      setForm({ title: "", description: "", assigneeEmail: "", dueDate: "" });
    }
  }, [projectId, orgSlug, refetch]);

  // refetch tasks + projects (stats) after create
  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    refetchQueries: [
      { query: TASKS, variables: { projectId } },
      { query: PROJECTS_FOR_STATS, variables: { search: "" } },
    ],
    awaitRefetchQueries: true,
  });

  // refetch tasks + projects (stats) after update/move
  const [updateTask] = useMutation(UPDATE_TASK, {
    refetchQueries: [
      { query: TASKS, variables: { projectId } },
      { query: PROJECTS_FOR_STATS, variables: { search: "" } },
    ],
    awaitRefetchQueries: true,
    onCompleted: () => setEditing(null),
  });

  const [addComment] = useMutation(ADD_COMMENT);

  if (!projectId) {
    return (
      <div className="p-6 rounded-2xl shadow bg-white">
        <p className="text-gray-600">Select a project to view tasks.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("Title required");

    if (editing) {
      await updateTask({
        variables: { id: editing.id, ...form, dueDate: form.dueDate || null },
      });
    } else {
      await createTask({
        variables: { projectId, ...form, dueDate: form.dueDate || null },
      });
    }
    setForm({ title: "", description: "", assigneeEmail: "", dueDate: "" });
    setEditing(null);
  };

  const move = async (id: string, status: Task["status"]) => {
    await updateTask({ variables: { id, status } });
  };

  const comment = async (id: string) => {
    const content = prompt("Comment");
    const email = prompt("Your email") || "user@example.com";
    if (content) {
      await addComment({
        variables: { taskId: id, content, authorEmail: email },
      });
    }
  };

  const startEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigneeEmail: task.assigneeEmail || "",
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
    });
  };

  // today date for restricting past dates
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 rounded-2xl shadow bg-white">
      <h2 className="text-2xl font-bold mb-4">Task Board</h2>
      {loading && <p className="text-gray-500">Loading tasks...</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      <div className="grid md:grid-cols-3 gap-6">
        {["TODO", "IN_PROGRESS", "DONE"].map((col) => (
          <div
            key={col}
            className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col"
          >
            <div className="font-semibold text-lg mb-3">
              {col.replace("_", " ")}
            </div>
            <ul className="space-y-3 flex-1">
              {data?.tasks
                ?.filter((t: Task) => t.status === col)
                .map((t: Task) => (
                  <li
                    key={t.id}
                    className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
                  >
                    <div className="font-medium">{t.title}</div>
                    {t.description && (
                      <div className="text-sm text-gray-500">
                        {t.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {t.assigneeEmail}{" "}
                      {t.dueDate &&
                        `· due ${format(new Date(t.dueDate), "yyyy-MM-dd")}`}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {col !== "TODO" && (
                        <button
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                          onClick={() => move(t.id, "TODO")}
                        >
                          To Do
                        </button>
                      )}
                      {col !== "IN_PROGRESS" && (
                        <button
                          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded-lg"
                          onClick={() => move(t.id, "IN_PROGRESS")}
                        >
                          In Progress
                        </button>
                      )}
                      {col !== "DONE" && (
                        <button
                          className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 rounded-lg"
                          onClick={() => move(t.id, "DONE")}
                        >
                          Done
                        </button>
                      )}
                      <button
                        className="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded-lg"
                        onClick={() => comment(t.id)}
                      >
                        Comment
                      </button>
                      <button
                        className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded-lg"
                        onClick={() => startEdit(t)}
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Task Form */}
      <form
        onSubmit={submit}
        className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm"
      >
        <h3 className="font-semibold mb-3">
          {editing ? "Edit Task" : "Add Task"}
        </h3>
        <div className="grid gap-3">
          <input
            className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <input
            className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            placeholder="Assignee Email"
            value={form.assigneeEmail}
            onChange={(e) =>
              setForm({ ...form, assigneeEmail: e.target.value })
            }
          />
          {/*  restrict past dates */}
          <input
            className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            type="date"
            min={today}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <button
            className="p-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            disabled={creating}
          >
            {editing ? "Update Task" : creating ? "Saving..." : "Create Task"}
          </button>
          {editing && (
            <button
              type="button"
              className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              onClick={() => {
                setEditing(null);
                setForm({
                  title: "",
                  description: "",
                  assigneeEmail: "",
                  dueDate: "",
                });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
