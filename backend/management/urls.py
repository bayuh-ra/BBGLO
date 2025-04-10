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
    InviteStaffView,
    ResendInviteView,
    StockInRecordViewSet,
    StaffProfileUpdateView,
    StaffProfileDeleteView,
)

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profiles')
router.register(r'staff-profiles', StaffProfileViewSet, basename='staff-profiles')
router.register(r'employees', StaffProfileViewSet, basename='employees')
router.register(r'inventory', InventoryItemViewSet, basename='inventory')
router.register(r'suppliers', SupplierViewSet, basename='suppliers')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'deliveries', DeliveryViewSet, basename='deliveries')
router.register(r'stockin', StockInRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),

    # Auth
    path('api/', include('management.api_urls')),
    path('resend-invite/', ResendInviteView.as_view(), name='resend-invite'),
    path('invite-staff/', InviteStaffView.as_view(), name='invite-staff'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Staff
    path('staff-profiles/<str:staff_id>/', StaffProfileUpdateView.as_view()),
    path('staff-profiles/<str:staff_id>/delete/', StaffProfileDeleteView.as_view(), name='delete-staff'),

    # Customers
    path('profiles/<uuid:customer_id>/activate/', CustomerActivationView.as_view(), name='customer-activate'),
]
