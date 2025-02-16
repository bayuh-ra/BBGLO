from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Customer, Delivery, Employee, InventoryItem, Supplier


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


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    



class DeliverySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.business_name', read_only=True)
    order_id = serializers.CharField(source='order.order_id', read_only=True)
    driver_name = serializers.CharField(source='driver.first_name', read_only=True, default="Not Assigned")

    class Meta:
        model = Delivery
        fields = ["id", "order_id", "customer_name", "driver", "driver_name", "status", "delivery_date"]
