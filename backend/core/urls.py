from django.contrib import admin
from django.shortcuts import redirect  # Import the redirect function
from django.urls import include, path


# Define a redirect function for the root URL
def home(request):
    return redirect('/admin/')  # Redirect to the admin panel

urlpatterns = [
    path('admin/', admin.site.urls),  # Admin panel
    path('', home),  # Root URL redirects to admin
    path('api/', include('management.urls')),  # New unified app for inventory, supplier, customers, employees
]
