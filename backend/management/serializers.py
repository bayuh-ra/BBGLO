from rest_framework import serializers
from .models import InventoryItem, Supplier, Customer, Employee

from rest_framework import serializers
from .models import InventoryItem, Supplier, Customer, Employee

class SupplierSerializer(serializers.ModelSerializer):
    supplier_id = serializers.CharField(read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'

class InventoryItemSerializer(serializers.ModelSerializer):
    item_id = serializers.CharField(read_only=True)
    stock_in_date = serializers.DateTimeField(format='%b-%d-%Y, %I:%M %p', read_only=True)
    supplier = serializers.SlugRelatedField(
        queryset=Supplier.objects.all(),
        slug_field='supplier_name'
    )  # Display supplier name instead of ID

    class Meta:
        model = InventoryItem
        fields = '__all__'


class CustomerSerializer(serializers.ModelSerializer):
    customer_id = serializers.CharField(read_only=True)  # Auto-generate ID

    class Meta:
        model = Customer
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(read_only=True)  # Auto-generate ID

    class Meta:
        model = Employee
        fields = '__all__'