import graphene
from graphene_django import DjangoObjectType
from django.db.models import Q
from .models import Organization, Project, Task, TaskComment
from graphene.types.datetime import Date, DateTime

# ====================
# GraphQL Types
# ====================
class OrganizationType(DjangoObjectType):
    class Meta:
        model = Organization
        fields = ("id", "name", "slug", "contact_email", "created_at")

class ProjectStatsType(graphene.ObjectType):
    taskCount = graphene.Int()
    completedTasks = graphene.Int()
    completionRate = graphene.Float()

class ProjectType(DjangoObjectType):
    stats = graphene.Field(ProjectStatsType)

    class Meta:
        model = Project
        fields = ("id", "name", "description", "status", "due_date", "created_at", "organization", "tasks")

    def resolve_stats(self, info):
        total = self.tasks.count()
        done = self.tasks.filter(status="DONE").count()
        return ProjectStatsType(
            taskCount=total, completedTasks=done, completionRate=(done / total if total else 0.0)
        )

class TaskType(DjangoObjectType):
    class Meta:
        model = Task
        fields = ("id", "title", "description", "status", "assignee_email", "due_date", "created_at", "project", "comments")

class TaskCommentType(DjangoObjectType):
    class Meta:
        model = TaskComment
        fields = ("id", "content", "author_email", "timestamp", "task")

# ====================
# Helper
# ====================
def get_organization(info):
    request = info.context
    org_slug = request.META.get("HTTP_X_ORG_SLUG")
    if not org_slug:
        raise Exception("Missing or invalid organization context. Provide X-Org-Slug header.")
    try:
        org = Organization.objects.get(slug=org_slug)
    except Organization.DoesNotExist:
        raise Exception("Invalid organization slug")
    return org

# ====================
# Queries
# ====================
class Query(graphene.ObjectType):
    organizations = graphene.List(OrganizationType)   # only current org
    all_organizations = graphene.List(OrganizationType)  # every org in DB
    projects = graphene.List(ProjectType, search=graphene.String())
    project = graphene.Field(ProjectType, id=graphene.ID(required=True))
    tasks = graphene.List(TaskType, project_id=graphene.ID(required=False))
    stats_for_project = graphene.Field(ProjectStatsType, project_id=graphene.ID(required=True))

    def resolve_organizations(self, info):
        org = get_organization(info)
        return [org]

    def resolve_all_organizations(self, info):
        return Organization.objects.all().order_by("created_at")

    def resolve_projects(self, info, search=None):
        org = get_organization(info)
        qs = Project.objects.filter(organization=org).order_by("-created_at")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs

    def resolve_project(self, info, id):
        org = get_organization(info)
        return Project.objects.get(id=id, organization=org)

    def resolve_tasks(self, info, project_id=None):
        org = get_organization(info)
        qs = Task.objects.filter(project__organization=org).order_by("-created_at")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def resolve_stats_for_project(self, info, project_id):
        org = get_organization(info)
        proj = Project.objects.get(id=project_id, organization=org)
        total = proj.tasks.count()
        done = proj.tasks.filter(status="DONE").count()
        return ProjectStatsType(
            taskCount=total, completedTasks=done, completionRate=(done / total if total else 0.0)
        )

# ====================
# Mutations
# ====================
class CreateOrganization(graphene.Mutation):
    class Arguments:
        slug = graphene.String(required=True)
        name = graphene.String(required=True)
        contact_email = graphene.String(required=False)

    organization = graphene.Field(OrganizationType)

    def mutate(self, info, slug, name, contact_email=None):
        if Organization.objects.filter(slug=slug).exists():
            raise Exception("Organization with this slug already exists")

        org = Organization.objects.create(
            slug=slug,
            name=name,
            contact_email=contact_email or ""
        )
        return CreateOrganization(organization=org)

class CreateProject(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        description = graphene.String(required=False)
        status = graphene.String(required=False)
        due_date = graphene.Date(required=False)

    project = graphene.Field(ProjectType)

    def mutate(self, info, name, description=None, status="ACTIVE", due_date=None):
        org = get_organization(info)
        project = Project.objects.create(
            organization=org,
            name=name,
            description=description or "",
            status=status,
            due_date=due_date
        )
        return CreateProject(project=project)

class UpdateProject(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        name = graphene.String(required=False)
        description = graphene.String(required=False)
        status = graphene.String(required=False)
        due_date = graphene.Date(required=False)

    project = graphene.Field(ProjectType)

    def mutate(self, info, id, **kwargs):
        org = get_organization(info)
        project = Project.objects.get(id=id, organization=org)
        for k, v in kwargs.items():
            if v is not None:
                setattr(project, k, v)
        project.save()
        return UpdateProject(project=project)

class CreateTask(graphene.Mutation):
    class Arguments:
        project_id = graphene.ID(required=True)
        title = graphene.String(required=True)
        description = graphene.String(required=False)
        status = graphene.String(required=False)
        assignee_email = graphene.String(required=False)
        due_date = graphene.types.datetime.DateTime(required=False)

    task = graphene.Field(TaskType)

    def mutate(self, info, project_id, title, description="", status="TODO", assignee_email="", due_date=None):
        org = get_organization(info)
        project = Project.objects.get(id=project_id, organization=org)
        task = Task.objects.create(
            project=project,
            title=title,
            description=description or "",
            status=status,
            assignee_email=assignee_email or "",
            due_date=due_date
        )
        return CreateTask(task=task)

class UpdateTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        title = graphene.String(required=False)
        description = graphene.String(required=False)
        status = graphene.String(required=False)
        assignee_email = graphene.String(required=False)
        due_date = graphene.types.datetime.DateTime(required=False)

    task = graphene.Field(TaskType)

    def mutate(self, info, id, **kwargs):
        org = get_organization(info)
        task = Task.objects.get(id=id, project__organization=org)
        for k, v in kwargs.items():
            if v is not None:
                setattr(task, k, v)
        task.save()
        return UpdateTask(task=task)

class AddTaskComment(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        content = graphene.String(required=True)
        author_email = graphene.String(required=True)

    comment = graphene.Field(TaskCommentType)

    def mutate(self, info, task_id, content, author_email):
        org = get_organization(info)
        task = Task.objects.get(id=task_id, project__organization=org)
        comment = TaskComment.objects.create(task=task, content=content, author_email=author_email)
        return AddTaskComment(comment=comment)

# ====================
# Root Schema
# ====================
class Mutation(graphene.ObjectType):
    create_organization = CreateOrganization.Field()
    create_project = CreateProject.Field()
    update_project = UpdateProject.Field()
    create_task = CreateTask.Field()
    update_task = UpdateTask.Field()
    add_task_comment = AddTaskComment.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
