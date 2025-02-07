from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, SupplierViewSet, CustomerViewSet, EmployeeViewSet

router = DefaultRouter()

# Register both Inventory and Supplier endpoints
router.register(r'inventory', InventoryItemViewSet, basename="inventory")
router.register(r'suppliers', SupplierViewSet, basename="supplier")
router.register(r'customers', CustomerViewSet, basename="customers")
router.register(r'employees', EmployeeViewSet, basename="employees")

urlpatterns = [
    path('', include(router.urls)),
]
