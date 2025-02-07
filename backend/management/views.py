from rest_framework import viewsets
from .models import InventoryItem, Supplier, Customer, Employee
from .serializers import InventoryItemSerializer, SupplierSerializer, CustomerSerializer, EmployeeSerializer

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
