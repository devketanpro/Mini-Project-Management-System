from django.utils.deprecation import MiddlewareMixin
from .models import Organization

class OrganizationContextMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Prefer explicit header, fallback to query param
        org_slug = request.headers.get("X-Org-Slug") or request.GET.get("org")
        request.organization = None
        if org_slug:
            try:
                request.organization = Organization.objects.get(slug=org_slug)
            except Organization.DoesNotExist:
                request.organization = None
        return None
