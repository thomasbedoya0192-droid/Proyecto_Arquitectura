from django.contrib import admin
from .models import Wallet, TestCard, WalletTransaction, Subscription, PaymentHistory


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'created_at', 'updated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']
    list_filter = ['created_at']

    actions = ['add_100_usd', 'add_50_usd', 'add_10_usd']

    def add_100_usd(self, request, queryset):
        for wallet in queryset:
            wallet.add_funds(100, "Admin bulk top-up $100")
        self.message_user(request, f"Added $100 to {queryset.count()} wallet(s)")
    add_100_usd.short_description = "Add $100 to selected wallets"

    def add_50_usd(self, request, queryset):
        for wallet in queryset:
            wallet.add_funds(50, "Admin bulk top-up $50")
        self.message_user(request, f"Added $50 to {queryset.count()} wallet(s)")
    add_50_usd.short_description = "Add $50 to selected wallets"

    def add_10_usd(self, request, queryset):
        for wallet in queryset:
            wallet.add_funds(10, "Admin bulk top-up $10")
        self.message_user(request, f"Added $10 to {queryset.count()} wallet(s)")
    add_10_usd.short_description = "Add $10 to selected wallets"


@admin.register(TestCard)
class TestCardAdmin(admin.ModelAdmin):
    list_display = ['user', 'card_type', 'last4', 'brand', 'balance', 'is_default', 'created_at']
    list_filter = ['card_type', 'brand', 'is_default', 'created_at']
    search_fields = ['user__username', 'user__email', 'last4']
    raw_id_fields = ['user']
    readonly_fields = ['created_at']

    actions = ['create_missing_cards', 'reset_balances']

    def create_missing_cards(self, request, queryset):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.filter(id__in=queryset.values_list('user', flat=True).distinct())
        for user in users:
            TestCard.create_predefined_cards(user)
        self.message_user(request, f"Created missing test cards for {users.count()} user(s)")
    create_missing_cards.short_description = "Create missing test cards for selected users"

    def reset_balances(self, request, queryset):
        """Reset card balances to their default values"""
        defaults = {
            'visa_rich': 1000.00,
            'visa_poor': 5.00,
            'mastercard_rich': 500.00,
            'mastercard_poor': 1.00,
            'amex_rich': 2000.00,
            'amex_poor': 0.00,
        }
        for card in queryset:
            if card.card_type in defaults:
                card.balance = defaults[card.card_type]
                card.save()
        self.message_user(request, f"Reset balances for {queryset.count()} card(s)")
    reset_balances.short_description = "Reset selected cards to default balances"


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'amount', 'type', 'description', 'balance_after', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['wallet__user__username', 'description', 'reference']
    raw_id_fields = ['wallet']
    readonly_fields = ['created_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'current_period_end', 'cancel_at_period_end', 'created_at']
    list_filter = ['plan', 'status', 'cancel_at_period_end']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']

    actions = ['activate_premium', 'cancel_premium', 'check_expirations']

    def activate_premium(self, request, queryset):
        for sub in queryset:
            sub.activate_premium()
        self.message_user(request, f"Activated premium for {queryset.count()} subscription(s)")
    activate_premium.short_description = "Activate Premium for selected subscriptions"

    def cancel_premium(self, request, queryset):
        for sub in queryset:
            sub.cancel_premium()
        self.message_user(request, f"Canceled premium for {queryset.count()} subscription(s)")
    cancel_premium.short_description = "Cancel Premium (at period end) for selected"

    def check_expirations(self, request, queryset):
        expired = 0
        for sub in queryset:
            if sub.check_and_expire():
                expired += 1
        self.message_user(request, f"Checked {queryset.count()} subscriptions, {expired} expired")
    check_expirations.short_description = "Check and expire ended subscriptions"


@admin.register(PaymentHistory)
class PaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'currency', 'type', 'status', 'created_at']
    list_filter = ['type', 'status', 'currency']
    search_fields = ['user__username', 'user__email']
    raw_id_fields = ['user', 'subscription']
    readonly_fields = ['created_at', 'updated_at', 'paid_at']