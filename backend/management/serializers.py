from django.contrib.auth import get_user_model
from django.core.serializers import serialize
from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Delivery,
    Expense,
    InventoryItem,
    Order,
    Profile,
    PurchaseOrder,
    PurchaseOrderItem,
    StaffProfile,
    StockInRecord,
    Supplier,
    Vehicle,
)


# ───── Supplier ─────
class SupplierSerializer(serializers.ModelSerializer):
    supplier_id = serializers.CharField(read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'


# ───── Inventory ─────
class InventoryItemSerializer(serializers.ModelSerializer):
    item_id = serializers.CharField(read_only=True)
    stock_in_date = serializers.DateTimeField(format='%b-%d-%Y, %I:%M %p', read_only=True)
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    supplier = serializers.SlugRelatedField(
        queryset=Supplier.objects.all(),
        slug_field='supplier_id',
        write_only=True
    )

    class Meta:
        model = InventoryItem
        fields = '__all__'

# ───── Stock In ─────
class StockInRecordSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    stocked_by_name = serializers.CharField(source='stocked_by.name', read_only=True)
    
    class Meta:
        model = StockInRecord
        fields = '__all__'

# ───── Purchase Order Item ─────
class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = ['item', 'quantity', 'uom', 'unit_price', 'total_price']


# ───── Purchase Order ─────
class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = [
            'po_id', 'supplier', 'expected_delivery', 'status', 'remarks',
            'ordered_by', 'date_ordered', 'total_cost', 'date_delivered'
        ]
        read_only_fields = ['po_id', 'date_ordered', 'total_cost', 'date_delivered']

    def validate(self, data):
        for item in self.initial_data.get('items', []):
            if int(item.get('quantity', 0)) <= 0:
                raise serializers.ValidationError("Quantity must be at least 1.")
        return data


    def create(self, validated_data):
        # Get request data manually
        request = self.context.get('request')
        items_data = request.data.get('items', [])

        if not isinstance(items_data, list):
            raise serializers.ValidationError({'items': 'Must be a list of items'})

        # Create the Purchase Order
        purchase_order = PurchaseOrder.objects.create(**validated_data)

        total_cost = 0

        for item_data in items_data:
            item_id = item_data.get('item')
            try:
                inventory_item = InventoryItem.objects.get(item_id=item_id)
            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError(f"Item '{item_id}' does not exist")

            quantity = float(item_data.get('quantity', 0))
            unit_price = float(item_data.get('unit_price', 0))

            total = quantity * unit_price

            PurchaseOrderItem.objects.create(
                po=purchase_order,
                item=inventory_item,
                quantity=quantity,
                uom=item_data.get('uom', ''),
                unit_price=unit_price,
                total_price=total
            )

            total_cost += total

        purchase_order.total_cost = total_cost
        purchase_order.save()
        return purchase_order


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['po_id', 'supplier', 'expected_delivery', 'status', 'remarks', 
                 'date_ordered', 'total_cost', 'items', 'date_delivered']
        read_only_fields = ['po_id', 'date_ordered', 'total_cost', 'date_delivered']


# ───── Orders ─────
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'


# ───── Customers (Profiles) ─────
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


# ───── Staff Profiles ─────
class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class StaffProfileCreateView(generics.CreateAPIView):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Modify here to set status to Active
        serializer.validated_data['status'] = 'Active'

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ───── Auth User ─────
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


# ───── Delivery ─────
class DeliverySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company', read_only=True)
    order_id = serializers.CharField(source='order.order_id', read_only=True)
    driver_name = serializers.CharField(source='driver.name', read_only=True, default="Not Assigned")

    class Meta:
        model = Delivery
        fields = [
            "id",
            "order_id",
            "customer_name",
            "driver",
            "driver_name",
            "status",
            "delivery_date"
        ]


# ───── Expense ─────
class ExpenseSerializer(serializers.ModelSerializer):
    expense_id = serializers.CharField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(
        queryset=StaffProfile.objects.all(),
        required=False
    )

    class Meta:
        model = Expense
        fields = [
            'expense_id', 'category', 'amount', 'date', 
            'paid_to', 'description', 'created_by', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['expense_id', 'created_at', 'updated_at']


# ───── Vehicle ─────
class VehicleSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.CharField(read_only=True)
    date_acquired = serializers.DateField(format="%B %d, %Y")
    last_maintenance = serializers.DateField(format="%B %d, %Y", required=False, allow_null=True)
    insurance_expiry = serializers.DateField(format="%B %d, %Y")
    registration_expiry = serializers.DateField(format="%B %d, %Y")
    assigned_driver_name = serializers.CharField(source='assigned_driver.name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.name', read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'vehicle_id', 'plate_number', 'model', 'brand', 'year_manufactured',
            'type', 'status', 'date_acquired', 'assigned_driver', 'assigned_driver_name',
            'last_maintenance', 'insurance_expiry', 'registration_expiry',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['vehicle_id', 'created_at', 'updated_at']