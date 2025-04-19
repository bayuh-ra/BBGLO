from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .views import (  # InventoryItemViewSet,
    CustomerActivationView,
    CustomerDetailAPIView,
    DeliveryViewSet,
    InventoryItemViewSet,
    InviteStaffView,
    LoginView,
    LogoutView,
    OrderViewSet,
    ProfileViewSet,
    PurchaseOrderViewSet,
    ResendInviteView,
    SignupView,
    StaffProfileActivateView,
    StaffProfileDeactivateView,
    StaffProfileDeleteView,
    StaffProfileUpdateView,
    StaffProfileViewSet,
    StockInRecordViewSet,
    SupplierViewSet,
)

router = DefaultRouter()

# RESTful API Endpoints
router.register(r'profiles', ProfileViewSet, basename='profiles')                   # Customer profiles
router.register(r'staff-profiles', StaffProfileViewSet, basename='staff-profiles') # Admin/Employee
router.register(r'employees', StaffProfileViewSet, basename='employees')
router.register(r'inventory', InventoryItemViewSet, basename='inventory')           # Products
router.register(r'suppliers', SupplierViewSet, basename='suppliers')               # Supplier info
router.register(r'orders', OrderViewSet, basename='orders')                         # Sales Orders
router.register(r'deliveries', DeliveryViewSet, basename='deliveries')
router.register(r'stockin', StockInRecordViewSet, basename='stockin')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchaseorder')

urlpatterns = [
    path('', include(router.urls)),

    # Auth routes
    path('api/', include('management.api_urls')),
    path('resend-invite/', ResendInviteView.as_view(), name='resend-invite'),
    path('invite-staff/', InviteStaffView.as_view(), name='invite-staff'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Staff management
    path('staff-profiles/<str:staff_id>/', StaffProfileUpdateView.as_view()),
    path('staff-profiles/<str:staff_id>/deactivate/', StaffProfileDeactivateView.as_view(), name='deactivate-staff'),
    path('staff-profiles/<str:staff_id>/delete/', StaffProfileDeleteView.as_view(), name='delete-staff'),
    path('staff-profiles/<str:staff_id>/activate/', StaffProfileActivateView.as_view()),

    # Customer management
    path('customer/<str:customer_id>/', CustomerDetailAPIView.as_view(), name='customer-detail'),
    path('customer/<str:customer_id>/status/', CustomerActivationView.as_view(), name='customer-status'),
]