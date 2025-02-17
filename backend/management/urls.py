from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (CustomerViewSet, DeliveryViewSet, EmployeeViewSet,
                    InventoryItemViewSet, LoginView, LogoutView, SignupView,
                    SupplierViewSet, CustomerActivationView)

router = DefaultRouter()

# Register both Inventory and Supplier endpoints
router.register(r'inventory', InventoryItemViewSet, basename="inventory")
router.register(r'suppliers', SupplierViewSet, basename="supplier")
router.register(r'customers', CustomerViewSet, basename="customers")
router.register(r'employees', EmployeeViewSet, basename="employees")
router.register(r'deliveries', DeliveryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('api/inventory/', include(router.urls)), 
    path('customers/<str:customer_id>/activate/', CustomerActivationView.as_view(), name='customer-activate'),

]

