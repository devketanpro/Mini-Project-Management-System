from django.test import TestCase, RequestFactory
from graphene.test import Client
from .schema import schema
from .models import Organization, Project

class GraphQLTest(TestCase):
    def setUp(self):
        self.client = Client(schema)
        self.factory = RequestFactory()
        # Create default org
        self.org = Organization.objects.create(name="DemoOrg", slug="demo-org")

    # Test 1: Create organization mutation
    def test_create_organization(self):
        mutation = '''
        mutation {
          createOrganization(slug: "test-org", name: "Test Org") {
            organization {
              id
              slug
              name
            }
          }
        }
        '''
        response = self.client.execute(mutation)
        data = response['data']['createOrganization']['organization']
        self.assertEqual(data['slug'], 'test-org')
        self.assertEqual(data['name'], 'Test Org')

    # Test 2: Create project mutation
    def test_create_project(self):
        mutation = '''
        mutation {
          createProject(name: "Project X") {
            project {
              id
              name
            }
          }
        }
        '''
        # Create a fake request with META
        request = self.factory.post("/graphql/")
        request.META["HTTP_X_ORG_SLUG"] = "demo-org"

        response = self.client.execute(mutation, context_value=request)
        data = response['data']['createProject']['project']
        self.assertEqual(data['name'], "Project X")
