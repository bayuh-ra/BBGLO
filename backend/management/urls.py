from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views
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
    InviteStaffView,
    ResendInviteView,
    StockInRecordViewSet,
)


router = DefaultRouter()

# RESTful API Endpoints
router.register(r'profiles', ProfileViewSet, basename='profiles')                  # Customer profiles
router.register(r'staff-profiles', StaffProfileViewSet, basename='staff-profiles') # Admin/Employee
router.register(r'employees', StaffProfileViewSet, basename='employees')
router.register(r'inventory', InventoryItemViewSet, basename='inventory')          # Products
router.register(r'suppliers', SupplierViewSet, basename='suppliers')              # Supplier info
router.register(r'orders', OrderViewSet, basename='orders')                        # Sales Orders
router.register(r'deliveries', DeliveryViewSet, basename='deliveries') 
router.register(r'stockin', StockInRecordViewSet)          

urlpatterns = [
    path('', include(router.urls)),

    # Auth routes
    path('api/', include('management.api_urls')),
    path('resend-invite/', ResendInviteView.as_view(), name='resend-invite'),
    path('invite-staff/', InviteStaffView.as_view(), name='invite-staff'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    path('staff-profiles/<str:staff_id>/', views.StaffProfileUpdateView.as_view()),
    path('staff-profiles/<str:staff_id>/deactivate/', views.StaffProfileDeactivateView.as_view(), name='deactivate-staff'),
    path('staff-profiles/<str:staff_id>/delete/', views.StaffProfileDeleteView.as_view(), name='delete-staff'),
    path('staff-profiles/<str:staff_id>/activate/', views.StaffProfileActivateView.as_view()),

    # Optional: Customer activation (via UUID)
    path('profiles/<uuid:customer_id>/activate/', CustomerActivationView.as_view(), name='customer-activate'),
]
