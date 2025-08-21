  // /src/pages/ProjectDashboard.tsx
  import { gql, useMutation, useQuery } from '@apollo/client'
  import { useState, useEffect } from 'react'
  import type { Project } from '../types'
  import { format } from 'date-fns'

  const PROJECTS = gql`
    query Projects($search: String) {
      projects(search: $search) {
        id
        name
        description
        status
        dueDate
        stats {
          taskCount
          completedTasks
          completionRate
        }
      }
    }
  `

  const CREATE_PROJECT = gql`
    mutation CreateProject($name: String!, $description: String, $status: String, $dueDate: Date) {
      createProject(
        name: $name
        description: $description
        status: $status
        dueDate: $dueDate
      ) {
        project {
          id
          name
          description
          status
          dueDate
          stats {
            taskCount
            completedTasks
            completionRate
          }
        }
      }
    }
  `

  const UPDATE_PROJECT = gql`
    mutation UpdateProject($id: ID!, $name: String, $description: String, $status: String, $dueDate: Date) {
      updateProject(
        id: $id
        name: $name
        description: $description
        status: $status
        dueDate: $dueDate
      ) {
        project {
          id
          name
          description
          status
          dueDate
          stats {
            taskCount
            completedTasks
            completionRate
          }
        }
      }
    }
  `

  export default function ProjectDashboard({
    orgSlug,
    onOpenTasks,
  }: {
    orgSlug: string
    onOpenTasks: (id: string, name: string) => void
  }) {
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({ id: '', name: '', description: '', status: 'ACTIVE', dueDate: '' })
    const [isEditing, setIsEditing] = useState(false)
    const [selectedProject, setSelectedProject] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 4

    const { data, loading, error, refetch } = useQuery<{ projects: Project[] }>(
      PROJECTS,
      {
        variables: { search, orgSlug }, // pass orgSlug to query
        fetchPolicy: "network-only",
      }
    )

    // refetch whenever orgSlug changes
    useEffect(() => {
      refetch({ search, orgSlug })
      setSelectedProject(null)
    }, [orgSlug, refetch, search])



    const today = format(new Date(), 'yyyy-MM-dd')

    const [createProject, { loading: savingCreate }] = useMutation(CREATE_PROJECT, {
      refetchQueries: [{ query: PROJECTS, variables: { search } }],
    })

    const [updateProject, { loading: savingUpdate }] = useMutation(UPDATE_PROJECT, {
      refetchQueries: [{ query: PROJECTS, variables: { search } }],
    })

    const submit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.name.trim()) return alert('Name required')

      if (isEditing) {
        await updateProject({ variables: { ...form, dueDate: form.dueDate || null } })
      } else {
        await createProject({ variables: { ...form, dueDate: form.dueDate || null } })
      }

      setForm({ id: '', name: '', description: '', status: 'ACTIVE', dueDate: '' })
      setIsEditing(false)
    }

    const startEdit = (project: Project) => {
      setForm({
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status,
        dueDate: project.dueDate ? project.dueDate.substring(0, 10) : '',
      })
      setIsEditing(true)
    }

    // pagination logic
    const projects = data?.projects ?? []
    const totalPages = Math.ceil(projects.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const visibleProjects = projects.slice(startIndex, startIndex + itemsPerPage)

    return (
      <div className="p-4 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-2">Projects</h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full mb-3 p-2 border rounded-xl"
        />

        {selectedProject && (
          <div className="mb-3 p-2 bg-green-100 border border-green-400 rounded-xl text-sm">
            Selected Project: <strong>{projects.find((p: Project) => p.id === selectedProject)?.name}</strong>
          </div>
        )}

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        <ul className="space-y-2">
          {visibleProjects.map((p: Project) => (
            <li
              key={p.id}
              onClick={() => {
                setSelectedProject(p.id)
                onOpenTasks(p.id, p.name)
              }}
              className={`p-3 border rounded-xl cursor-pointer transition ${
                selectedProject === p.id ? 'bg-blue-100 border-blue-500' : 'hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm opacity-70">{p.description}</div>
                  {p.dueDate && (
                    <div className="text-xs text-gray-500">
                      Due: {format(new Date(p.dueDate), 'yyyy-MM-dd')}
                    </div>
                  )}
                </div>
                <div className="text-sm text-right">
                  <div>Status: <span className="font-mono">{p.status}</span></div>
                  <div>
                    Done: {p.stats?.completedTasks ?? 0}/{p.stats?.taskCount ?? 0}
                  </div>
                  <button
                    className="ml-2 text-blue-600 underline"
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      startEdit(p)
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/*  pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-4">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-4 grid gap-2">
          <h3 className="font-semibold">{isEditing ? 'Update Project' : 'Create Project'}</h3>
          <input
            className="p-2 border rounded-xl"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            className="p-2 border rounded-xl"
            placeholder="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="p-2 border rounded-xl"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ON_HOLD">ON_HOLD</option>
          </select>
          <input
            className="p-2 border rounded-xl"
            type="date"
            value={form.dueDate}
            min={today}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
          />
          <button
            className="p-2 rounded-xl border shadow"
            disabled={savingCreate || savingUpdate}
          >
            {isEditing
              ? savingUpdate ? 'Updating...' : 'Update Project'
              : savingCreate ? 'Saving...' : 'Create Project'}
          </button>
          {isEditing && (
            <button
              type="button"
              className="p-2 rounded-xl border shadow bg-gray-200"
              onClick={() => {
                setForm({ id: '', name: '', description: '', status: 'ACTIVE', dueDate: '' })
                setIsEditing(false)
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    )
  }
