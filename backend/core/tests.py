from django.test import TestCase
from .models import Organization, Project, Task, TaskComment

class BasicModelTest(TestCase):
    # Test 1: Create organization
    def test_create_organization(self):
        org = Organization.objects.create(
            name="DemoOrg",
            slug="demo-org",
            contact_email="demo@example.com"
        )
        self.assertEqual(org.name, "DemoOrg")
        self.assertEqual(org.slug, "demo-org")
        self.assertEqual(org.contact_email, "demo@example.com")

    # Test 2: Create project linked to org
    def test_create_project(self):
        org = Organization.objects.create(name="DemoOrg", slug="demo-org")
        project = Project.objects.create(
            organization=org,
            name="Project X",
            status="ACTIVE"
        )
        self.assertEqual(project.organization.id, org.id)
        self.assertEqual(project.name, "Project X")
        self.assertEqual(project.status, "ACTIVE")

    # Test 3: Create task linked to project
    def test_create_task(self):
        org = Organization.objects.create(name="DemoOrg", slug="demo-org")
        project = Project.objects.create(organization=org, name="Project X", status="ACTIVE")
        task = Task.objects.create(
            project=project,
            title="Task 1",
            description="Test task",
            status="TODO",
            assignee_email="user@example.com"
        )
        self.assertEqual(task.project.id, project.id)
        self.assertEqual(task.title, "Task 1")
        self.assertEqual(task.status, "TODO")

    # Test 4: Add comment to a task
    def test_add_comment(self):
        org = Organization.objects.create(name="DemoOrg", slug="demo-org")
        project = Project.objects.create(organization=org, name="Project X", status="ACTIVE")
        task = Task.objects.create(project=project, title="Task 1")
        comment = TaskComment.objects.create(
            task=task,
            content="First Comment",
            author_email="commenter@example.com"
        )
        self.assertEqual(comment.task.id, task.id)
        self.assertEqual(comment.content, "First Comment")
        self.assertEqual(comment.author_email, "commenter@example.com")

    # Test 5: Task completion count logic
    def test_task_completion_count(self):
        org = Organization.objects.create(name="DemoOrg", slug="demo-org")
        project = Project.objects.create(organization=org, name="Project X", status="ACTIVE")
        Task.objects.create(project=project, title="Task 1", status="DONE")
        Task.objects.create(project=project, title="Task 2", status="TODO")
        self.assertEqual(project.tasks.filter(status="DONE").count(), 1)
        self.assertEqual(project.tasks.count(), 2)
