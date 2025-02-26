from django.contrib.auth import authenticate, get_user_model

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password

from .models import Customer, Delivery, Employee, InventoryItem, Supplier
from .serializers import (CustomerSerializer, DeliverySerializer,
                          EmployeeSerializer, InventoryItemSerializer,
                          SupplierSerializer, UserSerializer)


# Inventory ViewSet
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().select_related('supplier')  # Optimize DB query
    serializer_class = InventoryItemSerializer
    lookup_field = "item_id"

# Supplier ViewSet
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

# Customer ViewSet
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

# Employee ViewSet
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer


# Account Views
class SignupView(APIView):
    def post(self, request):
        data = request.data.copy()

        if "password" not in data or not data["password"].strip():
            return Response({"error": "Password is required."}, status=400)

        data["password"] = make_password(data["password"])  # ✅ Hash password before saving

        serializer = CustomerSerializer(data=data)
        if serializer.is_valid():
            serializer.save(is_active=False)  # ✅ Ensure new accounts are inactive
            return Response({"message": "Signup successful! Wait for admin approval."}, status=201)

        print("Signup Error:", serializer.errors)  # ✅ Debugging output
        return Response(serializer.errors, status=400)

class LoginView(APIView):
    def post(self, request):
        print("Received login request:", request.data)  # ✅ Debug input data

        username_or_email_or_phone = request.data.get("username_or_email_or_phone")
        password = request.data.get("password")

        if not username_or_email_or_phone or not password:
            print("Missing username/email/phone or password!")  # ✅ Debug missing input
            return Response({"error": "Username/email/phone and password are required."}, status=400)

        User = get_user_model()
        user = None

        # Check if the input is a username, email, or phone number
        if "@" in username_or_email_or_phone:  # Check for email
            user = User.objects.filter(email=username_or_email_or_phone).first()
        elif username_or_email_or_phone.isdigit():  # Check for phone number
            user = User.objects.filter(phone=username_or_email_or_phone).first()
        else:  # Assume it's a username
            user = User.objects.filter(username=username_or_email_or_phone).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({"access": str(refresh.access_token), "refresh": str(refresh)})

        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        return Response({'message': 'Logout successful'}, status=200)

# Existing ViewSets
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().select_related('supplier')
    serializer_class = InventoryItemSerializer
    lookup_field = "item_id"

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer

    @action(detail=True, methods=["PUT"])
    def update_status(self, request, pk=None):
        """ Update the delivery status """
        delivery = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["Pending", "Packed", "In Transit", "Delivered"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        delivery.status = new_status
        delivery.save()
        return Response({"message": f"Delivery status updated to {new_status}"})
    
class CustomerActivationView(APIView):
    def post(self, request, customer_id):
        try:
            customer = Customer.objects.get(customer_id=customer_id)
            customer.is_active = True
            customer.save()
            return Response({"message": "Customer account activated successfully."})
        except Customer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)
