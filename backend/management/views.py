import os
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework import status, viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from supabase import create_client

from .models import (
    Profile, StaffProfile, Delivery, InventoryItem, Supplier, Order, StockInRecord
)
from .serializers import (
    DeliverySerializer, InventoryItemSerializer, SupplierSerializer,
    UserSerializer, ProfileSerializer, StaffProfileSerializer,
    OrderSerializer, StockInRecordSerializer
)

# Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE")
client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ──────────────── STAFF ────────────────
class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, staff_id=None):
        print(f"🔧 Deactivating: {staff_id}")
        try:
            staff = self.get_object()
            staff.status = "Deactivated"
            staff.save()
            return Response({"message": "Deactivated"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, staff_id=None):
        print(f"⚙️ Activating: {staff_id}")
        try:
            staff = self.get_object()
            staff.status = "Active"
            staff.save()
            return Response({"message": "Activated"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StaffProfileUpdateView(generics.UpdateAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

class StaffProfileDeleteView(generics.DestroyAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Deleted'
        instance.save()
        return Response({'message': 'Employee deleted.'}, status=status.HTTP_200_OK)

# ──────────────── CUSTOMERS ────────────────
class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'id'

class CustomerListAPIView(generics.ListCreateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

class CustomerDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

class CustomerActivationView(APIView):
    def post(self, request, customer_id):
        try:
            customer = Profile.objects.get(id=customer_id)
            customer.is_active = True
            customer.save(update_fields=["is_active"])
            return Response({"message": "Customer account activated successfully."})
        except Profile.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)

# ──────────────── INVENTORY ────────────────
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().select_related('supplier')
    serializer_class = InventoryItemSerializer
    lookup_field = "item_id"

# ──────────────── STOCKIN ────────────────
class StockInRecordViewSet(viewsets.ModelViewSet):
    queryset = StockInRecord.objects.all().order_by('-created_at')
    serializer_class = StockInRecordSerializer

# ──────────────── SUPPLIER ────────────────
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

# ──────────────── DELIVERY ────────────────
class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer

    @action(detail=True, methods=["PUT"])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["Pending", "Packed", "In Transit", "Delivered"]:
            return Response({"error": "Invalid status"}, status=400)

        delivery.status = new_status
        delivery.save()
        return Response({"message": f"Delivery status updated to {new_status}"})

# ──────────────── ORDER ────────────────
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-date_ordered')
    serializer_class = OrderSerializer
    lookup_field = 'order_id'

    @action(detail=True, methods=["PUT"])
    def update_status(self, request, order_id=None):
        order = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["Pending", "Packed", "In Transit", "Delivered", "Cancelled"]:
            return Response({"error": "Invalid status"}, status=400)

        order.status = new_status
        if new_status == "Packed":
            order.packed_at = timezone.now()
        elif new_status == "In Transit":
            order.in_transit_at = timezone.now()
        elif new_status == "Delivered":
            order.delivered_at = timezone.now()

        order.save()
        return Response({"message": f"Order status updated to {new_status}"})

# ──────────────── SIGNUP & LOGIN ────────────────
class SignupView(APIView):
    def post(self, request):
        data = request.data.copy()
        if not data.get("password"):
            return Response({"error": "Password is required."}, status=400)

        data["password"] = make_password(data["password"])
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Signup successful."}, status=201)

        return Response(serializer.errors, status=400)

class LoginView(APIView):
    def post(self, request):
        identifier = request.data.get("username_or_email_or_phone")
        password = request.data.get("password")

        if not identifier or not password:
            return Response({"error": "Missing credentials."}, status=400)

        User = get_user_model()
        user = None

        if "@" in identifier:
            user = User.objects.filter(email=identifier).first()
        elif identifier.isdigit():
            user = User.objects.filter(phone=identifier).first()
        else:
            user = User.objects.filter(username=identifier).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            })

        return Response({"error": "Invalid credentials."}, status=401)

class LogoutView(APIView):
    def post(self, request):
        return Response({'message': 'Logout successful'}, status=200)

# ──────────────── INVITE STAFF ────────────────
class InviteStaffView(APIView):
    def post(self, request):
        email = request.data.get("email")
        role = request.data.get("role")

        if not email or not role:
            return Response({"error": "Email and role are required."}, status=400)

        try:
            invited = client.auth.admin.invite_user_by_email(email=email)
            user_id = invited.user.id
            StaffProfile.objects.create(
                id=user_id,
                email=email,
                role=role,
                created_at=timezone.now()
            )
            return Response({"message": f"Invitation sent to {email}"})

        except Exception as e:
            return Response({"error": str(e)}, status=500)

class ResendInviteView(APIView):
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required."}, status=400)

        try:
            result = client.auth.admin.invite_user_by_email(email=email)
            if result.user:
                return Response({"message": f"Invitation resent to {email}"})
            return Response({"error": "Failed to resend invite."}, status=500)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
