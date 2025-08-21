// /frontend/src/App.tsx
import { useState } from "react";
import { gql, useMutation, useLazyQuery } from "@apollo/client";
import ProjectDashboard from "./pages/ProjectDashboard";
import TaskBoard from "./pages/TaskBoard";
import OrgModal from "./components/OrgModal";

// GraphQL mutation to create organization
const CREATE_ORG = gql`
  mutation CreateOrg($slug: String!, $name: String!) {
    createOrganization(slug: $slug, name: $name) {
      organization {
        id
        slug
        name
      }
    }
  }
`;

// Query to fetch all organizations
const GET_ALL_ORGS = gql`
  query GetAllOrgs {
    allOrganizations {
      id
      slug
      name
    }
  }
`;

// Type for organization
interface Organization {
  id: string;
  slug: string;
  name: string;
}

export default function App() {
  const [org, setOrg] = useState<string>(
    localStorage.getItem("orgSlug") || "demo-org"
  );
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<null | "create" | "switch">(null);

  const [createOrgMutation] = useMutation(CREATE_ORG);
  const [fetchAllOrgs] = useLazyQuery(GET_ALL_ORGS);

  // Helper function for case-insensitive check
  const orgExists = (slug: string, orgList: Organization[]) =>
    orgList.some((o) => o.slug.toLowerCase() === slug.toLowerCase());

  // Create organization
  const handleCreateOrg = async (slug: string) => {
    try {
      const existing = await fetchAllOrgs();
      const orgList: Organization[] = existing.data?.allOrganizations || [];

      if (orgExists(slug, orgList)) {
        alert(" Organization already exists. Please create a new one.");
        return;
      }

      const res = await createOrgMutation({ variables: { slug, name: slug } });
      const newOrg: Organization = res.data.createOrganization.organization;

      localStorage.setItem("orgSlug", newOrg.slug);
      setOrg(newOrg.slug);
      setShowModal(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to create org: " + e.message);
    }
  };

  // Switch organization
  const handleSwitchOrg = async (slug: string) => {
    try {
      const existing = await fetchAllOrgs();
      const orgList: Organization[] = existing.data?.allOrganizations || [];

      if (!orgExists(slug, orgList)) {
        alert(" Slug does not exist. Enter another. ");
        return;
      }

      const matchedOrg = orgList.find(
        (o) => o.slug.toLowerCase() === slug.toLowerCase()
      )!; // safe because we checked above

      localStorage.setItem("orgSlug", matchedOrg.slug);
      setOrg(matchedOrg.slug);

      // reset selected project
      setProjectId(null);
      setProjectName(null);

      setShowModal(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to switch org: " + e.message);
    }
  };

  const handleOpenTasks = (id: string, name: string) => {
    setProjectId(id);
    setProjectName(name);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mini Project Management</h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowModal("create")}
            className="px-3 py-2 rounded-xl shadow border bg-green-100"
          >
            ➕ New Org
          </button>
          <button
            onClick={() => setShowModal("switch")}
            className="px-3 py-2 rounded-xl shadow border"
          >
            Org: {org}
          </button>
        </div>
      </header>

      {/* Dashboard & Task Board */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <ProjectDashboard orgSlug={org} onOpenTasks={handleOpenTasks} />
        </div>
        <div className="space-y-4">
          {projectId ? (
            <TaskBoard projectId={projectId} orgSlug={org} />
          ) : (
            <p className="text-gray-500">No project selected yet</p>
          )}
        </div>
      </div>

      {/* Org Modal */}
      {showModal && (
        <OrgModal
          initialValue={org}
          onClose={() => setShowModal(null)}
          onSave={(slug) =>
            showModal === "create"
              ? handleCreateOrg(slug)
              : handleSwitchOrg(slug)
          }
        />
      )}
    </div>
  );
}
