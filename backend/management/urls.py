from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (CustomerViewSet, EmployeeViewSet, InventoryItemViewSet,
                    LoginView, LogoutView, SignupView, SupplierViewSet)

router = DefaultRouter()

# Register both Inventory and Supplier endpoints
router.register(r'inventory', InventoryItemViewSet, basename="inventory")
router.register(r'suppliers', SupplierViewSet, basename="supplier")
router.register(r'customers', CustomerViewSet, basename="customers")
router.register(r'employees', EmployeeViewSet, basename="employees")

urlpatterns = [
    path('', include(router.urls)),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
