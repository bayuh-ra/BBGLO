# management/api_urls.py
from django.urls import path
from .views import CustomerListAPIView, CustomerDetailAPIView

urlpatterns = [
    path("customers/", CustomerListAPIView.as_view(), name="customer-list"),
    path("customers/<str:pk>/", CustomerDetailAPIView.as_view(), name="customer-detail"),
]
