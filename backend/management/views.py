from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import status, viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Profile, StaffProfile, Delivery, InventoryItem, Supplier, Order
)
from .serializers import (
    DeliverySerializer, InventoryItemSerializer, SupplierSerializer,
    UserSerializer, ProfileSerializer, StaffProfileSerializer, OrderSerializer
)

# ──────────────── INVENTORY ────────────────
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().select_related('supplier')
    serializer_class = InventoryItemSerializer
    lookup_field = "item_id"

# ──────────────── SUPPLIER ────────────────
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

# ──────────────── STAFF ────────────────
class StaffProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset

# ──────────────── CUSTOMER PROFILES ────────────────
class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'id'

# ──────────────── SIGNUP ────────────────
class SignupView(APIView):
    def post(self, request):
        data = request.data.copy()
        if "password" not in data or not data["password"].strip():
            return Response({"error": "Password is required."}, status=400)

        data["password"] = make_password(data["password"])
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Signup successful."}, status=201)

        return Response(serializer.errors, status=400)

# ──────────────── LOGIN ────────────────
class LoginView(APIView):
    def post(self, request):
        username_or_email_or_phone = request.data.get("username_or_email_or_phone")
        password = request.data.get("password")

        if not username_or_email_or_phone or not password:
            return Response({"error": "Username/email/phone and password are required."}, status=400)

        User = get_user_model()
        user = None

        if "@" in username_or_email_or_phone:
            user = User.objects.filter(email=username_or_email_or_phone).first()
        elif username_or_email_or_phone.isdigit():
            user = User.objects.filter(phone=username_or_email_or_phone).first()
        else:
            user = User.objects.filter(username=username_or_email_or_phone).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            })

        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

# ──────────────── LOGOUT ────────────────
class LogoutView(APIView):
    def post(self, request):
        return Response({'message': 'Logout successful'}, status=200)

# ──────────────── ORDERS ────────────────
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-date_ordered')
    serializer_class = OrderSerializer
    lookup_field = 'order_id'

    @action(detail=True, methods=["PUT"])
    def update_status(self, request, order_id=None):
        order = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["Pending", "Packed", "In Transit", "Delivered", "Cancelled"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        order.status = new_status
        if new_status == "Packed":
            order.packed_at = timezone.now()
        elif new_status == "In Transit":
            order.in_transit_at = timezone.now()
        elif new_status == "Delivered":
            order.delivered_at = timezone.now()

        order.save()
        return Response({"message": f"Order status updated to {new_status}"})

# ──────────────── DELIVERIES ────────────────
class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer

    @action(detail=True, methods=["PUT"])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["Pending", "Packed", "In Transit", "Delivered"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        delivery.status = new_status
        delivery.save()
        return Response({"message": f"Delivery status updated to {new_status}"})


# ──────────────── CUSTOMER ACTIVATION ────────────────
class CustomerActivationView(APIView):
    def post(self, request, customer_id):
        try:
            customer = Profile.objects.get(id=customer_id)
            customer.is_active = True
            customer.save(update_fields=["is_active"])
            return Response({"message": "Customer account activated successfully."})
        except Profile.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)


class CustomerListAPIView(generics.ListCreateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

class CustomerDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer