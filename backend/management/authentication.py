import os

from rest_framework import authentication, exceptions
from supabase import create_client


class SupabaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None

        try:
            token = auth_header.split(' ')[1]
            supabase = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_SERVICE_ROLE')
            )
            
            # Verify the token with Supabase
            user = supabase.auth.get_user(token)
            
            if not user:
                raise exceptions.AuthenticationFailed('Invalid token')
            
            return (user, None)
            
        except Exception as e:
            raise exceptions.AuthenticationFailed('Invalid token') 