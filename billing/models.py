from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Wallet(models.Model):
    """Internal wallet for each user - holds USD balance for testing"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallet'
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_wallet'

    def __str__(self):
        return f"{self.user.username} - ${self.balance}"

    def add_funds(self, amount, description="Admin top-up"):
        """Add funds to wallet (admin only)"""
        self.balance += Decimal(str(amount))
        self.save()
        WalletTransaction.objects.create(
            wallet=self,
            amount=Decimal(str(amount)),
            type='credit',
            description=description,
            balance_after=self.balance
        )

    def deduct_funds(self, amount, description="Payment"):
        """Deduct funds from wallet"""
        if self.balance < Decimal(str(amount)):
            raise ValueError("Insufficient funds")
        self.balance -= Decimal(str(amount))
        self.save()
        WalletTransaction.objects.create(
            wallet=self,
            amount=Decimal(str(amount)),
            type='debit',
            description=description,
            balance_after=self.balance
        )
        return True

    def can_afford(self, amount):
        return self.balance >= Decimal(str(amount))


class TestCard(models.Model):
    """Predefined test cards for testing payment flows"""
    CARD_TYPES = [
        ('visa_rich', 'Visa •••• 4242 (Rich - $1000)'),
        ('visa_poor', 'Visa •••• 4000 (Poor - $5)'),
        ('mastercard_rich', 'Mastercard •••• 5555 (Rich - $500)'),
        ('mastercard_poor', 'Mastercard •••• 5000 (Poor - $1)'),
        ('amex_rich', 'Amex •••• 3782 (Rich - $2000)'),
        ('amex_poor', 'Amex •••• 3000 (Poor - $0)'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='test_cards'
    )
    card_type = models.CharField(max_length=20, choices=CARD_TYPES)
    last4 = models.CharField(max_length=4)
    brand = models.CharField(max_length=20)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_test_card'
        unique_together = ['user', 'card_type']

    def __str__(self):
        return f"{self.user.username} - {self.get_card_type_display()}"

    @classmethod
    def create_predefined_cards(cls, user):
        """Create all predefined test cards for a user"""
        cards_data = [
            {'card_type': 'visa_rich', 'last4': '4242', 'brand': 'Visa', 'balance': Decimal('1000.00')},
            {'card_type': 'visa_poor', 'last4': '4000', 'brand': 'Visa', 'balance': Decimal('5.00')},
            {'card_type': 'mastercard_rich', 'last4': '5555', 'brand': 'Mastercard', 'balance': Decimal('500.00')},
            {'card_type': 'mastercard_poor', 'last4': '5000', 'brand': 'Mastercard', 'balance': Decimal('1.00')},
            {'card_type': 'amex_rich', 'last4': '3782', 'brand': 'Amex', 'balance': Decimal('2000.00')},
            {'card_type': 'amex_poor', 'last4': '3000', 'brand': 'Amex', 'balance': Decimal('0.00')},
        ]
        cards = []
        for data in cards_data:
            card, created = cls.objects.get_or_create(
                user=user,
                card_type=data['card_type'],
                defaults=data
            )
            cards.append(card)
        return cards

    def can_afford(self, amount):
        return self.balance >= Decimal(str(amount))

    def charge(self, amount, description="Test card charge"):
        """Simulate charging the test card"""
        if self.balance < Decimal(str(amount)):
            raise ValueError(f"Insufficient funds on {self.get_card_type_display()}")
        self.balance -= Decimal(str(amount))
        self.save()
        return True


class WalletTransaction(models.Model):
    """Transaction history for wallet"""
    TYPE_CHOICES = [
        ('credit', 'Credit (Add Funds)'),
        ('debit', 'Debit (Payment)'),
    ]

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)  # e.g., "PREMIUM_UPGRADE"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_wallet_transaction'
        ordering = ['-created_at']

    def __str__(self):
        sign = '+' if self.type == 'credit' else '-'
        return f"{self.wallet.user.username} {sign}${self.amount} ({self.type})"


class Subscription(models.Model):
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('canceled', 'Canceled'),
        ('past_due', 'Past Due'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Internal billing fields (no Stripe)
    current_period_end = models.DateTimeField(blank=True, null=True)
    cancel_at_period_end = models.BooleanField(default=False)

    # Premium pricing
    MONTHLY_PRICE = Decimal('9.99')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_subscription'

    def __str__(self):
        return f"{self.user.username} - {self.plan} ({self.status})"

    def is_premium(self):
        return self.plan == 'premium' and self.status == 'active'

    def activate_premium(self):
        """Activate premium plan for 30 days"""
        from datetime import timedelta
        self.plan = 'premium'
        self.status = 'active'
        self.current_period_end = timezone.now() + timedelta(days=30)
        self.cancel_at_period_end = False
        self.save()

        # Update user profile
        if hasattr(self.user, 'perfil'):
            self.user.perfil.plan = 'premium'
            self.user.perfil.save()

    def cancel_premium(self):
        """Cancel premium at period end (no refund)"""
        self.cancel_at_period_end = True
        self.status = 'canceled'
        self.save()

    def check_and_expire(self):
        """Check if premium period expired"""
        if self.is_premium() and self.current_period_end and timezone.now() > self.current_period_end:
            self.plan = 'free'
            self.status = 'active'
            self.current_period_end = None
            self.cancel_at_period_end = False
            self.save()

            # Update user profile
            if hasattr(self.user, 'perfil'):
                self.user.perfil.plan = 'free'
                self.user.perfil.save()
            return True
        return False


class PaymentHistory(models.Model):
    TYPE_CHOICES = [
        ('subscription', 'Subscription Upgrade'),
        ('wallet_topup', 'Wallet Top-up'),
        ('test_card_charge', 'Test Card Charge'),
    ]

    STATUS_CHOICES = [
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_history'
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='payments'
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='usd')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='subscription')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='succeeded')

    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'billing_payment_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - ${self.amount} {self.currency.upper()} ({self.status})"

    def mark_succeeded(self):
        self.status = 'succeeded'
        self.paid_at = timezone.now()
        self.save()

    def mark_failed(self):
        self.status = 'failed'
        self.save()