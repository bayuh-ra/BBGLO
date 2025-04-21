from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import StaffProfile


class CheckEmployeeStatusMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Skip middleware for login and public endpoints
        if request.path in ['/api/token/', '/api/token/refresh/']:
            return None

        try:
            # Get the authenticated user
            auth = JWTAuthentication()
            auth_result = auth.authenticate(request)
            
            if auth_result is None:
                # No authentication provided, allow the request to continue
                return None
                
            user, _ = auth_result
            
            if user:
                # Check if user is associated with a staff profile
                try:
                    staff_profile = StaffProfile.objects.get(user=user)
                    if staff_profile.status == "Deleted":
                        return JsonResponse(
                            {"error": "This account has been deleted and cannot be accessed."},
                            status=403
                        )
                    elif staff_profile.status == "Deactivated":
                        return JsonResponse(
                            {"error": "This account has been deactivated. Please contact the administrator."},
                            status=403
                        )
                except StaffProfile.DoesNotExist:
                    # If no staff profile exists, allow the request to continue
                    return None
                    
        except Exception as e:
            # Log the error but allow the request to continue
            print(f"Middleware error: {str(e)}")
            return None
            
        return None 