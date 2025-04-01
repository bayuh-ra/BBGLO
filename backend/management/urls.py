from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ProfileViewSet,
    DeliveryViewSet,
    StaffProfileViewSet,
    InventoryItemViewSet,
    LoginView,
    LogoutView,
    SignupView,
    SupplierViewSet,
    CustomerActivationView,
    OrderViewSet,
)

router = DefaultRouter()

# RESTful API Endpoints
router.register(r'profiles', ProfileViewSet, basename='profiles')                  # Customer profiles
router.register(r'staff-profiles', StaffProfileViewSet, basename='staff-profiles') # Admin/Employee
router.register(r'inventory', InventoryItemViewSet, basename='inventory')          # Products
router.register(r'suppliers', SupplierViewSet, basename='suppliers')              # Supplier info
router.register(r'orders', OrderViewSet, basename='orders')                        # Sales Orders
router.register(r'deliveries', DeliveryViewSet, basename='deliveries')            # Delivery info

urlpatterns = [
    path('', include(router.urls)),

    # Auth routes
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Optional: Customer activation (via UUID)
    path('profiles/<uuid:customer_id>/activate/', CustomerActivationView.as_view(), name='customer-activate'),
]
