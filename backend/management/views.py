import logging
import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db.models import Max
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from supabase import create_client

from .models import (
    Delivery,
    InventoryItem,
    Order,
    Profile,
    PurchaseOrder,
    StaffProfile,
    StockInRecord,
    Supplier,
)
from .serializers import (
    PurchaseOrderDetailSerializer,  # Import PurchaseOrderDetailSerializer here
)
from .serializers import (
    PurchaseOrderItemSerializer,  # Import PurchaseOrderItemSerializer here
)
from .serializers import (
    DeliverySerializer,
    InventoryItemSerializer,
    OrderSerializer,
    ProfileSerializer,
    PurchaseOrderSerializer,
    StaffProfileSerializer,
    StockInRecordSerializer,
    SupplierSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

# Load Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE")
client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ──────────────── INVENTORY ────────────────
class InventoryViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer

    def get_permissions(self):
        if self.action == 'list':  # GET /api/inventory/
            return [AllowAny()]  # 👈 Let anyone view
        return super().get_permissions()
    
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().select_related('supplier')
    serializer_class = InventoryItemSerializer
    lookup_field = "item_id"

    def get_permissions(self):
        if self.action == 'list':  # GET /api/inventory/
            return [AllowAny()]  # 👈 Let anyone view
        return super().get_permissions()

# ──────────────── STOCKIN ────────────────
class StockInRecordViewSet(viewsets.ModelViewSet):
    queryset = StockInRecord.objects.select_related('item', 'supplier', 'stocked_by', 'purchase_order').all()
    serializer_class = StockInRecordSerializer
    lookup_field = 'stockin_id'

    def create(self, request, *args, **kwargs):
        purchase_order_id = request.data.get("purchase_order")
        stockin_id = request.data.get("stockin_id")

        # Check if stockin_id already exists
        if StockInRecord.objects.filter(stockin_id=stockin_id).exists():
            return Response(
                {"error": f"Stock-in ID {stockin_id} already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if a purchase order is linked and its status
        if purchase_order_id:
            try:
                po = PurchaseOrder.objects.get(po_id=purchase_order_id)
                if po.status == "Cancelled":
                    return Response(
                        {"error": "Stock-In not allowed. Purchase Order is Cancelled."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except PurchaseOrder.DoesNotExist:
                return Response(
                    {"error": "Linked Purchase Order not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        stockin = serializer.save()
        # Update inventory quantity
        item = stockin.item
        item.quantity += stockin.quantity
        item.save()

    @action(detail=False, methods=['get'], url_path='next-sequence')
    def next_sequence(self, request):
        # Get the highest sequence number from existing stock-in records
        max_sequence = StockInRecord.objects.aggregate(Max('stockin_id'))['stockin_id__max']
        
        if max_sequence:
            try:
                # Extract the sequence number from the existing ID
                sequence = int(max_sequence.split('-')[1][:3])
                next_sequence = sequence + 1
            except (IndexError, ValueError):
                next_sequence = 1
        else:
            next_sequence = 1
        
        return Response({'sequence': next_sequence})


# ──────────────── PURCHASE ORDER ────────────────
class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.prefetch_related('items__item').all()
    serializer_class = PurchaseOrderSerializer

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        try:
            purchase_order = self.get_queryset().prefetch_related('items').get(pk=pk)
            serializer = PurchaseOrderDetailSerializer(purchase_order)

            # Debug unit_price
            if purchase_order.items.exists():
                first_item = purchase_order.items.first()
                print(f"Type of unit_price in Django: {type(first_item.unit_price)}")
                print(f"Value of unit_price in Django: {first_item.unit_price}")

            return Response(serializer.data)
        except PurchaseOrder.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    # ✅ Add this to handle status updates
    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        try:
            po = self.get_object()
            new_status = request.data.get("status")

            if new_status not in ["Pending", "Approved", "Completed", "Cancelled", "Stocked"]:
                return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

            po.status = new_status
            po.save()
            return Response({"message": f"PO {po.po_id} updated to {new_status}."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ──────────────── SUPPLIER ────────────────
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer


# ──────────────── STAFF ────────────────
class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Deleted'
        instance.deleted_at = timezone.now()  # Set the deletion timestamp
        instance.save()
        return Response({'message': 'Employee deleted.'}, status=status.HTTP_200_OK)

class StaffProfileUpdateView(generics.UpdateAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

class StaffProfileListView(generics.ListAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer

class StaffProfileDeactivateView(generics.UpdateAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Deactivated'
        instance.save()
        return Response({'message': 'Employee deactivated.'}, status=status.HTTP_200_OK)

class StaffProfileDeleteView(generics.DestroyAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Deleted'
        instance.deleted_at = timezone.now()  # Set the deletion timestamp
        instance.save()
        return Response({'message': 'Employee deleted.'}, status=status.HTTP_200_OK)

class StaffProfileActivateView(generics.UpdateAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    lookup_field = 'staff_id'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Active'
        instance.save()
        return Response({'message': 'Employee activated.'}, status=status.HTTP_200_OK)


# ──────────────── CUSTOMERS ────────────────
class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'id'
    permission_classes = [AllowAny]  # Allow unauthenticated access


class CustomerListAPIView(generics.ListCreateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class CustomerDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'customer_id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Deleted'
        instance.save()
        return Response({'message': 'Customer deleted successfully.'}, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class CustomerActivationView(APIView):
    def patch(self, request, customer_id):
        try:
            customer = Profile.objects.get(customer_id=customer_id)
            action = request.data.get('action')
            
            if action == 'activate':
                customer.status = 'Active'
                message = 'Customer activated successfully.'
            elif action == 'deactivate':
                customer.status = 'Deactivated'
                message = 'Customer deactivated successfully.'
            else:
                return Response(
                    {'error': 'Invalid action. Use "activate" or "deactivate".'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            customer.save()
            return Response({'message': message}, status=status.HTTP_200_OK)
            
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Customer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


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

        if not user:
            return Response({"error": "Invalid credentials."}, status=401)

        # First check if the user is a customer
        try:
            customer_profile = Profile.objects.get(email=user.email)
            if customer_profile.status == "Deleted":
                return Response({"error": "This account has been deleted and cannot be accessed."}, status=403)
            elif customer_profile.status == "Deactivated":
                return Response({"error": "This account has been deactivated. Please contact an administrator."}, status=403)
        except Profile.DoesNotExist:
            # If not a customer, check if it's a staff
            try:
                staff_profile = StaffProfile.objects.get(user=user)
                if staff_profile.status == "Deleted":
                    return Response({"error": "This account has been deleted and cannot be accessed."}, status=403)
                elif staff_profile.status == "Deactivated":
                    return Response({"error": "This account has been deactivated. Please contact an administrator."}, status=403)
            except StaffProfile.DoesNotExist:
                # If neither customer nor staff, check password
                if user.check_password(password):
                    refresh = RefreshToken.for_user(user)
                    return Response({
                        "access": str(refresh.access_token),
                        "refresh": str(refresh)
                    })
                return Response({"error": "Invalid credentials."}, status=401)

        # If we get here, the user is either a valid customer or staff
        if user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            })

        return Response({"error": "Invalid credentials."}, status=401)


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

        if new_status not in ["Pending", "Order Confirmed", "Cancelled"]:
            return Response({"error": "Invalid status"}, status=400)

        order.status = new_status
        if new_status == "Order Confirmed":
            order.confirmed_at = timezone.now()

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
            return Response({"error": "Invalid status"}, status=400)

        delivery.status = new_status
        delivery.save()
        return Response({"message": f"Delivery status updated to {new_status}"})


# ──────────────── INVITE STAFF ────────────────
class InviteStaffView(APIView):
    def post(self, request):
        email = request.data.get("email")
        role = request.data.get("role")

        if not email or not role:
            return Response({"error": "Email and role are required."}, status=400)

        try:
            # ✅ Invite the user (this sends the email!)
            invited = client.auth.admin.invite_user_by_email(email=email)

            # ✅ Store in staff_profiles
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
            # Supabase invite again
            result = client.auth.admin.invite_user_by_email(email=email)
            if result.user:
                return Response({"message": f"Invitation resent to {email}"})
            return Response({"error": "Failed to resend invite."}, status=500)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
            